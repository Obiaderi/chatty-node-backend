import express, { Router } from 'express';

// custom
import { CurrentUserController } from '@auth/controllers/current-user';
import { authMiddleware } from '@global/helpers/auth-middlewares';

class CurrentUserRoutes {
  private router: Router;

  constructor() {
    this.router = express.Router();
  }

  public routes(): Router {
    this.router.get('/currentuser', authMiddleware.checkAuthentication, CurrentUserController.prototype.read);

    return this.router;
  }
}

export const currentUserRoutes: CurrentUserRoutes = new CurrentUserRoutes();
