import {IsEmail, IsNotEmpty, IsString, MinLength} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email.' })
  @IsEmail({}, {message: 'O email informado deve ser um endereço válido.'})
  @IsNotEmpty( {message: 'O email é obrigatório.'})
  email: string;

    @ApiProperty({ example: 'senha123', minLength: 6, description: 'User password.' })
    @IsString()
    @IsNotEmpty( {message: 'A senha é obrigatória.'})
    @MinLength(6, {message: 'A senha deve ter no mínimo 6 caracteres.'})
    password: string;
}

