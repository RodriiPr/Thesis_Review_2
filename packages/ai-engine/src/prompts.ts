export function buildAnalysisPrompt(
  advanceText: string,
  templateSchema: object,
  templateText: string,
  advanceType: string,
): string {
  const schemaStr = JSON.stringify(templateSchema, null, 2);
  const templateSnippet = templateText.substring(0, 3000);
  const advanceSnippet = advanceText.substring(0, 6000);

  return `Eres un evaluador académico experto en tesis universitarias de posgrado. Evalúa el siguiente avance de tesis.

TIPO DE AVANCE: ${advanceType}

ESTRUCTURA ESPERADA (documento patrón):
${schemaStr}

FRAGMENTO DEL DOCUMENTO PATRÓN:
${templateSnippet}

TEXTO DEL AVANCE DEL ESTUDIANTE:
${advanceSnippet}

Evalúa el avance en cuatro dimensiones (escala 0-100):
1. ESTRUCTURA (30%): Presencia, orden y completitud de secciones obligatorias.
2. CONTENIDO (40%): Profundidad, coherencia, argumentación, uso de citas y calidad académica.
3. FORMA (20%): Extensión adecuada, formato de citas, redacción académica, ortografía.
4. ORIGINALIDAD (10%): Coherencia interna, calidad del lenguaje y pensamiento crítico.

Para cada problema detectado, genera un hallazgo estructurado.

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
{
  "scores": {
    "structure": <número 0-100>,
    "content": <número 0-100>,
    "form": <número 0-100>,
    "originality": <número 0-100>
  },
  "executiveSummary": "<párrafo de 3-5 oraciones: fortalezas, debilidades principales, prioridad de corrección>",
  "findings": [
    {
      "sectionRef": "<nombre de sección o área afectada>",
      "pageRef": <número de página aproximado o null>,
      "severity": "<CRITICAL|MAJOR|MINOR|SUGGESTION>",
      "description": "<descripción clara del problema encontrado>",
      "correctionSteps": "<instrucciones paso a paso para corregir>",
      "exampleImprovement": "<ejemplo concreto de cómo debería quedar>",
      "recommendation": "<consejo adicional de mejora académica>"
    }
  ]
}

Reglas:
- CRITICAL: Sección obligatoria completamente ausente o error que invalida el trabajo.
- MAJOR: Error significativo que requiere corrección antes de aprobar.
- MINOR: Error menor que debe corregirse pero no bloquea la aprobación.
- SUGGESTION: Mejora recomendada para elevar la calidad.
- Genera entre 3 y 8 hallazgos. Si el trabajo es excelente, genera solo sugerencias.
- Sé específico y contextualizado al documento, no genérico.`;
}

export function buildReferenceExtractionPrompt(text: string): string {
  const snippet = text.substring(0, 8000);
  return `Extrae todas las referencias bibliográficas del siguiente texto académico.

TEXTO:
${snippet}

Responde ÚNICAMENTE con un array JSON de referencias con esta estructura:
[
  {
    "rawText": "<texto completo de la referencia tal como aparece>",
    "title": "<título del trabajo>",
    "authors": "<autores>",
    "year": <año como número o null>,
    "doi": "<DOI si aparece explícitamente, o null>",
    "journal": "<nombre de la revista o editorial, o null>"
  }
]

Si no hay referencias, responde con [].`;
}
