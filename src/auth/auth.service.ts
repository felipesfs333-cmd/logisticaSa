import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Usuario } from '../database/entities/usuario.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepo: Repository<Usuario>,
    private jwtService: JwtService,
  ) {}

  // Segredos vem OBRIGATORIAMENTE das variaveis de ambiente.
  // Sem fallback inseguro: se faltar, o sistema falha de proposito.
  private get accessSecret() {
    const s = process.env.JWT_ACCESS_SECRET;
    if (!s) throw new Error('JWT_ACCESS_SECRET nao configurado.');
    return s;
  }
  private get refreshSecret() {
    const s = process.env.JWT_REFRESH_SECRET;
    if (!s) throw new Error('JWT_REFRESH_SECRET nao configurado.');
    return s;
  }

  // Cria o primeiro usuario (ou mais). Em producao, proteja/remova esta rota.
  async registrar(email: string, senha: string) {
    const existe = await this.usuarioRepo.findOne({ where: { email } });
    if (existe) throw new ConflictException('E-mail ja cadastrado.');

    const senha_hash = await bcrypt.hash(senha, 10);
    const user = this.usuarioRepo.create({ email, senha_hash });
    await this.usuarioRepo.save(user);
    return this.gerarTokens(user);
  }

  // Quantos usuarios existem no sistema (usado pra liberar o 1o cadastro)
  async totalUsuarios(): Promise<number> {
    return this.usuarioRepo.count();
  }

  async login(email: string, senha: string) {
    const user = await this.usuarioRepo.findOne({ where: { email } });
    if (!user) throw new UnauthorizedException('Credenciais invalidas.');

    const ok = await bcrypt.compare(senha, user.senha_hash);
    if (!ok) throw new UnauthorizedException('Credenciais invalidas.');

    return this.gerarTokens(user);
  }

  // Troca um refresh token valido por um novo par de tokens (rotacao)
  async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalido ou expirado.');
    }

    const user = await this.usuarioRepo.findOne({ where: { id: payload.sub } });
    if (!user || !user.refresh_hash) {
      throw new UnauthorizedException('Sessao nao encontrada.');
    }

    // Confere se o refresh token bate com o que esta guardado (revoga roubados)
    const confere = await bcrypt.compare(refreshToken, user.refresh_hash);
    if (!confere) throw new UnauthorizedException('Refresh token nao corresponde.');

    return this.gerarTokens(user);
  }

  // Logout: apaga o refresh guardado, invalidando a sessao
  async logout(userId: number) {
    await this.usuarioRepo.update(userId, { refresh_hash: null });
    return { ok: true };
  }

  // Gera access (curto) + refresh (longo) e guarda o hash do refresh
  private async gerarTokens(user: Usuario) {
    const payload = { sub: user.id, email: user.email, papel: user.papel };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.accessSecret,
      expiresIn: '15m', // access dura 15 minutos
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.refreshSecret,
      expiresIn: '7d', // refresh dura 7 dias
    });

    // Guarda o hash do refresh (nao o token em si)
    const refresh_hash = await bcrypt.hash(refreshToken, 10);
    await this.usuarioRepo.update(user.id, { refresh_hash });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      usuario: { id: user.id, email: user.email, papel: user.papel },
    };
  }
}
