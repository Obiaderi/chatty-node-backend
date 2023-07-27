import { Request, Response } from 'express';
import JWT from 'jsonwebtoken';
import HTTP_STATUS from 'http-status-codes';
// Path
import { config } from '@root/config';
import { joiValidation } from '@global/decorators/joi-validation.decorators';
import { authService } from '@service/db/auth.service';
import { loginSchema } from '@auth/schemas/signin';
import { IAuthDocument } from '@auth/interfaces/auth.interface';
import { BadRequestError } from '@global/helpers/error-handler';
import { userService } from '@service/db/user.service';
import { IUserDocument } from '@user/interfaces/user.interface';

export class SignInController {
  @joiValidation(loginSchema)
  public async read(req: Request, res: Response): Promise<void> {
    const { username, password } = req.body;
    const existingUser: IAuthDocument = await authService.getAuthUserByUsername(username);
    if (!existingUser) {
      throw new BadRequestError('Invalid credentials');
    }

    // Validate password / compare password
    const passwordsMatch: boolean = await existingUser.comparePassword(password);
    if (!passwordsMatch) {
      throw new BadRequestError('Invalid credentials');
    }
    const user: IUserDocument = await userService.getUserByAuthId(`${existingUser._id}`);
    const userJwt: string = JWT.sign(
      {
        userId: user._id,
        uId: existingUser.uId,
        email: existingUser.email,
        username: existingUser.username,
        avatarColor: existingUser.avatarColor
      },
      config.JWT_TOKEN!
    );
    req.session = { jwt: userJwt };

    // Send email Test
    // const templateParams: IResetPasswordParams = {
    //   username: existingUser.username!,
    //   email: existingUser.email,
    //   ipaddress: publicIp.address(),
    //   date: moment().format('MMMM Do YYYY, h:mm:ss a')
    // };

    // const template: string = resetPasswordTemplate.passwordResetConfirmationTemplate(templateParams);
    // emailQueue.addEmailJob('forgotPasswordEmail', {
    //   template,
    //   receiverEmail: existingUser.email,
    //   subject: 'Password Reset Confirmation'
    // });

    const userDocument: IUserDocument = {
      ...user,
      authId: existingUser!._id,
      username: existingUser!.username,
      email: existingUser!.email,
      avatarColor: existingUser!.avatarColor,
      uId: existingUser!.uId,
      createdAt: existingUser!.createdAt
    } as IUserDocument;
    res.status(HTTP_STATUS.OK).json({
      message: 'User login successfully',
      user: userDocument,
      token: userJwt
    });
  }
}
