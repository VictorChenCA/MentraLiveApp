import { AppServer, AppSession, ViewType, PhotoData } from '@mentra/sdk';
import { Request, Response } from 'express';
import * as ejs from 'ejs';
import * as path from 'path';

interface StoredPhoto {
  requestId: string;
  buffer: Buffer;
  timestamp: Date;
  userId: string;
  mimeType: string;
  filename: string;
  size: number;
}

const PACKAGE_NAME = process.env.PACKAGE_NAME ?? (() => { throw new Error('PACKAGE_NAME is not set in .env file'); })();
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY ?? (() => { throw new Error('MENTRAOS_API_KEY is not set in .env file'); })();
const PORT = parseInt(process.env.PORT || '3000');

class PokerCoachMentraApp extends AppServer {
  private static readonly DEMO_USER_ID = "demo";

  private photos: Map<string, StoredPhoto> = new Map();
  private latestPhotoTimestamp: Map<string, number> = new Map();
  private sessionStates: Map<string, "idle" | "awaiting_photo"> = new Map();

  constructor() {
    super({
      packageName: PACKAGE_NAME,
      apiKey: MENTRAOS_API_KEY,
      port: PORT,
    });
    this.setupWebviewRoutes();
  }

  protected async onSession(session: AppSession, sessionId: string, userId: string): Promise<void> {
    userId = PokerCoachMentraApp.DEMO_USER_ID;
    this.logger.info(`Session started for user ${userId}`);
    this.sessionStates.set(userId, "idle");

    session.events.onButtonPress(async (button) => {
      if (button.pressType !== 'short') return;

      const state = this.sessionStates.get(userId);

      if (state === "idle") {
        await session.audio.stopAudio();
        await session.audio.speak("Ready. Show me your hand and press the button again to take a photo.");
        this.sessionStates.set(userId, "awaiting_photo");
        return;
      }

      if (state === "awaiting_photo") {
        try {
          const photo = await session.camera.requestPhoto();
          this.logger.info(`Photo taken for user ${userId}, timestamp: ${photo.timestamp}`);

          this.cachePhoto(photo, userId);
          const photoUrl = `${this.getServerUrl()}/api/photo/${photo.requestId}`;

          const result = await this.fetchHandAnalysis(photoUrl);

          const message = `Your win probability is ${result.win_probability} percent. ${result.tip}`;
          await session.audio.stopAudio();
          await session.audio.speak(message);

        } catch (error) {
          this.logger.error(`Error during hand analysis: ${error}`);
          await session.audio.stopAudio();
          await session.audio.speak("Sorry, there was an error analyzing your hand.");
        }

        this.sessionStates.set(userId, "idle");
      }
    });
  }

  protected async onStop(sessionId: string, userId: string, reason: string): Promise<void> {
    userId = PokerCoachMentraApp.DEMO_USER_ID;
    this.logger.info(`Session stopped for user ${userId}, reason: ${reason}`);
    this.sessionStates.delete(userId);
  }

  private async fetchHandAnalysis(photoUrl: string): Promise<{ win_probability: number; tip: string }> {
    const response = await fetch('https://serverless.roboflow.com/infer/workflows/mentra-live-hackathon/detect-and-classify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: 'b9R5Pk1ktGB31ClFhAfS',
        inputs: {
          image: {
            type: 'url',
            value: photoUrl
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Roboflow API error: ${response.statusText}`);
    }

    const result = await response.json();

    return {
      win_probability: result.predictions?.[0]?.win_probability ?? 0,
      tip: result.predictions?.[0]?.tip ?? "No tip available."
    };
  }

  private async cachePhoto(photo: PhotoData, userId: string) {
    userId = PokerCoachMentraApp.DEMO_USER_ID;

    const cachedPhoto: StoredPhoto = {
      requestId: photo.requestId,
      buffer: photo.buffer,
      timestamp: photo.timestamp,
      userId: userId,
      mimeType: photo.mimeType,
      filename: photo.filename,
      size: photo.size
    };

    this.photos.set(userId, cachedPhoto);
    this.latestPhotoTimestamp.set(userId, cachedPhoto.timestamp.getTime());
    this.logger.info(`Photo cached for user ${userId}, timestamp: ${cachedPhoto.timestamp}`);
  }

  private setupWebviewRoutes(): void {
    const app = this.getExpressApp();
    const DEMO_USER_ID = PokerCoachMentraApp.DEMO_USER_ID;

    app.get('/api/latest-photo', (req: any, res: any) => {
      const userId = DEMO_USER_ID;
      const photo = this.photos.get(userId);
      if (!photo) {
        res.status(404).json({ error: 'No photo available' });
        return;
      }
      res.json({
        requestId: photo.requestId,
        timestamp: photo.timestamp.getTime(),
        hasPhoto: true
      });
    });

    app.get('/api/photo/:requestId', (req: any, res: any) => {
      const userId = DEMO_USER_ID;
      const requestId = req.params.requestId;
      const photo = this.photos.get(userId);
      if (!photo || photo.requestId !== requestId) {
        res.status(404).json({ error: 'Photo not found' });
        return;
      }
      res.set({
        'Content-Type': photo.mimeType,
        'Cache-Control': 'no-cache'
      });
      res.send(photo.buffer);
    });

    app.get('/webview', async (req: any, res: any) => {
      const templatePath = path.join(process.cwd(), 'views', 'photo-viewer.ejs');
      const html = await ejs.renderFile(templatePath, {});
      res.send(html);
    });
  }

  private getServerUrl(): string {
    const protocol = process.env.PUBLIC_URL?.startsWith('https') ? 'https' : 'http';
    return process.env.PUBLIC_URL || `${protocol}://localhost:${PORT}`;
  }
}

const app = new PokerCoachMentraApp();
app.start().catch(console.error);
