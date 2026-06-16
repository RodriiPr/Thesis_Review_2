import type { QAResult, Source, QAPipelineOptions } from './types.js';

interface KnowledgeEntry {
  keywords: string[];
  topic: string;
  answer: string;
  source: string;
  module: string | null;
}

const PROJECT_KNOWLEDGE: KnowledgeEntry[] = [
  {
    keywords: ['qué es', 'resumen', 'thesisreview', 'proyecto', 'sobre', 'trata', 'hace'],
    topic: 'Resumen del proyecto',
    source: 'architecture',
    module: null,
    answer: `ThesisReview es un sistema inteligente de revisión de tesis universitarias. Permite a estudiantes subir avances de tesis (PDF/DOCX), y el sistema analiza automáticamente el contenido usando IA, comparándolo contra plantillas institucionales. Los asesores humanos pueden revisar, aceptar o modificar los hallazgos de la IA, creando un ciclo de retroalimentación. También incluye detección de plagio, validación de referencias bibliográficas, integración con ORCID, y un generador automático de tesis.`,
  },
  {
    keywords: ['arquitectura', 'stack', 'tecnología', 'backend', 'frontend', 'lenguaje', 'framework', 'construido'],
    topic: 'Stack tecnológico',
    source: 'architecture',
    module: null,
    answer: `ThesisReview usa un monorepo con Turborepo y pnpm. El backend está construido con NestJS 11 (TypeScript) y el frontend con Next.js 15 + React 19 + Tailwind CSS v4 + shadcn/ui. La base de datos es PostgreSQL 16 con extensión pgvector para búsquedas semánticas. Usa Prisma 6 como ORM, BullMQ + Redis para colas de tareas, y MinIO para almacenamiento de archivos. La IA usa LangChain.js con DeepSeek (deepseek-v4-flash) como LLM principal y OpenAI (text-embedding-3-small) para embeddings.`,
  },
  {
    keywords: ['módulos', 'api', 'endpoints', 'rutas', 'controladores'],
    topic: 'Módulos del backend',
    source: 'code',
    module: null,
    answer: `El backend NestJS tiene 19 módulos: Auth (login JWT, refresh tokens), Users (CRUD de usuarios), Advances (subida y gestión de avances), Reviews (revisión humana), AiAnalysis (análisis con IA), Plagiarism (detección de plagio con pgvector + Copyleaks), References (validación de referencias via CrossRef), Reports (generación de reportes PDF), Stats (estadísticas y KPIs), Templates (plantillas de tesis), Programs (programas académicos), Orcid (integración ORCID), Notifications (notificaciones), FineTuning (retroalimentación de hallazgos), ThesisGenerator (generación automática de tesis), Pipeline (estado de colas BullMQ), Storage (almacenamiento MinIO), Prisma (conexión a BD), y ahora Chatbot.`,
  },
  {
    keywords: ['páginas', 'frontend', 'ui', 'interfaz', 'componentes', 'vistas'],
    topic: 'Frontend y páginas',
    source: 'code',
    module: null,
    answer: `El frontend Next.js tiene las siguientes páginas: /login y /forgot-password (autenticación), /dashboard (KPIs y estadísticas), /advances (lista de avances), /advances/upload (subir nuevo avance), /advances/[id]/review (panel de revisión), /stats (estadísticas detalladas), /bulk-review (revisión por lotes), /config (configuración), /users (gestión de usuarios, solo admin), /thesis-generator (generación de tesis con formulario, previsualización y descarga), y las rutas /orcid/success y /orcid/error para integración ORCID.`,
  },
  {
    keywords: ['base de datos', 'bd', 'db', 'modelos', 'tablas', 'prisma', 'esquema'],
    topic: 'Base de datos',
    source: 'architecture',
    module: null,
    answer: `La base de datos es PostgreSQL 16 con extensión pgvector. Los modelos principales son: User (usuarios con roles STUDENT, ADVISOR, COORDINATOR, ADMIN), Program (programas académicos), ThesisTemplate (plantillas con rúbricas), Advance (avances de tesis con versiones), AdvanceChunk (chunks de texto con embeddings vector(1536)), AIAnalysis (resultados de análisis), AIFinding (hallazgos individuales), Review (revisiones humanas), PlagiarismReport y PlagiarismAlert (plagio), ReferenceValidation (validación de referencias), ThesisDocument (documentos generados), Notification (notificaciones), AuditLog (auditoría), y OrcidProfile/OrcidPublication (ORCID).`,
  },
  {
    keywords: ['roles', 'usuarios', 'permisos', 'student', 'advisor', 'coordinator', 'admin'],
    topic: 'Roles de usuario',
    source: 'code',
    module: 'auth',
    answer: `Hay 4 roles: STUDENT (estudiante - sube avances, ve sus revisiones), ADVISOR (asesor - revisa avances asignados, da feedback), COORDINATOR (coordinador - supervisa el progreso, revisa estadísticas), ADMIN (administrador - gestiona usuarios, programas, plantillas y configuración).`,
  },
  {
    keywords: ['ia', 'inteligencia artificial', 'análisis', 'ai', 'llm', 'deepseek', 'langchain'],
    topic: 'Pipeline de IA',
    source: 'architecture',
    module: null,
    answer: `El pipeline de IA usa LangChain.js con DeepSeek (deepseek-v4-flash) como LLM principal y OpenAI (text-embedding-3-small) para embeddings. Primero extrae texto de PDF/DOCX, luego lo analiza con DeepSeek. Evalúa 4 dimensiones: Estructura (30%), Contenido (40%), Forma (20%) y Originalidad (10%). Los hallazgos tienen severidad: CRITICAL, MAJOR, MINOR o SUGGESTION. Si no hay API key, usa el analizador simulado (mock).`,
  },
  {
    keywords: ['plagio', 'plagiarism', 'copyleaks', 'similitud', 'copia'],
    topic: 'Detección de plagio',
    source: 'code',
    module: 'plagiarism',
    answer: `La detección de plagio funciona de dos formas: 1) Interna: usa pgvector para calcular similitud coseno entre los embeddings del avance del estudiante y otros avances del mismo programa académico. 2) Externa (opcional): integración con Copyleaks API para detectar plagio contra fuentes externas. Los resultados incluyen un puntaje general de similitud y alertas individuales por sección.`,
  },
  {
    keywords: ['referencias', 'bibliografía', 'crossref', 'doi', 'citas'],
    topic: 'Validación de referencias',
    source: 'code',
    module: 'references',
    answer: `La validación de referencias bibliográficas usa la API de CrossRef. El sistema extrae las referencias del texto usando IA (con regex como respaldo), luego consulta CrossRef para verificar si cada referencia es válida, obteniendo título, autores, año, DOI y journal. Marca cada referencia como válida, sospechosa o no encontrada, y sugiere correcciones.`,
  },
  {
    keywords: ['orcid', 'perfil', 'publicaciones', 'investigador'],
    topic: 'Integración ORCID',
    source: 'code',
    module: 'orcid',
    answer: `La integración con ORCID permite a los asesores conectar su perfil ORCID mediante OAuth 2.0. Una vez conectado, el sistema sincroniza automáticamente las publicaciones del asesor y calcula un puntaje de coincidencia (match score) entre el asesor y la línea de investigación de la tesis del estudiante, ayudando a asignar asesores adecuados.`,
  },
  {
    keywords: ['generador', 'tesis', 'documento', 'pdf', 'docx', 'generar'],
    topic: 'Generador de tesis',
    source: 'code',
    module: 'thesis-generator',
    answer: `El generador de tesis permite crear documentos académicos completos (proyecto de tesis o informe final) usando IA. Recibe título, autores, asesor, línea de investigación, y genera un documento estructurado. Usa Puppeteer para generar PDF y la librería docx para documentos Word. Soporta generación asíncrona (con BullMQ) o síncrona. Incluye previsualización del documento antes de descargar.`,
  },
  {
    keywords: ['autenticación', 'login', 'jwt', 'token', 'auth', 'sesión'],
    topic: 'Autenticación',
    source: 'code',
    module: 'auth',
    answer: `La autenticación usa JWT (JSON Web Tokens) con Passport.js. El login recibe email y contraseña, y devuelve access token (corto plazo) y refresh token (largo plazo). Los tokens se almacenan en sessionStorage del navegador. Cuando el access token expira, el interceptor de axios automáticamente usa el refresh token para obtener uno nuevo. También incluye recuperación de contraseña por email.`,
  },
  {
    keywords: ['docker', 'despliegue', 'instalación', 'ejecutar', 'correr', 'iniciar'],
    topic: 'Despliegue con Docker',
    source: 'architecture',
    module: null,
    answer: `El proyecto se despliega con Docker Compose. Incluye 5 servicios: PostgreSQL 16 con pgvector (puerto 5433), Redis 7 (puerto 6379), MinIO (almacenamiento S3, puertos 9000/9001), API NestJS (puerto 3001), y Web Next.js (puerto 3000). También hay un servicio seed que ejecuta la siembra inicial de datos. Para desarrollo local, usa pnpm dev.`,
  },
  {
    keywords: ['monorepo', 'turborepo', 'pnpm', 'workspace', 'paquetes'],
    topic: 'Estructura del monorepo',
    source: 'architecture',
    module: null,
    answer: `El proyecto es un monorepo con Turborepo y pnpm workspaces. Tiene 3 apps: apps/api (NestJS backend), apps/web (Next.js frontend), y 2 packages: packages/ai-engine (pipeline de IA con LangChain.js) y packages/database (Prisma ORM + esquema de BD). Usa pnpm 9.15.9 y Node.js >= 20.`,
  },
  {
    keywords: ['notificaciones', 'notifications', 'eventos', 'alertas'],
    topic: 'Notificaciones',
    source: 'code',
    module: 'notifications',
    answer: `El sistema de notificaciones usa @nestjs/event-emitter. Se disparan eventos cuando: el análisis de IA se completa (ai_complete), falla (ai_failed), o cuando una revisión humana está lista (review_complete). Las notificaciones se almacenan en la base de datos y se muestran en la interfaz con un contador de no leídas.`,
  },
  {
    keywords: ['tesis pdf', 'aguirre', 'elén', 'tesis académica', 'documento pdf'],
    topic: 'Tesis de Aguirre Rodriguez Elen',
    source: 'thesis',
    module: null,
    answer: `El repositorio incluye la tesis "Tesis_Aguirre Rodriguez Elen_FINAL.pdf", que es el documento académico de tesis de Aguirre Rodriguez Elen. Puedes hacer preguntas específicas sobre su contenido una vez que se haya ejecutado el script de ingestión (pnpm kb:ingest) que indexa el PDF en la base de conocimiento vectorial.`,
  },
  {
    keywords: ['chatbot', 'chat', 'bot', 'asistente', 'conversación', 'voice', 'voz', 'tts', 'stt'],
    topic: 'Chatbot del sistema',
    source: 'code',
    module: 'chatbot',
    answer: `El chatbot se abre automáticamente al entrar al dashboard. Usa reconocimiento de voz (STT) y síntesis de voz (TTS) para interactuar. Al hacer clic en cualquier parte de la página, el asistente saluda en voz alta, activa el micrófono, y espera tu pregunta. Cuando respondes, la respuesta se lee en voz alta automáticamente. El chatbot responde preguntas técnicas sobre el proyecto ThesisReview usando el pipeline de IA.`,
  },
  {
    keywords: ['embedding', 'vectores', 'vectorial', 'pgvector', 'búsqueda semántica', 'similaridad'],
    topic: 'Búsqueda semántica y embeddings',
    source: 'architecture',
    module: null,
    answer: `ThesisReview usa OpenAI text-embedding-3-small para generar embeddings de 1536 dimensiones, almacenados en PostgreSQL con la extensión pgvector. Los embeddings se usan para búsqueda semántica de contenido (similaridad coseno) y detección de plagio interna entre avances del mismo programa académico.`,
  },
  {
    keywords: ['colas', 'bullmq', 'redis', 'tareas', 'jobs', 'procesamiento', 'asíncrono'],
    topic: 'Colas de tareas con BullMQ',
    source: 'code',
    module: 'pipeline',
    answer: `Las tareas asíncronas se manejan con BullMQ sobre Redis. Hay colas para: análisis de IA (ai-analysis), detección de plagio (plagiarism), validación de referencias (reference-validation), y generación de tesis (thesis-generation). Cada cola tiene workers que procesan los jobs y actualizan el estado. La interfaz muestra el progreso de cada tarea.`,
  },
  {
    keywords: ['tesis pdf', 'aguirre', 'elén', 'tesis académica', 'documento pdf'],
    topic: 'Tesis de Aguirre Rodriguez Elen',
    source: 'thesis',
    module: null,
    answer: `El repositorio incluye la tesis "Tesis_Aguirre Rodriguez Elen_FINAL.pdf", que es el documento académico de tesis de Aguirre Rodriguez Elen. Puedes hacer preguntas específicas sobre su contenido una vez que se haya ejecutado el script de ingestión (pnpm kb:ingest) que indexa el PDF en la base de conocimiento vectorial.`,
  },
];

