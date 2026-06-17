import { Injectable, BadRequestException } from '@nestjs/common';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

import { StorageService } from '../storage/storage.service';
import { GenerateFromTemplateDto } from './dto/generate-from-template.dto';
import { v4 as uuidv4 } from 'uuid';
import { ContentGenerator } from '../thesis-generator/utils/content-generator';

function isSectionHeader(text: string): boolean {
  const normalized = text
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "");

  // Match common headers
  const headerWords = [
    'introduccion',
    'metodos',
    'materiales y metodos',
    'resultados',
    'discusion',
    'conclusiones',
    'conclusiones1',
    'conclusiones y recomendaciones',
    'recomendaciones',
    'abstract',
    'resumen',
    'anexos',
    'referencias',
    'referencias bibliograficas',
    'bibliografia',
  ];

  // Check if normalized matches any header word exactly
  if (headerWords.includes(normalized)) {
    return true;
  }

  // Check if it's a numbered header, e.g. "1 introduccion", "51 conclusiones"
  const withoutNumbers = normalized.replace(/^\d+\s*/, '').trim();
  if (headerWords.includes(withoutNumbers)) {
    return true;
  }

  const parts = normalized.split(/\s+/);
  
  // Check if it starts with "capitulo" followed by roman numeral or word
  if (normalized.startsWith('capitulo') && parts.length >= 3) {
    const remaining = parts.slice(2).join(' ');
    if (headerWords.includes(remaining)) {
      return true;
    }
  }

  // Check if first word is a roman numeral or single letter prefix
  if (parts.length >= 2) {
    const firstWord = parts[0];
    const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
    if (romanNumerals.includes(firstWord) || firstWord.length === 1) {
      const remaining = parts.slice(1).join(' ');
      if (headerWords.includes(remaining)) {
        return true;
      }
    }
  }

  return false;
}

function htmlToParagraphArray(html: string): Array<{ text: string }> {
  if (!html) {
    const empty = [] as any;
    empty.toString = () => '';
    return empty;
  }
  const paras = html
    .replace(/<\/li>/g, '\n')
    .replace(/<\/p>/g, '\n')
    .split('\n')
    .map(p => p.replace(/<[^>]*>/g, '').trim())
    .filter(Boolean)
    .filter(text => !isSectionHeader(text))
    .map(text => {
      const obj = { text };
      Object.defineProperty(obj, 'toString', {
        value: function() { return this.text; },
        writable: true,
        configurable: true,
        enumerable: false
      });
      return obj;
    });

  const decorated = [...paras] as any;
  Object.defineProperty(decorated, 'toString', {
    value: function() {
      return this.map((item: any) => item.text).join('\r\n');
    },
    writable: true,
    configurable: true,
    enumerable: false
  });
  return decorated;
}

function generateOrcid(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const part1 = String(Math.abs(hash % 9000) + 1000);
  const part2 = String(Math.abs((hash >> 3) % 9000) + 1000);
  return `0000-0002-${part1}-${part2}`;
}

function generateAuthorEmail(name: string): string {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  return `${normalized.substring(0, 10)}@unitru.edu.pe`;
}

@Injectable()
export class TemplateDocumentService {
  private contentGenerator: ContentGenerator;

  constructor(private readonly storageService: StorageService) {
    this.contentGenerator = new ContentGenerator(process.env.DEEPSEEK_API_KEY);
  }

