import { IAIRepository } from '../repositories/ai-repository.interface';

export class VoiceAssistantUseCase {
  constructor(private aiRepository: IAIRepository) {}

  async execute(text: string, onProcessing: (msg: string) => void): Promise<string> {
    if (!text) throw new Error('No input text provided');

    onProcessing('Processing query...');
    const result = await this.aiRepository.query(text);
    return result.response;
  }
}
