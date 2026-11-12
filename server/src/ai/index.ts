import { PhotoAnalyzer } from './types';
import { MockPhotoAnalyzer } from './mock-analyzer';

let analyzerInstance: PhotoAnalyzer | null = null;

export function getPhotoAnalyzer(): PhotoAnalyzer {
  if (analyzerInstance) {
    return analyzerInstance;
  }

  const provider = (process.env.AI_PROVIDER || 'mock').toLowerCase();

  switch (provider) {
    case 'openai':
      console.log('🤖 AI Provider: OpenAI (stub configured for Stage 5 integration)');
      // For Stage 1-4, falls back to mock if no API key is provided
      analyzerInstance = new MockPhotoAnalyzer();
      break;
    case 'local':
      console.log('🤖 AI Provider: Local model server (stub configured)');
      analyzerInstance = new MockPhotoAnalyzer();
      break;
    case 'mock':
    default:
      analyzerInstance = new MockPhotoAnalyzer();
      break;
  }

  return analyzerInstance;
}

export * from './types';
