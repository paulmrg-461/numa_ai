import { AppSession } from '@mentra/sdk';
import { VoiceAssistantUseCase } from '../../domain/use-cases/voice-assistant.use-case';
import { VisionAssistantUseCase } from '../../domain/use-cases/vision-assistant.use-case';

export class SessionHandler {
  constructor(
    private voiceUseCase: VoiceAssistantUseCase,
    private visionUseCase: VisionAssistantUseCase
  ) {}

  async handleButtonPress(session: AppSession) {
    console.log('Voice interaction started...');
    try {
      session.layouts.showTextWall('Listening...');

      const cleanup = session.events.onTranscription(async (data) => {
        if (!data.text) return;
        cleanup();
        console.log(`User query: ${data.text}`);

        // Logic to detect "take a photo" or similar command
        const lowerText = data.text.toLowerCase();
        const photoCommands = ['take a photo', 'toma una foto', 'analiza esto', 'describe esto', 'qué ves', 'what do you see'];
        
        const isPhotoCommand = photoCommands.some(cmd => lowerText.includes(cmd));

        if (isPhotoCommand) {
          await this.handleVisionRequest(session);
        } else {
          await this.handleVoiceRequest(session, data.text);
        }
      });
    } catch (error) {
      console.error('Session Error:', error);
      session.layouts.showTextWall('An error occurred.');
    }
  }

  async handleVoiceRequest(session: AppSession, text: string) {
    try {
      const response = await this.voiceUseCase.execute(text, (msg) => {
        session.layouts.showTextWall(msg);
      });

      console.log(`AI Response: ${response}`);
      session.layouts.showTextWall(response);
      await session.audio.speak(response);
    } catch (error) {
      console.error('Voice Assistant Error:', error);
      session.layouts.showTextWall('Voice assistant failed.');
    }
  }

  async handleVisionRequest(session: AppSession) {
    try {
      session.layouts.showTextWall('Capturing photo...');
      const photo = await session.camera.takePhoto();

      if (!photo || !photo.base64) {
        session.layouts.showTextWall('Failed to capture photo.');
        return;
      }

      const response = await this.visionUseCase.execute(photo.base64, (msg) => {
        session.layouts.showTextWall(msg);
      });

      console.log(`Vision Response: ${response}`);
      session.layouts.showTextWall(response);
      await session.audio.speak(response);
    } catch (error) {
      console.error('Vision Assistant Error:', error);
      session.layouts.showTextWall('Vision analysis failed.');
    }
  }

  async handleDoubleTap(session: AppSession) {
    console.log('Double tap vision request...');
    await this.handleVisionRequest(session);
  }
}
