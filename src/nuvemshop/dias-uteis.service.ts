import { Injectable } from '@nestjs/common';

/**
 * Calcula data de entrega considerando dias uteis brasileiros.
 *
 * Regras:
 * - Hoje NUNCA conta (cutoff a meia-noite).
 * - Sabados e domingos sao pulados.
 * - Feriados nacionais fixos (e moveis pre-calculados ate 2027) sao pulados.
 *
 * Como funciona:
 * 1. Avanca para o proximo dia util (a partir de amanha).
 * 2. Conta esse dia como prazo 1.
 * 3. Continua avancando, pulando finais de semana e feriados, ate completar
 *    o prazo solicitado.
 */
@Injectable()
export class DiasUteisService {
  // Feriados nacionais brasileiros (data fixa + moveis pre-calculados).
  // Formato: 'YYYY-MM-DD'. Atualize anualmente.
  private readonly FERIADOS = new Set<string>([
    // ----- 2026 -----
    '2026-01-01', // Confraternizacao Universal
    '2026-02-16', // Carnaval (segunda)
    '2026-02-17', // Carnaval (terca)
    '2026-04-03', // Sexta-feira Santa
    '2026-04-21', // Tiradentes
    '2026-05-01', // Dia do Trabalho
    '2026-06-04', // Corpus Christi
    '2026-09-07', // Independencia
    '2026-10-12', // N. Sra. Aparecida
    '2026-11-02', // Finados
    '2026-11-15', // Proclamacao da Republica
    '2026-11-20', // Consciencia Negra (feriado nacional desde 2024)
    '2026-12-25', // Natal
    // ----- 2027 -----
    '2027-01-01',
    '2027-02-08', // Carnaval (segunda)
    '2027-02-09', // Carnaval (terca)
    '2027-03-26', // Sexta-feira Santa
    '2027-04-21',
    '2027-05-01',
    '2027-05-27', // Corpus Christi
    '2027-09-07',
    '2027-10-12',
    '2027-11-02',
    '2027-11-15',
    '2027-11-20',
    '2027-12-25',
  ]);

  /**
   * Calcula a data de entrega somando N dias uteis a partir de AMANHA.
   * @param prazoDias quantidade de dias uteis (>= 0)
   * @param referencia data de referencia (default = hoje). Usado em testes.
   * @returns Date posicionada no MEIO-DIA do horario de Brasilia (UTC-3),
   *          o que equivale a 15:00 UTC. Usar meio-dia evita off-by-one
   *          em conversoes de fuso entre o servidor (UTC) e o cliente (BRT).
   */
  calcularEntrega(prazoDias: number, referencia: Date = new Date()): Date {
    // Comeca do dia seguinte (hoje nunca conta, conforme regra de negocio).
    const data = new Date(referencia);
    data.setHours(0, 0, 0, 0);
    data.setDate(data.getDate() + 1);

    let diasUteisContados = 0;
    const meta = Math.max(0, Math.floor(prazoDias));

    // Avanca dia a dia ate completar a quantidade pedida.
    // Limite de seguranca: 365 iteracoes (1 ano), evita loop infinito.
    let seguranca = 0;
    while (diasUteisContados < meta && seguranca < 365) {
      if (this.ehDiaUtil(data)) {
        diasUteisContados++;
        if (diasUteisContados >= meta) break;
      }
      data.setDate(data.getDate() + 1);
      seguranca++;
    }

    // Posiciona em 12h BRT = 15h UTC. Isso garante que a data
    // permanece a mesma quando interpretada em qualquer fuso entre
    // UTC-12 e UTC+11, eliminando bug de "chega hoje" causado por
    // arredondamento de timezone do lado do cliente.
    data.setUTCHours(15, 0, 0, 0);
    return data;
  }

  /**
   * Verifica se uma data e dia util (nao final de semana e nao feriado).
   */
  private ehDiaUtil(data: Date): boolean {
    const diaSemana = data.getDay(); // 0=domingo, 6=sabado
    if (diaSemana === 0 || diaSemana === 6) return false;
    const chave = this.formatarData(data);
    if (this.FERIADOS.has(chave)) return false;
    return true;
  }

  /**
   * Formata Date como 'YYYY-MM-DD' no fuso LOCAL (nao UTC).
   * Importante: usar fuso local evita off-by-one em comparacoes de feriado
   * quando o servidor roda em UTC mas a regra de negocio e BRT.
   */
  private formatarData(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }
}
