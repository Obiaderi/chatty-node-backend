import { Application } from 'express';

// custom
import { authRoutes } from '@auth/routes/authRouthes';
import { currentUserRoutes } from '@auth/routes/currentRoute';
import { serverAdapter } from '@service/queues/base.queue';
import { authMiddleware } from '@global/helpers/auth-middlewares';

const BASE_PATH = '/api/v1';

export default (app: Application) => {
  const routes = () => {
    app.use('/queues', serverAdapter.getRouter());
    app.use(BASE_PATH, authRoutes.routes());
    app.use(BASE_PATH, authRoutes.signoutRoute());

    // current user
    app.use(BASE_PATH, authMiddleware.verifyUser, currentUserRoutes.routes());
  };

  routes();
};
