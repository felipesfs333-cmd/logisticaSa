import { Controller, Get, Patch, Put, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { TransportadorasService } from './transportadoras.service';
import { StatsService } from './stats.service';
import { Transportadora } from '../database/entities/transportadora.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class GestaoController {
  constructor(
    private readonly transportadorasService: TransportadorasService,
    private readonly statsService: StatsService,
  ) {}

  // ---- Transportadoras ----

  // GET /transportadoras
  @Get('transportadoras')
  listarTransportadoras() {
    return this.transportadorasService.listar();
  }

  // PATCH /transportadoras/1/ativo  body: { "ativo": false }
  @Patch('transportadoras/:id/ativo')
  alternar(@Param('id') id: string, @Body() body: { ativo: boolean }) {
    return this.transportadorasService.alternarAtivo(Number(id), body.ativo);
  }

  // POST /transportadoras  body: { "nome": "Jadlog" }
  @Post('transportadoras')
  criar(@Body() body: { nome: string }) {
    return this.transportadorasService.criar(body.nome);
  }

  // DELETE /transportadoras/3
  @Delete('transportadoras/:id')
  excluir(@Param('id') id: string) {
    return this.transportadorasService.excluir(Number(id));
  }

  // PUT /transportadoras/1/integracao  body: { api_url, token, integracao_ativa }
  @Put('transportadoras/:id/integracao')
  salvarIntegracao(@Param('id') id: string, @Body() body: any) {
    return this.transportadorasService.salvarIntegracao(Number(id), body);
  }

  // POST /transportadoras/1/testar-conexao
  @Post('transportadoras/:id/testar-conexao')
  testarConexao(@Param('id') id: string) {
    return this.transportadorasService.testarConexao(Number(id));
  }

  // PUT /transportadoras/1  body: { "nome": "...", "api_url": "...", "token": "..." }
  @Put('transportadoras/:id')
  editar(@Param('id') id: string, @Body() body: Partial<Transportadora>) {
    return this.transportadorasService.editar(Number(id), body);
  }

  // ---- Estatisticas ----

  // GET /stats/resumo
  @Get('stats/resumo')
  resumo() {
    return this.statsService.resumo();
  }

  // GET /stats/por-transportadora
  @Get('stats/por-transportadora')
  porTransportadora() {
    return this.statsService.porTransportadora();
  }

  // GET /stats/por-estado
  @Get('stats/por-estado')
  porEstado() {
    return this.statsService.porEstado();
  }
}
