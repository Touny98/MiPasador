import { detectarIntencionPasador, manejarSolicitud, manejarComando, manejarPostulacion } from '@/lib/pasador/flows';
import { supabaseAdmin } from '@/lib/utils/supabase/admin';

// Mock supabaseAdmin
jest.mock('@/lib/utils/supabase/admin', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

describe('Pasador flows', () => {
  let supabaseChain: any;

  beforeEach(() => {
    jest.clearAllMocks();

    supabaseChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
    };

    (supabaseAdmin.from as jest.Mock).mockReturnValue(supabaseChain);
  });

  describe('detectarIntencionPasador', () => {
    test('returns null for unrelated text', () => {
      expect(detectarIntencionPasador('hola')).toBeNull();
      expect(detectarIntencionPasador('como estas?')).toBeNull();
    });

    test('returns solicitud for pasador-related keywords', () => {
      expect(detectarIntencionPasador('quisiera un pasador')).toBe('solicitar');
      expect(detectarIntencionPasador('enviar un paquete')).toBe('solicitar');
      expect(detectarIntencionPasador('llevar algo')).toBe('solicitar');
      expect(detectarIntencionPasador('transportar')).toBe('solicitar');
      expect(detectarIntencionPasador('cruzar la ciudad')).toBe('solicitar');
    });

    test('returns comando for * commands', () => {
      expect(detectarIntencionPasador('*ACTIVO')).toBe('comando');
      expect(detectarIntencionPasador('*acepto')).toBe('comando');
      expect(detectarIntencionPasador('*RECHAZO')).toBe('comando');
      expect(detectarIntencionPasador('*listo')).toBe('comando');
      expect(detectarIntencionPasador('*desconectar')).toBe('comando');
    });

    test('returns postular for postulation-related phrases', () => {
      expect(detectarIntencionPasador('quiero ser pasador')).toBe('postular');
      expect(detectarIntencionPasador('postularme')).toBe('postular');
      expect(detectarIntencionPasador('trabajar como pasador')).toBe('postular');
    });
  });

  describe('manejarSolicitud', () => {
    test('starts with location request', async () => {
      const result = await manejarSolicitud('123', 'pasador', {});

      expect(result.respuesta).toContain('compartí tu ubicación');
      expect(result.estado.paso).toBe('ubicacion');
    });

    test('after location, asks for route', async () => {
      const result = await manejarSolicitud(
        '123',
        '-34.6037,-58.3816',
        { pasador_flow: { paso: 'ubicacion', datos: {} } }
      );

      expect(result.respuesta).toContain('indicá la ruta');
      expect(result.estado.paso).toBe('ruta');
      expect(result.estado.data.ubicacion).toEqual({ lat: -34.6037, lng: -58.3816 });
    });

    test('after route, asks for weight', async () => {
      const result = await manejarSolicitud(
        '123',
        'Centro - Aeropuerto',
        { pasador_flow: { paso: 'ruta', datos: { ubicacion: { lat: -34.6037, lng: -58.3816 } } } }
      );

      expect(result.respuesta).toContain('peso del bulto');
      expect(result.estado.paso).toBe('peso');
      expect(result.estado.data.ruta).toBe('Centro - Aeropuerto');
    });

    test('after weight, asks for description', async () => {
      const result = await manejarSolicitud(
        '123',
        '5.5',
        { pasador_flow: { paso: 'peso', datos: { ruta: 'Centro - Aeropuerto', ubicacion: { lat: -34.6037, lng: -58.3816 } } } }
      );

      expect(result.respuesta).toContain('contenido del bulto');
      expect(result.estado.paso).toBe('descripcion');
      expect(result.estado.data.peso).toBe(5.5);
    });

    test('after description, calculates price and assigns pasador', async () => {
      // Mock tarifas_pasador query
      supabaseChain.single.mockResolvedValueOnce({ data: { precio_ars: 150 }, error: null });

      // Mock pasadores query
      supabaseChain.order.mockReturnThis();
      supabaseChain.limit.mockReturnThis();
      supabaseChain.single.mockResolvedValueOnce({
        data: {
          id: 1,
          nombre_completo: 'Juan Pérez',
          reputacion_promedio: 4.5,
          cantidad_viajes_completados: 10
        },
        error: null
      });

      // Mock viajes insert
      supabaseChain.single.mockResolvedValueOnce({
        data: { id: 12345 },
        error: null
      });

      const result = await manejarSolicitud(
        '123',
        'Una caja de libros',
        {
          pasador_flow: {
            paso: 'descripcion',
            datos: {
              ruta: 'Centro - Aeropuerto',
              peso: 5.5,
              ubicacion: { lat: -34.6037, lng: -58.3816 }
            }
          }
        }
      );

      expect(result.respuesta).toContain('Viaje creado');
      expect(result.respuesta).toContain('Juan Pérez');
      expect(result.respuesta).toContain('$150.00');
      expect(result.estado.paso).toBe('confirmacion');
      expect(result.estado.data.viajeId).toBe(12345);
    });
  });

  describe('manejarComando', () => {
    test('*ACTIVO activates pasador', async () => {
      // Mock pasador lookup
      supabaseChain.single.mockResolvedValueOnce({
        data: { id: 1, activo: false },
        error: null
      });

      // Mock pasador update
      supabaseChain.eq.mockReturnThis();
      supabaseChain.update.mockResolvedValueOnce({ error: null });

      // Mock sesiones_pasador insert
      supabaseChain.insert.mockResolvedValueOnce({ error: null });

      const result = await manejarComando('123', 'ACTIVO');

      expect(result).toContain('Estás activo');
      expect(supabaseAdmin.from).toHaveBeenCalledWith('pasadores');
      expect(supabaseAdmin.from).toHaveBeenCalledWith('sesiones_pasador');
    });

    test('*ACEPTO accepts viaje', async () => {
      // Mock pasador lookup
      supabaseChain.single.mockResolvedValueOnce({
        data: { id: 1, activo: true },
        error: null
      });

      // Mock viaje lookup
      supabaseChain.eq.mockReturnThis();
      supabaseChain.single.mockResolvedValueOnce({
        data: { id: 54321, estado: 'asignado', usuario_wa_id: '456' },
        error: null
      });

      // Mock viaje update
      supabaseChain.eq.mockReturnThis();
      supabaseChain.update.mockResolvedValueOnce({ error: null });

      const result = await manejarComando('123', 'ACEPTO');

      expect(result).toContain('Pasador aceptó, en camino');
      expect(supabaseAdmin.from).toHaveBeenCalledWith('viajes');
    });

    test('*DESCONECTAR generates payment link', async () => {
      // Mock pasador lookup
      supabaseChain.single.mockResolvedValueOnce({
        data: { id: 1, activo: true },
        error: null
      });

      // Mock sesiones_pasador lookup (active session)
      supabaseChain.eq.mockReturnThis();
      supabaseChain.is.mockReturnThis();
      supabaseChain.order.mockReturnThis();
      supabaseChain.limit.mockReturnThis();
      supabaseChain.single.mockResolvedValueOnce({
        data: { id: 999, inicio: '2026-05-05T10:00:00Z' },
        error: null
      });

      // Mock viajes completados query
      supabaseChain.eq.mockReturnThis();
      supabaseChain.eq.mockReturnThis();
      supabaseChain.gte.mockReturnThis();
      supabaseChain.order.mockReturnThis();
      supabaseChain.single.mockResolvedValueOnce({
        data: [{ id: 1, precio_ars: 100 }, { id: 2, precio_ars: 150 }],
        error: null
      });

      // Mock sesiones_pasador update
      supabaseChain.eq.mockReturnThis();
      supabaseChain.update.mockResolvedValueOnce({ error: null });

      const result = await manejarComando('123', 'DESCONECTAR');

      expect(result).toContain('Sesión cerrada');
      expect(result).toContain('Viajes completados: 2');
      expect(result).toContain('Total facturado: $250.00');
      expect(result).toContain('Comisión: $25.00');
      expect(result).toContain('Link de pago');
    });
  });

  describe('manejarPostulacion', () => {
    test('starts with name request', async () => {
      const result = await manejarPostulacion('123', 'inicio', 'ser pasador');

      expect(result).toContain('ingresá tu nombre completo');
    });

    test('after name, asks for DNI', async () => {
      const result = await manejarPostulacion('123', 'nombre', 'Juan Pérez');

      expect(result).toContain('Juan Pérez');
      expect(result).toContain('ingresá tu DNI');
    });

    test('after DNI, asks for front image', async () => {
      const result = await manejarPostulacion('123', 'dni', '12345678');

      expect(result).toContain('foto clara del frente');
    });

    test('after front image, asks for back image', async () => {
      const result = await manejarPostulacion('123', 'imagen_frente', '', ['http://example.com/frente.jpg']);

      expect(result).toContain('foto clara del dorso');
    });

    test('after back image, generates PDF and completes', async () => {
      // Mock postulation lookup
      supabaseChain.single.mockResolvedValueOnce({
        data: {
          nombre_completo: 'Juan Pérez',
          dni: '12345678',
          imagen_frente_url: 'http://example.com/frente.jpg',
          imagen_dorso_url: null
        },
        error: null
      });

      // Mock PDF generation (we'll mock the actual function)
      jest.mocked(require('@/lib/utils/pdf/generatePostulacionPdf').generarPostulacionPdf)
        .mockResolvedValueOnce('https://example.com/postulacion.pdf');

      // Mock postulacion update with PDF URL
      supabaseChain.eq.mockReturnThis();
      supabaseChain.update.mockResolvedValueOnce({ error: null });

      const result = await manejarPostulacion(
        '123',
        'imagen_dorso:1',
        '',
        ['http://example.com/dorso.jpg']
      );

      expect(result).toContain('postulación ha sido completada');
      expect(result).toContain('https://example.com/postulacion.pdf');
    });
  });
});