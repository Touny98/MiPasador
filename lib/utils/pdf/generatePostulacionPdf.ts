import PDFDocument from 'pdfkit';
import { supabaseAdmin } from '@/lib/utils/supabase/admin';

interface PostulacionPdfData {
  nombre_completo: string;
  dni: string;
  imagen_frente_url: string;
  imagen_dorso_url: string;
}

export async function generarPostulacionPdf(data: PostulacionPdfData): Promise<string> {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks: Buffer[] = [];

  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  const pdfPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  doc.fontSize(20).text('POSTULACIÓN DE PASADOR', { align: 'center' });
  doc.moveDown();

  doc.fontSize(14).text('Datos del Postulante', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12)
    .text(`Nombre completo: ${data.nombre_completo}`)
    .text(`DNI: ${data.dni}`)
    .moveDown();

  doc.fontSize(14).text('Documentación adjunta', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12);

  if (data.imagen_frente_url) {
    doc.text('Frente DNI:');
    doc.image(data.imagen_frente_url, {
      fit: [400, 300],
      align: 'center'
    });
    doc.moveDown();
  } else {
    doc.text('Frente DNI: No proporcionado');
    doc.moveDown();
  }

  if (data.imagen_dorso_url) {
    doc.text('Dorso DNI:');
    doc.image(data.imagen_dorso_url, {
      fit: [400, 300],
      align: 'center'
    });
    doc.moveDown();
  } else {
    doc.text('Dorso DNI: No proporcionado');
    doc.moveDown();
  }

  doc.end();

  const pdfBuffer = await pdfPromise;
  const fileName = `postulacion-${Date.now()}.pdf`;
  const filePath = `postulaciones/${fileName}`;

  const { error } = await supabaseAdmin
    .storage
    .from('documentos')
    .upload(filePath, pdfBuffer, { contentType: 'application/pdf', upsert: false });

  if (error) {
    console.error('Error uploading PDF to Supabase Storage:', error);
    throw error;
  }

  const { data: { publicUrl } } = supabaseAdmin.storage.from('documentos').getPublicUrl(filePath);
  return publicUrl;
}
