import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /auth/registrar  body: { email, senha }
  @Post('registrar')
  registrar(@Body() body: { email: string; senha: string }) {
    return this.authService.registrar(body.email, body.senha);
  }

  // POST /auth/login  body: { email, senha }
  @Post('login')
  login(@Body() body: { email: string; senha: string }) {
    return this.authService.login(body.email, body.senha);
  }

  // POST /auth/refresh  body: { refresh_token }
  @Post('refresh')
  refresh(@Body() body: { refresh_token: string }) {
    return this.authService.refresh(body.refresh_token);
  }

  // POST /auth/logout  (precisa do access token)
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Req() req: any) {
    return this.authService.logout(req.user.id);
  }
}
