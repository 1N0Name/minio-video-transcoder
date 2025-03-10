"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var VideoProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const child_process_1 = require("child_process");
const util_1 = require("util");
const path = require("path");
const fs = require("fs/promises");
const fsSync = require("fs");
const stream_1 = require("stream");
const util_2 = require("util");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_client_config_1 = require("../s3/s3-client.config");
const common_1 = require("@nestjs/common");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const pipelineAsync = (0, util_2.promisify)(stream_1.pipeline);
const SOURCE_BUCKET = process.env.SOURCE_BUCKET || 'videos';
const PUBLIC_BUCKET = process.env.PUBLIC_BUCKET || 'public-videos';
async function getVideoHeight(inputFilePath) {
    const ffprobeCmd = `ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "${inputFilePath}"`;
    const { stdout } = await execAsync(ffprobeCmd);
    const height = parseInt(stdout.trim(), 10);
    if (isNaN(height)) {
        throw new Error('Unable to determine video height');
    }
    return height;
}
function getTargetResolutions(originalHeight) {
    const commonResolutions = [1080, 720, 480, 360];
    return commonResolutions.filter(r => r < originalHeight);
}
let VideoProcessor = VideoProcessor_1 = class VideoProcessor {
    logger = new common_1.Logger(VideoProcessor_1.name);
    async transcodeVideo(job) {
        const { key } = job.data;
        const fileName = path.basename(key);
        const inputFilePath = `/tmp/${fileName}`;
        this.logger.log(`Transcoding job started for key: ${key}`);
        const getParams = { Bucket: SOURCE_BUCKET, Key: key };
        try {
            const response = await s3_client_config_1.default.send(new client_s3_1.GetObjectCommand(getParams));
            if (!response.Body) {
                throw new Error('Empty response body');
            }
            const writeStream = fsSync.createWriteStream(inputFilePath);
            await pipelineAsync(response.Body, writeStream);
            this.logger.log(`Downloaded file saved at ${inputFilePath}`);
        }
        catch (error) {
            this.logger.error(`Error downloading file ${key}: ${error.message}`);
            return;
        }
        let originalHeight;
        try {
            originalHeight = await getVideoHeight(inputFilePath);
            this.logger.log(`Original video height: ${originalHeight}`);
        }
        catch (error) {
            this.logger.error(`Error determining video height for ${fileName}: ${error.message}`);
            await fs.unlink(inputFilePath);
            return;
        }
        const targetResolutions = getTargetResolutions(originalHeight);
        if (targetResolutions.length === 0) {
            this.logger.log('No lower resolutions available; skipping transcoding.');
            await fs.unlink(inputFilePath);
            return;
        }
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
        }
        catch (error) {
            this.logger.error(`Error running FFmpeg: ${error.message}`);
            await fs.unlink(inputFilePath);
            return;
        }
        for (const mapping of outputMappings) {
            try {
                const fileContent = await fs.readFile(mapping.outputFilePath);
                const putParams = {
                    Bucket: PUBLIC_BUCKET,
                    Key: mapping.outputFileName,
                    Body: fileContent,
                    ACL: "public-read",
                };
                await s3_client_config_1.default.send(new client_s3_1.PutObjectCommand(putParams));
                this.logger.log(`Uploaded ${mapping.outputFileName} to bucket ${PUBLIC_BUCKET}`);
                await fs.unlink(mapping.outputFilePath);
            }
            catch (error) {
                this.logger.error(`Error uploading ${mapping.outputFileName}: ${error.message}`);
            }
        }
        await fs.unlink(inputFilePath);
        this.logger.log(`Transcoding job completed for key: ${key}`);
    }
};
exports.VideoProcessor = VideoProcessor;
__decorate([
    (0, bull_1.Process)('transcode'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VideoProcessor.prototype, "transcodeVideo", null);
exports.VideoProcessor = VideoProcessor = VideoProcessor_1 = __decorate([
    (0, bull_1.Processor)('video')
], VideoProcessor);
//# sourceMappingURL=video.processor.js.map