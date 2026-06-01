import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  // Quando voce acessar http://localhost:3000/ no navegador,
  // essa rota responde. Serve so para confirmar que esta tudo de pe.
  @Get()
  health() {
    return {
      status: 'ok',
      mensagem: 'Plataforma logistica rodando!',
      data: new Date().toISOString(),
    };
  }
}
