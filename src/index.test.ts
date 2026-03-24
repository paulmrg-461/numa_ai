import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Mock the SDK BEFORE importing anything that uses it
vi.mock('@mentra/sdk', () => {
  const mockSession = {
    layouts: {
      showTextWall: vi.fn(),
    },
    events: {
      onTranscription: vi.fn(),
      onButtonPress: vi.fn(),
      onTouchEvent: vi.fn(),
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
import { voiceUseCase, visionUseCase, sessionHandler, server } from './index';
import { NumaAppServer } from './presentation/server/numa-server';

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
        onButtonPress: vi.fn(),
        onTouchEvent: vi.fn(),
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

  describe('Vision Analysis', () => {
    it('should capture photo and call analyze-image API on double tap', async () => {
      const mockPhoto = { buffer: Buffer.from('base64-image-data') };
      const mockApiResponse = { response: 'Scene description' };
      
      let touchHandler: any;
      mockSession.events.onTouchEvent.mockImplementation((gesture: string, handler: any) => {
        if (gesture === 'double_tap') touchHandler = handler;
      });

      mockSession.camera.requestPhoto.mockResolvedValue(mockPhoto);
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });

      const server = new NumaAppServer(sessionHandler);
      // Use the prototype to access the protected method
      await (NumaAppServer.prototype as any).onSession.call(server, mockSession, 'id', 'user');
      
      await touchHandler();

      expect(mockSession.layouts.showTextWall).toHaveBeenCalledWith('Capturando foto...');
      expect(mockSession.camera.requestPhoto).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('analyze-image'), expect.objectContaining({
        method: 'POST',
      }));
      expect(mockSession.layouts.showTextWall).toHaveBeenCalledWith('Scene description');
      expect(mockSession.audio.speak).toHaveBeenCalledWith('Scene description');
    });
  });

  describe('Voice Interaction', () => {
    it('should process regular queries via VoiceAssistantUseCase', async () => {
      const mockApiResponse = { response: 'This is a voice answer' };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });

      const response = await voiceUseCase.execute('What time is it?', vi.fn());
      expect(response).toBe('This is a voice answer');
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('query'), expect.any(Object));
    });
  });

  describe('Vision Interaction', () => {
    it('should process images via VisionAssistantUseCase', async () => {
      const mockApiResponse = { response: 'I see a computer' };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });

      const response = await visionUseCase.execute('base64-data', vi.fn());
      expect(response).toBe('I see a computer');
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('analyze-image'), expect.any(Object));
    });
  });

  describe('SessionHandler Logic', () => {
    it('should stop all activities when "detente" is heard', async () => {
      let transcriptionHandler: any;
      mockSession.events.onTranscription.mockImplementation((handler: any) => {
        transcriptionHandler = handler;
        return vi.fn();
      });

      sessionHandler.setupWakeWordDetection(mockSession);
      
      // Simulate hearing "Numa detente"
      await transcriptionHandler({ text: 'Numa detente' });

      expect(mockSession.audio.cancelAllRequests).toHaveBeenCalled();
      expect(mockSession.layouts.showTextWall).toHaveBeenCalledWith('Detenido.');
    });

    it('should trigger wake word detection when "Numa" is heard', async () => {
      let transcriptionHandler: any;
      mockSession.events.onTranscription.mockImplementation((handler: any) => {
        transcriptionHandler = handler;
        return vi.fn();
      });

      sessionHandler.setupWakeWordDetection(mockSession);
      
      // Simulate hearing "Numa"
      await transcriptionHandler({ text: 'Hola Numa' });

      expect(mockSession.layouts.showTextWall).toHaveBeenCalledWith('¿Sí? Te escucho...');
    });

    it('should trigger vision when a "take photo" command is detected in voice', async () => {
      const mockPhoto = { buffer: Buffer.from('photo-data') };
      const mockApiResponse = { response: 'Photo description' };
      
      mockSession.camera.requestPhoto.mockResolvedValue(mockPhoto);
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });

      let transcriptionHandler: any;
      mockSession.events.onTranscription.mockImplementation((handler: any) => {
        transcriptionHandler = handler;
        return vi.fn();
      });

      await sessionHandler.handleButtonPress(mockSession);
      
      // Simulate voice command "Toma una foto"
      await transcriptionHandler({ text: 'Toma una foto por favor' });

      expect(mockSession.layouts.showTextWall).toHaveBeenCalledWith('Capturando foto...');
      expect(mockSession.camera.requestPhoto).toHaveBeenCalled();
      expect(mockSession.audio.speak).toHaveBeenCalledWith('Photo description');
    });

    it('should trigger regular voice request for other commands', async () => {
      const mockApiResponse = { response: 'Regular answer' };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });

      let transcriptionHandler: any;
      mockSession.events.onTranscription.mockImplementation((handler: any) => {
        transcriptionHandler = handler;
        return vi.fn();
      });

      await sessionHandler.handleButtonPress(mockSession);
      
      await transcriptionHandler({ text: '¿Cómo estás?' });

      expect(mockSession.layouts.showTextWall).not.toHaveBeenCalledWith('Capturing photo...');
      expect(mockSession.audio.speak).toHaveBeenCalledWith('Regular answer');
    });
  });
});
