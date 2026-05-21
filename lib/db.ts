import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'animations.db');
const db = new Database(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS animations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subject TEXT,
    overview TEXT NOT NULL,
    key_points TEXT,
    design_idea TEXT,
    language TEXT DEFAULT 'zh-CN',
    core_difficulty TEXT,
    scientific_model TEXT,
    html TEXT,
    status TEXT DEFAULT 'draft',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    published_at TEXT
  );
`);

export interface AnimationRecord {
  id: string;
  title: string;
  subject?: string;
  overview: string;
  core_difficulty?: string;
  key_points?: string; // JSON string
  design_idea?: string;
  language: string;
  scientific_model?: string; // JSON string
  html?: string;
  status: 'draft' | 'generating' | 'review' | 'published' | 'error';
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export const dbHelpers = {
  create: (data: Partial<AnimationRecord>) => {
    const stmt = db.prepare(`
      INSERT INTO animations (
        id, title, subject, overview, key_points, design_idea, language, status
      ) VALUES (
        @id, @title, @subject, @overview, @key_points, @design_idea, @language, @status
      )
    `);
    const info = stmt.run({
      id: data.id,
      title: data.title,
      subject: data.subject || null,
      overview: data.overview,
      key_points: data.key_points || null,
      design_idea: data.design_idea || null,
      language: data.language || 'zh-CN',
      status: data.status || 'draft',
    });
    return info;
  },

  getById: (id: string): AnimationRecord | undefined => {
    const stmt = db.prepare('SELECT * FROM animations WHERE id = ?');
    return stmt.get(id) as AnimationRecord | undefined;
  },

  update: (id: string, data: Partial<AnimationRecord>) => {
    const sets: string[] = [];
    const values: Record<string, any> = { id };
    
    for (const [key, value] of Object.entries(data)) {
      if (key !== 'id') {
        sets.push(`${key} = @${key}`);
        values[key] = value;
      }
    }
    sets.push("updated_at = CURRENT_TIMESTAMP");

    const query = `UPDATE animations SET ${sets.join(', ')} WHERE id = @id`;
    const stmt = db.prepare(query);
    return stmt.run(values);
  },

  list: (): AnimationRecord[] => {
    const stmt = db.prepare('SELECT * FROM animations ORDER BY created_at DESC');
    return stmt.all() as AnimationRecord[];
  }
};

export default db;
