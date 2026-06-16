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
    methods: `<p>La presente investigación se enmarca dentro del enfoque cuantitativo, de tipo aplicado y nivel explicativo. El diseño corresponde a un estudio no experimental, transversal y correlacional-causal (Hernández-Sampieri, 2023).</p><p>La población estuvo conformada por profesionales y especialistas del área de ${input.lineOfResearch}, seleccionados mediante muestreo estratificado proporcional. La muestra final incluyó a 120 participantes, distribuidos en tres estratos según su nivel de experiencia.</p><p>Para la recolección de datos se utilizó un cuestionario estructurado con escala Likert de 5 puntos, validado mediante juicio de expertos (V de Aiken = 0.89) y con una confiabilidad Alpha de Cronbach de 0.92. El análisis de datos se realizó mediante estadística descriptiva e inferencial, utilizando el software SPSS v28.</p>`,
    results: `<p>Los resultados del análisis descriptivo muestran que el 65% de los participantes presenta un nivel medio de conocimiento sobre las variables estudiadas. La media general fue de 3.42 (DE = 0.78), lo que indica una tendencia moderadamente favorable.</p><p>En relación al objetivo general, se encontró una correlación positiva significativa entre las variables principales (r = 0.68, p < 0.001). El análisis de regresión múltiple evidenció que el modelo explica el 54% de la varianza total (R² ajustado = 0.54, F(3,116) = 45.67, p < 0.001).</p><p>Las pruebas de hipótesis confirmaron que existen diferencias estadísticamente significativas entre los grupos analizados (t = 3.45, gl = 98, p < 0.01), lo que permite rechazar la hipótesis nula y aceptar la hipótesis alternativa planteada.</p>`,
    discussion: `<p>Los hallazgos de esta investigación coinciden con los reportados por García (2023), quien encontró patrones similares en su estudio sobre ${input.lineOfResearch}. Sin embargo, difieren parcialmente de los resultados de Martínez et al. (2024), posiblemente debido a diferencias en el contexto y la metodología empleada.</p><p>La correlación positiva encontrada entre las variables principales refuerza la teoría de sistemas adaptativos propuesta por Holland (2022), sugiriendo que los mecanismos de retroalimentación juegan un papel crucial en la dinámica del sistema.</p><p>Las implicaciones prácticas de estos resultados son relevantes para profesionales y tomadores de decisiones en el ámbito de ${input.lineOfResearch}. Se recomienda implementar programas de intervención basados en los factores identificados como predictores significativos.</p>`,
    conclusions: `<h2>5.1 Conclusiones</h2><p>Primera: Se determinó que existe una relación significativa entre las variables principales del estudio, confirmando la hipótesis general planteada.</p><p>Segunda: El análisis de los objetivos específicos permitió identificar que los factores contextuales influyen de manera determinante en los resultados del estudio.</p><p>Tercera: La metodología empleada demostró ser adecuada para el tipo de investigación realizada, obteniendo niveles de confiabilidad y validez satisfactorios.</p><h2>5.2 Recomendaciones</h2><p>Primera: Se recomienda a futuros investigadores ampliar la muestra y considerar variables adicionales que puedan enriquecer el modelo explicativo.</p><p>Segunda: Las instituciones del sector deberían implementar programas de capacitación basados en los hallazgos de este estudio para mejorar las prácticas en el área de ${input.lineOfResearch}.</p>`,
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
  };

  const chapterKey = chapter.toLowerCase().replace(/[\s\-]/g, '');
  const matchKey = Object.keys(mockTexts).find(k => chapterKey.includes(k) || k.includes(chapterKey));
  if (matchKey) return mockTexts[matchKey];

  return `<h2>${chapter}</h2>
<p>Contenido generado para la sección "${chapter}" del documento académico "${input.title}". Esta sección presenta un análisis detallado de los aspectos fundamentales relacionados con la línea de investigación ${input.lineOfResearch}. El contenido académico sigue los lineamientos establecidos por la metodología de investigación científica y las normas APA 7ª edición.</p>`;
}

function buildDynamicChapterPrompt(input: ThesisInput, chapterName: string, chapterDesc: string, chapterReqs: string[]): string {
  return `Eres un académico experto en metodología de la investigación científica. 
Genera el contenido para la sección "${chapterName}" de un documento académico tipo "${input.documentType}".

DATOS DEL PROYECTO:
- Título: "${input.title}"
- Autor(es): ${input.authors.join(', ')}
- Asesor: ${input.advisor}
- Línea de investigación: ${input.lineOfResearch}

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

Responde ÚNICAMENTE con el HTML del contenido, sin etiquetas html/body/head adicionales.`;
}

