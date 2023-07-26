import { ObjectId } from 'mongodb';
import JWT from 'jsonwebtoken';
import { omit } from 'lodash';
import HTTP_STATUS from 'http-status-codes';
import { Request, Response } from 'express';
import { UploadApiResponse } from 'cloudinary';

//
import { joiValidation } from '@global/decorators/joi-validation.decorators';
import { signupSchema } from '@auth/schemas/signup';
import { IAuthDocument, ISignUpData } from '@auth/interfaces/auth.interface';
import { authService } from '@service/db/auth.service';
import { BadRequestError } from '@global/helpers/error-handler';
import { Helpers } from '@global/helpers/helpers';
import { uploads } from '@global/helpers/cloudinary-upload';
import { IUserDocument } from '@user/interfaces/user.interface';
import { UserCache } from '@service/redis/user.cache';
import { authQueue } from '@service/queues/auth.queue';
import { userQueue } from '@service/queues/user.queue';
import { config } from '@root/config';

const userCache: UserCache = new UserCache();

export class SignUpController {
  @joiValidation(signupSchema)
  public async create(req: Request, res: Response): Promise<void> {
    const { email, username, password, avatarColor, avatarImage } = req.body;
    const checkIfUserExist: IAuthDocument = await authService.getUserByUsernameOrEmail(username, email);

    if (checkIfUserExist) {
      throw new BadRequestError('Invalid credentials');
    }

    const authObjectId: ObjectId = new ObjectId();
    const userObjectId: ObjectId = new ObjectId();
    const uId = `${Helpers.generateRandomIntegers(12)}`;
    // the reason we are using SignUpController.prototype.signupData and not this.signupData is because
    // of how we invoke the create method in the routes method.
    // the scope of the this object is not kept when the method is invoked
    const authData: IAuthDocument = SignUpController.prototype.signupData({
      _id: authObjectId,
      uId,
      username,
      email,
      password,
      avatarColor
    });

    // Cloudinary upload method
    const result: UploadApiResponse = (await uploads(avatarImage, `${userObjectId}`, true, true)) as UploadApiResponse;
    if (!result?.public_id) {
      throw new BadRequestError('File upload: Error occurred. Try again.');
    }

    // Add to redis cache
    const userDataForCache: IUserDocument = SignUpController.prototype.userData(authData, userObjectId);
    userDataForCache.profilePicture = `https://res.cloudinary.com/dcnwzsjm6/image/upload/v${result.version}/chatty_assets/${userObjectId}`;
    await userCache.saveUserToCache(`${userObjectId}`, uId, userDataForCache);

    // Add to database
    omit(userDataForCache, ['uId', 'username', 'email', 'password', 'avatarColor']);
    authQueue.addAuthUserJob('addAuthUserToDB', { value: authData });
    userQueue.addUserJob('addUserToDB', { value: userDataForCache });

    const userJwt: string = SignUpController.prototype.signToken(authData, userObjectId);
    req.session = { jwt: userJwt };

    res.status(HTTP_STATUS.CREATED).json({
      message: 'User created successfully',
      user: userDataForCache,
      token: userJwt
    });
  }

  private signToken(data: IAuthDocument, userObjectId: ObjectId): string {
    return JWT.sign(
      {
        userId: userObjectId,
        uId: data.uId,
        email: data.email,
        username: data.username,
        avatarColor: data.avatarColor
      },
      config.JWT_TOKEN!
    );
  }

  private signupData(data: ISignUpData): IAuthDocument {
    const { _id, username, email, uId, password, avatarColor } = data;
    return {
      _id,
      uId,
      username: Helpers.firstLetterUppercase(username),
      email: Helpers.lowerCase(email),
      password,
      avatarColor,
      createdAt: new Date()
    } as IAuthDocument;
  }

  private userData(data: IAuthDocument, userObjectId: ObjectId): IUserDocument {
    const { _id, username, email, uId, password, avatarColor } = data;
    return {
      _id: userObjectId,
      authId: _id,
      uId,
      username: Helpers.firstLetterUppercase(username),
      email,
      password,
      avatarColor,
      profilePicture: '',
      blocked: [],
      blockedBy: [],
      work: '',
      location: '',
      school: '',
      quote: '',
      bgImageVersion: '',
      bgImageId: '',
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      notifications: {
        messages: true,
        reactions: true,
        comments: true,
        follows: true
      },
      social: {
        facebook: '',
        instagram: '',
        twitter: '',
        youtube: ''
      }
    } as unknown as IUserDocument;
  }
}
