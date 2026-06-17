import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const [progIngenieria, progEducacion, progDerecho] = await Promise.all([
    prisma.program.upsert({
      where: { id: 'prog-ingenieria' },
      update: {},
      create: { id: 'prog-ingenieria', name: 'Maestría en Ingeniería de Sistemas' },
    }),
    prisma.program.upsert({
      where: { id: 'prog-educacion' },
      update: {},
      create: { id: 'prog-educacion', name: 'Maestría en Educación' },
    }),
    prisma.program.upsert({
      where: { id: 'prog-derecho' },
      update: {},
      create: { id: 'prog-derecho', name: 'Maestría en Derecho' },
    }),
  ]);

  const hashedPassword = await bcrypt.hash('ThesisReview2025!', 12);

  const [, , advisor1, , student1] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@unitru.edu.pe' },
      update: {},
      create: {
        email: 'admin@unitru.edu.pe',
        passwordHash: hashedPassword,
        name: 'Administrador Sistema',
        role: 'ADMIN',
      },
    }),
    prisma.user.upsert({
      where: { email: 'coordinadora@unitru.edu.pe' },
      update: {},
      create: {
        email: 'coordinadora@unitru.edu.pe',
        passwordHash: hashedPassword,
        name: 'María Castillo Vega',
        role: 'COORDINATOR',
        programId: progIngenieria.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'jperez@unitru.edu.pe' },
      update: {},
      create: {
        email: 'jperez@unitru.edu.pe',
        passwordHash: hashedPassword,
        name: 'Dr. Jorge Pérez Sánchez',
        role: 'ADVISOR',
        programId: progIngenieria.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'dsalinas@unitru.edu.pe' },
      update: {},
      create: {
        email: 'dsalinas@unitru.edu.pe',
        passwordHash: hashedPassword,
        name: 'Dra. Diana Salinas Roque',
        role: 'ADVISOR',
        programId: progEducacion.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'ktorres@unitru.edu.pe' },
      update: {},
      create: {
        email: 'ktorres@unitru.edu.pe',
        passwordHash: hashedPassword,
        name: 'Torres Mendoza, Karla',
        role: 'STUDENT',
        programId: progIngenieria.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'jrivera@unitru.edu.pe' },
      update: {},
      create: {
        email: 'jrivera@unitru.edu.pe',
        passwordHash: hashedPassword,
        name: 'Rivera Salas, Juan',
        role: 'STUDENT',
        programId: progEducacion.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'scampos@unitru.edu.pe' },
      update: {},
      create: {
        email: 'scampos@unitru.edu.pe',
        passwordHash: hashedPassword,
        name: 'Campos Vera, Sandra',
        role: 'STUDENT',
        programId: progIngenieria.id,
      },
    }),
  ]);

  await prisma.user.update({
    where: { id: student1.id },
    data: { advisorId: advisor1.id },
  });

  const templateIngenieria = await prisma.thesisTemplate.upsert({
    where: { id: 'tpl-ingenieria-v2' },
    update: {},
    create: {
      id: 'tpl-ingenieria-v2',
      programId: progIngenieria.id,
      name: 'Patrón Maestría Ingeniería de Sistemas',
      version: '2.1',
      fileKey: 'templates/ingenieria-v2.1.docx',
      isActive: true,
      extractedSchema: {
        sections: [
          { name: 'Capítulo I: Problema de investigación', required: true, minPages: 8 },
          { name: 'Capítulo II: Marco teórico', required: true, minPages: 15 },
          { name: 'Capítulo III: Metodología', required: true, minPages: 10 },
          { name: 'Referencias bibliográficas', required: true, minPages: 2 },
        ],
        citationFormat: 'APA 7',
      },
      rubric: {
        dimensions: [
          { name: 'structure', weight: 0.3, maxScore: 100 },
          { name: 'content', weight: 0.4, maxScore: 100 },
          { name: 'form', weight: 0.2, maxScore: 100 },
          { name: 'originality', weight: 0.1, maxScore: 100 },
        ],
        maxGrade: 20,
        approvalThreshold: 13,
      },
    },
  });

  const advance = await prisma.advance.upsert({
    where: { id: 'adv-torres-cap2-v3' },
    update: {},
    create: {
      id: 'adv-torres-cap2-v3',
      studentId: student1.id,
      programId: progIngenieria.id,
      templateId: templateIngenieria.id,
      advanceType: 'chapter_2',
      title: 'Capítulo II: Marco Teórico v3',
      version: 3,
      fileKey: 'advances/prog-ingenieria/student1/chapter_2/v3.docx',
      fileType: 'docx',
      fileSizeBytes: 2_450_000,
      pageCount: 42,
      status: 'AI_COMPLETE',
    },
  });

  await prisma.aIAnalysis.upsert({
    where: { advanceId: advance.id },
    update: {},
    create: {
      advanceId: advance.id,
      structureScore: 90,
      contentScore: 85,
      formScore: 88,
      originalityScore: 92,
      overallScore: 88,
      gradeConverted: 17.6,
      processingMs: 18420,
      modelUsed: process.env.OPENAI_API_KEY ? 'gpt-4o' : 'mock-analyzer',
      executiveSummary:
        'El documento presenta una estructura sólida y coherente con el patrón institucional. ' +
        'Se detecta una deficiencia en el marco conceptual. Se recomienda priorizar esa corrección.',
      findings: {
        create: [
          {
            sectionRef: 'Capítulo II — Sección 2.3 Marco conceptual',
            pageRef: 18,
            severity: 'MAJOR',
            description:
              'La sección 2.3 no incluye definiciones operacionales de los conceptos clave.',
            correctionSteps:
              'Redacte definiciones operacionales para cada término clave con cita de autoridad.',
            exampleImprovement:
              'El aprendizaje adaptativo es un proceso en el que los sistemas ajustan el contenido según el perfil del estudiante.',
            recommendation: 'Consulte glosarios especializados del área temática.',
          },
        ],
      },
    },
  });

  console.log('✓ Seed completado');
  console.log('\nCredenciales (contraseña: ThesisReview2025!):');
  console.log('  Administrador: admin@unitru.edu.pe');
  console.log('  Coordinador: coordinadora@unitru.edu.pe');
  console.log('  Asesor:      jperez@unitru.edu.pe');
  console.log('  Estudiante:  ktorres@unitru.edu.pe');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
