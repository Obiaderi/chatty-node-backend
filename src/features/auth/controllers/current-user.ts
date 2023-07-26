import { Request, Response } from 'express';
import HTTP_STATUS from 'http-status-codes';

// custom
import { UserCache } from '@service/redis/user.cache';
import { IUserDocument } from '@user/interfaces/user.interface';
import { userService } from '@service/db/user.service';

const userCache: UserCache = new UserCache();

export class CurrentUserController {
  public async read(req: Request, res: Response): Promise<void> {
    let isUser = false;
    let token = null;
    let user = null;
    const cachedUser: IUserDocument = (await userCache.getUserFromCache(`${req.currentUser!.userId}`)) as IUserDocument;
    const existingUser: IUserDocument = cachedUser ? cachedUser : await userService.getUserById(`${req.currentUser!.userId}`);

    // if the user exists, and the object has values, then the user is logged in
    if (Object.keys(existingUser).length) {
      isUser = true;
      token = req.session?.jwt;
      user = existingUser;
    }
    res.status(HTTP_STATUS.OK).json({ token, isUser, user });
  }
}
