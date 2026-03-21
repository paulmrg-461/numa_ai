import { MentraApp, GlassesIO } from '@mentra/sdk';
import * as dotenv from 'dotenv';

dotenv.config();

export const API_URL = process.env.API_URL || 'http://localhost:3000/api/v1/query';
export const APP_ID = process.env.APP_ID || 'numa-ai-assistant';
export const APP_NAME = process.env.APP_NAME || 'Numa AI Assistant';

/**
 * Logic to handle button press and API interaction
 */
export async function handleButtonPress() {
  console.log('Voice capture started...');
  
  try {
    // 1. Capture audio and get transcription from MentraOS
    const transcript = await GlassesIO.captureTranscription();
    
    if (!transcript) {
      await GlassesIO.displayMessage('I didn\'t catch that. Please try again.');
      return;
    }

    console.log(`Transcript: ${transcript}`);
    await GlassesIO.displayMessage('Processing...');

    // 2. Send transcription to numa_ai_api
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ query: transcript }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = (await response.json()) as { response: string };

    // 3. Display and optionally speak the response
    if (data.response) {
      console.log(`AI Response: ${data.response}`);
      await GlassesIO.displayMessage(data.response);
      await GlassesIO.speak(data.response);
    } else {
      await GlassesIO.displayMessage('No response from AI.');
    }

  } catch (error) {
    console.error('Integration Error:', error);
    await GlassesIO.displayMessage('Connection error with Numa AI');
  }
}

/**
 * App initialization
 */
export function createApp() {
  const app = new MentraApp({
    id: APP_ID,
    name: APP_NAME,
  });

  app.onButtonPress('right', handleButtonPress);

  app.on('start', () => {
    console.log(`${APP_NAME} is running!`);
    GlassesIO.displayMessage(`${APP_NAME} ready.`);
  });

  return app;
}

// Only run if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const app = createApp();
  app.run();
}
