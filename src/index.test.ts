import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MentraApp, GlassesIO } from '@mentra/sdk';
import { handleButtonPress, createApp } from './index';

// Mock global fetch
global.fetch = vi.fn();

describe('Mentra MiniApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleButtonPress', () => {
    it('should show error if transcription is empty', async () => {
      vi.mocked(GlassesIO.captureTranscription).mockResolvedValue(null);

      await handleButtonPress();

      expect(GlassesIO.displayMessage).toHaveBeenCalledWith("I didn't catch that. Please try again.");
    });

    it('should process successful transcription and API response', async () => {
      const mockTranscript = 'Test question';
      const mockApiResponse = { response: 'AI answer' };

      vi.mocked(GlassesIO.captureTranscription).mockResolvedValue(mockTranscript);
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });

      await handleButtonPress();

      expect(GlassesIO.displayMessage).toHaveBeenCalledWith('Processing...');
      expect(global.fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ query: mockTranscript }),
      }));
      expect(GlassesIO.displayMessage).toHaveBeenCalledWith('AI answer');
      expect(GlassesIO.speak).toHaveBeenCalledWith('AI answer');
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(GlassesIO.captureTranscription).mockResolvedValue('Some text');
      (global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      });

      await handleButtonPress();

      expect(GlassesIO.displayMessage).toHaveBeenCalledWith('Connection error with Numa AI');
    });
  });

  describe('createApp', () => {
    it('should register event handlers correctly', () => {
      const app = createApp();
      
      expect(app.onButtonPress).toHaveBeenCalledWith('right', expect.any(Function));
      expect(app.on).toHaveBeenCalledWith('start', expect.any(Function));
    });
  });
});
