// src/config.ts - Configuration
import dotenv from 'dotenv';

export function configureEnv() {
  dotenv.config();
  
  if (!process.env.GIT_REPO_URL) {
    throw new Error('Missing required environment variables');
  }
}