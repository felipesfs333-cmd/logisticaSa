import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * Protege a rota de cadastro de usuarios:
 *  - Se NAO existe nenhum usuario ainda -> libera (cria o primeiro/admin).
 *  - Se ja existe pelo menos um usuario -> exige estar logado (token valido).
 *
 * Assim ninguem de fora cria conta depois que o sistema tem usuarios,
 * mas voce nunca fica trancado pra fora se o banco for recriado.
 */
@Injectable()
export class RegistrarGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private jwtGuard: JwtAuthGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const total = await this.authService.totalUsuarios();

    // Primeiro usuario do sistema: cadastro liberado
    if (total === 0) return true;

    // Ja existem usuarios: precisa estar logado pra criar mais
    try {
      return (await this.jwtGuard.canActivate(context)) as boolean;
    } catch {
      throw new UnauthorizedException(
        'Cadastro de novos usuarios exige estar logado.',
      );
    }
  }
}
