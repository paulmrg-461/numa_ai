import { AppSession } from '@mentra/sdk';
import { VoiceAssistantUseCase } from '../../domain/use-cases/voice-assistant.use-case';
import { VisionAssistantUseCase } from '../../domain/use-cases/vision-assistant.use-case';

export enum SessionState {
  IDLE,
  LISTENING,
  PROCESSING
}

export class SessionHandler {
  private state: SessionState = SessionState.IDLE;

  constructor(
    private voiceUseCase: VoiceAssistantUseCase,
    private visionUseCase: VisionAssistantUseCase
  ) {}

  /**
   * Initializes the session and sets up the main transcription loop
   */
  setup(session: AppSession) {
    console.log('Initializing Numa Session Handler (Logging enabled)...');
    this.state = SessionState.IDLE;

    // Use a single persistent subscription for Spanish transcription
    session.events.onTranscriptionForLanguage('es-ES', async (data) => {
      // LOG TODO: Ver qué está llegando exactamente de las gafas
      console.log(`[DEBUG] Transcription received: "${data.text}" | isFinal: ${data.isFinal} | Current State: ${this.state}`);

      if (!data.text) return;

      const lowerText = data.text.toLowerCase();
      const textLength = lowerText.trim().length;

      // Prevent processing if it's too short (except for state transitions)
      if (textLength < 2) return;

      switch (this.state) {
        case SessionState.IDLE:
          if (lowerText.includes('numa')) {
            console.log('[STATE] Wake word "Numa" detected.');
            
            // Extract the command if it was said in the same breath (e.g., "Numa toma una foto")
            const commandPart = lowerText.split('numa')[1]?.trim();

            if (commandPart && commandPart.length > 2) {
              console.log(`[STATE] Immediate command detected: "${commandPart}"`);
              this.state = SessionState.PROCESSING;
              await this.processCommand(session, commandPart);
              return;
            }

            // If no immediate command, ask what's needed
            console.log('[STATE] No immediate command. Switching to LISTENING.');
            this.state = SessionState.LISTENING;
            session.layouts.showTextWall('¿Qué necesitas?');
            await session.audio.speak('¿Qué necesitas?');
          }
          break;

        case SessionState.LISTENING:
          if ((data as any).isFinal === false) return;

          console.log(`[STATE] Command detected in LISTENING: "${data.text}"`);
          this.state = SessionState.PROCESSING;
          await this.processCommand(session, lowerText);
          break;

        case SessionState.PROCESSING:
          if ((data as any).isFinal && (lowerText.includes('detente') || lowerText.includes('para'))) {
            await this.handleStop(session);
          }
          break;
      }
    });

    // Handle manual button press
    session.events.onButtonPress((data) => {
      if (data.buttonId === 'right' && data.pressType === 'short') {
        this.handleManualTrigger(session);
      }
    });

    // Handle double tap
    session.events.onTouchEvent('double_tap', async () => {
      await this.handleDoubleTap(session);
    });

    // Handle Webview messages
    session.events.onCustomMessage('webview_action', async (payload: any) => {
      console.log('Webview action received:', payload);
      if (payload.action === 'talk') {
        this.handleManualTrigger(session);
      } else if (payload.action === 'photo') {
        await this.handleDoubleTap(session);
      } else if (payload.action === 'stop') {
        await this.handleStop(session);
      }
    });
  }

  /**
   * Centralized command processing logic
   */
  private async processCommand(session: AppSession, text: string) {
    try {
      if (text.includes('detente') || text.includes('para')) {
        await this.handleStop(session);
        return;
      }

      const photoCommands = ['take a photo', 'toma una foto', 'toma foto', 'analiza esto', 'describe esto', 'qué ves', 'what do you see'];
      const isPhotoCommand = photoCommands.some(cmd => text.includes(cmd));

      if (isPhotoCommand) {
        await this.handleVisionRequest(session);
      } else {
        await this.handleVoiceRequest(session, text);
      }
    } catch (err) {
      console.error('[ERROR] Error during processing:', err);
    } finally {
      this.state = SessionState.IDLE;
      console.log('[STATE] Back to IDLE. Ready for "Numa".');
    }
  }

  private handleManualTrigger(session: AppSession) {
    if (this.state === SessionState.PROCESSING) return;
    this.state = SessionState.LISTENING;
    session.layouts.showTextWall('Escuchando...');
  }

  async handleButtonPress(session: AppSession) {
    this.handleManualTrigger(session);
  }

  /**
   * Stops all current activities (audio and visual)
   */
  async handleStop(session: AppSession) {
    console.log('Stop command received.');
    this.state = SessionState.IDLE;
    try {
      await session.audio.cancelAllRequests();
      session.layouts.showTextWall('Detenido.');
      setTimeout(() => {
        session.layouts.showTextWall('Numa ready.');
      }, 1500);
    } catch (error) {
      console.error('Error handling stop:', error);
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
      session.layouts.showTextWall('Fallo en el asistente de voz.');
    }
  }

  async handleVisionRequest(session: AppSession) {
    try {
      session.layouts.showTextWall('Capturando foto...');
      
      const photo = await session.camera.requestPhoto({
        size: 'medium',
        saveToGallery: false
      });

      if (!photo || !photo.buffer) {
        session.layouts.showTextWall('Error al capturar la foto.');
        return;
      }

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
    if (this.state === SessionState.PROCESSING) return;
    console.log('Double tap vision request...');
    this.state = SessionState.PROCESSING;
    await this.handleVisionRequest(session);
    this.state = SessionState.IDLE;
  }
}
