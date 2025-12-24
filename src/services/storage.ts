import { promises as fs } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';
import { Camera } from '../types';

export class StorageService {
    private static instance: StorageService;
    private dataDir: string;
    private camerasFile: string;

    private constructor() {
        this.dataDir = join(process.cwd(), 'data');
        this.camerasFile = join(this.dataDir, 'cameras.json');
    }

    static getInstance(): StorageService {
        if (!StorageService.instance) {
            StorageService.instance = new StorageService();
        }
        return StorageService.instance;
    }

    /**
     * Ensure the data directory exists
     */
    private async ensureDataDir(): Promise<void> {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });
        } catch (error) {
            logger.error('Failed to create data directory:', error);
        }
    }

    /**
     * Load cameras from persistent storage
     */
    async loadCameras(): Promise<Camera[]> {
        try {
            await this.ensureDataDir();

            const data = await fs.readFile(this.camerasFile, 'utf-8');
            const cameras = JSON.parse(data) as Camera[];

            // Convert date strings back to Date objects
            cameras.forEach(camera => {
                if (camera.lastSeen) {
                    camera.lastSeen = new Date(camera.lastSeen);
                }
            });

            logger.info(`Loaded ${cameras.length} cameras from storage`);
            return cameras;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                logger.info('No cameras file found, starting fresh');
                return [];
            }
            logger.error('Failed to load cameras:', error);
            return [];
        }
    }

    /**
     * Save cameras to persistent storage
     */
    async saveCameras(cameras: Camera[]): Promise<void> {
        try {
            await this.ensureDataDir();

            const data = JSON.stringify(cameras, null, 2);
            await fs.writeFile(this.camerasFile, data, 'utf-8');

            logger.debug(`Saved ${cameras.length} cameras to storage`);
        } catch (error) {
            logger.error('Failed to save cameras:', error);
            throw error;
        }
    }

    /**
     * Clear all cameras from storage
     */
    async clearCameras(): Promise<void> {
        try {
            await fs.unlink(this.camerasFile);
            logger.info('Cleared cameras from storage');
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                logger.error('Failed to clear cameras:', error);
            }
        }
    }
}
