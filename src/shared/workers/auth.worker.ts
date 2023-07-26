/* A worker process the job by calling the
processJob method in the constructor of the queue class.
the method will data to database and remove the job from the queue
*/

import { DoneCallback, Job } from 'bull';
import Logger from 'bunyan';
import { config } from '@root/config';
import { authService } from '@service/db/auth.service';

const log: Logger = config.createLogger('authWorker');

class AuthWorker {
  async addAuthUserToDB(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { value } = job.data;
      // Add method to send data to database
      await authService.createAuthUser(value);
      job.progress(100); // To report the progress of the job
      done(null, job.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }
}

export const authWorker: AuthWorker = new AuthWorker();
