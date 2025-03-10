import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { VideoModule } from './video/video.module';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'redis',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    }),
    VideoModule,
  ],
})
export class AppModule {}
