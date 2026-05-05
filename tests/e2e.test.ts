import { handleIncomingMessage, handleInteractiveMessage } from '../lib/bot/dispatcher';
import { MetaCloudProvider } from '../lib/messaging/meta-cloud';

// All jest.mock factories are fully self-contained — no external variable references
jest.mock('../lib/messaging/meta-cloud', () => ({
  MetaCloudProvider: jest.fn().mockImplementation(() => ({
    sendMessage: jest.fn().mockResolvedValue(undefined),
    sendInteractiveButtons: jest.fn().mockResolvedValue(undefined),
    sendList: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@/lib/utils/supabase/admin', () => ({
  supabaseAdmin: { from: jest.fn() },
}));

jest.mock('@/lib/search/products', () => ({
  searchProducts: jest.fn(),
}));

jest.mock('@/lib/services/reservationService', () => ({
  createReservation: jest.fn(),
}));

jest.mock('@/lib/pasador/flows', () => ({
  detectarIntencionPasador: jest.fn(),
  manejarSolicitud: jest.fn(),
  manejarComando: jest.fn(),
  manejarPostulacion: jest.fn(),
}));

describe('Bot dispatcher', () => {
  // metaMock holds the mock object returned by the dispatcher's `new MetaCloudProvider()` call
  let metaMock: { sendMessage: jest.Mock; sendInteractiveButtons: jest.Mock; sendList: jest.Mock };
  let supabaseChain: { select: jest.Mock; eq: jest.Mock; single: jest.Mock; insert: jest.Mock };

  beforeAll(() => {
    // Dispatcher creates metaProvider at module load — capture that instance before any clearAllMocks
    metaMock = (MetaCloudProvider as jest.Mock).mock.results[0].value as typeof metaMock;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Restore implementations that clearAllMocks cleared
    metaMock.sendMessage.mockResolvedValue(undefined);
    metaMock.sendInteractiveButtons.mockResolvedValue(undefined);
    metaMock.sendList.mockResolvedValue(undefined);

    // Fresh supabase chain per test
    supabaseChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockResolvedValue({ error: null }),
    };
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { supabaseAdmin } = require('@/lib/utils/supabase');
    (supabaseAdmin.from as jest.Mock).mockReturnValue(supabaseChain);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { searchProducts } = require('@/lib/search/products');
    (searchProducts as jest.Mock).mockResolvedValue([]);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createReservation } = require('@/lib/services/reservationService');
    (createReservation as jest.Mock).mockResolvedValue(undefined);
  });

  // --- Text message flows ---

  test('greeting "hola" sends welcome message', async () => {
    await handleIncomingMessage('123', 'hola');

    expect(metaMock.sendMessage).toHaveBeenCalled();
    expect(metaMock.sendMessage.mock.calls[0][0]).toBe('123');
    expect(metaMock.sendMessage.mock.calls[0][1]).toContain('Hola! 👋');
  });

  test('"menu" sends interactive list with "Ver opciones" button label', async () => {
    await handleIncomingMessage('123', 'menu');

    // sendList(to, body, buttonLabel, sections, header?)
    expect(metaMock.sendList).toHaveBeenCalled();
    const [to, , buttonLabel] = metaMock.sendList.mock.calls[0];
    expect(to).toBe('123');
    expect(buttonLabel).toBe('Ver opciones');
  });

  test('search with 1 result sends interactive buttons with reserve_<id>', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { searchProducts } = require('@/lib/search/products');
    (searchProducts as jest.Mock).mockResolvedValue([
      { id: 'prod1', name: 'Freidora de Aire', price: 99, description: 'Sin aceite' },
    ]);

    await handleIncomingMessage('123', 'freidora');

    // sendInteractiveButtons(to, body, buttons, header?)
    expect(metaMock.sendInteractiveButtons).toHaveBeenCalled();
    const [to, , buttons] = metaMock.sendInteractiveButtons.mock.calls[0];
    expect(to).toBe('123');
    expect(buttons[0].id).toBe('reserve_prod1');
    expect(buttons[0].title).toBe('Reservar este');
  });

  test('search with 3 results sends list with reserve_<id> rows', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { searchProducts } = require('@/lib/search/products');
    (searchProducts as jest.Mock).mockResolvedValue([
      { id: 'p1', name: 'Producto 1', price: 10 },
      { id: 'p2', name: 'Producto 2', price: 20 },
      { id: 'p3', name: 'Producto 3', price: 30 },
    ]);

    await handleIncomingMessage('123', 'productos');

    // sendList(to, body, buttonLabel, sections, header?)
    expect(metaMock.sendList).toHaveBeenCalled();
    const [to, , buttonLabel, sections] = metaMock.sendList.mock.calls[0];
    expect(to).toBe('123');
    expect(buttonLabel).toBe('Ver productos');
    expect(sections[0].rows).toHaveLength(3);
    expect(sections[0].rows[0].id).toBe('reserve_p1');
    expect(sections[0].rows[1].id).toBe('reserve_p2');
    expect(sections[0].rows[2].id).toBe('reserve_p3');
  });

  test('search with 0 results sends NO_RESULTS message', async () => {
    // searchProducts returns [] by default (set in beforeEach)
    await handleIncomingMessage('123', 'producto inexistente');

    expect(metaMock.sendMessage).toHaveBeenCalled();
    expect(metaMock.sendMessage.mock.calls[0][0]).toBe('123');
    expect(metaMock.sendMessage.mock.calls[0][1]).toContain('No encontré');
  });

  // --- Interactive message flows ---

  test('button reply reserve_<uuid> creates reservation and sends confirmation', async () => {
    supabaseChain.single.mockResolvedValueOnce({
      data: { id: 'prod123', name: 'Freidora', price: 99, description: '' },
      error: null,
    });

    await handleInteractiveMessage('123', 'reserve_prod123', 'merchant1', 'conv1');

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createReservation } = require('@/lib/services/reservationService');
    expect(createReservation).toHaveBeenCalledWith(expect.objectContaining({
      conversationId: 'conv1',
      productId: 'prod123',
      quantity: 1,
      status: 'pending',
      notes: expect.any(String),
    }));
    expect(metaMock.sendMessage).toHaveBeenCalled();
    expect(metaMock.sendMessage.mock.calls[0][0]).toBe('123');
    expect(metaMock.sendMessage.mock.calls[0][1]).toContain('Reserva confirmada');
  });

  test('button reply menu_search sends search instruction', async () => {
    await handleInteractiveMessage('123', 'menu_search', '', 'conv1');

    expect(metaMock.sendMessage).toHaveBeenCalled();
    expect(metaMock.sendMessage.mock.calls[0][0]).toBe('123');
    expect(metaMock.sendMessage.mock.calls[0][1]).toContain('Escribí el nombre del producto que buscás');
  });

  // --- Pasador flow tests ---

  test('pasador solicitation flow: start with location request', async () => {
    // Mock detectarIntencionPasador to return 'solicitar' for "pasador"
    const { detectarIntencionPasador } = require('@/lib/pasador/flows');
    (detectarIntencionPasador as jest.Mock).mockReturnValueOnce('solicitar');

    // Mock manejarSolicitud to return a response asking for location
    const { manejarSolicitud } = require('@/lib/pasador/flows');
    (manejarSolicitud as jest.Mock).mockResolvedValueOnce({
      respuesta: '📍 Por favor, compartí tu ubicación actual (puedes usar el botón de ubicación de WhatsApp o escribir tu dirección).',
      estado: {
        paso: 'ubicacion',
        datos: {}
      }
    });

    await handleIncomingMessage('123', 'pasador');

    expect(detectarIntencionPasador).toHaveBeenCalledWith('pasador');
    expect(manejarSolicitud).toHaveBeenCalledWith('123', 'pasador', {});
    expect(metaMock.sendMessage).toHaveBeenCalled();
    expect(metaMock.sendMessage.mock.calls[0][0]).toBe('123');
    expect(metaMock.sendMessage.mock.calls[0][1]).toContain('compartí tu ubicación');
  });

  test('pasador solicitation flow: location step asks for route', async () => {
    // Mock detectarIntencionPasador to return null (not a new solicitud)
    const { detectarIntencionPasador } = require('@/lib/pasador/flows');
    (detectarIntencionPasador as jest.Mock).mockReturnValueOnce(null);

    // Mock manejarSolicitud to handle the ubicacion step
    const { manejarSolicitud } = require('@/lib/pasador/flows');
    (manejarSolicitud as jest.Mock).mockResolvedValueOnce({
      respuesta: '🛣️ Ahora, indicá la ruta (por ejemplo: "Centro - Aeropuerto" o "Casa - Trabajo"):',
      estado: {
        paso: 'ruta',
        datos: {
          ubicacion: { lat: -34.6037, lng: -58.3816 }
        }
      }
    });

    // Simulate sending location (we'll simulate by sending coordinates as text)
    await handleIncomingMessage('123', '-34.6037,-58.3816');

    expect(detectarIntencionPasador).toHaveBeenCalledWith('-34.6037,-58.3816');
    expect(manejarSolicitud).toHaveBeenCalledWith(
      '123',
      '-34.6037,-58.3816',
      { pasador_flow: { paso: 'ubicacion', datos: {} } }
    );
    expect(metaMock.sendMessage).toHaveBeenCalled();
    expect(metaMock.sendMessage.mock.calls[0][0]).toBe('123');
    expect(metaMock.sendMessage.mock.calls[0][1]).toContain('indicá la ruta');
  });

  test('pasador comandos: *ACTIVO activates pasador', async () => {
    // Mock manejarComando to return activation response
    const { manejarComando } = require('@/lib/pasador/flows');
    (manejarComando as jest.Mock).mockResolvedValueOnce('✅ Estás activo, esperando viajes.');

    await handleIncomingMessage('123', '*ACTIVO');

    expect(manejarComando).toHaveBeenCalledWith('123', 'ACTIVO');
    expect(metaMock.sendMessage).toHaveBeenCalled();
    expect(metaMock.sendMessage.mock.calls[0][0]).toBe('123');
    expect(metaMock.sendMessage.mock.calls[0][1]).toContain('Estás activo');
  });

  test('pasador postulation flow: start with name request', async () => {
    // Mock detectarIntencionPasador to return 'postular' for "ser pasador"
    const { detectarIntencionPasador } = require('@/lib/pasador/flows');
    (detectarIntencionPasador as jest.Mock).mockReturnValueOnce('postular');

    // Mock manejarPostulacion to return a response asking for name
    const { manejarPostulacion } = require('@/lib/pasador/flows');
    (manejarPostulacion as jest.Mock).mockResolvedValueOnce('📄 Vamos a iniciar tu postulación como pasador. Por favor, ingresá tu nombre completo:');

    await handleIncomingMessage('123', 'ser pasador');

    expect(detectarIntencionPasador).toHaveBeenCalledWith('ser pasador');
    expect(manejarPostulacion).toHaveBeenCalledWith('123', 'inicio', 'ser pasador', []);
    expect(metaMock.sendMessage).toHaveBeenCalled();
    expect(metaMock.sendMessage.mock.calls[0][0]).toBe('123');
    expect(metaMock.sendMessage.mock.calls[0][1]).toContain('ingresá tu nombre completo');
  });
});
