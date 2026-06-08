import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CotacaoService } from '../cotacao/cotacao.service';
import { DiasUteisService } from './dias-uteis.service';

/**
 * Endpoint que a Nuvemshop chama no checkout para obter as taxas de frete.
 * Formato de entrada e saida seguem a doc oficial "Shipping Carrier".
 *
 * IMPORTANTE: a Nuvemshop exige que este endpoint seja HTTPS e publico.
 * Em localhost, use um tunel (ngrok) ou hospede num servidor. Veja o README.
 */
@Controller('nuvemshop')
export class NuvemshopController {
  constructor(
    private readonly cotacaoService: CotacaoService,
    private readonly diasUteisService: DiasUteisService,
  ) {}

  // POST /nuvemshop/rates  -> este e o "callback_url" registrado na Nuvemshop
  @Post('rates')
  async rates(@Body() body: any) {
    try {
      const destino = body?.destination;
      const itens = body?.items || [];

      if (!destino || !destino.postal_code || itens.length === 0) {
        // 4xx: a doc recomenda 4xx (nao 5xx) para "nao consigo cotar".
        throw new HttpException(
          { rates: [], motivo: 'Dados insuficientes para cotar.' },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      // Soma peso (gramas) e valor de todos os itens, respeitando quantidade
      let pesoG = 0;
      let valorPedido = 0;
      for (const it of itens) {
        const q = Number(it.quantity) || 1;
        pesoG += (Number(it.grams) || 0) * q;
        valorPedido += (Number(it.price) || 0) * q;
      }
      const pesoKg = pesoG / 1000 || 0.1; // evita zero

      // Chama o motor de cotacao interno
      const cotacao = await this.cotacaoService.cotar({
        cep_destino: String(destino.postal_code),
        peso: pesoKg,
        valor_nf: valorPedido,
      });

      if (!cotacao.opcoes || cotacao.opcoes.length === 0) {
        // Sem cobertura para este CEP -> 4xx (mostra fallback na loja)
        throw new HttpException(
          { rates: [] },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      // Traduz para o formato "rates" da Nuvemshop.
      // IMPORTANTE: o prazo cadastrado nas tabelas e em DIAS UTEIS
      // (sabados, domingos e feriados nacionais nao contam).
      // Alem disso, o prazo nunca conta o dia da compra: comeca de amanha.
      const rates = cotacao.opcoes.map((o: any) => {
        const entrega = this.diasUteisService.calcularEntrega(o.prazo || 0);
        return {
          name: o.transportadora + (o.frete_gratis ? ' (Frete grátis)' : ''),
          code: this.slug(o.transportadora),
          price: o.valor,
          price_merchant: o.valor,
          currency: 'BRL',
          type: 'ship',
          min_delivery_date: entrega.toISOString().split('T')[0], 
          max_delivery_date: entrega.toISOString().split('T')[0],
          reference: 'logistica-' + this.slug(o.transportadora),
        };
      });

      return { rates };
    } catch (e) {
      if (e instanceof HttpException) throw e;
      // Erro inesperado tambem vira 4xx para nao penalizar a saude do carrier
      throw new HttpException({ rates: [] }, HttpStatus.UNPROCESSABLE_ENTITY);
    }
  }

  // Gera um code simples e estavel a partir do nome (ex: "Azul Cargo" -> "azul_cargo")
  private slug(nome: string): string {
    return String(nome)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }
}
