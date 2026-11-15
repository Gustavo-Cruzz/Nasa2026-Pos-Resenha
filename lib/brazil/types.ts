export type MunicipalityContext = { code: string; name: string; uf: string };
export type ZarcRiskLevel = 20 | 30 | 40;
/** One MAPA Tábua de Risco table shared by the listed cycle groups (Cod_Ciclo) and soil codes (Cod_Solo). `risk[i]` is decêndio i+1: 0 = not indicated (CSV value 0), otherwise 20/30/40. */
export type ZarcWindow = {
  culture: string;
  management: string | null;
  cycleCodes: number[];
  soilCodes: number[];
  risk: Array<0 | ZarcRiskLevel>;
};
export type ZarcCropContext = {
  cropId: string;
  rowCount: number;
  zarcCultures: string[];
  cycleCodes: number[];
  soilCodes: number[];
  climateCodes: number[];
  managements: string[];
  ordinances: string[];
  riskCodes: number[];
  decendiosWithRiskCode: number[];
  windows: ZarcWindow[];
};
export type PamProductContext = { productCode: string; productLabel: string; cropIds: string[]; harvestedAreaHa: number | null; producedQuantity: number | null; productionUnit: string | null; caveat: string | null };
export type BrazilRegionalContext = {
  country: 'BR' | null;
  municipality: MunicipalityContext | null;
  municipalitySource: { version: '2025'; url: string; officialMeshUrl: string; accessedAt: string; referenceSystem: string; sha256: string } | null;
  zarc: {
    safra: string;
    sourceUrl: string;
    dictionaryUrl: string;
    accessedAt: string;
    sha256: string;
    crops: Record<string, ZarcCropContext>;
  } | null;
  pam: { year: string; sourceUrl: string; accessedAt: string; sha256: string; caveat: string; products: PamProductContext[] } | null;
  gaps: string[];
};
