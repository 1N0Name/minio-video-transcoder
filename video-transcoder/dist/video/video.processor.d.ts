import { Job } from 'bull';
export declare class VideoProcessor {
    private readonly logger;
    transcodeVideo(job: Job<{
        key: string;
    }>): Promise<void>;
}
