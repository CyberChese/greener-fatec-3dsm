import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';

interface LocalSeedCredentials {
  email: string;
  password: string;
}

class SeedConfigurationError extends Error {}

function getLocalSeedCredentials(): LocalSeedCredentials {
  if (
    process.env.NODE_ENV !== 'development' ||
    process.env.LOCAL_DEVELOPMENT_SEED_ENABLED !== 'true'
  ) {
    throw new SeedConfigurationError(
      'Seed disabled. Use NODE_ENV=development and explicitly enable the local seed.',
    );
  }

  const email = process.env.LOCAL_DEVELOPMENT_SEED_EMAIL?.trim();
  const password = process.env.LOCAL_DEVELOPMENT_SEED_PASSWORD;
  if (!email || !password) {
    throw new SeedConfigurationError(
      'Set LOCAL_DEVELOPMENT_SEED_EMAIL and LOCAL_DEVELOPMENT_SEED_PASSWORD for the local seed.',
    );
  }

  return { email, password };
}

async function runSeed(): Promise<void> {
  const { email, password } = getLocalSeedCredentials();
  let initialized = false;

  try {
    await dataSource.initialize();
    initialized = true;

    const passwordHash = await bcrypt.hash(password, 10);
    await dataSource.query(
      `INSERT INTO "users" ("nameUsers", "email", "password_hash")
       VALUES ($1, $2, $3)
       ON CONFLICT ("email") DO NOTHING;`,
      ['Usuário local', email, passwordHash],
    );

    console.info('Local development seed completed.');
  } finally {
    if (initialized) {
      await dataSource.destroy();
    }
  }
}

runSeed().catch((error: unknown) => {
  console.error(
    error instanceof SeedConfigurationError
      ? error.message
      : 'Seed failed. Check database connectivity and configuration without logging credentials.',
  );
  process.exitCode = 1;
});
