const dotenv = require('dotenv');

dotenv.config();

function requireEnv(name, fallback) {
  const v = process.env[name] ?? fallback;
  if (v == null || v === '') throw new Error(`Missing env: ${name}`);
  return v;
}

const env = {
  MONGODB_URI: requireEnv('MONGODB_URI', 'mongodb://127.0.0.1:27017/factory_orders'),
  PORT: Number(process.env.PORT ?? 4000),
  CORS_ORIGIN: requireEnv('CORS_ORIGIN', 'http://localhost:5173')
};

module.exports = { env };

