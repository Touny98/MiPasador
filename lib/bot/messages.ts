export const MSG = {
  WELCOME: (name: string) =>
    `Hola! 👋 Soy el asistente de ${name}.\n\nPuedo ayudarte a:\n• Buscar productos\n• Hacer una reserva\n\nEscribí lo que buscás o escribí "menu" para ver las opciones.`,

  NO_RESULTS:
    'No encontré productos con esa búsqueda. 🤔\n\nProbá con otras palabras o escribí "menu".',

  NO_PRODUCT_FOR_RESERVE:
    'No encontré ese producto. 🤔\n\nEscribí el nombre de lo que querés reservar.',

  RESERVE_MISSING_PRODUCT:
    '¿Qué producto querés reservar? 🛍️\n\nEscribilo así: "reservar freidora"',

  RESERVE_CONFIRM: (name: string, code: string) =>
    `Reserva confirmada ✅\n\n📦 ${name}\n🔑 Código: ${code}\n\nEl negocio te va a contactar pronto para coordinar.`,

  RESERVE_ERROR:
    'Ups, algo salió mal. 😕\n\nIntentalo de nuevo o escribí "menu".',

  GENERIC_ERROR:
    'Ups, algo salió mal. 😕\n\nIntentalo de nuevo o escribí "menu".',

  NO_CONVERSATION:
    'No pudimos identificar tu conversación. Por favor, intentalo de nuevo.',

  MENU_HEADER: 'Menú de opciones',
  MENU_BODY: 'Tocá una opción para empezar 👇',
  MENU_BUTTON: 'Ver opciones',

  SEARCH_HEADER: (n: number) => `Encontré ${n} ${n === 1 ? 'opción' : 'opciones'}`,
  SEARCH_BODY: 'Estos son los productos disponibles 👇',
  SEARCH_BUTTON: 'Ver productos',

  RESERVE_BUTTON_TITLE: 'Reservar este',
};

export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 3) + '...' : str;
}

export function parseReserveButtonId(id: string): string | null {
  const match = id.match(/^reserve_(.+)$/);
  return match ? match[1] : null;
}

export function isGreeting(text: string): boolean {
  return /^(hola|buenas?|buenos\s+(dias|tardes|noches)|hi|hey|empezar|inicio)\b/i.test(text.trim());
}

export function isMenuRequest(text: string): boolean {
  return /^(menu|ayuda|help|opciones|que\s+pod[eé]s?\s+hacer)\b/i.test(text.trim());
}
