const isDev = process.env.NODE_ENV !== 'production';

const formatTimestamp = () => new Date().toISOString();

export const logger = {
  info: (msg, meta = {}) => {
    console.log(`[${formatTimestamp()}] [INFO] ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  warn: (msg, meta = {}) => {
    console.warn(`[${formatTimestamp()}] [WARN] ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  error: (msg, meta = {}) => {
    console.error(`[${formatTimestamp()}] [ERROR] ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  debug: (msg, meta = {}) => {
    if (isDev) {
      console.log(`[${formatTimestamp()}] [DEBUG] ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
    }
  }
};

export default logger;
