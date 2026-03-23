import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
  app: {
    id: process.env.APP_ID || 'com.iaaplicada.numa-ai',
    name: process.env.APP_NAME || 'Numa AI',
    port: Number(process.env.PORT) || 3000,
    apiKey: process.env.MENTRAOS_API_KEY || 'local_dev_key',
  },
  api: {
    queryUrl: process.env.API_URL || 'https://pq48nm3b-1717.use2.devtunnels.ms/api/v1/query',
    analyzeImageUrl: process.env.ANALYZE_IMAGE_URL || 'https://pq48nm3b-1717.use2.devtunnels.ms/api/v1/analyze-image',
  },
};
