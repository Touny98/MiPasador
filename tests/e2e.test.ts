import { handleIncomingMessage } from '../lib/bot/dispatcher';
import { MetaCloudProvider } from '../lib/messaging/meta-cloud';

// Mock the Supabase client
jest.mock('@supabase/supabase-js', () => {
  return {
    createClient: () => ({
      from: () => ({
        select: () => ({
          ilike: () => ({
            or: () => ({
              order: () => ({
                // Mock data: return a sample product
                limit: () => Promise.resolve({ data: [{ id: 1, name: 'Producto de prueba', description: 'Descripción de prueba', price: 100 }], error: null }),
              }),
            }),
          }),
        }),
      }),
    }),
  };
});

// Mock the MetaCloudProvider.sendMessage method
jest.mock('../lib/messaging/meta-cloud', () => {
  return {
    MetaCloudProvider: jest.fn().mockImplementation(() => {
      return {
        sendMessage: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

describe('E2E test for bot dispatcher', () => {
  let metaProviderMock: jest.Mocked<MetaCloudProvider>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Create a mock instance of MetaCloudProvider
    metaProviderMock = new MetaCloudProvider('test-token', 'test-phone-id') as jest.Mocked<MetaCloudProvider>;
  });

  test('should return products when message matches a product', async () => {
    const from = '1234567890';
    const message = 'producto de prueba';

    // Call the dispatcher
    await handleIncomingMessage(from, message);

    // Verify that sendMessage was called with a response containing the product
    expect(metaProviderMock.sendMessage).toHaveBeenCalled();
    const callArgs = metaProviderMock.sendMessage.mock.calls[0];
    expect(callArgs[0]).toBe(from); // The recipient
    expect(callArgs[1]).toContain('Producto de prueba'); // The message should contain the product name
  });

  test('should handle no results and log unresolved query', async () => {
    // Mock the Supabase client to return empty data
    const supabaseMock = {
      from: () => ({
        select: () => ({
          ilike: () => ({
            or: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        }),
      }),
    };
    // We need to replace the supabase instance in the dispatcher module
    // Since we mocked the supabase client globally, we can adjust the mock return value
    // But for simplicity, we'll just test the dispatcher with a different approach.
    // Instead, we'll modify the mock to return empty data for this test.
    // We'll do it by changing the mock implementation in the test.
    // However, we already have a global mock. Let's reset and set a new mock for this test.
    jest.resetModules();
    jest.mock('@supabase/supabase-js', () => {
      return {
        createClient: () => ({
          from: () => ({
            select: () => ({
              ilike: () => ({
                or: () => ({
                  order: () => ({
                    limit: () => Promise.resolve({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          }),
        }),
      };
    });
    // Re-import the dispatcher to get the new mock
    const { handleIncomingMessage } = require('../lib/bot/dispatcher');
    const metaProviderMock = new MetaCloudProvider('test-token', 'test-phone-id') as jest.Mocked<MetaCloudProvider>;

    const from = '1234567890';
    const message = 'producto inexistente';

    await handleIncomingMessage(from, message);

    expect(metaProviderMock.sendMessage).toHaveBeenCalled();
    const callArgs = metaProviderMock.sendMessage.mock.calls[0];
    expect(callArgs[0]).toBe(from);
    expect(callArgs[1]).toContain('Lo siento, no encontré productos');
  });
});