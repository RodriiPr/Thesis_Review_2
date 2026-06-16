import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

export async function extractText(buffer: Buffer, fileType: 'pdf' | 'docx'): Promise<string> {
  if (fileType === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  const data = await pdfParse(buffer);
  return data.text.trim();
}
