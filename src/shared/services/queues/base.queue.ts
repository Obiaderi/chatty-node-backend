import Queue, { Job } from 'bull';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';

//
import Logger from 'bunyan';
import { config } from '@root/config';

let bullAdapters: BullAdapter[] = [];
export let serverAdapter: ExpressAdapter;

export abstract class BaseQueue {
  queue: Queue.Queue;
  log: Logger;

  constructor(queueName: string) {
    this.queue = new Queue(queueName, `${config.REDIS_HOST}`);
    bullAdapters.push(new BullAdapter(this.queue));

    // Remove duplicate queues
    bullAdapters = [...new Set(bullAdapters)];
    serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/queues');

    // Create BullBoard Queues
    createBullBoard({
      queues: bullAdapters,
      serverAdapter
    });

    this.log = Logger.createLogger({
      name: `Queue: ${queueName}`,
      level: 'info'
    });

    this.queue.on('completed', (job: Job) => {
      job.remove();
    });

    this.queue.on('global:completed', (jobId: Job) => {
      this.log.info(`Job ${jobId} completed`);
    });

    this.queue.on('global:stalled', (jobId: Job) => {
      this.log.info(`Job ${jobId} stalled`);
    });

    this.queue.on('global:failed', (jobId: Job) => {
      this.log.info(`Job ${jobId} failed`);
    });
  }

  protected async addJob(jobName: string, data: unknown) {
    this.queue.add(jobName, data, {
      attempts: 3,
      backoff: {
        type: 'fixed',
        delay: 5000
      }
    });
  }

  // concurrency means how many jobs can be processed at the same time
  protected processJob(jobName: string, concurrency: number, callback: Queue.ProcessCallbackFunction<void>): void {
    this.queue.process(jobName, concurrency, callback);
  }
}
