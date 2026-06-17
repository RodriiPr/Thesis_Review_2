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

### 4. Desarrollo Local (Híbrido - Recomendado)
Si prefieres ejecutar la web o la api fuera de Docker para mayor velocidad de compilación y facilidad de depuración, puedes levantar únicamente los servicios de infraestructura en Docker y correr las aplicaciones localmente con Node:

```bash
# 1. Copiar archivo de entorno
cp .env.example .env

# 2. Instalar dependencias del monorepo
pnpm install

# 3. Levantar solo servicios de infraestructura (Postgres, Redis, MinIO)
docker compose up postgres redis minio -d

# 4. Correr migraciones e insertar seed de datos
docker compose up seed

# 5. Levantar aplicaciones en modo de desarrollo (Next.js + NestJS)
pnpm dev
```

### 🔐 Credenciales de Prueba (Seed)
* **Administrador:** `admin@unitru.edu.pe`
* **Contraseña:** `ThesisReview2025!`
* *(Todos los usuarios de prueba usan el dominio `@unitru.edu.pe`)*

## 📝 Notas de Mantenimiento (Saneamiento Windows)
Este proyecto está optimizado para ejecutarse en entornos Windows. Se recomienda no mover el proyecto a carpetas de usuario con caracteres especiales o espacios (ej: `C:\Users\Mi Usuario\Documents`), ya que puede romper los montajes de volumen de Docker y las dependencias de node_modules.

## 🗺️ Flujo de Generación
1. **Ingesta:** El usuario sube la tesis/documento $\rightarrow$ `extractor.ts` procesa el texto.
2. **Análisis:** El `AnalysisPipeline` evalúa el texto contra el esquema patrón utilizando Ollama o DeepSeek.
3. **Corrección:** Se generan hallazgos estructurados (CRITICAL, MAJOR, MINOR) con pasos de corrección.
4. **Transformación:** El motor genera el documento final inyectando de forma coherente las variables (VI, VDs) y desglosando los apartados metodológicos de forma exacta según las etiquetas detectadas en la plantilla `.docx`.
