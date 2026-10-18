import * as bcrypt from 'bcrypt';
import dataSource from '../data-source'; 

async function runSeed() {
  console.log('🔄 Conectando ao banco de dados...');
  await dataSource.initialize();

  const name = 'Usuario Teste';
  const email = 'teste@greener.com';
  const plainPassword = 'senha123';

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(plainPassword, saltRounds);

  console.log(`👤 Criando usuário: ${email}`);

  await dataSource.query(
    `INSERT INTO "users" ("nameUsers", "email", "password_hash")
     VALUES ($1, $2, $3)
     ON CONFLICT ("email") DO NOTHING;`,
    [name, email, passwordHash],
  );

  console.log('✅ Seed executado com sucesso!');
  console.log('-----------------------------------');
  console.log(`Email de login : ${email}`);
  console.log(`Senha de login : ${plainPassword}`);
  console.log('-----------------------------------');

  await dataSource.destroy();
  process.exit(0);
}

runSeed().catch((error) => {
  console.error('❌ Erro ao executar o seed:', error);
  process.exit(1);
});