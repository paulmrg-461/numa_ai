import { IAIRepository } from '../../domain/repositories/ai-repository.interface';
import { IAIResponse, IImageAnalysisRequest } from '../../domain/entities/ai';
import { config } from '../../shared/config/env';

export class AIRepository implements IAIRepository {
  async query(text: string): Promise<IAIResponse> {
    const response = await fetch(config.api.queryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: text }),
    });

    if (!response.ok) {
      throw new Error(`AI Query API error: ${response.statusText}`);
    }

    return (await response.json()) as IAIResponse;
  }

  async analyzeImage(request: IImageAnalysisRequest): Promise<IAIResponse> {
    const response = await fetch(config.api.analyzeImageUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Image Analysis API error: ${response.statusText}`);
    }

    return (await response.json()) as IAIResponse;
  }
}
