import { DocumentSchemaType } from '../../prisma';

export interface ThesisInput {
  title: string;
  authors: string[];
  advisor: string;
  lineOfResearch: string;
  city: string;
  year: number;
  documentType: DocumentSchemaType;
  chapters?: string[];
  structure?: any;
  variables?: Record<string, string>;
}

export interface GeneratedContent {
  [key: string]: string;
}

type LlmProvider = { type: 'deepseek'; apiKey: string; model: string }
  | { type: 'openai'; apiKey: string; model: string }
  | { type: 'ollama'; baseUrl: string; model: string };

function detectProvider(): LlmProvider {
  if (process.env.OLLAMA_MODEL) {
    return { type: 'ollama', baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434', model: process.env.OLLAMA_MODEL };
  }
  const key = process.env.DEEPSEEK_API_KEY;
  if (key) {
    return { type: 'deepseek', apiKey: key, model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash' };
  }
  return { type: 'openai', apiKey: process.env.OPENAI_API_KEY || '', model: 'gpt-4o' };
}

async function createLlm(provider: LlmProvider): Promise<any> {
  if (provider.type === 'ollama') {
    const { ChatOllama } = await import('@langchain/ollama');
    return new ChatOllama({
      baseUrl: provider.baseUrl,
      model: provider.model,
      temperature: 0.7,
      numPredict: 8192,
    });
  }
  if (provider.type === 'openai') {
    const { ChatOpenAI } = await import('@langchain/openai');
    return new ChatOpenAI({
      apiKey: provider.apiKey,
      model: provider.model,
      temperature: 0.7,
      maxTokens: 8192,
    });
  }
  const { ChatDeepSeek } = await import('@langchain/deepseek');
  return new ChatDeepSeek({
    apiKey: provider.apiKey,
    model: provider.model,
    temperature: 0.7,
    maxTokens: 8192,
  });
}

function generateMockContent(input: ThesisInput, chapter: string): string {
  const mockTexts: Record<string, string> = {
    introduction: `<p>El presente estudio aborda la problemática de ${input.title} en el contexto actual, donde la literatura especializada ha identificado brechas significativas en el conocimiento. A nivel global, diversos autores han señalado la necesidad de investigar esta temática desde una perspectiva multidimensional (García, 2023; López & Martínez, 2024).</p><p>En el ámbito regional, los estudios previos han demostrado que las variables asociadas a ${input.lineOfResearch} presentan una complejidad que requiere un análisis detallado y sistemático. La investigación de Rodríguez et al. (2025) evidenció que existe una correlación significativa entre los factores contextuales y los resultados esperados.</p><p>El marco teórico se sustenta en tres enfoques fundamentales: la teoría de sistemas adaptativos complejos (Holland, 2022), el modelo de análisis multidimensional propuesto por Pérez (2023), y el enfoque integrador de Sánchez & Torres (2024), los cuales proporcionan una base sólida para el desarrollo de esta investigación.</p><p>La justificación del estudio radica en su relevancia académica, social y práctica. Desde el punto de vista académico, contribuye a llenar un vacío en la literatura especializada. Socialmente, los resultados podrían tener implicaciones significativas para la toma de decisiones en el ámbito de ${input.lineOfResearch}.</p>`,
    methods: JSON.stringify({
      type: "La presente investigación se enmarca dentro del enfoque cuantitativo de tipo aplicado, buscando dar solución a problemas prácticos organizacionales.",
      level: "El nivel de la investigación es correlacional-causal, orientado a determinar la relación e impacto entre las variables de estudio.",
      design: "El diseño es no experimental, de corte transversal, observando las variables en su entorno natural sin manipulación deliberada.",
      population: `La población comprende a los profesionales, especialistas y usuarios asociados al dominio de la línea de investigación dentro del ámbito institucional delimitado.`,
      sample: "La muestra representativa se calculó mediante fórmula estadística para poblaciones finitas, constando de 120 sujetos aptos para el análisis.",
      sampling: "El muestreo aplicado es de tipo probabilístico estratificado, asegurando que cada subgrupo tenga representación proporcional.",
      techniques: "La técnica de recolección es la encuesta y el instrumento es un cuestionario validado mediante juicio de expertos con una alta confiabilidad alpha de Cronbach.",
      procedure: "El procedimiento contempla la delimitación del problema, la validación instrumental, la recolección de campo y el posterior procesamiento de datos.",
      ethics: "Se aplican rigurosas consideraciones éticas, garantizando el anonimato de los participantes y el consentimiento informado."
    }),
    results: `<p>Los resultados del análisis descriptivo muestran que el 65% de los participantes presenta un nivel medio de conocimiento sobre las variables estudiadas. La media general fue de 3.42 (DE = 0.78), lo que indica una tendencia moderadamente favorable.</p><p>En relación al objetivo general, se encontró una correlación positiva significativa entre las variables principales (r = 0.68, p < 0.001). El análisis de regresión múltiple evidenció que el modelo explica el 54% de la varianza total (R² ajustado = 0.54, F(3,116) = 45.67, p < 0.001).</p><p>Las pruebas de hipótesis confirmaron que existen diferencias estadísticamente significativas entre los grupos analizados (t = 3.45, gl = 98, p < 0.01), lo que permite rechazar la hipótesis nula y aceptar la hipótesis alternativa planteada.</p>`,
    discussion: `<p>Los hallazgos de esta investigación coinciden con los reportados por García (2023), quien encontró patrones similares en su estudio sobre ${input.lineOfResearch}. Sin embargo, difieren parcialmente de los resultados de Martínez et al. (2024), posiblemente debido a diferencias en el contexto y la metodología empleada.</p><p>La correlación positiva encontrada entre las variables principales refuerza la teoría de sistemas adaptativos propuesta por Holland (2022), sugiriendo que los mecanismos de retroalimentación juegan un papel crucial en la dinámica del sistema.</p><p>Las implicaciones prácticas de estos resultados son relevantes para profesionales y tomadores de decisiones en el ámbito de ${input.lineOfResearch}. Se recomienda implementar programas de intervención basados en los factores identificados como predictores significativos.</p>`,
    conclusions: `<p>Primera: Se determinó que existe una relación significativa entre las variables principales del estudio, confirmando la hipótesis general planteada.</p><p>Segunda: El análisis de los objetivos específicos permitió identificar que los factores contextuales influyen de manera determinante en los resultados del estudio.</p><p>Tercera: La metodología empleada demostró ser adecuada para el tipo de investigación realizada, obteniendo niveles de confiabilidad y validez satisfactorios.</p><p>Cuarta: Se recomienda a futuros investigadores ampliar la muestra y considerar variables adicionales que puedan enriquecer el modelo explicativo.</p><p>Quinta: Las instituciones del sector deberían implementar programas de capacitación basados en los hallazgos de este estudio para mejorar las prácticas en el área de ${input.lineOfResearch}.</p>`,
    references: `<ul class="references-list">
<li>García, M. (2023). Metodología de investigación en ciencias sociales. Editorial Universidad.</li>
<li>Hernández-Sampieri, R. (2023). Metodología de la investigación (7ª ed.). McGraw-Hill.</li>
<li>Holland, J. H. (2022). Complex adaptive systems. MIT Press.</li>
<li>López, A., & Martínez, P. (2024). Innovación tecnológica y desarrollo sostenible. Revista de Investigación Científica, 45(2), 123-145.</li>
<li>Pérez, R. (2023). Modelos de análisis multidimensional. Journal of Research Methods, 18(3), 67-89.</li>
<li>Rodríguez, C., et al. (2025). Factores determinantes en la investigación académica. Revista Latinoamericana de Ciencia, 12(1), 45-78.</li>
<li>Sánchez, L., & Torres, M. (2024). Enfoques integradores para la investigación contemporánea. Editorial Académica.</li>
</ul>`,
    annexes: `<div class="annex-title">Anexo A: Árbol de Problemas</div>
<pre class="annex-tree">
                        ┌──────────────────────────────┐
                        │  Resultados insatisfactorios  │
                        │  en el ámbito de investigación │
                        └──────────────┬───────────────┘
                                       │
                        ┌──────────────┴───────────────┐
                        │  Limitada aplicación de los  │
                        │  hallazgos en la práctica     │
                        └──────────────┬───────────────┘
                                       │
                        ┌──────────────┴───────────────┐
                        │     PROBLEMA CENTRAL:         │
                        │  Deficiencias en la           │
                        │  comprensión del fenómeno     │
                        └──────────────┬───────────────┘
                                       │
               ┌───────────────────────┼───────────────────────┐
               │                       │                       │
┌──────────────┴───────────┐ ┌────────┴────────┐ ┌────────────┴───────────┐
│  Escasa literatura       │ │  Limitada        │ │  Falta de metodologías │
│  especializada           │ │  formación       │ │  adecuadas             │
└──────────────────────────┘ └─────────────────┘ └────────────────────────┘
</pre>
<div class="annex-title">Anexo B: Árbol de Objetivos</div>
<pre class="annex-tree">
                        ┌──────────────────────────────┐
                        │  Resultados satisfactorios    │
                        │  en el ámbito de investigación │
                        └──────────────┬───────────────┘
                                       │
                        ┌──────────────┴───────────────┐
                        │  Aplicación efectiva de los  │
                        │  hallazgos en la práctica     │
                        └──────────────┬───────────────┘
                                       │
                        ┌──────────────┴───────────────┐
                        │     OBJETIVO CENTRAL:         │
                        │  Comprensión integral del     │
                        │  fenómeno de estudio          │
                        └──────────────┬───────────────┘
                                       │
               ┌───────────────────────┼───────────────────────┐
               │                       │                       │
┌──────────────┴───────────┐ ┌────────┴────────┐ ┌────────────┴───────────┐
│  Generar nueva           │ │  Fortalecer      │ │  Implementar           │
│  literatura              │ │  capacidades     │ │  metodologías          │
│  especializada           │ │  formativas      │ │  adecuadas             │
└──────────────────────────┘ └─────────────────┘ └────────────────────────┘
</pre>`,
    abstract: `<p>El presente artículo científico describe el diseño y desarrollo de una solución basada en el título "${input.title}". A través de una metodología descriptiva-explicativa, se analizan los factores fundamentales relacionados con la línea de investigación "${input.lineOfResearch}". Los resultados muestran correlaciones significativas, lo cual permite concluir sobre la relevancia práctica y metodológica de la propuesta.</p>`,
    keywords: `Análisis, Desarrollo, Innovación, ${input.lineOfResearch || 'Investigación'}`,
    title_en: `Integrated Data Architecture with Intelligent Document Extraction for Credit Risk Assessment in Microfinance Institutions`,
  };

  if (chapter === 'variables') {
    return JSON.stringify(getMockVariables(input));
  }

  const chapterKey = chapter.toLowerCase().replace(/[\s\-]/g, '');
  const matchKey = Object.keys(mockTexts).find(k => chapterKey.includes(k) || k.includes(chapterKey));
  if (matchKey) return mockTexts[matchKey];

  return `<h2>${chapter}</h2>
<p>Contenido generado para la sección "${chapter}" del documento académico "${input.title}". Esta sección presenta un análisis detallado de los aspectos fundamentales relacionados con la línea de investigación ${input.lineOfResearch}. El contenido académico sigue los lineamientos establecidos por la metodología de investigación científica y las normas APA 7ª edición.</p>`;
}

function getVariablesContextText(variables?: Record<string, string>): string {
  if (!variables || !variables.vi) return '';
  return `
VARIABLES CLAVE DE LA INVESTIGACIÓN (Debes integrarlas de forma natural y coherente en la redacción de esta sección):
- Variable Independiente (VI): ${variables.vi}
  * Definición Conceptual: ${variables.vi_def_conceptual}
  * Definición Operacional: ${variables.vi_def_operacional}
- Variable Dependiente 1 (VD1): ${variables.vd1}
  * Definición Conceptual: ${variables.vd1_def_conceptual}
  * Definición Operacional: ${variables.vd1_def_operacional}
${variables.vd2 ? `- Variable Dependiente 2 (VD2): ${variables.vd2}\n  * Definición Conceptual: ${variables.vd2_def_conceptual}\n  * Definición Operacional: ${variables.vd2_def_operacional}` : ''}
${variables.vd3 ? `- Variable Dependiente 3 (VD3): ${variables.vd3}\n  * Definición Conceptual: ${variables.vd3_def_conceptual}\n  * Definición Operacional: ${variables.vd3_def_operacional}` : ''}
`;
}

function buildVariablesExtractionPrompt(title: string, lineOfResearch: string): string {
  return `Eres un académico experto en metodología de la investigación.
Analiza el título de la investigación y la línea de investigación para identificar la Variable Independiente (VI) y hasta 3 Variables Dependientes (VD1, VD2, VD3).
Luego, para cada variable identificada, define de forma concisa:
1. Definición Conceptual
2. Definición Operacional
3. Dimensión principal
4. Indicador principal
5. Escala de medición

DATOS:
- Título: "${title}"
- Línea de investigación: "${lineOfResearch}"

Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura (sin bloques de código markdown \`\`\`, sin texto antes o después, solo el JSON puro):
{
  "vi": "Nombre de la Variable Independiente",
  "vi_def_conceptual": "Definición conceptual...",
  "vi_def_operacional": "Definición operacional...",
  "vi_dimension": "Dimensión...",
  "vi_indicador": "Indicador...",
  "vi_escala": "Escala...",
  
  "vd1": "Nombre de la Variable Dependiente 1",
  "vd1_def_conceptual": "Definición conceptual...",
  "vd1_def_operacional": "Definición operacional...",
  "vd1_dimension": "Dimensión...",
  "vd1_indicador": "Indicador...",
  "vd1_escala": "Escala...",
  
  "vd2": "Nombre de la Variable Dependiente 2 (en blanco si no aplica)",
  "vd2_def_conceptual": "...",
  "vd2_def_operacional": "...",
  "vd2_dimension": "...",
  "vd2_indicador": "...",
  "vd2_escala": "...",
  
  "vd3": "Nombre de la Variable Dependiente 3 (en blanco si no aplica)",
  "vd3_def_conceptual": "...",
  "vd3_def_operacional": "...",
  "vd3_dimension": "...",
  "vd3_indicador": "...",
  "vd3_escala": "..."
}
`;
}

function getMockVariables(input: ThesisInput): Record<string, string> {
  return {
    vi: "Arquitectura de datos integrada con extracción inteligente de documentos",
    vi_def_conceptual: "La arquitectura de datos integrada con extracción inteligente es un marco tecnológico estructurado que automatiza la captura, preprocesamiento y almacenamiento de datos no estructurados usando inteligencia artificial para optimizar el análisis organizacional.",
    vi_def_operacional: "Se mide a través de la tasa de acierto en la extracción de campos, el tiempo de procesamiento en milisegundos y el porcentaje de consistencia en el esquema de la base de datos.",
    vi_dimension: "Tecnología de la información / Automatización de procesos",
    vi_indicador: "Porcentaje de precisión en la extracción de datos",
    vi_escala: "Razón / Porcentual",
    
    vd1: "Evaluación de riesgo crediticio",
    vd1_def_conceptual: "La evaluación del riesgo crediticio es el proceso mediante el cual una entidad financiera estima la probabilidad de que un prestatario incumpla con sus obligaciones financieras contratadas.",
    vd1_def_operacional: "Se cuantifica mediante la tasa de morosidad de la cartera, el índice de cobertura de provisiones y el puntaje crediticio promedio de la muestra.",
    vd1_dimension: "Gestión financiera de riesgo",
    vd1_indicador: "Tasa de morosidad de la cartera",
    vd1_escala: "Razón / Porcentual",
    
    vd2: "Entidades microfinancieras",
    vd2_def_conceptual: "Las entidades microfinancieras son organizaciones financieras orientadas a proveer servicios de crédito, ahorro y seguros a micro y pequeñas empresas que carecen de acceso a la banca tradicional.",
    vd2_def_operacional: "Se evalúa por el número de sucursales activas, el volumen total de la cartera de microcréditos colocados y el número de clientes atendidos.",
    vd2_dimension: "Contexto sectorial microfinanciero",
    vd2_indicador: "Volumen de créditos colocados",
    vd2_escala: "Escala numérica de moneda",
    
    vd3: "Eficiencia operativa",
    vd3_def_conceptual: "La eficiencia operativa es la relación entre los insumos utilizados y los productos obtenidos en la ejecución de los procesos internos de la organización.",
    vd3_def_operacional: "Se mide mediante el ratio de gastos operativos sobre activos totales y el número medio de solicitudes procesadas por analista por día.",
    vd3_dimension: "Procesos organizacionales",
    vd3_indicador: "Tiempo medio de aprobación de solicitudes",
    vd3_escala: "Escala de tiempo en minutos"
  };
}

function buildDynamicChapterPrompt(input: ThesisInput, chapterName: string, chapterDesc: string, chapterReqs: string[]): string {
  const varsCtx = getVariablesContextText(input.variables);
  return `Eres un académico experto en metodología de la investigación científica. 
Genera el contenido para la sección "${chapterName}" de un documento académico tipo "${input.documentType}".

DATOS DEL PROYECTO:
- Título: "${input.title}"
- Autor(es): ${input.authors.join(', ')}
- Asesor: ${input.advisor}
- Línea de investigación: ${input.lineOfResearch}
${varsCtx}

DESCRIPCIÓN DE LA SECCIÓN:
${chapterDesc}

REQUISITOS ESPECÍFICOS:
${chapterReqs.map(req => `- ${req}`).join('\n')}

REQUISITOS GENERALES DE FORMA:
- Texto en prosa académica formal.
- Cada párrafo de 150-250 palabras.
- Incluir citas APA en texto con formato (Autor, Año).
- Usar etiquetas HTML <p> para párrafos y <h2>/<h3> para subtítulos si es necesario.
- El contenido debe ser académicamente plausible y coherente con el título.
- NO incluyas el título principal o numeración del capítulo al inicio (por ejemplo, no empieces con "${chapterName}"). Empieza a escribir directamente el contenido.

Responde ÚNICAMENTE con el HTML del contenido, sin etiquetas html/body/head adicionales.`;
}

function buildIntroductionPrompt(input: ThesisInput): string {
  const varsCtx = getVariablesContextText(input.variables);
  return `Eres un académico experto en metodología de la investigación científica. 
Genera el CAPÍTULO I - INTRODUCCIÓN completo para un proyecto de tesis universitario.

DATOS DEL PROYECTO:
- Título: "${input.title}"
- Autor(es): ${input.authors.join(', ')}
- Asesor: ${input.advisor}
- Línea de investigación: ${input.lineOfResearch}
- Tipo: ${input.documentType === DocumentSchemaType.THESIS_PROJECT ? 'Proyecto de Tesis' : 'Informe de Proyecto de Tesis'}
${varsCtx}

REQUISITOS DEL CONTENIDO:
1. REALIDAD PROBLEMÁTICA (3-4 párrafos): Contextualización del problema a nivel global, regional y local.
2. ANTECEDENTES (4-5 párrafos): Revisión de investigaciones previas relevantes con citas APA.
3. MARCO TEÓRICO (5-6 párrafos): Incluir EXACTAMENTE 3 metodologías o enfoques teóricos estándar del área de ${input.lineOfResearch}.
4. JUSTIFICACIÓN (2-3 párrafos): Relevancia académica, social y económica.
5. PLANTEAMIENTO DEL PROBLEMA (1-2 párrafos): Pregunta de investigación principal bien formulada.
6. HIPÓTESIS (1-2 párrafos): Hipótesis nula y alternativa (o descriptivas según corresponda).
7. OBJETIVO GENERAL (1 párrafo): Objetivo general del estudio.
8. OBJETIVOS ESPECÍFICOS (listado): Mínimo 3 objetivos específicos.
9. LIMITACIONES DEL ESTUDIO (1-2 párrafos): Limitaciones identificadas.

REQUISITOS DE FORMA:
- Texto en prosa CONTINUA, SIN subtítulos internos numerados
- Cada párrafo de 150-250 palabras
- Incluir citas APA en texto con formato (Autor, Año)
- Tono formal y académico
- Mínimo 15 páginas de contenido (aproximadamente 4500-6000 palabras)
- El contenido debe ser académicamente plausible y coherente con el título y línea de investigación
- NO incluir títulos de sección como "Realidad Problemática" ni el encabezado principal "INTRODUCCIÓN" al inicio del texto. Empieza directamente con el contenido de la realidad problemática.
- Las citas en texto deben seguir formato APA estricto

Responde ÚNICAMENTE con el HTML del capítulo, usando etiquetas <p> para cada párrafo, sin etiquetas html/body/head adicionales.`;
}

function buildReferencesPrompt(input: ThesisInput): string {
  return `Genera una lista de AL MENOS 30 referencias bibliográficas en formato APA 7ma edición EXACTO, relacionadas con el tema: "${input.title}" en la línea de investigación: ${input.lineOfResearch}.

REQUISITOS:
- Formato APA 7ma edición EXACTO con sangría francesa
- 80% de los últimos 5 años (2021-${input.year})
- 80% en idioma inglés
- 80% artículos de revistas indexadas (Scopus/WoS)
- Incluir DOI cuando exista
- Orden alfabético por apellido del primer autor
- Mínimo 30 referencias
- Temáticas relevantes al título y línea de investigación

Responde ÚNICAMENTE con una lista HTML (<ul class="references-list">) donde cada <li> sea una referencia en formato APA 7 exacto.`;
}

function buildAnnexesPrompt(input: ThesisInput): string {
  return `Genera los anexos para un proyecto de tesis titulado "${input.title}" en la línea de ${input.lineOfResearch}.

1. ÁRBOL DE PROBLEMAS: Diagrama textual jerárquico que muestre:
   - El problema central en el medio
   - Causas principales en la parte inferior
   - Efectos/consecuencias en la parte superior
   Usa caracteres ASCII para las conexiones (│, ├──, └──)

2. ÁRBOL DE OBJETIVOS: Transformación positiva del árbol de problemas
   - El objetivo central (solución) en el medio
   - Medios (transformación de causas) en la parte inferior
   - Fines (transformación de efectos) en la parte superior

Responde ÚNICAMENTE con:
<div class="annex-title">Anexo A: Árbol de Problemas</div>
<pre class="annex-tree">[árbol de problemas en ASCII]</pre>
<div class="annex-title">Anexo B: Árbol de Objetivos</div>
<pre class="annex-tree">[árbol de objetivos en ASCII]</pre>`;
}

function buildMethodsPrompt(input: ThesisInput): string {
  const varsCtx = getVariablesContextText(input.variables);
  return `Eres un académico experto en metodología de la investigación científica.
Genera el contenido detallado para el diseño metodológico de la investigación.

DATOS DEL PROYECTO:
- Título: "${input.title}"
- Autor(es): ${input.authors.join(', ')}
- Asesor: ${input.advisor}
- Línea de investigación: ${input.lineOfResearch}
${varsCtx}

Debes estructurar el diseño metodológico respondiendo en formato JSON puro.
Cada sección debe ser redactada en prosa académica formal (2-3 párrafos cada una, con citas APA si corresponde, sin numeraciones ni títulos al inicio del texto).

Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura (sin bloques de código markdown \`\`\`, sin texto adicional, solo el JSON puro):
{
  "type": "Redacción detallada sobre el Tipo de investigación general (enfoque, paradigma).",
  "type_orientation": "Redacción detallada de acuerdo a la orientación o finalidad de la investigación.",
  "type_contrast": "Redacción detallada de acuerdo a la técnica de contrastación de la hipótesis.",
  "level": "Redacción detallada sobre el Nivel de investigación (descriptivo, correlacional, explicativo, etc.).",
  "design": "Redacción detallada sobre el Diseño de investigación (no experimental, transversal, correlacional-causal, etc.).",
  "population": "Redacción detallada sobre la Población objeto de estudio.",
  "sample": "Redacción detallada sobre la Muestra representativa seleccionada para el estudio.",
  "sampling": "Redacción detallada sobre el método de Muestreo (probabilístico o no probabilístico, criterios de inclusión/exclusión).",
  "techniques": "Redacción detallada sobre las Técnicas e instrumentos de recolección de datos (sin incluir validez/confiabilidad ni análisis).",
  "validation": "Redacción detallada sobre los criterios de validez y confiabilidad de los instrumentos de recolección de datos.",
  "procedure": "Redacción detallada sobre el Procedimiento secuencial para ejecutar la investigación.",
  "analysis": "Redacción detallada sobre los Métodos de análisis de datos (análisis estadístico descriptivo e inferencial, pruebas de hipótesis, etc.).",
  "ethics": "Redacción detallada sobre las Consideraciones éticas aplicadas en el tratamiento de los datos."
}
`;
}

function buildResultsPrompt(input: ThesisInput): string {
  const varsCtx = getVariablesContextText(input.variables);
  return `Eres un académico experto en investigación científica.
Genera el CAPÍTULO III - RESULTADOS completo para una tesis universitaria.

DATOS DEL PROYECTO:
- Título: "${input.title}"
- Autor(es): ${input.authors.join(', ')}
- Línea de investigación: ${input.lineOfResearch}
${varsCtx}

ESTRUCTURA REQUERIDA:
1. Análisis exploratorio de los datos recolectados
2. Preprocesamiento y preparación de los datos
3. Entrenamiento y evaluación de modelos o aplicación de la metodología propuesta
4. Validación de los resultados obtenidos

REQUISITOS:
- Presentar resultados de manera objetiva y descriptiva
- Incluir tablas y descripciones de hallazgos
- Mencionar métricas de evaluación relevantes al área
- Texto académico formal con párrafos de 150-250 palabras
- Aproximadamente 3000-4000 palabras
- Usar etiquetas <p> para párrafos, <table> para tablas
- NO incluyas el título principal "RESULTADOS" ni numeraciones principales al inicio. Empieza a escribir directamente el contenido.

Responde ÚNICAMENTE con el HTML del capítulo, sin etiquetas html/body/head adicionales.`;
}

function buildDiscussionPrompt(input: ThesisInput): string {
  const varsCtx = getVariablesContextText(input.variables);
  return `Eres un académico experto en investigación científica.
Genera el CAPÍTULO IV - DISCUSIÓN completo para una tesis universitaria.

DATOS DEL PROYECTO:
- Título: "${input.title}"
- Autor(es): ${input.authors.join(', ')}
- Línea de investigación: ${input.lineOfResearch}
${varsCtx}

ESTRUCTURA REQUERIDA:
1. Interpretación de los resultados obtenidos
2. Comparación con estudios previos y antecedentes
3. Implicaciones teóricas y prácticas de los hallazgos
4. Limitaciones del estudio y su impacto en los resultados

REQUISITOS:
- Analizar y contrastar los resultados con la literatura existente
- Incluir citas APA comparativas
- Texto crítico y reflexivo
- Párrafos de 150-250 palabras
- Aproximadamente 2500-3500 palabras
- Usar etiquetas <p> para cada párrafo
- NO incluyas el título principal "DISCUSIÓN" al inicio. Empieza a escribir directamente el contenido.

Responde ÚNICAMENTE con el HTML del capítulo, sin etiquetas html/body/head adicionales.`;
}

function buildConclusionsPrompt(input: ThesisInput): string {
  const varsCtx = getVariablesContextText(input.variables);
  return `Eres un académico experto en investigación científica.
Genera el CAPÍTULO V - CONCLUSIONES Y RECOMENDACIONES completo para una tesis universitaria.

DATOS DEL PROYECTO:
- Título: "${input.title}"
- Autor(es): ${input.authors.join(', ')}
- Línea de investigación: ${input.lineOfResearch}
${varsCtx}

ESTRUCTURA REQUERIDA:
1. CONCLUSIONES (5-8 conclusiones numeradas)
   - Relacionadas directamente con cada objetivo específico
   - Basadas en los resultados obtenidos
   - Redacción clara y concisa

2. RECOMENDACIONES (3-5 recomendaciones numeradas)
   - Para futuras investigaciones
   - Para la práctica profesional o institucional
   - Para mejora de la metodología

REQUISITOS:
- Cada conclusión en un párrafo independiente
- Las recomendaciones deben derivarse lógicamente de las conclusiones
- Aproximadamente 1500-2000 palabras
- Usar <p> para cada punto con formato claro
- NO incluyas encabezados principales como "5.1 Conclusiones", "5.2 Recomendaciones", "CONCLUSIONES" ni "RECOMENDACIONES" como títulos de sección. Escribe el listado directamente en párrafos.

Responde ÚNICAMENTE con el HTML del capítulo, sin etiquetas html/body/head adicionales.`;
}

function buildAbstractPrompt(input: ThesisInput): string {
  const varsCtx = getVariablesContextText(input.variables);
  return `Eres un académico experto en investigación científica.
Genera el RESUMEN (Abstract) en un solo párrafo (entre 150 y 200 palabras) para un artículo científico.
Debe incluir: justificación breve, objetivo general, metodología resumida, resultados principales y conclusiones.

DATOS DEL PROYECTO:
- Título: "${input.title}"
- Línea de investigación: "${input.lineOfResearch}"
${varsCtx}

Responde ÚNICAMENTE con el texto del resumen, sin etiquetas HTML ni formato markdown.`;
}

function buildKeywordsPrompt(input: ThesisInput): string {
  return `Eres un académico experto en investigación científica.
Genera de 3 a 5 PALABRAS CLAVE (Keywords) para el siguiente artículo científico.
Las palabras clave deben estar en orden alfabético, separadas por comas.

DATOS DEL PROYECTO:
- Título: "${input.title}"
- Línea de investigación: "${input.lineOfResearch}"

Responde ÚNICAMENTE con la lista de palabras clave (ej: "Análisis de datos, Aprendizaje automático, Inteligencia artificial").`;
}

function stringifyValue(p: any): string {
  if (p === null || p === undefined) return '';
  if (typeof p === 'string') return p.trim();
  if (Array.isArray(p)) {
    return p.map(item => stringifyValue(item)).filter(Boolean).join('\n');
  }
  if (typeof p === 'object') {
    return Object.entries(p)
      .map(([key, val]) => `<strong>${key}</strong>: ${stringifyValue(val)}`)
      .join('\n');
  }
  return String(p).trim();
}

function safeParseJson(jsonStr: string): any {
  // First, extract the JSON block if there's surrounding text
  let cleaned = jsonStr.trim();
  const jsonBlockMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonBlockMatch) {
    cleaned = jsonBlockMatch[0];
  }
  
  // Clean markdown wrappers
  cleaned = cleaned.replace(/```json/i, '').replace(/```/g, '').trim();

  // Try standard JSON.parse first
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("Standard JSON.parse failed, trying to repair JSON...", e);
  }

  // Try to repair trailing commas and backslashes
  try {
    const repaired = cleaned
      .replace(/\\(?!["\\/bfnrtu])/g, '\\\\')
      .replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(repaired);
  } catch (e) {
    console.warn("Repaired JSON.parse failed, using regex-based extraction...", e);
  }

  // Fallback to regex-based extraction
  try {
    const EXPECTED_KEYS = [
      'vi', 'vi_def_conceptual', 'vi_def_operacional', 'vi_dimension', 'vi_indicador', 'vi_escala',
      'vd1', 'vd1_def_conceptual', 'vd1_def_operacional', 'vd1_dimension', 'vd1_indicador', 'vd1_escala',
      'vd2', 'vd2_def_conceptual', 'vd2_def_operacional', 'vd2_dimension', 'vd2_indicador', 'vd2_escala',
      'vd3', 'vd3_def_conceptual', 'vd3_def_operacional', 'vd3_dimension', 'vd3_indicador', 'vd3_escala',
      'type', 'type_orientation', 'type_contrast', 'level', 'design', 'population', 'sample', 'sampling', 'techniques', 'validation', 'procedure', 'analysis', 'ethics'
    ];
    const keysPattern = EXPECTED_KEYS.join('|');
    const pairRegex = new RegExp('"(' + keysPattern + ')"\\s*:\\s*"([\\s\\S]*?)"(?=\\s*,\\s*"(?:' + keysPattern + ')"\\s*:|\\s*\\})', 'g');
    
    const result: Record<string, string> = {};
    let match;
    let matchCount = 0;
    while ((match = pairRegex.exec(cleaned)) !== null) {
      const key = match[1];
      let val = match[2];
      val = val
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t');
      result[key] = val;
      matchCount++;
    }
    
    if (matchCount > 0) {
      console.log(`Successfully extracted ${matchCount} keys from malformed JSON via regex.`);
      return result;
    }
  } catch (regexErr) {
    console.error("Regex-based JSON extraction failed:", regexErr);
  }

  throw new Error("Could not parse JSON even with regex fallback");
}

export class ContentGenerator {
  private readonly primaryProvider: LlmProvider;
  private readonly fallbackProvider: LlmProvider | null;
  private currentInput: ThesisInput | null = null;

  constructor(apiKey?: string) {
    const envProvider = detectProvider();
    if (apiKey) {
      this.primaryProvider = { type: 'deepseek', apiKey, model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash' };
    } else {
      this.primaryProvider = envProvider;
    }
    this.fallbackProvider = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== (apiKey || process.env.DEEPSEEK_API_KEY)
      ? { type: 'openai', apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4o' }
      : null;
  }

  async generate(input: ThesisInput): Promise<GeneratedContent> {
    this.currentInput = input;
    const results: GeneratedContent = {};

    // 1. Generate/extract variables first
    const variablesPrompt = buildVariablesExtractionPrompt(input.title, input.lineOfResearch);
    const variablesRaw = await this.callModel(variablesPrompt, 'variables');
    let variablesJson: Record<string, string> = {};
    try {
      variablesJson = safeParseJson(variablesRaw);
    } catch (e) {
      console.warn('Failed to parse variables JSON from model, using mock', e);
      variablesJson = getMockVariables(input);
    }

    // Set variables on input so prompt builders can use them
    input.variables = variablesJson;

    // Si hay una estructura dinámica definida en el input, usarla
    if (input.structure && input.structure.chapters) {
      const chapterPromises = input.structure.chapters.map(async (ch: any) => {
        const prompt = buildDynamicChapterPrompt(input, ch.name, ch.description, ch.requirements || []);
        const content = await this.callModel(prompt, ch.name);
        return { name: ch.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""), content };
      });

      const chapters = await Promise.all(chapterPromises);
      chapters.forEach(ch => {
        results[ch.name] = ch.content;
      });

      // Asegurar que siempre se generen referencias y anexos si se pide
      if (input.chapters?.includes('bibliography') && !results['bibliography']) {
        results['references'] = await this.callModel(buildReferencesPrompt(input), 'references');
      }
      if (input.chapters?.includes('annexes') && !results['annexes']) {
        results['annexes'] = await this.callModel(buildAnnexesPrompt(input), 'annexes');
      }

      // Add variables to output results
      Object.assign(results, variablesJson);

      return results;
    }

    // Comportamiento por defecto (legacy)
    const selected = input.chapters ?? ['introduction', 'bibliography', 'annexes'];

    const introTask = selected.includes('introduction')
      ? this.callModel(buildIntroductionPrompt(input), 'introduction')
      : Promise.resolve('');

    const methodsTask = selected.includes('methods')
      ? this.callModel(buildMethodsPrompt(input), 'methods')
      : Promise.resolve('');

    const resultsTask = selected.includes('results')
      ? this.callModel(buildResultsPrompt(input), 'results')
      : Promise.resolve('');

    const discussionTask = selected.includes('discussion')
      ? this.callModel(buildDiscussionPrompt(input), 'discussion')
      : Promise.resolve('');

    const conclusionsTask = selected.includes('conclusions')
      ? this.callModel(buildConclusionsPrompt(input), 'conclusions')
      : Promise.resolve('');

    const referencesTask = selected.includes('bibliography')
      ? this.callModel(buildReferencesPrompt(input), 'references')
      : Promise.resolve('');

    const annexesTask = selected.includes('annexes')
      ? this.callModel(buildAnnexesPrompt(input), 'annexes')
      : Promise.resolve('');

    const abstractTask = this.callModel(buildAbstractPrompt(input), 'abstract');
    const keywordsTask = this.callModel(buildKeywordsPrompt(input), 'keywords');
    const titleEnTask = this.callModel(`Traduce el siguiente título de investigación al inglés (menos de 20 palabras, solo responde con la traducción limpia, sin comillas ni textos adicionales): "${input.title}"`, 'title_en');

    const [introduction, methodsRaw, res, discussion, conclusions, references, annexes, abstract, keywords, title_en] =
      await Promise.all([
        introTask,
        methodsTask,
        resultsTask,
        discussionTask,
        conclusionsTask,
        referencesTask,
        annexesTask,
        abstractTask,
        keywordsTask,
        titleEnTask,
      ]);

    let methodsJson: Record<string, string> = {};
    let methodsHtml = '';
    
    if (selected.includes('methods')) {
      try {
        const parsed = safeParseJson(methodsRaw);
        const mapped: Record<string, string> = {};
        for (const key of Object.keys(parsed)) {
          mapped[key] = stringifyValue(parsed[key]);
        }
        methodsJson = mapped;
        methodsHtml = Object.values(methodsJson)
          .filter(Boolean)
          .map(p => p.startsWith('<p>') ? p : `<p>${p}</p>`)
          .join('\n');
      } catch (e) {
        console.warn('Failed to parse methods JSON, using raw response', e);
        methodsHtml = methodsRaw;
        methodsJson = {
          type: methodsRaw,
          type_orientation: '',
          type_contrast: '',
          level: '',
          design: '',
          population: '',
          sample: '',
          sampling: '',
          techniques: '',
          validation: '',
          procedure: '',
          analysis: '',
          ethics: ''
        };
      }
    }

    return {
      introduction,
      methods: methodsHtml,
      results: res,
      discussion,
      conclusions,
      references,
      annexes,
      abstract,
      keywords,
      title_en: title_en.replace(/"/g, '').trim(),
      ...variablesJson,
      
      // Expose methods sub-sections
      methods_type: methodsJson.type || '',
      methods_type_orientation: methodsJson.type_orientation || '',
      methods_type_contrast: methodsJson.type_contrast || '',
      methods_level: methodsJson.level || '',
      methods_design: methodsJson.design || '',
      population: methodsJson.population || '',
      sample: methodsJson.sample || '',
      sampling: methodsJson.sampling || '',
      methods_techniques: methodsJson.techniques || '',
      methods_validation: methodsJson.validation || '',
      methods_procedure: methodsJson.procedure || '',
      methods_analysis: methodsJson.analysis || '',
      methods_ethics: methodsJson.ethics || '',
    };
  }

  private async callModel(prompt: string, chapterName?: string): Promise<string> {
    const providers = [this.primaryProvider];
    if (this.fallbackProvider) {
      providers.push(this.fallbackProvider);
    }

    for (const provider of providers) {
      try {
        const llm = await createLlm(provider);
        const response = await llm.invoke(prompt);
        return response.content.toString();
      } catch (err) {
        console.warn(`[ContentGenerator] ${provider.type} call failed:`, (err as Error).message);
      }
    }

    console.warn(`[ContentGenerator] All LLM providers failed, generating mock content`);
    return generateMockContent(this.currentInput || { title: '', authors: [], advisor: '', lineOfResearch: '', city: '', year: new Date().getFullYear(), documentType: 'THESIS_PROJECT' as any }, chapterName || 'content');
  }
}

