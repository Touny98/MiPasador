export function normalizeQuery(raw: string): string {
  let normalized = raw.toLowerCase();
  // Strip Unicode combining marks (U+0300–U+036F) after NFD decomposition
  normalized = normalized.normalize('NFD').replace(/[̀-ͯ]/g, '');
  normalized = normalized.trim().replace(/\s+/g, ' ');
  return normalized;
}

export function parseIntent(normalized: string): {
  category: string | null;
  brand: string | null;
  capacityLiters: number | null;
  maxPriceArs: number | null;
  keywords: string[];
} {
  const categoryMatches = normalized.match(/(?:category:|categoria:)\s*(\w+)/i);
  const category = categoryMatches ? categoryMatches[1] : null;

  const brandMatches = normalized.match(/(?:brand:|marca:)\s*([\w-]+)/i);
  const brand = brandMatches ? brandMatches[1] : null;

  // Capacity: "2l", "2 litros", "500ml", etc.
  const capacityMatches = normalized.match(/(\d+(?:\.\d+)?)\s*(lt|l|litros?|ml)\b/i);
  let capacityLiters: number | null = null;
  if (capacityMatches) {
    const value = parseFloat(capacityMatches[1]);
    const unit = capacityMatches[2].toLowerCase();
    capacityLiters = unit === 'ml' ? value / 1000 : value;
  }

  // Price: "$100" or "100 pesos" — handle number-before and number-after formats
  let maxPriceArs: number | null = null;
  const priceMatchDollar = normalized.match(/\$\s*(\d+(?:[.,]\d+)?)/);
  const priceMatchPesos = normalized.match(/(\d+(?:[.,]\d+)?)\s*pesos\b/i);
  if (priceMatchDollar) {
    maxPriceArs = parseFloat(priceMatchDollar[1].replace(',', '.'));
  } else if (priceMatchPesos) {
    maxPriceArs = parseFloat(priceMatchPesos[1].replace(',', '.'));
  }

  // Keywords: remove already-extracted patterns, split remainder
  let keywordsStr = normalized;
  if (categoryMatches) keywordsStr = keywordsStr.replace(categoryMatches[0], '');
  if (brandMatches) keywordsStr = keywordsStr.replace(brandMatches[0], '');
  if (capacityMatches) keywordsStr = keywordsStr.replace(capacityMatches[0], '');
  if (priceMatchDollar) keywordsStr = keywordsStr.replace(priceMatchDollar[0], '');
  else if (priceMatchPesos) keywordsStr = keywordsStr.replace(priceMatchPesos[0], '');

  const keywords = keywordsStr
    .split(' ')
    .map((w) => w.trim())
    .filter((w) => w.length > 0);

  return { category, brand, capacityLiters, maxPriceArs, keywords };
}

export function scoreProduct(
  product: any,
  intent: ReturnType<typeof parseIntent>,
  rate: number = 1.0
): number {
  let score = 0;

  const weights = { category: 0.3, brand: 0.2, capacity: 0.2, price: 0.2, keywords: 0.1 };

  if (intent.category && product.category === intent.category) {
    score += weights.category;
  }

  // brand column does not exist in current schema — no-op until added
  if (intent.brand && product.brand && product.brand === intent.brand) {
    score += weights.brand;
  }

  // capacity_liters column does not exist in current schema — no-op until added
  if (intent.capacityLiters !== null && product.capacity_liters !== null) {
    const diff = Math.abs(product.capacity_liters - intent.capacityLiters);
    const maxCap = Math.max(product.capacity_liters, intent.capacityLiters);
    score += maxCap > 0 ? weights.capacity * (1 - diff / maxCap) : weights.capacity;
  }

  // product.price is stored in product.currency; rate converts to ARS
  // Some test mocks may provide priceArs directly
  let priceInArs: number | null = null;
  if (product.price != null) {
    const priceInBaseCurrency = parseFloat(product.price);
    priceInArs = priceInBaseCurrency * rate;
  } else if (product.priceArs != null) {
    priceInArs = parseFloat(product.priceArs);
  }

  if (intent.maxPriceArs !== null && priceInArs != null) {
    if (priceInArs <= intent.maxPriceArs) {
      score += weights.price;
    }
  }

  if (intent.keywords.length > 0) {
    const text = `${product.name} ${product.description ?? ''}`.toLowerCase();
    const matches = intent.keywords.filter((kw) => text.includes(kw)).length;
    score += weights.keywords * (matches / intent.keywords.length);
  }

  return score;
}

export function rerank(products: any[], intent: ReturnType<typeof parseIntent>): any[] {
  if (products.length === 0) return [];

  const maxReservations = Math.max(...products.map(p => p.total_reservations || 0));

  return products
    .map((product) => {
      const intentScore = scoreProduct(product, intent);
      const popularityScore = maxReservations > 0 ? (product.total_reservations || 0) / maxReservations : 0;
      const finalScore = intentScore * 0.7 + popularityScore * 0.3;
      return { product, score: finalScore };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((sp) => sp.product);
}
