import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { CotacaoService } from '../cotacao/cotacao.service';
import { DiasUteisService } from './dias-uteis.service';

/**
 * Endpoint que a Nuvemshop chama no checkout para obter as taxas de frete.
 */
@Controller('nuvemshop')
export class NuvemshopController {
  constructor(
    private readonly cotacaoService: CotacaoService,
    private readonly diasUteisService: DiasUteisService,
  ) {}

  // POST /nuvemshop/rates  -> este e o "callback_url" registrado na Nuvemshop
  @Post('rates')
  @HttpCode(200)
  async rates(@Body() body: any) {
    try {
      console.log('NUVEMSHOP REQUEST:', JSON.stringify(body));
      const destino = body?.destination;
      const itens = body?.items || [];

      if (!destino || !destino.postal_code || itens.length === 0) {
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
      const pesoKg = pesoG / 1000 || 0.1;

      const cotacao = await this.cotacaoService.cotar({
        cep_destino: String(destino.postal_code),
        peso: pesoKg,
        valor_nf: valorPedido,
      });

      if (!cotacao.opcoes || cotacao.opcoes.length === 0) {
        throw new HttpException({ rates: [] }, HttpStatus.UNPROCESSABLE_ENTITY);
      }

      const rates = cotacao.opcoes.map((o: any) => {
        const entrega = this.diasUteisService.calcularEntrega(o.prazo || 0);
        return {
          name: o.transportadora + (o.frete_gratis ? ' (Frete grátis)' : ''),
          code: this.slug(o.transportadora),
          price: o.valor,
          price_merchant: o.valor,
          currency: 'BRL',
          type: 'ship',
          min_delivery_date: this.formatarDataBR(entrega),
          max_delivery_date: this.formatarDataBR(entrega),
          reference: 'logistica-' + this.slug(o.transportadora),
        };
      });

      console.log('NUVEMSHOP RESPONSE:', JSON.stringify({ rates }));
      return { rates };
    } catch (e) {
      if (e instanceof HttpException) throw e;
      throw new HttpException({ rates: [] }, HttpStatus.UNPROCESSABLE_ENTITY);
    }
  }

  // Formata a data em ISO 8601 com fuso de Brasilia (-03:00)
  private formatarDataBR(data: Date): string {
    const ano = data.getUTCFullYear();
    const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
    const dia = String(data.getUTCDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}T12:00:00-03:00`;
  }

  // Gera um code simples e estavel a partir do nome
  private slug(nome: string): string {
    return String(nome)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }
}