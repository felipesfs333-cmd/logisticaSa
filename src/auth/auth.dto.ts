import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

// Valida o corpo de /auth/login e /auth/registrar
export class CredenciaisDto {
  @IsEmail({}, { message: 'E-mail invalido.' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve ter ao menos 6 caracteres.' })
  @MaxLength(100)
  senha: string;
}

// Valida o corpo de /auth/refresh
export class RefreshDto {
  @IsString()
  refresh_token: string;
}
