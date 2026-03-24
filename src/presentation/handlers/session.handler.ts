import { AppSession } from '@mentra/sdk';
import { VoiceAssistantUseCase } from '../../domain/use-cases/voice-assistant.use-case';
import { VisionAssistantUseCase } from '../../domain/use-cases/vision-assistant.use-case';

export class SessionHandler {
  constructor(
    private voiceUseCase: VoiceAssistantUseCase,
    private visionUseCase: VisionAssistantUseCase
  ) {}

  async handleButtonPress(session: AppSession) {
    console.log('Manual voice interaction started...');
    await this.startListening(session);
  }

  /**
   * Main entry point for starting the listening and processing flow
   */
  private async startListening(session: AppSession) {
    try {
      session.layouts.showTextWall('Escuchando...');

      const cleanup = session.events.onTranscription(async (data) => {
        if (!data.text) return;
        
        const lowerText = data.text.toLowerCase();
        
        // 1. Immediate check for stop command
        if (lowerText.includes('detente') || lowerText.includes('para')) {
          cleanup();
          await this.handleStop(session);
          return;
        }

        cleanup();
        console.log(`Input detectado: ${data.text}`);

        // 2. Logic to detect vision commands
        const photoCommands = ['take a photo', 'toma una foto', 'analiza esto', 'describe esto', 'qué ves', 'what do you see'];
        const isPhotoCommand = photoCommands.some(cmd => lowerText.includes(cmd));

        if (isPhotoCommand) {
          await this.handleVisionRequest(session);
        } else {
          await this.handleVoiceRequest(session, data.text);
        }
      });
    } catch (error) {
      console.error('Listening Error:', error);
      session.layouts.showTextWall('Error al escuchar.');
    }
  }

  /**
   * Stops all current activities (audio and visual)
   */
  async handleStop(session: AppSession) {
    console.log('Stop command received. Clearing all activities...');
    try {
      // 1. Stop any ongoing speech
      await session.audio.cancelAllRequests();
      
      // 2. Clear the display
      session.layouts.showTextWall('Detenido.');
      
      // 3. Brief delay and clear display completely
      setTimeout(() => {
        session.layouts.showTextWall('Numa ready.');
      }, 1500);
    } catch (error) {
      console.error('Error handling stop:', error);
    }
  }

  /**
   * Handler for continuous background transcription to detect wake word
   */
  setupWakeWordDetection(session: AppSession) {
    console.log('Wake word detection ("Numa") active...');
    
    session.events.onTranscription(async (data) => {
      if (!data.text) return;
      
      const lowerText = data.text.toLowerCase();

      // Check for "Numa detente" in background
      if (lowerText.includes('numa') && (lowerText.includes('detente') || lowerText.includes('para'))) {
        await this.handleStop(session);
        return;
      }

      // Detect wake word "Numa"
      if (lowerText.includes('numa')) {
        console.log('Wake word "Numa" detected!');
        
        // Visual/Audio Feedback
        session.layouts.showTextWall('¿Sí? Te escucho...');
        // Small delay to avoid capturing the wake word itself in the next processing
        setTimeout(() => {
          this.startListening(session);
        }, 500);
      }
    });
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
      session.layouts.showTextWall('Capturando foto...');
      
      // Use requestPhoto instead of takePhoto as per SDK v2.1.29
      const photo = await session.camera.requestPhoto({
        size: 'medium',
        saveToGallery: false
      });

      if (!photo || !photo.buffer) {
        session.layouts.showTextWall('Error al capturar la foto.');
        return;
      }

      // Convert Buffer to base64
      const base64Image = photo.buffer.toString('base64');

      const response = await this.visionUseCase.execute(base64Image, (msg) => {
        session.layouts.showTextWall(msg);
      });

      console.log(`Vision Response: ${response}`);
      session.layouts.showTextWall(response);
      await session.audio.speak(response);
    } catch (error) {
      console.error('Vision Assistant Error:', error);
      session.layouts.showTextWall('Fallo en el análisis de visión.');
    }
  }

  async handleDoubleTap(session: AppSession) {
    console.log('Double tap vision request...');
    await this.handleVisionRequest(session);
  }
}
