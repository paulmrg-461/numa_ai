import sdk from '@mentra/sdk';
const { AppServer, AppSession } = (sdk as any).default || sdk;
import * as dotenv from 'dotenv';

dotenv.config();

export const API_URL = process.env.API_URL || 'https://pq48nm3b-1717.use2.devtunnels.ms/api/v1/query';
export const ANALYZE_IMAGE_URL = process.env.ANALYZE_IMAGE_URL || 'https://pq48nm3b-1717.use2.devtunnels.ms/api/v1/analyze-image';
export const APP_ID = process.env.APP_ID || 'com.iaaplicada.numa-ai';
export const APP_NAME = process.env.APP_NAME || 'Numa AI';

/**
 * Logic to handle button press and API interaction
 */
export async function handleButtonPress(session: AppSession) {
  console.log('Voice capture started...');
  
  try {
    // 1. Show processing message
    session.layouts.showTextWall('Listening...');

    // 2. Setup one-time transcription handler
    const cleanup = session.events.onTranscription(async (data) => {
      if (!data.text) return;
      
      cleanup(); // Only handle first transcript
      console.log(`Transcript: ${data.text}`);
      session.layouts.showTextWall('Processing...');

      try {
        // 3. Send transcription to numa_ai_api
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ query: data.text }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        const result = (await response.json()) as { response: string };

        // 4. Display and speak the response
        if (result.response) {
          console.log(`AI Response: ${result.response}`);
          session.layouts.showTextWall(result.response);
          await session.audio.speak(result.response);
        } else {
          session.layouts.showTextWall('No response from AI.');
        }
      } catch (error) {
        console.error('API Error:', error);
        session.layouts.showTextWall('Connection error with Numa AI');
      }
    });

  } catch (error) {
    console.error('Integration Error:', error);
    session.layouts.showTextWall('Error starting capture');
  }
}

/**
 * App Server implementation
 */
export class NumaAppServer extends AppServer {
  constructor() {
    super({
      packageName: APP_ID,
      apiKey: process.env.MENTRAOS_API_KEY || 'local_dev_key',
      port: Number(process.env.PORT) || 3000,
    });
  }

  protected async onSession(session: AppSession, sessionId: string, userId: string) {
    console.log(`New session: ${sessionId} for user: ${userId}`);
    
    session.layouts.showTextWall(`${APP_NAME} ready.`);

    // Register button press handler
    session.events.onButtonPress((data) => {
      if (data.buttonId === 'right' && data.pressType === 'short') {
        handleButtonPress(session);
      }
    });

    // Register gesture handler for vision (double tap to analyze scene)
    session.events.onTouchEvent('double_tap', async () => {
      console.log('Vision request started (double tap)...');
      try {
        session.layouts.showTextWall('Capturing image...');
        
        // 1. Capture photo from glasses
        const photo = await session.camera.takePhoto();
        
        if (!photo || !photo.base64) {
          session.layouts.showTextWall('Failed to capture photo.');
          return;
        }

        session.layouts.showTextWall('Analyzing scene...');

        // 2. Send to analyze-image endpoint
        const response = await fetch(ANALYZE_IMAGE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            image: photo.base64,
            prompt: 'Describe what you see in this image briefly and clearly.'
          }),
        });

        if (!response.ok) {
          throw new Error(`Vision API error: ${response.statusText}`);
        }

        const result = (await response.json()) as { response: string };

        // 3. Display and speak result
        if (result.response) {
          console.log(`Vision AI Response: ${result.response}`);
          session.layouts.showTextWall(result.response);
          await session.audio.speak(result.response);
        } else {
          session.layouts.showTextWall('Could not analyze image.');
        }

      } catch (error) {
        console.error('Vision Integration Error:', error);
        session.layouts.showTextWall('Vision connection error');
      }
    });
  }
}

// Only run if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const server = new NumaAppServer();
  server.start().then(() => {
    console.log(`${APP_NAME} server started on port ${process.env.PORT || 3000}`);
  });
}

