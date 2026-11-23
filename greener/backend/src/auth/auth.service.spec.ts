import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../entities/user.entity';
import { UserRepository } from '../repositories/user.repository';
import { PasswordHasherService } from './password-hasher.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let userRepository: {
    findByEmailWithPassword: jest.Mock;
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
      findByEmailWithPassword: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('jwt-token'),
    };
    passwordHasherService = {
      comparePassword: jest.fn(),
    };

    authService = new AuthService(
      userRepository as unknown as UserRepository,
      jwtService as unknown as JwtService,
      passwordHasherService as unknown as PasswordHasherService,
    );
  });

  it('faz login com sucesso e emite um JWT', async () => {
    userRepository.findByEmailWithPassword.mockResolvedValue(user);
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

    expect(userRepository.findByEmailWithPassword).toHaveBeenCalledWith(user.email);
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
    userRepository.findByEmailWithPassword.mockResolvedValue(user);
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
    userRepository.findByEmailWithPassword.mockResolvedValue(null);

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
