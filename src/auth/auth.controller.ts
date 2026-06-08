import { Controller, Post, Get, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RegistrarGuard } from './registrar.guard';
import { CredenciaisDto, RefreshDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /auth/registrar  body: { email, senha }
  // Liberado para o primeiro usuario; depois exige login.
  @UseGuards(RegistrarGuard)
  @Post('registrar')
  registrar(@Body() body: CredenciaisDto) {
    return this.authService.registrar(body.email, body.senha);
  }

  // POST /auth/login  body: { email, senha }
  @Post('login')
  login(@Body() body: CredenciaisDto) {
    return this.authService.login(body.email, body.senha);
  }

  // POST /auth/refresh  body: { refresh_token }
  @Post('refresh')
  refresh(@Body() body: RefreshDto) {
    return this.authService.refresh(body.refresh_token);
  }

  // POST /auth/logout  (precisa do access token)
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Req() req: any) {
    return this.authService.logout(req.user.id);
  }
  // GET /auth/usuarios  (lista usuarios, precisa estar logado)
  @UseGuards(JwtAuthGuard)
  @Get('usuarios')
  listarUsuarios() {
    return this.authService.listarUsuarios();
  }

  // DELETE /auth/usuarios/:id  (remove usuario, precisa estar logado)
  @UseGuards(JwtAuthGuard)
  @Delete('usuarios/:id')
  removerUsuario(@Param('id') id: string) {
    return this.authService.removerUsuario(Number(id));
  }
}
