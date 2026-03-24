import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Mock the SDK BEFORE importing anything that uses it
vi.mock('@mentra/sdk', () => {
  const mockSession = {
    layouts: {
      showTextWall: vi.fn(),
    },
    events: {
      onTranscription: vi.fn(),
      onTranscriptionForLanguage: vi.fn(),
      onButtonPress: vi.fn(),
      onTouchEvent: vi.fn(),
      onCustomMessage: vi.fn(),
    },
    audio: {
      speak: vi.fn(),
      cancelAllRequests: vi.fn(),
    },
    camera: {
      requestPhoto: vi.fn(),
    },
    getSessionId: vi.fn().mockReturnValue('test-session'),
  };

  const mockAppServer = vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    getExpressApp: vi.fn().mockReturnValue({
      get: vi.fn(),
      use: vi.fn(),
    }),
  }));

  return {
    default: {
      AppServer: mockAppServer,
      AppSession: vi.fn().mockImplementation(() => mockSession),
    },
    AppServer: mockAppServer,
    AppSession: vi.fn().mockImplementation(() => mockSession),
  };
});

// 2. Import dependencies
import { voiceUseCase, visionUseCase, sessionHandler } from './index';
import { SessionState } from './presentation/handlers/session.handler';

// Mock global fetch
global.fetch = vi.fn();

describe('Numa AI MiniApp (Clean Architecture)', () => {
  let mockSession: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = {
      layouts: {
        showTextWall: vi.fn(),
      },
      events: {
        onTranscription: vi.fn(),
        onTranscriptionForLanguage: vi.fn(),
        onButtonPress: vi.fn(),
        onTouchEvent: vi.fn(),
        onCustomMessage: vi.fn(),
      },
      audio: {
        speak: vi.fn(),
        cancelAllRequests: vi.fn(),
      },
      camera: {
        requestPhoto: vi.fn(),
      },
    };
  });

  describe('SessionHandler Logic (Unified Loop)', () => {
    it('should initialize correctly and subscribe to es-ES', () => {
      sessionHandler.setup(mockSession);
      expect(mockSession.events.onTranscriptionForLanguage).toHaveBeenCalledWith('es-ES', expect.any(Function));
    });

    it('should stop all activities when "detente" is heard in IDLE state', async () => {
      let transcriptionHandler: any;
      mockSession.events.onTranscriptionForLanguage.mockImplementation((lang: string, handler: any) => {
        transcriptionHandler = handler;
        return vi.fn();
      });

      sessionHandler.setup(mockSession);
      
      // Simulate hearing "Numa detente"
      await transcriptionHandler({ text: 'Numa detente', isFinal: true });

      expect(mockSession.audio.cancelAllRequests).toHaveBeenCalled();
      expect(mockSession.layouts.showTextWall).toHaveBeenCalledWith('Detenido.');
    });

    it('should transition to LISTENING when "Numa" is heard', async () => {
      let transcriptionHandler: any;
      mockSession.events.onTranscriptionForLanguage.mockImplementation((lang: string, handler: any) => {
        transcriptionHandler = handler;
        return vi.fn();
      });

      sessionHandler.setup(mockSession);
      
      // Simulate hearing "Hola Numa"
      await transcriptionHandler({ text: 'Hola Numa', isFinal: true });

      expect(mockSession.layouts.showTextWall).toHaveBeenCalledWith('¿Sí? Te escucho...');
      // State check would require exposing the private state or checking logs
    });

    it('should process vision command when in LISTENING state', async () => {
      const mockPhoto = { buffer: Buffer.from('photo-data') };
      mockSession.camera.requestPhoto.mockResolvedValue(mockPhoto);
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ response: 'Photo description' }),
      });

      let transcriptionHandler: any;
      mockSession.events.onTranscriptionForLanguage.mockImplementation((lang: string, handler: any) => {
        transcriptionHandler = handler;
        return vi.fn();
      });

      sessionHandler.setup(mockSession);
      
      // 1. Wake up
      await transcriptionHandler({ text: 'Numa', isFinal: true });
      
      // 2. Command
      await transcriptionHandler({ text: 'Toma una foto', isFinal: true });

      expect(mockSession.layouts.showTextWall).toHaveBeenCalledWith('Capturando foto...');
      expect(mockSession.camera.requestPhoto).toHaveBeenCalled();
    });

    it('should handle Webview actions', async () => {
      let customMessageHandler: any;
      mockSession.events.onCustomMessage.mockImplementation((action: string, handler: any) => {
        if (action === 'webview_action') customMessageHandler = handler;
      });

      sessionHandler.setup(mockSession);
      
      await customMessageHandler({ action: 'talk' });
      expect(mockSession.layouts.showTextWall).toHaveBeenCalledWith('Escuchando...');

      await customMessageHandler({ action: 'stop' });
      expect(mockSession.audio.cancelAllRequests).toHaveBeenCalled();
    });
  });
});
