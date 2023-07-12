import { Application, json, urlencoded, Response, Request, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import compression from 'compression';
import cookieSession from 'cookie-session';
import 'express-async-errors';
import HTTP_STATUS from 'http-status-codes';
import { Server } from 'socket.io';
import Logger from 'bunyan';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import applicationRoutes from '@root/routes';
import { config } from '@root/config';
import { CustomError, IErrorResponse } from '@global/helpers/error-handler';

const SERVER_PORT = process.env.PORT || 5000;
const log: Logger = config.createLogger('setupServer');

export class ChattyServer {
  private app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  public start(): void {
    this.securityMiddlewares(this.app);
    this.standardMiddlewares(this.app);
    this.routeMiddlewares(this.app);
    this.globalErrorMiddlewares(this.app);
    this.startServer(this.app);
  }

  private securityMiddlewares(app: Application): void {
    app.use(
      cookieSession({
        name: 'session',
        keys: [config.SECRET_KEY_ONE!, config.SECRET_KEY_TWO!],
        maxAge: 24 * 60 * 60 * 1000, // Cookie will be valid for 24 hours
        secure: config.NODE_ENV !== 'development' // Cookie will only be sent over HTTPS
      })
    );
    app.use(helmet());
    app.use(hpp());
    app.use(
      cors({
        origin: config.CLIENT_URL,
        credentials: true, // Access-Control-Allow-Credentials: true
        optionsSuccessStatus: HTTP_STATUS.OK,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
      })
    );
  }

  private standardMiddlewares(app: Application): void {
    app.use(json({ limit: '50mb' })); // Body limit is set to 50mb
    app.use(urlencoded({ extended: true }));
    app.use(compression());
  }

  private routeMiddlewares(app: Application): void {
    applicationRoutes(app);
  }

  private globalErrorMiddlewares(app: Application): void {
    app.all('*', async (req: Request, res: Response) => {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        status: 'error',
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: `Can't find ${req.originalUrl} on this server!`
      });
    });
    app.use((error: IErrorResponse, req: Request, res: Response, next: NextFunction) => {
      log.error(error);
      if (error instanceof CustomError) {
        return res.status(error.statusCode).json(error.serializeErrors());
      }
    });
  }

  private async startServer(app: Application): Promise<void> {
    try {
      const httpServer: http.Server = new http.Server(app);
      const socketIO: Server = await this.createSocketIO(httpServer);
      this.startHttpServer(httpServer);
      this.socketIOConnectionns(socketIO);
    } catch (error) {
      log.error(error);
    }
  }

  private async createSocketIO(httpServer: http.Server): Promise<Server> {
    const IO = new Server(httpServer, {
      cors: {
        origin: config.CLIENT_URL,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
      }
    });
    const pubClient = createClient({
      url: config.REDIS_HOST
    });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    IO.adapter(createAdapter(pubClient, subClient));
    return IO;
  }

  private startHttpServer(httpServer: http.Server): void {
    log.info('Server has started with process id', process.pid);

    httpServer.listen(SERVER_PORT, () => {
      log.info(`Server is listening on port ${SERVER_PORT}`);
    });
  }

  private socketIOConnectionns(socketIO: Server): void {}
}
