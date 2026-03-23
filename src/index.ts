import { AIRepository } from './data/repositories/ai-repository';
import { VoiceAssistantUseCase } from './domain/use-cases/voice-assistant.use-case';
import { VisionAssistantUseCase } from './domain/use-cases/vision-assistant.use-case';
import { SessionHandler } from './presentation/handlers/session.handler';
import { NumaAppServer } from './presentation/server/numa-server';
import { config } from './shared/config/env';

// 1. Initialize Repositories
const aiRepository = new AIRepository();

// 2. Initialize Use Cases
const voiceUseCase = new VoiceAssistantUseCase(aiRepository);
const visionUseCase = new VisionAssistantUseCase(aiRepository);

// 3. Initialize Handlers
const sessionHandler = new SessionHandler(voiceUseCase, visionUseCase);

// 4. Initialize and Start Server
const server = new NumaAppServer(sessionHandler);

if (process.env.NODE_ENV !== 'test') {
  server.start().then(() => {
    console.log(`${config.app.name} server started on port ${config.app.port}`);
  });
}

export { server, sessionHandler, voiceUseCase, visionUseCase, aiRepository };
