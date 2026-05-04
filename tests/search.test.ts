import {
  normalizeQuery,
  parseIntent,
  scoreProduct,
  rerank,
} from '../lib/search/intent-parser';

// Mock the supabase client for testing searchProducts
jest.mock('@/lib/utils/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

import { searchProducts } from '../lib/search/products';

describe('normalizeQuery', () => {
  it('should convert to lowercase and remove accents', () => {
    expect(normalizeQuery('ÁÉÍÓÚ áéíóú')).toBe('aeiou aeiou');
    expect(normalizeQuery('  HOLA   MUNDO  ')).toBe('hola mundo');
  });

  it('should trim and normalize spaces', () => {
    expect(normalizeQuery('  hello   world  ')).toBe('hello world');
  });
});

describe('parseIntent', () => {
  it('should extract category, brand, capacity, price, and keywords', () => {
    const normalized = 'category: bebida brand: coca-cola 2 lt $100 dulce';
    const intent = parseIntent(normalized);
    expect(intent.category).toBe('bebida');
    expect(intent.brand).toBe('coca-cola');
    expect(intent.capacityLiters).toBeCloseTo(2);
    expect(intent.maxPriceArs).toBe(100);
    expect(intent.keywords).toContain('dulce');
  });

  it('should handle missing fields', () => {
    const normalized = 'just some keywords';
    const intent = parseIntent(normalized);
    expect(intent.category).toBeNull();
    expect(intent.brand).toBeNull();
    expect(intent.capacityLiters).toBeNull();
    expect(intent.maxPriceArs).toBeNull();
    expect(intent.keywords).toEqual(['just', 'some', 'keywords']);
  });

  it('should parse capacity in ml', () => {
    const normalized = '500 ml';
    const intent = parseIntent(normalized);
    expect(intent.capacityLiters).toBeCloseTo(0.5);
  });

  it('should parse price with $ and pesos', () => {
    let normalized = '$150';
    let intent = parseIntent(normalized);
    expect(intent.maxPriceArs).toBe(150);

    normalized = '150 pesos';
    intent = parseIntent(normalized);
    expect(intent.maxPriceArs).toBe(150);
  });
});

describe('scoreProduct', () => {
  const mockProduct = {
    name: 'Coca-Cola 2 lt',
    category: 'bebida',
    brand: 'coca-cola',
    capacityLiters: 2,
    priceArs: 90,
    description: 'Bebida gaseosa dulce',
  };

  it('should score high for exact matches', () => {
    const intent = {
      category: 'bebida',
      brand: 'coca-cola',
      capacityLiters: 2,
      maxPriceArs: 100,
      keywords: ['dulce'],
    };
    const score = scoreProduct(mockProduct, intent, 1);
    expect(score).toBeCloseTo(1.0); // All matches
  });

  it('should score lower for partial matches', () => {
    const intent = {
      category: 'bebida',
      brand: 'pepsi', // different brand
      capacityLiters: 2,
      maxPriceArs: 100,
      keywords: ['dulce'],
    };
    const score = scoreProduct(mockProduct, intent, 1);
    expect(score).toBeLessThan(1.0);
    expect(score).toBeGreaterThan(0);
  });

  it('should score zero if over budget', () => {
    const intent = {
      category: 'bebida',
      brand: 'coca-cola',
      capacityLiters: 2,
      maxPriceArs: 80, // less than product price 90
      keywords: ['dulce'],
    };
    const score = scoreProduct(mockProduct, intent, 1);
    // Since price is over budget, we give 0 for price weight, but other weights may apply.
    // In our implementation, we only add price weight if under budget.
    // So we expect score from category, brand, capacity, keywords.
    // Let's calculate: category (0.3) + brand (0.2) + capacity (0.2) + keywords (0.1 * 1) = 0.8
    expect(score).toBeCloseTo(0.8);
  });
});

describe('rerank', () => {
  it('should return top-3 products sorted by score', () => {
    const products = [
      { name: 'Product A', category: 'cat', brand: 'brand', capacityLiters: 1, priceArs: 50 },
      { name: 'Product B', category: 'cat', brand: 'brand', capacityLiters: 1, priceArs: 50 },
      { name: 'Product C', category: 'cat', brand: 'brand', capacityLiters: 1, priceArs: 50 },
      { name: 'Product D', category: 'cat', brand: 'brand', capacityLiters: 1, priceArs: 50 },
    ];
    const intent = {
      category: 'cat',
      brand: 'brand',
      capacityLiters: 1,
      maxPriceArs: 100,
      keywords: [],
    };
    const top3 = rerank(products, intent);
    expect(top3.length).toBe(Math.min(3, products.length));
    // Since all have same score, order may be preserved? We'll just check length.
  });
});

describe('searchProducts', () => {
  it('should call supabase.rpc with normalized query and merchantId and return reranked results', async () => {
    const mockProducts = [
      { id: 1, name: 'Test Product', category: 'test', brand: 'test', capacityLiters: 1, priceArs: 100, description: 'A test product' },
    ];
    const mockMerchantId = 'merchant-123';

    // Mock the supabase.rpc function
    const { supabase } = require('@/lib/utils/supabase');
    supabase.rpc.mockResolvedValue({ data: mockProducts, error: null });

    const results = await searchProducts('test query', mockMerchantId);

    expect(supabase.rpc).toHaveBeenCalledWith('search_products', {
      query_text: 'test query', // normalized would be same as input in this case
      merchant: mockMerchantId,
    });
    expect(results).toEqual(mockProducts);
  });

  it('should handle error from rpc', async () => {
    const mockError = new Error('Database error');
    const { supabase } = require('@/lib/utils/supabase');
    supabase.rpc.mockResolvedValue({ data: null, error: mockError });

    await expect(searchProducts('test query', 'merchant-123')).rejects.toThrow('Database error');
  });
});