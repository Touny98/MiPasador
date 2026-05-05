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

jest.mock('@/lib/utils/supabase', () => ({
  supabaseAdmin: { from: jest.fn() },
}));

jest.mock('@/lib/search/products', () => ({
  searchProducts: jest.fn(),
}));

jest.mock('@/lib/services/reservationService', () => ({
  createReservation: jest.fn(),
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
});
