import { Queue } from 'bull';
export declare class VideoController {
    private videoQueue;
    private readonly logger;
    constructor(videoQueue: Queue);
    handleNewVideo(body: any): Promise<{
        status: string;
    }>;
}
