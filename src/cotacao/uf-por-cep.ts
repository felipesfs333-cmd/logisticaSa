/**
 * Descobre a UF (estado) a partir do CEP, usando as faixas oficiais dos Correios.
 * O CEP deve vir como numero de 8 digitos (ex: 30110000).
 * Retorna a sigla do estado (ex: "MG") ou null se nao encontrar.
 */

interface FaixaUf {
  uf: string;
  inicio: number;
  fim: number;
}

// Faixas de CEP por estado (primeiros digitos), conforme Correios.
const FAIXAS: FaixaUf[] = [
  { uf: 'SP', inicio: 1000000, fim: 19999999 },
  { uf: 'RJ', inicio: 20000000, fim: 28999999 },
  { uf: 'ES', inicio: 29000000, fim: 29999999 },
  { uf: 'MG', inicio: 30000000, fim: 39999999 },
  { uf: 'BA', inicio: 40000000, fim: 48999999 },
  { uf: 'SE', inicio: 49000000, fim: 49999999 },
  { uf: 'PE', inicio: 50000000, fim: 56999999 },
  { uf: 'AL', inicio: 57000000, fim: 57999999 },
  { uf: 'PB', inicio: 58000000, fim: 58999999 },
  { uf: 'RN', inicio: 59000000, fim: 59999999 },
  { uf: 'CE', inicio: 60000000, fim: 63999999 },
  { uf: 'PI', inicio: 64000000, fim: 64999999 },
  { uf: 'MA', inicio: 65000000, fim: 65999999 },
  { uf: 'PA', inicio: 66000000, fim: 68899999 },
  { uf: 'AP', inicio: 68900000, fim: 68999999 },
  { uf: 'AM', inicio: 69000000, fim: 69299999 },
  { uf: 'RR', inicio: 69300000, fim: 69399999 },
  { uf: 'AM', inicio: 69400000, fim: 69899999 },
  { uf: 'AC', inicio: 69900000, fim: 69999999 },
  { uf: 'DF', inicio: 70000000, fim: 72799999 },
  { uf: 'GO', inicio: 72800000, fim: 72999999 },
  { uf: 'DF', inicio: 73000000, fim: 73699999 },
  { uf: 'GO', inicio: 73700000, fim: 76799999 },
  { uf: 'TO', inicio: 77000000, fim: 77999999 },
  { uf: 'MT', inicio: 78000000, fim: 78899999 },
  { uf: 'RO', inicio: 76800000, fim: 76999999 },
  { uf: 'MS', inicio: 79000000, fim: 79999999 },
  { uf: 'PR', inicio: 80000000, fim: 87999999 },
  { uf: 'SC', inicio: 88000000, fim: 89999999 },
  { uf: 'RS', inicio: 90000000, fim: 99999999 },
];

export function ufPorCep(cep: number): string | null {
  for (const f of FAIXAS) {
    if (cep >= f.inicio && cep <= f.fim) {
      return f.uf;
    }
  }
  return null;
}