  async generate(templateBuffer: Buffer, data: GenerateFromTemplateDto): Promise<{ url: string; id: string }> {
    try {
      console.log('--- DEBUG GENERATION START ---');
      console.log('Data received:', JSON.stringify(data, null, 2));
      console.log('Template buffer size:', templateBuffer.length);

      // Generate academic content using AI
      console.log('Calling ContentGenerator to generate academic sections...');
      const generated = await this.contentGenerator.generate({
        title: data.title || 'Investigación Académica',
        authors: Array.isArray(data.authors) ? data.authors : [data.authors || ''],
        advisor: data.advisor || '',
        lineOfResearch: data.lineOfResearch || 'Sistemas e Informática',
        city: data.city || 'Lima',
        year: Number(data.year || new Date().getFullYear()),
        documentType: data.templateType as any,
        chapters: ['introduction', 'methods', 'results', 'discussion', 'conclusions', 'bibliography', 'annexes'],
      });

      const zip = new PizZip(templateBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
      });

      const authorsList = Array.isArray(data.authors) ? data.authors : [data.authors || ''];
      const authorsText = authorsList.join(', ');
      
      // 1. Build authors_list details (for loop {#authors_list}...{/authors_list})
      const authorsListDetails = authorsList.map((author, index) => ({
        index: index + 1,
        name: author,
        orcid: generateOrcid(author),
        email: generateAuthorEmail(author),
      }));

      // 2. Flatten individual tags for up to 5 authors
      const individualAuthorTags: Record<string, string> = {};
      for (let i = 0; i < 5; i++) {
        const authorDetail = authorsListDetails[i];
        individualAuthorTags[`author_${i + 1}`] = authorDetail ? authorDetail.name : '';
        individualAuthorTags[`orcid_${i + 1}`] = authorDetail ? authorDetail.orcid : '';
        individualAuthorTags[`email_${i + 1}`] = authorDetail ? authorDetail.email : '';
      }

      // 3. title_es and title_en
      const titleEs = data.title || '';
      const titleEn = generated.title_en || '';

      // 4. authors_tags (e.g. Montenegro Baca Zee Ricardo ¹, Rodriguez Preciado Andre Jhonel ²)
      const authorsTags = authorsList
        .map((author, index) => `${author} ${index + 1}`)
        .join(', ');

      // 5. corresponding_email (based on first author)
      const correspondingEmail = authorsListDetails[0] ? authorsListDetails[0].email : 'contacto@unitru.edu.pe';

      // 6. academic texts
      const conflictOfInterest = "Los autores declaran que no existe ningún tipo de conflicto de intereses relacionado con el tema del trabajo.";
      const funding = "Los autores no recibieron ningún patrocinio para la realización de este estudio.";
      const dataAvailability = "Los datos que sustentan los hallazgos de este estudio están disponibles en el repositorio institucional de la universidad o bajo solicitud razonable a los autores correspondientes.";
      
      const advisorText = data.advisor || 'Asesor';
      const institutionText = data.institution || 'Universidad';
      const agradecimientos = `Los autores expresan su profundo agradecimiento al asesor de la investigación, ${advisorText}, por su valiosa orientación metodológica y técnica a lo largo del desarrollo de este estudio, así como a la ${institutionText} por brindar el apoyo institucional necesario.`;

      // 7. CRediT roles loop (Full 14 Roles)
      const author1 = authorsList[0] || 'Autor 1';
      const author2 = authorsList[1] || authorsList[0] || 'Autor 2';
      
      const creditRoles = [
        { role: '1. Conceptualización', author_name: author1 },
        { role: '2. Curación de datos', author_name: author2 },
        { role: '3. Análisis formal', author_name: author1 },
        { role: '4. Adquisición de fondos', author_name: author1 },
        { role: '5. Investigación', author_name: author1 },
        { role: '6. Metodología', author_name: author1 },
        { role: '7. Administración de proyectos', author_name: author1 },
        { role: '8. Recursos', author_name: author2 },
        { role: '9. Software', author_name: author2 },
        { role: '10. Supervisión', author_name: advisorText },
        { role: '11. Validación', author_name: author2 },
        { role: '12. Visualización', author_name: author2 },
        { role: '13. Redacción - borrador original', author_name: author1 },
        { role: '14. Redacción - revisión y edición', author_name: author2 },
      ];

      const currentDate = new Date();
      const spanishMonths = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      const currentDay = String(currentDate.getDate());
      const currentMonth = spanishMonths[currentDate.getMonth()];
      const currentYear = String(currentDate.getFullYear());

      const originalArrayToString = Array.prototype.toString;
      try {
        Array.prototype.toString = function() {
          if (this.length > 0 && typeof this[0] === 'object' && this[0] !== null && 'text' in this[0]) {
            return this.map((item: any) => item ? (item.text || '') : '').join('\r\n');
          }
          return originalArrayToString.call(this);
        };

        doc.render({
          ...data,
          ...individualAuthorTags,
          day: currentDay,
          month: currentMonth,
          year: data.year || currentYear,
          authors: authorsText,
          authors_list: authorsListDetails,
          title_es: titleEs,
          title_en: titleEn,
          authors_tags: authorsTags,
          corresponding_email: correspondingEmail,
          conflict_of_interest: conflictOfInterest,
          funding: funding,
          data_availability: dataAvailability,
          agradecimientos: agradecimientos,
          acknowledgements: agradecimientos,
          credit_roles: creditRoles,
          keywords: generated.keywords || '',
          
          // Line of Research aliases
          lineOfResearch: data.lineOfResearch || '',
          line_of_research: data.lineOfResearch || '',
          linea_investigacion: data.lineOfResearch || '',
          linea_investigación: data.lineOfResearch || '',
          lineaOfResearch: data.lineOfResearch || '',
          
          // Introduction aliases
          introduction: htmlToParagraphArray(generated.introduction),
          introduccion: htmlToParagraphArray(generated.introduction),
          introducción: htmlToParagraphArray(generated.introduction),
          
          // Other sections
          methods: htmlToParagraphArray(generated.methods),
          
          methods_type: htmlToParagraphArray(generated.methods_type),
          
          methods_type_orientation: htmlToParagraphArray(generated.methods_type_orientation),
          type_orientation: htmlToParagraphArray(generated.methods_type_orientation),
          orientacion: htmlToParagraphArray(generated.methods_type_orientation),
          orientación: htmlToParagraphArray(generated.methods_type_orientation),
          finalidad: htmlToParagraphArray(generated.methods_type_orientation),
          de_acuerdo_a_la_orientacion_o_finalidad: htmlToParagraphArray(generated.methods_type_orientation),
          
          methods_type_contrast: htmlToParagraphArray(generated.methods_type_contrast),
          type_contrast: htmlToParagraphArray(generated.methods_type_contrast),
          contrastacion: htmlToParagraphArray(generated.methods_type_contrast),
          contrastación: htmlToParagraphArray(generated.methods_type_contrast),
          tecnica_contrastacion: htmlToParagraphArray(generated.methods_type_contrast),
          técnica_contrastación: htmlToParagraphArray(generated.methods_type_contrast),
          de_acuerdo_a_la_tecnica_de_contrastacion: htmlToParagraphArray(generated.methods_type_contrast),
          
          methods_level: htmlToParagraphArray(generated.methods_level),
          methods_design: htmlToParagraphArray(generated.methods_design),
          population: htmlToParagraphArray(generated.population),
          sample: htmlToParagraphArray(generated.sample),
          sampling: htmlToParagraphArray(generated.sampling),
          
          methods_techniques: htmlToParagraphArray(generated.methods_techniques),
          techniques: htmlToParagraphArray(generated.methods_techniques),
          tecnicas: htmlToParagraphArray(generated.methods_techniques),
          técnicas: htmlToParagraphArray(generated.methods_techniques),
          tecnicas_instrumentos: htmlToParagraphArray(generated.methods_techniques),
          técnicas_instrumentos: htmlToParagraphArray(generated.methods_techniques),
          
          methods_validation: htmlToParagraphArray(generated.methods_validation),
          validation: htmlToParagraphArray(generated.methods_validation),
          validacion: htmlToParagraphArray(generated.methods_validation),
          validación: htmlToParagraphArray(generated.methods_validation),
          confiabilidad: htmlToParagraphArray(generated.methods_validation),
          validacion_confiabilidad: htmlToParagraphArray(generated.methods_validation),
          validación_confiabilidad: htmlToParagraphArray(generated.methods_validation),
          
          methods_procedure: htmlToParagraphArray(generated.methods_procedure),
          
          methods_analysis: htmlToParagraphArray(generated.methods_analysis),
          analysis: htmlToParagraphArray(generated.methods_analysis),
          data_analysis: htmlToParagraphArray(generated.methods_analysis),
          analisis_datos: htmlToParagraphArray(generated.methods_analysis),
          análisis_datos: htmlToParagraphArray(generated.methods_analysis),
          metodo_analisis: htmlToParagraphArray(generated.methods_analysis),
          método_análisis: htmlToParagraphArray(generated.methods_analysis),
          
          methods_ethics: htmlToParagraphArray(generated.methods_ethics),
          results: htmlToParagraphArray(generated.results),
          discussion: htmlToParagraphArray(generated.discussion),
          conclusions: htmlToParagraphArray(generated.conclusions),
          references: htmlToParagraphArray(generated.references),
          annexes: htmlToParagraphArray(generated.annexes),
          abstract: htmlToParagraphArray(generated.abstract),
          resumen: htmlToParagraphArray(generated.abstract),
          
          // Variable Independiente (VI) and aliases
          vi: generated.vi || '',
          vi_nombre: generated.vi || '',
          vi_name: generated.vi || '',
          variable_independiente: generated.vi || '',
          
          vi_def_conceptual: generated.vi_def_conceptual || '',
          vi_definicion_conceptual: generated.vi_def_conceptual || '',
          vi_definición_conceptual: generated.vi_def_conceptual || '',
          
          vi_def_operacional: generated.vi_def_operacional || '',
          vi_definicion_operacional: generated.vi_def_operacional || '',
          vi_definición_operacional: generated.vi_def_operacional || '',
          
          vi_dimension: generated.vi_dimension || '',
          vi_dimensión: generated.vi_dimension || '',
          vi_indicador: generated.vi_indicador || '',
          vi_escala: generated.vi_escala || '',
          
          // Variable Dependiente 1 (VD1) and aliases
          vd1: generated.vd1 || '',
          vd1_nombre: generated.vd1 || '',
          vd1_name: generated.vd1 || '',
          variable_dependiente_1: generated.vd1 || '',
          
          vd1_def_conceptual: generated.vd1_def_conceptual || '',
          vd1_definicion_conceptual: generated.vd1_def_conceptual || '',
          vd1_definición_conceptual: generated.vd1_def_conceptual || '',
          
          vd1_def_operacional: generated.vd1_def_operacional || '',
          vd1_definicion_operacional: generated.vd1_def_operacional || '',
          vd1_definición_operacional: generated.vd1_def_operacional || '',
          
          vd1_dimension: generated.vd1_dimension || '',
          vd1_dimensión: generated.vd1_dimension || '',
          vd1_indicador: generated.vd1_indicador || '',
          vd1_escala: generated.vd1_escala || '',
          
          // Variable Dependiente 2 (VD2) and aliases
          vd2: generated.vd2 || '',
          vd2_nombre: generated.vd2 || '',
          vd2_name: generated.vd2 || '',
          variable_dependiente_2: generated.vd2 || '',
          
          vd2_def_conceptual: generated.vd2_def_conceptual || '',
          vd2_definicion_conceptual: generated.vd2_def_conceptual || '',
          vd2_definición_conceptual: generated.vd2_def_conceptual || '',
          
          vd2_def_operacional: generated.vd2_def_operacional || '',
          vd2_definicion_operacional: generated.vd2_def_operacional || '',
          vd2_definición_operacional: generated.vd2_def_operacional || '',
          
          vd2_dimension: generated.vd2_dimension || '',
          vd2_dimensión: generated.vd2_dimension || '',
          vd2_indicador: generated.vd2_indicador || '',
          vd2_escala: generated.vd2_escala || '',
          
          // Variable Dependiente 3 (VD3) and aliases
          vd3: generated.vd3 || '',
          vd3_nombre: generated.vd3 || '',
          vd3_name: generated.vd3 || '',
          variable_dependiente_3: generated.vd3 || '',
          
          vd3_def_conceptual: generated.vd3_def_conceptual || '',
          vd3_definicion_conceptual: generated.vd3_def_conceptual || '',
          vd3_definición_conceptual: generated.vd3_def_conceptual || '',
          
          vd3_def_operacional: generated.vd3_def_operacional || '',
          vd3_definicion_operacional: generated.vd3_def_operacional || '',
          vd3_definición_operacional: generated.vd3_def_operacional || '',
          
          vd3_dimension: generated.vd3_dimension || '',
          vd3_dimensión: generated.vd3_dimension || '',
          vd3_indicador: generated.vd3_indicador || '',
          vd3_escala: generated.vd3_escala || '',
        });
      } finally {
        Array.prototype.toString = originalArrayToString;
      }

      const out = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });

      console.log('Generated buffer size:', out.length);
      if (out.length === templateBuffer.length) {
        console.warn('WARNING: Generated file size is identical to template. No replacements were made.');
      }

      const fileName = `generated-docs/${uuidv4()}.docx`;
      await this.storageService.upload(fileName, out, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      
      const url = await this.storageService.getPresignedUrl(fileName);
      console.log('Final URL generated:', url);
      console.log('--- DEBUG GENERATION END ---');

      return { url, id: fileName };
    } catch (error) {
      console.error('CRITICAL ERROR during generation:', error);
      throw new BadRequestException(`Error generating document: ${error.message}`);
    }
  }

  async getDownloadUrl(id: string): Promise<string> {
    return this.storageService.getPresignedUrl(id);
  }

  async getPreviewHtml(id: string): Promise<string> {
    try {
      const { buffer } = await this.getFile(id, 'docx');
      const mammoth = await import('mammoth');
      const result = await mammoth.default.convertToHtml({ buffer });
      
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              html {
                background-color: #f8fafc;
                margin: 0;
                padding: 0;
              }
              body { 
                font-family: 'Arial', sans-serif; 
                padding: 50px 60px; 
                line-height: 1.8; 
                color: #334155; 
                max-width: 800px;
                margin: 30px auto;
                background-color: #ffffff;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                border: 1px solid #e2e8f0;
                border-radius: 8px;
              }
              @media (max-width: 850px) {
                body {
                  margin: 0;
                  border-radius: 0;
                  border: none;
                  box-shadow: none;
                  padding: 24px 16px;
                }
              }
              h1, h2, h3, h4 { 
                color: #0f172a; 
                font-weight: 700;
                margin-top: 28px;
                margin-bottom: 14px;
                line-height: 1.3;
              }
              h1 { font-size: 26px; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; color: #1e3a8a; }
              h2 { font-size: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; color: #1e40af; }
              h3 { font-size: 16px; color: #1e3a8a; }
              p { margin-bottom: 18px; text-align: justify; text-justify: inter-word; }
              table { border-collapse: collapse; width: 100%; margin: 24px 0; table-layout: fixed; }
              th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; font-size: 14px; word-wrap: break-word; }
              th { background-color: #f1f5f9; font-weight: 600; color: #1e293b; }
              ul, ol { margin-bottom: 18px; padding-left: 24px; }
              li { margin-bottom: 8px; }
              
              /* Images scaling */
              img {
                max-width: 100%;
                height: auto !important;
                display: block;
                margin: 24px auto;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
              }
              
              /* Preformatted text / ASCII tree scaling */
              pre {
                background-color: #f8fafc;
                border: 1px solid #e2e8f0;
                padding: 18px;
                overflow-x: auto;
                font-family: 'Courier New', Courier, monospace;
                font-size: 12px;
                border-radius: 6px;
                max-width: 100%;
                white-space: pre-wrap;
                word-wrap: break-word;
                line-height: 1.4;
                color: #334155;
              }
            </style>
          </head>
          <body>
            ${result.value}
          </body>
        </html>
      `;
    } catch (error) {
      console.error('Error rendering document preview:', error);
      return `
        <html>
          <body style="font-family: sans-serif; padding: 20px; color: red;">
            <h3>No se pudo cargar la vista previa del documento.</h3>
            <p>${error.message}</p>
          </body>
        </html>
      `;
    }
  }

  async getFile(id: string, format: 'pdf' | 'docx'): Promise<{ buffer: Buffer; contentType: string }> {
    const key = id;
    const buffer = await this.storageService.download(key);
    const contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    return { buffer, contentType };
  }
}
