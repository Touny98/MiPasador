export const truncate = (str: string, max: number) =>
  str.length > max ? str.substring(0, max - 3) + '...' : str;

export const parseReserveButtonId = (id: string) => {
  if (id.startsWith('sales_reserve_')) return { type: 'reserve', productId: id.replace('sales_reserve_', '') };
  if (id.startsWith('followup_reserve_')) return { type: 'reserve', productId: id.replace('followup_reserve_', '') };
  if (id.startsWith('sales_cat_')) return { type: 'category', categoryName: id.replace('sales_cat_', '') };
  if (id === 'sales_cheaper') return { type: 'cheaper' };
  if (id === 'sales_more') return { type: 'more'};
  if (id === 'sales_no_thanks' || id === 'followup_no_thanks') return { type: 'no_thanks' };
  if (id.startsWith('reserve_')) return { type: 'reserve', productId: id.replace('reserve_', '') };
  return { type: 'unknown' };
};

export const isGreeting = (text: string) => {
  const greetings = ['hola', 'buen día', 'buenas tardes', 'buenas noches', 'hey', 'hi'];
  return greetings.some(g => text.toLowerCase().trim().startsWith(g));
};

export const isMenuRequest = (text: string) => {
  const menus = ['menu', 'ayuda', 'opciones', 'qué puedo hacer'];
  return menus.some(m => text.toLowerCase().includes(m));
};

export const isDoubtCheaper = (text: string) => {
  const cheaper = ['más económico', 'más barato', 'algo económico', 'menor precio', 'barato'];
  return cheaper.some(c => text.toLowerCase().includes(c));
};

export const isDoubtBetter = (text: string) => {
  const better = ['algo mejor', 'mejor calidad', 'más caro', 'premium'];
  const t = text.toLowerCase().trim();
  return better.some(b => t.includes(b));
};

export const isConfirmation = (text: string) => {
  const trimmed = text.toLowerCase().trim();
  if (isNegation(trimmed)) return false;
  const confirms = ['sí', 'si', 'dale', 'ok', 'bueno', 'quiero', 'reserva', 'reservar'];
  return confirms.some(c => {
    if (c.length <= 2) return trimmed === c;
    return trimmed.includes(c);
  });
};

export const isNegation = (text: string) => {
  const negations = ['no', 'no gracias', 'nada', 'no quiero', 'no quiero reservar'];
  return negations.some(n => {
    const trimmed = text.toLowerCase().trim();
    if (n.length <= 2) return trimmed === n;
    return trimmed.includes(n);
  });
};

export const MSG = {
  WELCOME: () => "¡Hola! ¿Qué estás buscando? 👇",
  NO_RESULTS: "No encontré eso 🤔\n¿Probás con otra palabra?",
  NO_PRODUCT_FOR_RESERVE: "No encontré ese producto.\n¿Cómo se llama exactamente?",
  RESERVE_MISSING_PRODUCT: "¿Qué querés reservar? 🛍️\nEscribí el nombre del producto.",
  RESERVE_CONFIRM: (name: string, code: string) =>
    `✅ Confirmado\n📦 ${name}\n🔑 Código: ${code}\nTe contactamos pronto 🤙`,
  RESERVE_ERROR: "Ups, no pude hacer la reserva. 😕\nIntentalo de nuevo.",
  GENERIC_ERROR: "Algo salió mal. 😕\nEscribí de nuevo.",
  NO_CONVERSATION: "No pude identificar tu conversación.\nEscribí hola para empezar.",
  MENU_HEADER: "¿Qué querés hacer?",
  MENU_BODY: "Elegí una opción 👇",
  MENU_BUTTON: "Ver opciones",
  SEARCH_HEADER: (n: number) => n === 1 ? "👉 Encontré esto" : "Encontré estas opciones",
  SEARCH_BODY: "La primera es la más elegida 👇",
  SEARCH_BUTTON: "Ver opciones",
  RESERVE_BUTTON_TITLE: "Sí, lo reservo",
  PUSH_DECISION: "¿Lo querés? 👇",
  DOUBT_CHEAPER: "Entendido 👍 Buscando algo más económico...",
  DOUBT_BETTER: "Entendido 👍 Buscando algo mejor...",
  RESERVE_PUSH: "Te lo puedo reservar ahora 👇\n¿Querés?",
  CONFUSION: "¿Qué querés hacer? 👇",
  FOLLOWUP_DAY1: (product: string) =>
    `Hola 👋 ¿Seguís interesado en ${product}?\nLo puedo reservar ahora.`,
  FOLLOWUP_DAY3: (product: string) =>
    `Tenemos stock de ${product} 📦\n¿Lo reservamos?`,
  FOLLOWUP_DAY7: (product: string) =>
    `⏰ Últimas unidades de ${product}.\n¿Querés que te lo guarde?`,
  NO_FOLLOWUP_RESPONSE: "Cuando quieras, acá estoy 👋",
  BTN_RESERVE: "Sí, reservar",
  BTN_CHEAPER: "Algo más económico",
  BTN_BETTER: "Algo mejor",
  BTN_NO_THANKS: "No, gracias",
  BTN_MORE: "Ver más",
  BTN_SEARCH: "Buscar algo",
  BTN_TALK: "Hablar con alguien",
};
