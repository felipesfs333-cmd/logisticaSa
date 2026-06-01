import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Use @UseGuards(JwtAuthGuard) em qualquer rota que deva exigir login.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
