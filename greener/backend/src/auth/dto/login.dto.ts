import {IsEmail, IsNotEmpty, IsString, MinLength} from 'class-validator';

export class LoginDto {
  @IsEmail({}, {message: 'O email informado deve ser um endereço válido.'})
  @IsNotEmpty( {message: 'O email é obrigatório.'})
  email: string;

    @IsString()
    @IsNotEmpty( {message: 'A senha é obrigatória.'})
    @MinLength(6, {message: 'A senha deve ter no mínimo 6 caracteres.'})
    password: string;
}

