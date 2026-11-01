import fs from 'fs';
import path from 'path';

export interface GroundingSource {
  title?: string;
  url?: string;
}

export interface WorkflowStep {
  title: string;
  description: string;
  status: 'complete' | 'running' | 'pending';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: GroundingSource[];
  workflowSteps?: WorkflowStep[];
  timestamp: number;
}

export interface Thread {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

const DATA_DIR = path.join(process.cwd(), '.data', 'threads');

function ensureDirExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getUserFilePath(userId: string) {
  // Sanitize user id for safe file system usage
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(DATA_DIR, `${safeId}.json`);
}

export function getUserThreads(userId: string): Thread[] {
  try {
    ensureDirExists();
    const filePath = getUserFilePath(userId);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to read user threads:', err);
    return [];
  }
}

export function saveUserThreads(userId: string, threads: Thread[]): void {
  try {
    ensureDirExists();
    const filePath = getUserFilePath(userId);
    fs.writeFileSync(filePath, JSON.stringify(threads, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save user threads:', err);
  }
}
