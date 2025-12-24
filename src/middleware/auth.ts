import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from './errorHandler';

export interface JWTPayload {
    cameraId: string;
    iat?: number;
    exp?: number;
}

declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}

export function authenticateToken(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const token = req.query.token as string || req.headers.authorization?.split(' ')[1];

    if (!token) {
        throw new AppError(401, 'Authentication token required');
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
        req.user = decoded;
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new AppError(401, 'Token expired');
        }
        if (error instanceof jwt.JsonWebTokenError) {
            throw new AppError(401, 'Invalid token');
        }
        throw new AppError(401, 'Authentication failed');
    }
}

export function generateToken(cameraId: string): string {
    return jwt.sign(
        { cameraId },
        config.jwtSecret,
        { expiresIn: config.jwtExpiry }
    );
}
