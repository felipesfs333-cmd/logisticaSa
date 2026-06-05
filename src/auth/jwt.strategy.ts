import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

// Segredo obrigatorio: sem ele, a aplicacao nem inicia.
const JWT_SECRET = process.env.JWT_ACCESS_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_ACCESS_SECRET nao configurado. Configure a variavel de ambiente.');
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET,
    });
  }

  // O que retorna aqui vira o req.user nas rotas protegidas
  async validate(payload: any) {
    return { id: payload.sub, email: payload.email, papel: payload.papel };
  }
}
