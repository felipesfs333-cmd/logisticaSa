import { Controller, Post, Body } from '@nestjs/common';
import { CotacaoService, CotacaoInput } from './cotacao.service';

@Controller('api')
export class CotacaoController {
  constructor(private readonly cotacaoService: CotacaoService) {}

  /**
   * Cotacao de frete.
   * POST /api/cotacao
   * Body: { "cep_destino": "30110000", "peso": 18.5, "valor_nf": 1200 }
   */
  @Post('cotacao')
  async cotar(@Body() body: CotacaoInput) {
    return this.cotacaoService.cotar(body);
  }
}
