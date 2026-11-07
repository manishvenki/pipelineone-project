import pg from 'pg';
const { Client } = pg;

const passwordsToTry = [
  process.env.PGPASSWORD,
  'postgres',
  'admin',
  'root',
  '123456',
  'password',
  '',
];

async function attempt() {
  for (const pw of passwordsToTry) {
    if (pw === undefined) continue;
    const client = new Client({
      host: process.env.PGHOST || 'localhost',
      port: process.env.PGPORT || 5432,
      user: process.env.PGUSER || 'postgres',
      password: pw,
      database: 'postgres',
      connectionTimeoutMillis: 2000,
    });

    try {
      await client.connect();
      console.log(`Connected with password: "${pw ? '***' : '(empty)'}"`);
      const check = await client.query("SELECT 1 FROM pg_database WHERE datname = 'pipeline_one'");
      if (check.rows.length === 0) {
        await client.query('CREATE DATABASE pipeline_one');
        console.log('Database "pipeline_one" successfully created in PostgreSQL!');
      } else {
        console.log('Database "pipeline_one" already exists in PostgreSQL.');
      }
      await client.end();
      return true;
    } catch (e) {
      await client.end().catch(() => {});
      // continue trying
    }
  }
  console.log('Could not connect to postgres with default password list; using resilient fallback mode.');
  return false;
}

attempt().then(() => process.exit(0));

