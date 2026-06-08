import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Valida que o callback veio mesmo da Nuvemshop, conferindo o header
 * x-linkedstore-hmac-sha256 (HMAC-SHA256 do corpo cru usando o App Secret).
 *
 * Comportamento seguro e nao-disruptivo:
 * - Se o header existir e for invalido -> bloqueia (401).
 * - Se o header existir e for valido   -> libera.
 * - Se o header NAO vier               -> libera, mas registra um aviso
 *   (alguns callbacks podem nao assinar; assim nao quebramos o checkout).
 */
@Injectable()
export class NuvemshopHmacGuard implements CanActivate {
  private readonly logger = new Logger('NuvemshopHmacGuard');

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const headerHmac =
      req.headers['x-linkedstore-hmac-sha256'] ||
      req.headers['http_x_linkedstore_hmac_sha256'];

    const secret = process.env.NUVEMSHOP_APP_SECRET;
    if (!secret) {
      this.logger.error('NUVEMSHOP_APP_SECRET nao configurado.');
      // Sem secret nao da pra validar; libera mas avisa (corrigir no deploy).
      return true;
    }

    if (!headerHmac) {
      this.logger.warn(
        'Callback sem header HMAC. Liberado, mas sem verificacao de origem.',
      );
      return true;
    }

    // Precisa do corpo CRU (raw) para calcular o HMAC corretamente.
    const raw = (req as any).rawBody;
    if (!raw) {
      this.logger.warn('rawBody indisponivel; nao foi possivel validar HMAC.');
      return true;
    }

    const calculado = crypto
      .createHmac('sha256', secret)
      .update(raw)
      .digest('hex');

    // Comparacao em tempo constante (evita timing attack)
    const a = Buffer.from(calculado);
    const b = Buffer.from(String(headerHmac));
    const ok = a.length === b.length && crypto.timingSafeEqual(a, b);

    if (!ok) {
      this.logger.warn('HMAC invalido. Callback bloqueado.');
    }
    return ok;
  }
}