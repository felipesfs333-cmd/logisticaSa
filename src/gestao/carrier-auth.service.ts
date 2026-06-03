import { Injectable } from '@nestjs/common';
import { Transportadora } from '../database/entities/transportadora.entity';

/**
 * Resultado de uma tentativa de autenticacao/teste.
 * Sempre retorna a resposta crua, pra voce ver o que a API devolveu.
 */
export interface ResultadoAuth {
  ok: boolean;
  mensagem: string;
  status_http?: number;
  token_obtido?: string; // quando o login gera um token
  resposta_crua?: string; // o corpo da resposta, como veio (pra inspecao)
}

@Injectable()
export class CarrierAuthService {
  /**
   * Obtem/gera o token de acesso conforme o tipo de autenticacao da
   * transportadora. Para "login_senha", faz o POST de login e extrai o token.
   * Para "token_fixo", devolve o token ja cadastrado.
   */
  async obterToken(t: Transportadora): Promise<ResultadoAuth> {
    if (t.auth_tipo === 'nenhuma') {
      return { ok: true, mensagem: 'API sem autenticacao.', token_obtido: '' };
    }

    if (t.auth_tipo === 'token_fixo') {
      if (!t.token) {
        return { ok: false, mensagem: 'Nenhum token fixo cadastrado.' };
      }
      return { ok: true, mensagem: 'Token fixo em uso.', token_obtido: t.token };
    }

    if (t.auth_tipo === 'login_senha') {
      return this.loginGerarToken(t);
    }

    return { ok: false, mensagem: `Tipo de auth desconhecido: ${t.auth_tipo}` };
  }

  /**
   * Faz POST no endpoint de login e tenta extrair o token da resposta.
   * Suporta corpo "form" (x-www-form-urlencoded) ou "json".
   * Procura o token em campos comuns: access_token, token, accessToken.
   */
  private async loginGerarToken(t: Transportadora): Promise<ResultadoAuth> {
    if (!t.auth_url) {
      return { ok: false, mensagem: 'Nenhuma URL de login (auth_url) cadastrada.' };
    }

    // Monta o conjunto de campos do login: usuario, senha + extras (JSON)
    const campos: Record<string, string> = {};
    if (t.auth_usuario) campos['username'] = t.auth_usuario;
    if (t.auth_senha) campos['password'] = t.auth_senha;

    // auth_extra: JSON com campos adicionais (ex: grant_type, companyId, auth_type)
    if (t.auth_extra) {
      try {
        const extra = JSON.parse(t.auth_extra);
        for (const k of Object.keys(extra)) campos[k] = String(extra[k]);
      } catch {
        return {
          ok: false,
          mensagem: 'Campos extras (auth_extra) nao sao um JSON valido.',
        };
      }
    }

    // Monta corpo e content-type conforme o formato
    let body: string;
    let contentType: string;
    if (t.auth_formato === 'json') {
      body = JSON.stringify(campos);
      contentType = 'application/json';
    } else {
      // form-urlencoded (padrao, ex: Rodonaves)
      body = new URLSearchParams(campos).toString();
      contentType = 'application/x-www-form-urlencoded';
    }

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      const resp = await fetch(t.auth_url, {
        method: 'POST',
        headers: { 'Content-Type': contentType },
        body,
        signal: ctrl.signal,
      });
      clearTimeout(timer);

      const textoCru = await resp.text();

      if (!resp.ok) {
        return {
          ok: false,
          status_http: resp.status,
          mensagem: `Login falhou (HTTP ${resp.status}).`,
          resposta_crua: textoCru.slice(0, 2000),
        };
      }

      // Tenta achar o token na resposta JSON
      let token = '';
      try {
        const json = JSON.parse(textoCru);
        token =
          json.access_token ||
          json.token ||
          json.accessToken ||
          json.Token ||
          '';
      } catch {
        // resposta nao era JSON
      }

      if (!token) {
        return {
          ok: false,
          status_http: resp.status,
          mensagem:
            'Login respondeu, mas nao encontrei o token na resposta. Veja a resposta crua.',
          resposta_crua: textoCru.slice(0, 2000),
        };
      }

      return {
        ok: true,
        status_http: resp.status,
        mensagem: 'Login OK, token gerado com sucesso.',
        token_obtido: token,
        resposta_crua: textoCru.slice(0, 2000),
      };
    } catch (e: any) {
      const motivo =
        e.name === 'AbortError'
          ? 'Tempo esgotado (a API de login nao respondeu em 10s).'
          : 'Nao foi possivel conectar na URL de login.';
      return { ok: false, mensagem: motivo };
    }
  }

  /**
   * Monta os headers de autenticacao pra usar nas chamadas a API,
   * dado um token. Respeita token_envio (bearer ou header customizado).
   */
  montarHeaderAuth(t: Transportadora, token: string): Record<string, string> {
    if (!token) return {};
    if (t.token_envio === 'header' && t.auth_header_nome) {
      return { [t.auth_header_nome]: token };
    }
    // padrao: bearer
    return { Authorization: `Bearer ${token}` };
  }
}
