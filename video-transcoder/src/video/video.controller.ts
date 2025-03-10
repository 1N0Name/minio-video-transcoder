import { Controller, Post, Body, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Controller('new_video')
export class VideoController {
  private readonly logger = new Logger(VideoController.name);

  constructor(@InjectQueue('video') private videoQueue: Queue) { }

  @Post()
  async handleNewVideo(@Body() body: any): Promise<{ status: string }> {
    let key: string | undefined;
    if (body.Records?.length && body.Records[0].s3?.object?.key) {
      key = body.Records[0].s3.object.key;
    }
    if (!key) {
      this.logger.error('Key not found in payload');
      return { status: 'Error: key not found' };
    }
    this.logger.log(`Received new video event with key: ${key}`);
    await this.videoQueue.add('transcode', { key });
    this.logger.log(`Job queued for transcoding with key: ${key}`);
    return { status: 'Job queued' };
  }
}