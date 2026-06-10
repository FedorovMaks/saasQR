/**
 * Единый источник юридических/контактных данных сервиса.
 * Используется на публичных страницах: /pricing, /offer, /privacy, /contacts
 * и в футере лендинга.
 */
export const COMPANY = {
  brand: "TapMenu",
  domain: "tap-menu.ru",
  url: "https://tap-menu.ru",
  legalName: "Федоров Максим Дмитриевич",
  status: "Плательщик налога на профессиональный доход (самозанятый)",
  inn: "590423271267",
  email: "fedorovmaksim3228@icloud.com",
  phone: "+7 992 215-88-31",
  phoneHref: "+79922158831",
} as const;

/** Дата последней редакции документов (оферта / политика). */
export const LEGAL_UPDATED = "3 июня 2026 г.";
