import {Module} from '@nestjs/common';
import {ConfigModule, ConfigService} from '@nestjs/config';
import {JwtModule} from '@nestjs/jwt';
import {PasswordHasherService} from './password-hasher.service';

@Module({
    imports: [
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory:  (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: {expiresIn: configService.get<string>('JWT_EXPIRATION', '1d') as any,
                },
            }),
        }),
    ],
    providers: [PasswordHasherService],
    exports: [PasswordHasherService, JwtModule],
  })
  export class AuthModule {}
