import { PDFDocument, rgb, StandardFonts } from 'pdfkit';
import { supabaseAdmin } from '@/lib/utils/supabase/admin';
import type { Json } from '@/lib/database.types';

interface PostulacionData {
  id: number;
  nombre_completo: string;
  dni: string;
  wa_user_id: string;
  fecha_nacimiento: string;
  domicilio: string;
  telefono: string;
  email: string;
  antecedentes: string;
  vehículo: string;
  documento_vehiculo: string;
  seguro_vehiculo: string;
  licencia_conducir: string;
  foto_perfil: string;
  foto_documento: string;
  foto_vehiculo: string;
  foto_seguro: string;
  foto_licencia: string;
  pdf_url?: string;
  estado: string;
  created_at: string;
}

/**
 * Generates a PDF for a postulacion and uploads it to Supabase Storage
 */
export async function generatePostulacionPdf(
  postulacion: PostulacionData
): Promise<string> {
  // Create a new PDF document
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  // Generate buffer to store PDF data
  const chunks: Uint8Array[] = [];
  doc.on('data', chunk => chunks.push(chunk));

  const pdfPromise = new Promise<Uint8Array>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  // Add content to PDF
  doc.fontSize(20).text('POSTULACIÓN DE PASADOR', { align: 'center' });
  doc.moveDown();

  doc.fontSize(16).text('Datos del Postulante', { underline: true });
  doc.moveDown(0.5);

  doc.fontSize(12)
    .text(`Nombre completo: ${postulacion.nombre_completo}`)
    .text(`DNI: ${postulacion.dni}`)
    .text(`WhatsApp ID: ${postulacion.wa_user_id || 'No proporcionado'}`)
    .text(`Fecha de nacimiento: ${postulacion.fecha_nacimiento || 'No proporcionada'}`)
    .text(`Domicilio: ${postulacion.domicilio || 'No proporcionado'}`)
    .text(`Teléfono: ${postulacion.telefono || 'No proporcionado'}`)
    .text(`Email: ${postulacion.email || 'No proporcionado'}`)
    .moveDown();

  doc.fontSize(16).text('Información del Vehículo', { underline: true });
  doc.moveDown(0.5);

  doc.fontSize(12)
    .text(`Tipo de vehículo: ${postulacion.vehículo || 'No proporcionado'}`)
    .text(`Documento del vehículo: ${postulacion.documento_vehiculo || 'No proporcionado'}`)
    .text(`Seguro del vehículo: ${postulacion.seguro_vehiculo || 'No proporcionado'}`)
    .text(`Licencia de conducir: ${postulacion.licencia_conducir || 'No proporcionado'}`)
    .moveDown();

  doc.fontSize(16).text('Antecedentes', { underline: true });
  doc.moveDown(0.5);

  doc.fontSize(12)
    .text(postulacion.antecedentes || 'No proporcionados')
    .moveDown();

  doc.fontSize(10)
    .text(`Fecha de postulación: ${new Date(postulacion.created_at).toLocaleString()}`,
          { align: 'right' })
    .moveDown();

  // Finalize PDF
  doc.end();

  // Wait for PDF to be generated
  const pdfBuffer = await pdfPromise;

  // Upload to Supabase Storage
  const fileName = `postulacion-${postulacion.id}-${Date.now()}.pdf`;
  const filePath = `postulaciones/${fileName}`;

  const { data, error } = await supabaseAdmin
    .storage
    .from('documentos')
    .upload(filePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false
    });

  if (error) {
    console.error('Error uploading PDF to Supabase Storage:', error);
    throw error;
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from('documentos').getPublicUrl(filePath);

  // Update postulacion record with PDF URL
  const { error: updateError } = await supabaseAdmin
    .from('postulaciones')
    .update({ pdf_url: publicUrl })
    .eq('id', postulacion.id);

  if (updateError) {
    console.error('Error updating postulacion with PDF URL:', updateError);
    throw updateError;
  }

  return publicUrl;
}

/**
 * Generates a simple PDF for testing purposes
 */
export async function generateTestPdf(content: string): Promise<string> {
  const doc = new PDFDocument();

  const chunks: Uint8Array[] = [];
  doc.on('data', chunk => chunks.push(chunk));

  const pdfPromise = new Promise<Uint8Array>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  doc.fontSize(16).text(content, { align: 'center' });
  doc.end();

  const pdfBuffer = await pdfPromise;

  const fileName = `test-${Date.now()}.pdf`;
  const filePath = `test/${fileName}`;

  const { error } = await supabaseAdmin
    .storage
    .from('documentos')
    .upload(filePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false
    });

  if (error) {
    console.error('Error uploading test PDF:', error);
    throw error;
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from('documentos').getPublicUrl(filePath);

  return publicUrl;
}