import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleButtonPress, NumaAppServer } from './index';

// Mock the SDK
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

// Mock global fetch
global.fetch = vi.fn();

describe('Numa AI MiniApp', () => {
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

  describe('Vision Analysis', () => {
    it('should capture photo and call analyze-image API on double tap', async () => {
      const mockPhoto = { base64: 'base64-image-data' };
      const mockApiResponse = { response: 'Scene description' };
      
      let touchHandler: any;
      mockSession.events.onTouchEvent.mockImplementation((gesture: string, handler: any) => {
        if (gesture === 'double_tap') touchHandler = handler;
      });

      mockSession.camera.takePhoto.mockResolvedValue(mockPhoto);
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });

      const server = new NumaAppServer();
      // Use the prototype to access the protected method
      await (NumaAppServer.prototype as any).onSession.call(server, mockSession, 'id', 'user');
      
      await touchHandler();

      expect(mockSession.layouts.showTextWall).toHaveBeenCalledWith('Capturing image...');
      expect(mockSession.camera.takePhoto).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('analyze-image'), expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('base64-image-data'),
      }));
      expect(mockSession.layouts.showTextWall).toHaveBeenCalledWith('Scene description');
      expect(mockSession.audio.speak).toHaveBeenCalledWith('Scene description');
    });
  });

  describe('handleButtonPress', () => {
    it('should show listening message and setup transcription handler', async () => {
      await handleButtonPress(mockSession);

      expect(mockSession.layouts.showTextWall).toHaveBeenCalledWith('Listening...');
      expect(mockSession.events.onTranscription).toHaveBeenCalled();
    });

    it('should process transcription and call AI API', async () => {
      const mockTranscript = 'Test question';
      const mockApiResponse = { response: 'AI answer' };
      
      let transcriptionHandler: any;
      mockSession.events.onTranscription.mockImplementation((handler: any) => {
        transcriptionHandler = handler;
        return vi.fn(); // cleanup function
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });

      await handleButtonPress(mockSession);
      
      // Trigger the transcription handler
      await transcriptionHandler({ text: mockTranscript });

      expect(mockSession.layouts.showTextWall).toHaveBeenCalledWith('Processing...');
      expect(global.fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ query: mockTranscript }),
      }));
      expect(mockSession.layouts.showTextWall).toHaveBeenCalledWith('AI answer');
      expect(mockSession.audio.speak).toHaveBeenCalledWith('AI answer');
    });

    it('should handle API errors', async () => {
      let transcriptionHandler: any;
      mockSession.events.onTranscription.mockImplementation((handler: any) => {
        transcriptionHandler = handler;
        return vi.fn();
      });

      (global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      });

      await handleButtonPress(mockSession);
      await transcriptionHandler({ text: 'Some text' });

      expect(mockSession.layouts.showTextWall).toHaveBeenCalledWith('Connection error with Numa AI');
    });
  });

  describe('NumaAppServer', () => {
    it('should initialize correctly', () => {
      const server = new NumaAppServer();
      expect(server).toBeDefined();
    });
  });
});
