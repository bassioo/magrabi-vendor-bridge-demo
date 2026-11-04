// Environment and runtime configuration. A .env file next to the repo root is loaded if present (no dependency needed).
import fs from 'node:fs';
import path from 'node:path';

function loadDotEnv(): void {
  for (const candidate of [process.env.DOTENV_PATH, path.resolve(process.cwd(), '.env'), path.resolve(process.cwd(), '../../.env')]) {
    if (!candidate || !fs.existsSync(candidate)) continue;
    for (const raw of fs.readFileSync(candidate, 'utf8').split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      if (process.env[key] === undefined) process.env[key] = value;
    }
    break;
  }
}
loadDotEnv();

const env = (k: string, d = ''): string => (process.env[k] ?? d).trim();

export const config = {
  mode: (env('APP_MODE', 'demo') === 'live' ? 'live' : 'demo') as 'demo' | 'live',
  port: Number(env('PORT', '8787')),
  publicUrl: env('PUBLIC_URL', 'http://localhost:5173').replace(/\/$/, ''),
  dataDir: path.resolve(env('DATA_DIR', './data')),
  sessionSecret: env('SESSION_SECRET', 'dev-only-secret-change-me'),
  adminEmail: env('ADMIN_EMAIL', 'procurement@magrabi.example').toLowerCase(),
  adminName: env('ADMIN_NAME', 'Admin'),
  smtp: { host: env('SMTP_HOST'), port: Number(env('SMTP_PORT', '587')), user: env('SMTP_USER'), pass: env('SMTP_PASS'), from: env('SMTP_FROM', 'MAGRABi Vendor Hub <no-reply@magrabi.example>') },
  anthropicKey: env('ANTHROPIC_API_KEY'),
  anthropicModel: env('ANTHROPIC_MODEL', 'claude-opus-5-5'),
  wathq: { key: env('WATHQ_API_KEY'), baseUrl: env('WATHQ_BASE_URL', 'https://api.wathq.sa/v5').replace(/\/$/, '') },
  reminderAfterDays: Number(env('REMINDER_AFTER_DAYS', '3')),
  isProduction: env('NODE_ENV') === 'production',
  get samplesDir() { return path.resolve(this.dataDir, 'samples'); },
  get uploadsDir() { return path.resolve(this.dataDir, 'uploads'); },
  get dbPath() { return path.resolve(this.dataDir, 'vendorhub.db'); },
};
export type Config = typeof config;
