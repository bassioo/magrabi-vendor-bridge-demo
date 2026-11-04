// Hourly housekeeping: remind vendors who have not submitted, expire old invites.
import { getLastReminderAt, getSettings, listVendors, setLastReminderAt, updateVendor, addAudit, type DB } from '../db/index.js';
import { daysBetween, nowIso } from '../lib/time.js';
import { log } from '../lib/log.js';

/** Reminders need a fresh token the vendor can click, so the job re-issues one per reminder. */
export async function runHousekeeping(db: DB, issueToken: (vendorId: string) => Promise<string>, send: (vendorId: string, token: string) => Promise<void>): Promise<{ reminded: number; expired: number }> {
  const s = getSettings(db);
  const now = nowIso();
  let reminded = 0, expired = 0;
  for (const v of listVendors(db)) {
    if (!['invited', 'draft'].includes(v.status)) continue;
    if (v.inviteExpiresAt < now) {
      v.status = 'expired';
      updateVendor(db, v);
      addAudit(db, v.id, 'System', 'system', 'Invite expired · procurement can re-send a new link');
      expired += 1;
      continue;
    }
    const since = daysBetween(v.invitedAt, now) ?? 0;
    const last = getLastReminderAt(db, v.id);
    const sinceLast = last ? daysBetween(last, now) ?? 0 : Infinity;
    if (since >= s.reminderAfterDays && sinceLast >= 3) {
      try {
        const token = await issueToken(v.id);
        await send(v.id, token);
        setLastReminderAt(db, v.id, now);
        addAudit(db, v.id, 'System', 'email', `Reminder sent to ${v.email} (${Math.floor(since)} days since invite)`);
        reminded += 1;
      } catch (err) { log.warn({ err, vendor: v.id }, 'reminder failed'); }
    }
  }
  return { reminded, expired };
}

export function startHousekeeping(db: DB, issueToken: (vendorId: string) => Promise<string>, send: (vendorId: string, token: string) => Promise<void>): NodeJS.Timeout {
  const tick = () => runHousekeeping(db, issueToken, send).then((r) => { if (r.reminded || r.expired) log.info(r, 'housekeeping'); }).catch((err) => log.error({ err }, 'housekeeping failed'));
  setTimeout(tick, 15_000);
  return setInterval(tick, 60 * 60 * 1000);
}
