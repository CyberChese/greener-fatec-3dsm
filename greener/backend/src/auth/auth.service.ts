import {Injectable, UnauthorizedException} from '@nestjs/common';
import { JwtService} from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import{LoginDto} from './dto/login.dto';
import { PasswordHasherService } from './password-hasher.service';
import { User } from '../entities/user.entity';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly jwtService: JwtService,
        private readonly passwordHasherService: PasswordHasherService,
    ) {}

    async login(loginDto:LoginDto){
        const {email, password} = loginDto;
        const user = await this.userRepository.findOne({where:{email},
            select:{
                idUsers: true,
                email: true,
                nameUsers: true,
                password_hash: true
            }});

        if(!user){
            throw new UnauthorizedException('Credenciais inválidas.');
        }

        const isPasswordValid = await this.passwordHasherService.comparePassword(password, user.password_hash);
        if(!isPasswordValid){
            throw new UnauthorizedException('Credenciais inválidas.');
        }

        const payload = {sub: user.idUsers, email: user.email, name: user.nameUsers};

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.idUsers,
                email: user.email,
                name: user.nameUsers,
            },
        };
    }
}