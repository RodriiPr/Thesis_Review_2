import type { AnalysisResult, FindingSeverity } from './types.js';

const MOCK_FINDINGS = [
  {
    sectionRef: 'Capítulo I — Planteamiento del problema',
    pageRef: 5,
    severity: 'MAJOR' as FindingSeverity,
    description: 'El planteamiento del problema no delimita claramente el contexto geográfico ni temporal del estudio.',
    correctionSteps: '1. Especifique el lugar y período del estudio. 2. Incluya datos cuantitativos que evidencien la magnitud del problema. 3. Cite al menos 3 fuentes recientes (últimos 5 años).',
    exampleImprovement: 'En la región X, durante el período 2020-2023, el 67% de las organizaciones presentan deficiencias en... (Autor, 2023).',
    recommendation: 'Consulte el repositorio CONCYTEC para estadísticas actualizadas del sector.',
  },
  {
    sectionRef: 'Marco teórico — Definiciones operacionales',
    pageRef: 18,
    severity: 'MAJOR' as FindingSeverity,
    description: 'Faltan definiciones operacionales para los conceptos clave del marco teórico.',
    correctionSteps: '1. Identifique las variables principales de su investigación. 2. Para cada variable, proporcione una definición operacional con cita de autoridad. 3. Distinga entre definición conceptual y operacional.',
    exampleImprovement: 'La variable "desempeño organizacional" se operacionaliza mediante el índice compuesto de eficiencia (ICE) = (resultados obtenidos / resultados esperados) × 100 (García, 2022).',
    recommendation: 'Revise los instrumentos de medición validados en estudios previos similares.',
  },
  {
    sectionRef: 'Referencias bibliográficas',
    pageRef: null,
    severity: 'MINOR' as FindingSeverity,
    description: 'Algunas referencias no siguen consistentemente el formato APA 7ª edición.',
    correctionSteps: '1. Verifique que todas las referencias incluyen DOI cuando está disponible. 2. Use cursiva solo para el título de la obra principal. 3. Ordene alfabéticamente por apellido del primer autor.',
    exampleImprovement: 'García López, M. A., & Rodríguez, T. (2023). Metodología de investigación en ciencias sociales (3.ª ed.). Editorial Universidad. https://doi.org/10.xxxx/xxxxx',
    recommendation: 'Use Zotero o Mendeley para gestionar automáticamente el formato APA.',
  },
  {
    sectionRef: 'Metodología — Diseño de investigación',
    pageRef: 28,
    severity: 'SUGGESTION' as FindingSeverity,
    description: 'La justificación del diseño metodológico podría fortalecerse con mayor fundamentación teórica.',
    correctionSteps: '1. Cite autores que respalden la elección del diseño (cuantitativo/cualitativo/mixto). 2. Explique por qué este diseño es el más adecuado para sus objetivos. 3. Mencione las limitaciones del diseño elegido.',
    exampleImprovement: 'Se adopta un enfoque cuantitativo correlacional porque "permite establecer relaciones entre variables sin manipulación directa" (Hernández-Sampieri, 2018, p. 93), lo cual es coherente con el objetivo de determinar la asociación entre...',
    recommendation: 'Consulte Creswell & Creswell (2022) para una justificación más robusta del diseño mixto si aplica.',
  },
];

export function mockAnalyze(advanceText: string, maxGrade: number): AnalysisResult {
  const start = Date.now();

  const textLength = advanceText.length;
  const baseScore = Math.min(95, Math.max(55, 60 + (textLength / 500)));

  const scores = {
    structure: Math.min(100, baseScore + (Math.random() * 10 - 5)),
    content: Math.min(100, baseScore - 5 + (Math.random() * 10 - 5)),
    form: Math.min(100, baseScore + 5 + (Math.random() * 10 - 5)),
    originality: Math.min(100, baseScore + (Math.random() * 10 - 5)),
    overall: 0,
  };

  scores.structure = Math.round(scores.structure);
  scores.content = Math.round(scores.content);
  scores.form = Math.round(scores.form);
  scores.originality = Math.round(scores.originality);
  scores.overall = Math.round(
    scores.structure * 0.3 +
    scores.content * 0.4 +
    scores.form * 0.2 +
    scores.originality * 0.1,
  );

  const grade = parseFloat(((scores.overall / 100) * maxGrade).toFixed(1));

  const quality = scores.overall >= 80 ? 'sólida' : scores.overall >= 65 ? 'aceptable' : 'deficiente';
  const executiveSummary =
    `El documento presenta una estructura ${quality} en relación al patrón institucional. ` +
    `La dimensión de contenido muestra ${scores.content >= 75 ? 'buena profundidad argumentativa' : 'deficiencias en la fundamentación teórica'}. ` +
    `Se detectaron ${MOCK_FINDINGS.filter(f => f.severity === 'CRITICAL' || f.severity === 'MAJOR').length} observaciones mayores que requieren atención prioritaria. ` +
    `Se recomienda enfocarse primero en ${scores.structure < scores.content ? 'mejorar la estructura de secciones' : 'fortalecer el marco conceptual'} antes de la próxima entrega.`;

  return {
    scores,
    grade,
    executiveSummary,
    findings: MOCK_FINDINGS.slice(0, Math.floor(Math.random() * 2) + 3).map(f => ({ ...f, pageRef: f.pageRef ?? undefined })),
    processingMs: Date.now() - start,
  };
}
