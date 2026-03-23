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
    },
    camera: {
      takePhoto: vi.fn(),
    },
    getSessionId: vi.fn().mockReturnValue('test-session'),
  };

  const mockAppServer = vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    getExpressApp: vi.fn().mockReturnValue({
      get: vi.fn(),
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
      },
      camera: {
        takePhoto: vi.fn(),
      },
    };
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
    it('should trigger vision when a "take photo" command is detected in voice', async () => {
      const mockPhoto = { base64: 'photo-data' };
      const mockApiResponse = { response: 'Photo description' };
      
      mockSession.camera.takePhoto.mockResolvedValue(mockPhoto);
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

      expect(mockSession.layouts.showTextWall).toHaveBeenCalledWith('Capturing photo...');
      expect(mockSession.camera.takePhoto).toHaveBeenCalled();
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
