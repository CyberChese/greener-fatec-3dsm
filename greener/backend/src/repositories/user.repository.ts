import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

export type NewUser = Pick<User, 'nameUsers' | 'email' | 'password_hash'>;

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { email },
      select: {
        idUsers: true,
        email: true,
        nameUsers: true,
        password_hash: true,
      },
    });
  }

  async insertIfAbsent(user: NewUser): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .insert()
      .into(User)
      .values(user)
      .orIgnore()
      .execute();
  }
}
