import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserRepository } from './user.repository';

describe('UserRepository', () => {
  it('busca o usuário pelo e-mail incluindo o hash da senha', async () => {
    const typeorm = { findOne: jest.fn().mockResolvedValue(null) };
    const repository = new UserRepository(typeorm as unknown as Repository<User>);

    await repository.findByEmailWithPassword('user@example.com');

    expect(typeorm.findOne).toHaveBeenCalledWith({
      where: { email: 'user@example.com' },
      select: { idUsers: true, email: true, nameUsers: true, password_hash: true },
    });
  });

  it('insere o usuário ignorando e-mail já cadastrado', async () => {
    const builder = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    const typeorm = { createQueryBuilder: jest.fn().mockReturnValue(builder) };
    const repository = new UserRepository(typeorm as unknown as Repository<User>);
    const user = { nameUsers: 'Local', email: 'user@example.com', password_hash: 'hash' };

    await repository.insertIfAbsent(user);

    expect(builder.into).toHaveBeenCalledWith(User);
    expect(builder.values).toHaveBeenCalledWith(user);
    expect(builder.orIgnore).toHaveBeenCalled();
    expect(builder.execute).toHaveBeenCalled();
  });
});
