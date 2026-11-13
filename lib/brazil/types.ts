export type MunicipalityContext = { code: string; name: string; uf: string };
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
};
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
  gaps: string[];
};
