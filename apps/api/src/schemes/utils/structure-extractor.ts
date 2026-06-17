import { Injectable, Logger } from '@nestjs/common';
import { extractText } from '@thesis-review/ai-engine';


@Injectable()
export class StructureExtractor {
  private readonly logger = new Logger(StructureExtractor.name);

  async extract(buffer: Buffer, fileType: 'pdf' | 'docx'): Promise<any> {
    const text = await extractText(buffer, fileType);
    
    // Tomar solo los primeros 10000 caracteres para el análisis de estructura para no exceder tokens
    const sampleText = text.substring(0, 10000);

    const { ChatDeepSeek } = await import('@langchain/deepseek');
    const model = new ChatDeepSeek({
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      temperature: 0.1, // Baja temperatura para consistencia en JSON
    });

    const prompt = `Eres un experto en metodología de la investigación. Tu tarea es analizar el siguiente fragmento de un documento académico (tesis, proyecto de tesis o artículo científico) y extraer su ESTRUCTURA DE CAPÍTULOS Y SECCIONES.

TEXTO DEL DOCUMENTO:
"""
${sampleText}
"""

REQUISITOS DE SALIDA:
1. Identifica los capítulos principales (ej: Introducción, Metodología, etc.).
2. Para cada capítulo, identifica las secciones internas o subcapítulos si existen.
3. Para cada capítulo, define una breve descripción de lo que debe contener y sus requisitos académicos (ej: "Mínimo 5 páginas", "Citas APA").
4. El formato de salida DEBE ser un JSON válido con la siguiente estructura:

{
  "chapters": [
    {
      "id": "string_id_unico",
      "name": "Nombre del Capítulo",
      "description": "Descripción detallada",
      "requirements": ["Requisito 1", "Requisito 2"],
      "sections": [
        {
          "name": "Nombre de la sección",
          "description": "Descripción"
        }
      ]
    }
  ]
}

Responde ÚNICAMENTE con el objeto JSON.`;

    try {
      const response = await model.invoke(prompt);
      const content = response.content.toString();
      
      // Limpiar posible formato markdown si la IA lo incluye
      const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (error) {
      this.logger.error('Error extracting structure with DeepSeek', error);
      throw new Error('No se pudo extraer la estructura del documento');
    }
  }
}
