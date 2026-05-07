// Persistent app logger — Wingman convention.
// Writes structured entries to Dexie (db.logs); keeps the most recent 500;
// always mirrors to the browser console so devtools still see everything.
//
// Usage:
//   import { initLogger, logger } from './logger.js'
//   initLogger(db)                                      // call once on boot
//   logger.info('sw', 'Service worker registered', { scope })

let _db = null

export function initLogger(db) {
  _db = db
}

const MAX_LOGS = 500

async function persist(level, category, message, data) {
  if (!_db) return
  try {
    await _db.logs.add({
      timestamp: Date.now(),
      level,
      category,
      message,
      data: data !== undefined ? safeStringify(data) : null,
    })
    const count = await _db.logs.count()
    if (count > MAX_LOGS) {
      const oldest = await _db.logs
        .orderBy('id')
        .limit(count - MAX_LOGS)
        .primaryKeys()
      await _db.logs.bulkDelete(oldest)
    }
  } catch {
    // Never let logging crash the app
  }
}

function safeStringify(v) {
  try {
    return JSON.stringify(v, replacer, 0)
  } catch {
    try { return String(v) } catch { return null }
  }
}

function replacer(_key, value) {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack?.slice(0, 1000) }
  }
  return value
}

function log(level, category, message, data) {
  const tag = `[${level.toUpperCase()}][${category}]`
  try {
    if (level === 'error') console.error(tag, message, data ?? '')
    else if (level === 'warn') console.warn(tag, message, data ?? '')
    else console.log(tag, message, data ?? '')
  } catch {}
  persist(level, category, message, data)
}

export const logger = {
  error: (category, message, data) => log('error', category, message, data),
  warn:  (category, message, data) => log('warn',  category, message, data),
  info:  (category, message, data) => log('info',  category, message, data),
  debug: (category, message, data) => log('debug', category, message, data),
}