function normalize(text: string): string {
  return text.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findBestMatch(question: string): KnowledgeEntry | null {
  const normalized = normalize(question);
  const words = normalized.split(' ').filter(w => w.length > 2);

  let bestEntry: KnowledgeEntry | null = null;
  let bestScore = 0;

  for (const entry of PROJECT_KNOWLEDGE) {
    let score = 0;
    for (const keyword of entry.keywords) {
      const kw = normalize(keyword);
      if (normalized.includes(kw)) {
        score += kw.length * 3;
      } else {
        const kwWords = kw.split(' ');
        for (const w of kwWords) {
          if (w.length > 2 && words.includes(w)) {
            score += w.length;
          }
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  return bestScore > 5 ? bestEntry : null;
}

type LlmProvider = { type: 'deepseek'; apiKey: string; model: string };

function detectProvider(): LlmProvider {
  const key = process.env.DEEPSEEK_API_KEY;
  return {
    type: 'deepseek',
    apiKey: key || '',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
  };
}

function buildQAPrompt(question: string, context: string, history: string): string {
  return `Eres un asistente experto en el proyecto "ThesisReview", un sistema de revisión inteligente de tesis universitarias.

## Contexto relevante del proyecto:
${context || '(No se encontró información específica en la base de conocimiento)'}

## Historial de la conversación:
${history || '(Sin historial previo)'}

## Instrucciones:
- Responde SIEMPRE en español, de forma clara y concisa.
- Si la información está en el contexto, responde basándote en él.
- Si no encuentras la respuesta en el contexto, usa tu conocimiento general.
- Menciona la fuente de tu respuesta cuando sea posible.

## Pregunta del usuario:
${question}

## Respuesta:`;
}

export class QAPipeline {
  private readonly provider: LlmProvider;
  private readonly temperature: number;
  private readonly maxTokens: number;

  constructor(options: QAPipelineOptions = {}) {
    this.temperature = options.temperature ?? 0.3;
    this.maxTokens = options.maxTokens ?? 1024;

    if (options.deepseekKey) {
      this.provider = {
        type: 'deepseek',
        apiKey: options.deepseekKey,
        model: options.deepseekModel || 'deepseek-v4-flash',
      };
    } else {
      this.provider = detectProvider();
    }
  }

  get hasLlmAccess(): boolean {
    return !!this.provider.apiKey;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
    }

    try {
      const { OpenAIEmbeddings } = await import('@langchain/openai');
      const embeddings = new OpenAIEmbeddings({
        apiKey,
        modelName: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      });
      return embeddings.embedQuery(text.substring(0, 8000));
    } catch {
      return Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
    }
  }

  async ask(
    question: string,
    contextDocuments: { title: string; content: string; source: string; module: string | null }[],
    history: { role: 'user' | 'assistant'; content: string }[] = [],
  ): Promise<QAResult> {
    const builtInMatch = findBestMatch(question);

    if (!this.hasLlmAccess) {
      if (builtInMatch) {
        return {
          answer: builtInMatch.answer,
          sources: [{
            title: builtInMatch.topic,
            source: builtInMatch.source,
            module: builtInMatch.module,
            excerpt: builtInMatch.answer.substring(0, 200),
          }],
        };
      }
      return {
        answer: `No tengo información específica sobre "${question}" en mi base de conocimiento local. ` +
          `Configura DEEPSEEK_API_KEY en tu archivo .env para que pueda responder cualquier pregunta usando IA.`,
        sources: [],
      };
    }

    const formattedContext = contextDocuments
      .map((d, i) => `[Documento ${i + 1}] ${d.title} (Fuente: ${d.source}${d.module ? ` / Módulo: ${d.module}` : ''})\n${d.content}`)
      .join('\n\n');

    const formattedHistory = history
      .map((m) => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`)
      .join('\n');

    const prompt = buildQAPrompt(question, formattedContext, formattedHistory);

    const sources: Source[] = contextDocuments.map((d) => ({
      title: d.title,
      source: d.source,
      module: d.module,
      excerpt: d.content.substring(0, 200),
    }));

    if (builtInMatch) {
      sources.unshift({
        title: builtInMatch.topic,
        source: builtInMatch.source,
        module: builtInMatch.module,
        excerpt: builtInMatch.answer.substring(0, 200),
      });
    }

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { ChatDeepSeek } = await import('@langchain/deepseek');
        const llm = new ChatDeepSeek({
          apiKey: this.provider.apiKey,
          model: this.provider.model,
          temperature: this.temperature,
          maxTokens: this.maxTokens,
        });

        const response = await llm.invoke(prompt);
        const answer = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

        return { answer, sources };
      } catch {
        if (attempt === 0) {
          continue;
        }
      }
    }

    if (builtInMatch) {
      return {
        answer: builtInMatch.answer,
        sources: [{ title: builtInMatch.topic, source: builtInMatch.source, module: builtInMatch.module, excerpt: builtInMatch.answer.substring(0, 200) }],
      };
    }

    return {
      answer: `Las APIs de IA (DeepSeek y OpenAI) no tienen crédito disponible en este momento. ` +
        `Puedo responder preguntas sobre el proyecto ThesisReview, su arquitectura, ` +
        `módulos, funcionalidades, y configuración. ` +
        `Para recargar créditos visita: https://platform.deepseek.com/`,
      sources: [],
    };
  }
}
