import {
  Controller,
  Post,
  Param,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportadorService } from './importador.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('importador')
@UseGuards(JwtAuthGuard)
export class ImportadorController {
  constructor(private readonly importadorService: ImportadorService) {}

  /**
   * Sobe um Excel para uma transportadora.
   * Exemplo: POST /importador/Quick  (com o arquivo no campo "arquivo")
   */
  @Post(':transportadora')
  @UseInterceptors(FileInterceptor('arquivo'))
  async importar(
    @Param('transportadora') transportadora: string,
    @UploadedFile() arquivo: Express.Multer.File,
  ) {
    if (!arquivo) {
      throw new BadRequestException('Nenhum arquivo enviado no campo "arquivo".');
    }
    return this.importadorService.importar(transportadora, arquivo.buffer);
  }
}
