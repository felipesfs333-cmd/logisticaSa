import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Criptografa/descriptografa textos sensiveis (tokens, senhas de
 * transportadoras) antes de guardar no banco. Usa AES-256-GCM.
 *
 * A chave vem da variavel CRYPTO_KEY (uma frase longa). Derivamos uma
 * chave de 32 bytes dela. Se nao houver chave, o texto e guardado como
 * veio (pra nao quebrar em desenvolvimento), mas em producao a variavel
 * DEVE estar configurada.
 */
@Injectable()
export class CryptoService {
  private readonly key: Buffer | null;
  private readonly PREFIX = 'enc:v1:'; // marca textos criptografados

  constructor() {
    const raw = process.env.CRYPTO_KEY;
    this.key = raw ? crypto.createHash('sha256').update(raw).digest() : null;
  }

  // Criptografa um texto. Se nao houver chave, devolve o texto original.
  encrypt(texto: string | null | undefined): string | null {
    if (texto === null || texto === undefined || texto === '') return texto ?? null;
    if (!this.key) return texto; // sem chave: nao criptografa (dev)
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    // formato: prefixo + iv.tag.dados (base64)
    return (
      this.PREFIX +
      Buffer.concat([iv, tag, enc]).toString('base64')
    );
  }

  // Descriptografa. Se nao tiver o prefixo, devolve como esta (texto antigo).
  decrypt(valor: string | null | undefined): string | null {
    if (!valor) return valor ?? null;
    if (!valor.startsWith(this.PREFIX)) return valor; // texto nao criptografado
    if (!this.key) return valor;
    try {
      const raw = Buffer.from(valor.slice(this.PREFIX.length), 'base64');
      const iv = raw.subarray(0, 12);
      const tag = raw.subarray(12, 28);
      const dados = raw.subarray(28);
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(dados), decipher.final()]).toString(
        'utf8',
      );
    } catch {
      return valor; // se falhar, devolve o que tem (nao quebra)
    }
  }
}
