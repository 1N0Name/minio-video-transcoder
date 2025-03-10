import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import { pipeline } from 'stream';
import { promisify as promisifyStream } from 'util';
import { GetObjectCommand, PutObjectCommand, ObjectCannedACL } from '@aws-sdk/client-s3';
import s3Client from '../s3/s3-client.config';
import { Logger } from '@nestjs/common';

const execAsync = promisify(exec);
const pipelineAsync = promisifyStream(pipeline);

const SOURCE_BUCKET = process.env.SOURCE_BUCKET || 'videos';
const PUBLIC_BUCKET = process.env.PUBLIC_BUCKET || 'public-videos';

/**
 * Определение высоты видео.
 */
async function getVideoHeight(inputFilePath: string): Promise<number> {
  const ffprobeCmd = `ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "${inputFilePath}"`;
  const { stdout } = await execAsync(ffprobeCmd);
  const height = parseInt(stdout.trim(), 10);
  if (isNaN(height)) {
    throw new Error('Unable to determine video height');
  }
  return height;
}

/**
 * Выбираем набор разрешений меньше исходного.
 */
function getTargetResolutions(originalHeight: number): number[] {
  const commonResolutions = [1080, 720, 480, 360];
  return commonResolutions.filter(r => r < originalHeight);
}

@Processor('video')
export class VideoProcessor {
  private readonly logger = new Logger(VideoProcessor.name);

  @Process('transcode')
  async transcodeVideo(job: Job<{ key: string }>): Promise<void> {
    const { key } = job.data;
    const fileName = path.basename(key);
    const inputFilePath = `/tmp/${fileName}`;

    this.logger.log(`Transcoding job started for key: ${key}`);

    // Скачиваение исходного файла из MiniO
    const getParams = { Bucket: SOURCE_BUCKET, Key: key };
    try {
      const response = await s3Client.send(new GetObjectCommand(getParams));
      if (!response.Body) {
        throw new Error('Empty response body');
      }
      const writeStream = fsSync.createWriteStream(inputFilePath);
      await pipelineAsync(response.Body as NodeJS.ReadableStream, writeStream);
      this.logger.log(`Downloaded file saved at ${inputFilePath}`);
    } catch (error: any) {
      this.logger.error(`Error downloading file ${key}: ${error.message}`);
      return;
    }

    // Определение исходного разрешения
    let originalHeight: number;
    try {
      originalHeight = await getVideoHeight(inputFilePath);
      this.logger.log(`Original video height: ${originalHeight}`);
    } catch (error: any) {
      this.logger.error(`Error determining video height for ${fileName}: ${error.message}`);
      await fs.unlink(inputFilePath);
      return;
    }

    // Получение целевых разрешений
    const targetResolutions = getTargetResolutions(originalHeight);
    if (targetResolutions.length === 0) {
      this.logger.log('No lower resolutions available; skipping transcoding.');
      await fs.unlink(inputFilePath);
      return;
    }

    // Генерируем новые видео при помощи ffmpeg.
    const outputMappings = targetResolutions.map((res) => {
      const outputFileName = `${path.parse(fileName).name}_${res}p.mp4`;
      const outputFilePath = `/tmp/${outputFileName}`;
      return { res, outputFileName, outputFilePath };
    });
    const ffmpegOutputs = outputMappings
      .map(({ res, outputFilePath }) => `-map 0:v -vf "scale=-2:${res}" "${outputFilePath}"`)
      .join(' ');
    const ffmpegCmd = `ffmpeg -i "${inputFilePath}" ${ffmpegOutputs}`;
    this.logger.log(`Running FFmpeg command: ${ffmpegCmd}`);

    try {
      await execAsync(ffmpegCmd);
      this.logger.log(`FFmpeg conversion completed.`);
    } catch (error: any) {
      this.logger.error(`Error running FFmpeg: ${error.message}`);
      await fs.unlink(inputFilePath);
      return;
    }

    // Загружаем полученные файлы в публичный бакет MiniO
    for (const mapping of outputMappings) {
      try {
        const fileContent = await fs.readFile(mapping.outputFilePath);
        const putParams = {
          Bucket: PUBLIC_BUCKET,
          Key: mapping.outputFileName,
          Body: fileContent,
          ACL: "public-read" as ObjectCannedACL,
        };
        await s3Client.send(new PutObjectCommand(putParams));
        this.logger.log(`Uploaded ${mapping.outputFileName} to bucket ${PUBLIC_BUCKET}`);
        await fs.unlink(mapping.outputFilePath);
      } catch (error: any) {
        this.logger.error(`Error uploading ${mapping.outputFileName}: ${error.message}`);
      }
    }

    await fs.unlink(inputFilePath);
    this.logger.log(`Transcoding job completed for key: ${key}`);
  }
}