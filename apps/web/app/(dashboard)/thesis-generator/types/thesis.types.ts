export const THESIS_CHAPTERS = [
  'introduction',
  'methods',
  'results',
  'discussion',
  'conclusions',
  'bibliography',
  'annexes',
] as const;

export type ThesisChapter = (typeof THESIS_CHAPTERS)[number];

export const CHAPTER_LABELS: Record<ThesisChapter, string> = {
  introduction: 'Capítulo I: Introducción',
  methods: 'Capítulo II: Métodos',
  results: 'Capítulo III: Resultados',
  discussion: 'Capítulo IV: Discusión',
  conclusions: 'Capítulo V: Conclusiones y Recomendaciones',
  bibliography: 'Referencias Bibliográficas',
  annexes: 'Anexos',
};

export interface GenerateThesisDto {
  title: string;
  authors: string[];
  advisor: string;
  lineOfResearch: string;
  city?: string;
  year: number;
  documentType: 'THESIS_PROJECT' | 'SCIENTIFIC_ARTICLE' | 'THESIS' | 'THESIS_REPORT';
  schemaId?: string;
  outputFormats?: ('PDF' | 'DOCX')[];
  chapters?: ThesisChapter[];
}

export interface ThesisStatus {
  id: string;
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DownloadResponse {
  url: string;
}

export interface SyncResponse {
  id: string;
  status: ThesisStatus;
  downloadUrls: Record<string, string>;
}

export const LINEAS_INVESTIGACION = [
  'Inteligencia Artificial',
  'Ciencia de Datos',
  'Ciberseguridad',
  'Internet de las Cosas (IoT)',
  'Blockchain',
  'Energías Renovables',
  'Biotecnología',
  'Robótica',
  'Computación Cuántica',
  'Ingeniería de Software',
  'Sistemas Distribuidos',
  'Otra',
] as const;
