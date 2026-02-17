const { createApp } = require('./app');
const { connectDb } = require('./config/db');
const { env } = require('./config/env');

async function main() {
  await connectDb(env.MONGODB_URI);
  const app = createApp();
  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

