import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { PasswordHasherService } from './password-hasher.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let userRepository: {
    findOne: jest.Mock;
  };
  let jwtService: {
    sign: jest.Mock;
  };
  let passwordHasherService: {
    comparePassword: jest.Mock;
  };

  const user = {
    idUsers: '550e8400-e29b-41d4-a716-446655440000',
    nameUsers: 'Isabelly',
    email: 'isabelly@example.com',
    password_hash: 'hashed-password',
  } as User;

  beforeEach(() => {
    userRepository = {
      findOne: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('jwt-token'),
    };
    passwordHasherService = {
      comparePassword: jest.fn(),
    };

    authService = new AuthService(
      userRepository as unknown as Repository<User>,
      jwtService as unknown as JwtService,
      passwordHasherService as unknown as PasswordHasherService,
    );
  });

  it('faz login com sucesso e emite um JWT', async () => {
    userRepository.findOne.mockResolvedValue(user);
    passwordHasherService.comparePassword.mockResolvedValue(true);

    await expect(
      authService.login({
        email: user.email,
        password: 'correct-password',
      }),
    ).resolves.toEqual({
      access_token: 'jwt-token',
      user: {
        id: user.idUsers,
        email: user.email,
        name: user.nameUsers,
      },
    });

    expect(userRepository.findOne).toHaveBeenCalledWith({
      where: { email: user.email },
      select: {
        idUsers: true,
        email: true,
        nameUsers: true,
        password_hash: true,
      },
    });
    expect(passwordHasherService.comparePassword).toHaveBeenCalledWith(
      'correct-password',
      user.password_hash,
    );
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: user.idUsers,
      email: user.email,
      name: user.nameUsers,
    });
  });

  it('rejeita o login quando a senha está errada', async () => {
    userRepository.findOne.mockResolvedValue(user);
    passwordHasherService.comparePassword.mockResolvedValue(false);

    await expect(
      authService.login({
        email: user.email,
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('rejeita o login quando o usuário não existe', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await expect(
      authService.login({
        email: 'unknown@example.com',
        password: 'any-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(passwordHasherService.comparePassword).not.toHaveBeenCalled();
    expect(jwtService.sign).not.toHaveBeenCalled();
  });
});
