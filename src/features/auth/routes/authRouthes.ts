import express, { Router } from 'express';

// custom
import { SignUpController } from '@auth/controllers/signup';
import { SignInController } from '@auth/controllers/signin';
import { SignOut } from '@auth/controllers/signout';

class AuthRoutes {
  private router: Router;

  constructor() {
    this.router = express.Router();
  }

  public routes(): Router {
    this.router.post('/signup', SignUpController.prototype.create);
    this.router.post('/signin', SignInController.prototype.read);
    // this.router.post('/forgot-password', Password.prototype.create);
    // this.router.post('/reset-password/:token', Password.prototype.update);

    return this.router;
  }

  public signoutRoute(): Router {
    this.router.get('/signout', SignOut.prototype.update);

    return this.router;
  }
}

export const authRoutes: AuthRoutes = new AuthRoutes();
