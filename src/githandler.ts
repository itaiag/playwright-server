// src/gitHandler.ts - Git integration
import simpleGit, { SimpleGit } from 'simple-git';
import fs from 'fs/promises';
import { logger } from './logger';

const git: SimpleGit = simpleGit();

export async function gitPullHandler() {
  try {
    if (!process.env.GIT_REPO_URL) throw new Error('Missing repo URL');
    if (!process.env.PROJECT_DIR) throw new Error('Missing project folder');
    
    if (await fs.access(process.env.PROJECT_DIR).then(() => true).catch(() => false)) {
      await git.pull();
    } else {
      await git.clone(process.env.GIT_REPO_URL, process.env.PROJECT_DIR);
    }
    
    return { status: 'success', message: 'Repository updated' };
  } catch (error) {
    logger.error('Git operation failed', error);
    throw error;
  }
}