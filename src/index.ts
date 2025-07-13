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
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? (() => { throw new Error('OPENAI_API_KEY is not set in .env file'); })();
const ROBOFLOW_API_KEY = process.env.ROBOFLOW_API_KEY ?? (() => { throw new Error('ROBOFLOW_API_KEY is not set in .env file'); })();
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

          const message = `Your win probability is ${result.win_probability} percent.`;
          await session.audio.stopAudio();
          await session.audio.speak(message);
          await session.audio.speak(result.tip);

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
    /* ───── Step 1 – Roboflow HTTP API ───── */
    const apiBase = "https://pokerclass.roboflow.cloud";
    const modelPath = "playing-cards-ow27d/4";
    const roboflowURL = `${apiBase}/${modelPath}?` + new URLSearchParams({
      api_key: ROBOFLOW_API_KEY,
      image: photoUrl
    }).toString();

    this.logger.info(`Roboflow URL: ${roboflowURL}`);

    const rfRes = await fetch(roboflowURL);
    if (!rfRes.ok) {
      const errText = await rfRes.text().catch(() => "");
      throw new Error(`Roboflow API error: ${rfRes.status} ${rfRes.statusText} - ${errText}`);
    }

    const rfJson = await rfRes.json();
    this.logger.info(`Roboflow raw response: ${JSON.stringify(rfJson)}`);

    // Extract and deduplicate class labels
    const rawPredictions = Array.isArray(rfJson.predictions) ? rfJson.predictions : [];
    const classes = [...new Set(rawPredictions.map(p => p.class).filter(c => typeof c === "string"))];

    if (classes.length !== 2) {
      throw new Error(
        `Expected 2 distinct card classes.\nCards: ${JSON.stringify(classes)}\nFull response: ${JSON.stringify(rfJson)}`
      );
    }

    /* ───── Step 2 – OpenAI GPT API ───── */
    const openaiPayload = {
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: "You are an intelligent poker assistant for newbie players. You have an image of my hand, pre-flop."
        },
        {
          role: "user",
          content: `My hand is ${classes.join(" and ")}. Return to me a JSON file in the format: {win_probability: 0-100,tip: 
                    "a 1-sentence advice to be read out loud to the player. Don't use any emojis or special characters."}`
        }
      ]
    };

    this.logger.info(`[OpenAI] Request payload: ${JSON.stringify(openaiPayload, null, 2)}`);

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(openaiPayload)
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text().catch(() => "");
      this.logger.error(`[OpenAI] Error ${openaiRes.status} ${openaiRes.statusText}`);
      this.logger.error(`[OpenAI] Response body: ${errText}`);
      throw new Error(`OpenAI API error: ${openaiRes.status} ${openaiRes.statusText} - ${errText}`);
    }

    const openaiJson = await openaiRes.json();
    const responseText = openaiJson.choices?.[0]?.message?.content?.trim();

    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch (err) {
      this.logger.error(`[OpenAI] Invalid JSON response: ${responseText}`);
      throw new Error(`Failed to parse OpenAI response as JSON: ${responseText}`);
    }

    return {
      win_probability: Math.max(0, Math.min(100, parsed.win_probability)),
      tip: parsed.tip
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
