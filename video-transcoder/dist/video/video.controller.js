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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var VideoController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoController = void 0;
const common_1 = require("@nestjs/common");
const bull_1 = require("@nestjs/bull");
let VideoController = VideoController_1 = class VideoController {
    videoQueue;
    logger = new common_1.Logger(VideoController_1.name);
    constructor(videoQueue) {
        this.videoQueue = videoQueue;
    }
    async handleNewVideo(body) {
        let key;
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
};
exports.VideoController = VideoController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VideoController.prototype, "handleNewVideo", null);
exports.VideoController = VideoController = VideoController_1 = __decorate([
    (0, common_1.Controller)('new_video'),
    __param(0, (0, bull_1.InjectQueue)('video')),
    __metadata("design:paramtypes", [Object])
], VideoController);
//# sourceMappingURL=video.controller.js.map