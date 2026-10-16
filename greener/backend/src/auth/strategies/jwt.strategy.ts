import {Injectable,UnauthorizedException} from '@nestjs/common';
import {PassportStrategy} from '@nestjs/passport';
import {ExtractJwt, Strategy} from 'passport-jwt';
import {ConfigService} from '@nestjs/config';


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || 'seu_segredo_jwt_aqui',
        });
    }

    async validate(payload: { sub: string; email: string; name: string }) {
        if(!payload||!payload.sub){
            throw new UnauthorizedException('Token Inválido ou expirado.');

        }
        return { id: payload.sub, email: payload.email, name: payload.name };
   
    }
} 
     