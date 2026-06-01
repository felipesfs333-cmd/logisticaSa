import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as XLSX from 'xlsx';
import { TabelaFrete } from '../database/entities/tabela-frete.entity';
import { Transportadora } from '../database/entities/transportadora.entity';

@Injectable()
export class ImportadorService {
  constructor(
    @InjectRepository(TabelaFrete)
    private tabelaRepo: Repository<TabelaFrete>,
    @InjectRepository(Transportadora)
    private transpRepo: Repository<Transportadora>,
    private dataSource: DataSource,
  ) {}

  /**
   * Recebe o arquivo Excel e o nome da transportadora.
   * Le todas as linhas, valida e salva no banco em lotes.
   */
  async importar(nomeTransportadora: string, buffer: Buffer) {
    // 1. Garante que a transportadora existe (cria se nao existir)
    let transp = await this.transpRepo.findOne({
      where: { nome: nomeTransportadora },
    });
    if (!transp) {
      transp = await this.transpRepo.save(
        this.transpRepo.create({ nome: nomeTransportadora, ativo: true }),
      );
    }

    // 2. Le o Excel
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const primeiraAba = wb.SheetNames[0];
    const linhas: any[] = XLSX.utils.sheet_to_json(wb.Sheets[primeiraAba]);

    if (linhas.length === 0) {
      throw new BadRequestException('A planilha esta vazia.');
    }

    // 3. Confere se as colunas esperadas existem
    const colunasEsperadas = [
      'CEP Início',
      'CEP Fim',
      'Peso Início (g)',
      'Peso Fim (g)',
      'Frete Base (R$)',
      'Ad Valorem (fração)',
      'Extra/kg (R$)',
      'Prazo (dias)',
    ];
    const primeira = linhas[0];
    const faltando = colunasEsperadas.filter((c) => !(c in primeira));
    if (faltando.length > 0) {
      throw new BadRequestException(
        `Colunas faltando na planilha: ${faltando.join(', ')}`,
      );
    }

    // 4. Apaga as tabelas antigas dessa transportadora (reimportacao limpa)
    await this.tabelaRepo.delete({ transportadora_id: transp.id });

    // 5. Converte e insere em lotes de 2000 (arquivos grandes nao travam)
    const TAMANHO_LOTE = 2000;
    let inseridas = 0;
    let lote: Partial<TabelaFrete>[] = [];

    for (const l of linhas) {
      lote.push({
        transportadora_id: transp.id,
        cep_inicio: this.numero(l['CEP Início']),
        cep_fim: this.numero(l['CEP Fim']),
        peso_inicio_g: this.numero(l['Peso Início (g)']),
        peso_fim_g: this.numero(l['Peso Fim (g)']),
        frete_base: this.numero(l['Frete Base (R$)']),
        ad_valorem: this.numero(l['Ad Valorem (fração)']),
        extra_kg: this.numero(l['Extra/kg (R$)']),
        prazo_dias: this.numero(l['Prazo (dias)']),
      });

      if (lote.length >= TAMANHO_LOTE) {
        await this.tabelaRepo
          .createQueryBuilder()
          .insert()
          .values(lote)
          .execute();
        inseridas += lote.length;
        lote = [];
      }
    }
    // Insere o que sobrou
    if (lote.length > 0) {
      await this.tabelaRepo
        .createQueryBuilder()
        .insert()
        .values(lote)
        .execute();
      inseridas += lote.length;
    }

    return {
      transportadora: transp.nome,
      transportadora_id: transp.id,
      linhas_importadas: inseridas,
    };
  }

  // Converte texto/numero do Excel em numero limpo.
  // No seu arquivo os valores ja vem como numero (ex: 57.28), entao o
  // caminho normal e so retornar. O tratamento de texto cobre o caso de
  // alguem subir uma planilha com numeros em formato brasileiro ("57,28").
  private numero(valor: any): number {
    if (valor === null || valor === undefined || valor === '') return 0;
    if (typeof valor === 'number') return valor;
    let texto = String(valor).trim();
    // Se tem virgula, assume formato BR: ponto = milhar, virgula = decimal
    if (texto.includes(',')) {
      texto = texto.replace(/\./g, '').replace(',', '.');
    }
    const n = parseFloat(texto);
    return isNaN(n) ? 0 : n;
  }
}
