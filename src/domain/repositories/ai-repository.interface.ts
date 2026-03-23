import { IAIResponse, IImageAnalysisRequest } from '../entities/ai';

export interface IAIRepository {
  query(text: string): Promise<IAIResponse>;
  analyzeImage(request: IImageAnalysisRequest): Promise<IAIResponse>;
}
