import { z } from 'zod';

const configSchema = z.object({
    // Server
    port: z.number().default(3000),
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),

    // JWT
    jwtSecret: z.string().min(32),
    jwtExpiry: z.string().default('60s'),

    // DVR/NVR
    dvrUsername: z.string().default('admin'),
    dvrPassword: z.string(),
    dvrIp: z.string().optional(),
    dvrPort: z.number().default(554),

    // RTSP
    rtspTransport: z.enum(['tcp', 'udp']).default('tcp'),
    rtspTimeout: z.number().default(5000),

    // WebRTC / go2rtc
    stunServer: z.string().default('stun:stun.l.google.com:19302'),
    turnServer: z.string().optional(),
    turnUsername: z.string().optional(),
    turnPassword: z.string().optional(),
    go2rtcApi: z.string().default('http://localhost:1984'),
    go2rtcEnabled: z.boolean().default(false),

    // Cloudflare
    cloudflareUrl: z.string().optional(),
    cloudflareToken: z.string().optional(),

    // Discovery
    autoDiscover: z.boolean().default(true),
    discoveryInterval: z.number().default(300000), // 5 minutes
    maxCameras: z.number().default(16),

    // Logging
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

    // CORS
    corsOrigins: z.array(z.string()).default(['*'])
});

type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
    const rawConfig = {
        port: parseInt(process.env.PORT || '3000', 10),
        nodeEnv: process.env.NODE_ENV || 'development',
        jwtSecret: process.env.JWT_SECRET || 'change-this-secret-key-in-production-min-32-chars',
        jwtExpiry: process.env.JWT_EXPIRY || '60s',
        dvrUsername: process.env.DVR_USERNAME || 'admin',
        dvrPassword: process.env.DVR_PASSWORD || '',
        dvrIp: process.env.DVR_IP,
        dvrPort: parseInt(process.env.DVR_PORT || '554', 10),
        rtspTransport: process.env.RTSP_TRANSPORT || 'tcp',
        rtspTimeout: parseInt(process.env.RTSP_TIMEOUT || '5000', 10),
        stunServer: process.env.STUN_SERVER || 'stun:stun.l.google.com:19302',
        turnServer: process.env.TURN_SERVER,
        turnUsername: process.env.TURN_USERNAME,
        turnPassword: process.env.TURN_PASSWORD,
        go2rtcApi: process.env.GO2RTC_API || 'http://localhost:1984',
        go2rtcEnabled: process.env.GO2RTC_ENABLED === 'true',
        cloudflareUrl: process.env.CLOUDFLARE_TUNNEL_URL,
        cloudflareToken: process.env.CLOUDFLARE_TUNNEL_TOKEN,
        autoDiscover: process.env.AUTO_DISCOVER !== 'false',
        discoveryInterval: parseInt(process.env.DISCOVERY_INTERVAL || '300000', 10),
        maxCameras: parseInt(process.env.MAX_CAMERAS || '16', 10),
        logLevel: process.env.LOG_LEVEL || 'info',
        corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*']
    };

    return configSchema.parse(rawConfig);
}

export const config = loadConfig();
