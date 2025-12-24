import { Express } from 'express';
import express from 'express';
import path from 'path';
import cameraRoutes from './cameras';
import webrtcRoutes from './webrtc';
import alexaRoutes from './alexa';
import configRoutes from './config';

export function setupRoutes(app: Express): void {
  // API routes
  app.use('/api', cameraRoutes);
  app.use('/api', webrtcRoutes);
  app.use('/api', configRoutes);
  app.use('/alexa', alexaRoutes);

  // Serve static dashboard files
  const publicPath = path.join(process.cwd(), 'public');
  app.use(express.static(publicPath));

  // Dashboard route - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    // Skip API and Alexa routes
    if (req.path.startsWith('/api') || req.path.startsWith('/alexa')) {
      return;
    }

    const indexPath = path.join(publicPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        res.status(404).send('Dashboard not built. Run: cd dashboard && bun install && bun run build');
      }
    });
  });
}
