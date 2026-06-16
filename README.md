# 🎓 Thesis Review AI

Sistema inteligente de auditoría y generación de tesis, artículos científicos y proyectos de investigación, optimizado para entornos de desarrollo en Windows y despliegues dockerizados.

## 🚀 Arquitectura Actualizada

El proyecto utiliza un **Monorepo** gestionado con **Turborepo** y **pnpm**, estructurado de la siguiente manera:

### 📂 Estructura de Módulos
- `apps/web`: Interfaz de usuario construida con **Next.js 15 (App Router)** y Tailwind CSS.
- `apps/api`: Backend robusto basado en **NestJS**, encargado de la orquestación de pipelines y gestión de documentos.
- `packages/ai-engine`: El núcleo de inteligencia artificial. Implementa pipelines de análisis, extracción de referencias y generación de contenido utilizando **LangChain**.
- `packages/database`: Capa de persistencia utilizando **Prisma ORM** y **PostgreSQL** con la extensión `pgvector` para almacenamiento de embeddings.

## ⚙️ Configuración de IA (Ollama 3.2)

El sistema está configurado para priorizar el uso de modelos locales mediante **Ollama**, evitando costos de API y mejorando la privacidad.

- **Modelo Recomendado:** `llama3.2`
- **Conexión:** El contenedor de la API se comunica con el host de Windows mediante `http://host.docker.internal:11434`.

## 🛠️ Guía de Inicio Rápido

### 1. Requisitos Previos
- [Ollama](https://ollama.com/) instalado en Windows.
- Descargar el modelo: `ollama pull llama3.2`
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo.
- [pnpm](https://pnpm.io/) instalado globalmente.

### 2. Configuración de Entorno
Crea un archivo `.env` en la raíz basándote en `.env.example`:
```env
OLLAMA_MODEL=llama3.2
OLLAMA_BASE_URL=http://host.docker.internal:11434
POSTGRES_PASSWORD=supersecret123
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
JWT_SECRET=tu_secreto_seguro
```

### 3. Despliegue con Docker
Para levantar toda la infraestructura (Base de datos, Redis, MinIO, API y Web):

```bash
# Levantar servicios
docker compose up -d

# Ejecutar migración y seed inicial de base de datos
docker compose up seed
```

### 4. Desarrollo Local (Opcional)
Si prefieres ejecutar la web o api fuera de Docker para mayor velocidad de compilación:
```bash
pnpm install
pnpm dev
```

## 📝 Notas de Mantenimiento (Saneamiento Windows)
Este proyecto ha sido migrado a `C:\thesis-review` para evitar errores de rutas con espacios o tildes. **No mover el proyecto a carpetas de usuario con caracteres especiales**, ya que puede romper los binds de volúmenes de Docker y el sistema de archivos de Node.js.

## 🗺️ Flujo de Generación
1. **Ingesta:** El usuario sube la tesis/documento $\rightarrow$ `extractor.ts` procesa el texto.
2. **Análisis:** El `AnalysisPipeline` evalúa el texto contra el esquema patrón utilizando Ollama 3.2.
3. **Corrección:** Se generan hallazgos estructurados (CRITICAL, MAJOR, MINOR) con pasos de corrección.
4. **Transformación:** El motor puede convertir la tesis en un artículo científico o proyecto de tesis basado en los prompts definidos en `prompts.ts`.
