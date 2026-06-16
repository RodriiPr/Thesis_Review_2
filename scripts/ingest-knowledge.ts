import { PrismaClient } from '@thesis-review/database';
import { QAPipeline } from '@thesis-review/ai-engine';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

const prisma = new PrismaClient();
const pipeline = new QAPipeline();

interface SourceFile {
  title: string;
  content: string;
  source: string;
  module: string | null;
}

async function readTextFile(filePath: string): Promise<string> {
  return readFile(filePath, 'utf-8');
}

async function readPdfText(filePath: string): Promise<string> {
  try {
    const pdf = await import('pdf-parse');
    const buffer = await readFile(filePath);
    const data = await pdf.default(buffer);
    return data.text;
  } catch {
    console.warn(`  No se pudo extraer texto del PDF: ${filePath}`);
    return '';
  }
}

async function collectSourceFiles(): Promise<SourceFile[]> {
  const files: SourceFile[] = [];
  const root = process.cwd();

  // 1. Documentación principal
  const docFiles: { path: string; title: string; source: string }[] = [
    { path: 'aquitectura.md', title: 'Arquitectura del Sistema', source: 'architecture' },
    { path: 'estructura.txt', title: 'Estructura del Proyecto', source: 'architecture' },
    { path: 'PROMPT_DEEPSEEK_THESIS_GENERATOR.md', title: 'Generador de Tesis - Prompt', source: 'prompt' },
    { path: 'README.md', title: 'README del Proyecto', source: 'readme' },
  ];

  for (const doc of docFiles) {
    const fullPath = join(root, doc.path);
    try {
      const content = await readTextFile(fullPath);
      if (content.trim()) {
        files.push({ title: doc.title, content, source: doc.source, module: null });
        console.log(`  + ${doc.path}`);
      }
    } catch {
      console.warn(`  - ${doc.path} (no encontrado)`);
    }
  }

  // 2. Tesis PDF
  const thesisPath = join(root, 'Tesis_Aguirre Rodriguez Elen_FINAL.pdf');
  try {
    const pdfText = await readPdfText(thesisPath);
    if (pdfText.trim()) {
      files.push({
        title: 'Tesis: Aguirre Rodriguez Elen - FINAL',
        content: pdfText.substring(0, 50000),
        source: 'thesis',
        module: null,
      });
      console.log('  + Tesis PDF (extracto)');
    }
  } catch {
    console.warn('  - Tesis PDF (no se pudo leer)');
  }

  // 3. Código fuente - resúmenes por módulo
  const apiDir = join(root, 'apps', 'api', 'src');
  const webComponentsDir = join(root, 'apps', 'web', 'components');
  const webAppDir = join(root, 'apps', 'web', 'app');

  const codeDirs = [
    { dir: apiDir, source: 'code', label: 'API' },
    { dir: webComponentsDir, source: 'code', label: 'Components' },
    { dir: webAppDir, source: 'code', label: 'Pages' },
  ];

  for (const { dir, source, label } of codeDirs) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      const modules = entries.filter(e => e.isDirectory()).map(e => e.name);

      for (const mod of modules) {
        const modPath = join(dir, mod);
        const filesInMod = await readdir(modPath);
        const tsFiles = filesInMod.filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

        let summary = '';
        for (const tf of tsFiles) {
          try {
            const content = await readFile(join(modPath, tf), 'utf-8');
            const lines = content.split('\n');
            const imports = lines.filter(l => l.trim().startsWith('import ')).slice(0, 15).join('\n');
            const codeSnippet = lines.slice(0, 80).join('\n');
            summary += `\n--- ${tf} ---\n${imports}\n\n${codeSnippet}\n`;
          } catch { /* skip */ }
        }

        if (summary.trim()) {
          files.push({
            title: `Módulo ${label}: ${mod}`,
            content: `Resumen del módulo "${mod}" de ${label}:\n${summary.substring(0, 8000)}`,
            source,
            module: mod,
          });
          console.log(`  + ${label}/${mod} (${tsFiles.length} archivos)`);
        }
      }
    } catch {
      console.warn(`  - ${label} (no se pudo leer)`);
    }
  }

  return files;
}

async function chunkContent(sourceFile: SourceFile): Promise<{ title: string; content: string; chunkIndex: number }[]> {
  const { RecursiveCharacterTextSplitter } = await import('langchain/text_splitter');
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1500,
    chunkOverlap: 200,
  });

  const docs = await splitter.createDocuments([sourceFile.content]);
  return docs.map((doc, i) => ({
    title: sourceFile.chunkIndex !== undefined ? sourceFile.title : `${sourceFile.title} (parte ${i + 1})`,
    content: doc.pageContent,
    chunkIndex: i,
  }));
}

async function main() {
  console.log('\n=== Ingestión de Base de Conocimiento ===\n');
  console.log('Colectando archivos fuente...\n');

  const sourceFiles = await collectSourceFiles();
  console.log(`\nTotal archivos fuente: ${sourceFiles.length}`);

  // Limpiar base de conocimiento anterior
  await prisma.projectDocumentation.deleteMany();
  console.log('\nBase de conocimiento anterior limpiada.');

  let totalChunks = 0;

  for (const sf of sourceFiles) {
    const chunks = await chunkContent(sf);
    console.log(`\nProcesando: ${sf.title} (${chunks.length} chunks)`);

    for (const chunk of chunks) {
      process.stdout.write('.');
      const embedding = await pipeline.generateEmbedding(chunk.content);

      await prisma.projectDocumentation.create({
        data: {
          title: chunk.title,
          content: chunk.content,
          source: sf.source,
          module: sf.module,
          chunkIndex: chunk.chunkIndex,
          parentId: sf.title,
          embedding,
        },
      });
      totalChunks++;
    }
  }

  console.log(`\n\n=== Ingestión completada ===`);
  console.log(`Total documentos: ${sourceFiles.length}`);
  console.log(`Total chunks insertados: ${totalChunks}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Error durante la ingestión:', err);
  prisma.$disconnect();
  process.exit(1);
});
