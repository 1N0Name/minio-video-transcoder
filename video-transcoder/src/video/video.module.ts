import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { VideoController } from './video.controller';
import { VideoProcessor } from './video.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'video',
    }),
  ],
  controllers: [VideoController],
  providers: [VideoProcessor],
})
export class VideoModule {}