function buildIntroductionPrompt(input: ThesisInput): string {
  return `Eres un académico experto en metodología de la investigación científica. 
Genera el CAPÍTULO I - INTRODUCCIÓN completo para un proyecto de tesis universitario.

DATOS DEL PROYECTO:
- Título: "${input.title}"
- Autor(es): ${input.authors.join(', ')}
- Asesor: ${input.advisor}
- Línea de investigación: ${input.lineOfResearch}
- Tipo: ${input.documentType === DocumentSchemaType.THESIS_PROJECT ? 'Proyecto de Tesis' : 'Informe de Proyecto de Tesis'}

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
- NO incluir títulos de sección como "Realidad Problemática" dentro del texto, solo fluir naturalmente de un tema a otro
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
  return `Eres un académico experto en metodología de la investigación científica.
Genera el CAPÍTULO II - MÉTODOS completo para una tesis universitaria.

DATOS DEL PROYECTO:
- Título: "${input.title}"
- Autor(es): ${input.authors.join(', ')}
- Asesor: ${input.advisor}
- Línea de investigación: ${input.lineOfResearch}

ESTRUCTURA REQUERIDA:
1. MATERIALES (2-3 párrafos introductorios)
   a. Objeto de estudio: describir el objeto o fenómeno de estudio
   b. Recursos utilizados (Personal, Bienes, Servicios, Tecnológicos)

2. MÉTODOS
   a. Tipo de investigación: según orientación/finalidad y técnica de contrastación
   b. Nivel de investigación: explicativo, descriptivo, correlacional, etc.
   c. Régimen de investigación: orientado o libre
   d. Diseño de investigación: experimental, cuasiexperimental, no experimental
   e. Población y muestra: describir población y técnica de muestreo
   f. Variables: tipo y operacionalización
   g. Método de procesamiento y análisis de datos
   h. Procedimiento: pasos secuenciales de la investigación
   i. Consideraciones éticas

REQUISITOS:
- Formato académico formal con citas APA
- Texto en prosa continua con párrafos de 150-250 palabras
- Aproximadamente 3000-4000 palabras
- Usar etiquetas <p> para cada párrafo
- Incluir <h2> para secciones principales (2.1, 2.2) y <h3> para sub-secciones

Responde ÚNICAMENTE con el HTML del capítulo, sin etiquetas html/body/head adicionales.`;
}

function buildResultsPrompt(input: ThesisInput): string {
  return `Eres un académico experto en investigación científica.
Genera el CAPÍTULO III - RESULTADOS completo para una tesis universitaria.

DATOS DEL PROYECTO:
- Título: "${input.title}"
- Autor(es): ${input.authors.join(', ')}
- Línea de investigación: ${input.lineOfResearch}

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
- Usar etiquetas <p> para párrafos, <h2> para secciones, <table> para tablas

Responde ÚNICAMENTE con el HTML del capítulo, sin etiquetas html/body/head adicionales.`;
}

function buildDiscussionPrompt(input: ThesisInput): string {
  return `Eres un académico experto en investigación científica.
Genera el CAPÍTULO IV - DISCUSIÓN completo para una tesis universitaria.

DATOS DEL PROYECTO:
- Título: "${input.title}"
- Autor(es): ${input.authors.join(', ')}
- Línea de investigación: ${input.lineOfResearch}

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

Responde ÚNICAMENTE con el HTML del capítulo, sin etiquetas html/body/head adicionales.`;
}

function buildConclusionsPrompt(input: ThesisInput): string {
  return `Eres un académico experto en investigación científica.
Genera el CAPÍTULO V - CONCLUSIONES Y RECOMENDACIONES completo para una tesis universitaria.

DATOS DEL PROYECTO:
- Título: "${input.title}"
- Autor(es): ${input.authors.join(', ')}
- Línea de investigación: ${input.lineOfResearch}

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
- Usar <h2> para "5.1 Conclusiones" y "5.2 Recomendaciones"
- Usar <p> para cada punto con formato claro

Responde ÚNICAMENTE con el HTML del capítulo, sin etiquetas html/body/head adicionales.`;
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

    const [introduction, methods, res, discussion, conclusions, references, annexes] =
      await Promise.all([
        introTask,
        methodsTask,
        resultsTask,
        discussionTask,
        conclusionsTask,
        referencesTask,
        annexesTask,
      ]);

    return {
      introduction,
      methods,
      results: res,
      discussion,
      conclusions,
      references,
      annexes,
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

