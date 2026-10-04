import type { Locale } from "./locales";
import { formatNumber } from "./numbers";

/**
 * Interface copy per language (Phase 7). Interface text only: no vehicle facts live here —
 * vehicle values come from the public model (categorical values via ./vehicle-values.ts).
 *
 * English strings are the confirmed Phase 4/5 wording. Arabic and Russian are translations of
 * that wording and follow the same rules: "Request a viewing / test drive" (no appointment-confirming verbs), no
 * sourcing, availability or appointment promises.
 */
export interface Messages {
  readonly skipToContent: string;
  readonly mainNavLabel: string;
  readonly languageNavLabel: string;
  readonly navCars: string;

  readonly homeTitle: string;
  readonly carsTitle: string;
  /** `<title>` of `/cars`. */
  readonly carsMetaTitle: string;
  readonly availableCount: (count: number) => string;
  readonly availableCarsLabel: string;

  readonly emptyTitle: string;
  readonly emptyText: string;
  readonly unavailableTitle: string;
  readonly unavailableText: string;
  readonly unavailableMetaTitle: string;

  readonly vehicleDetailsTitle: string;
  readonly carNotFoundTitle: string;
  readonly carNotFoundText: string;
  readonly pageNotFoundTitle: string;
  readonly pageNotFoundText: string;
  readonly seeCarsInStock: string;
  readonly allCars: string;

  readonly errorTitle: string;
  readonly errorText: string;
  readonly tryAgain: string;

  readonly sold: string;
  readonly soldNotice: string;

  readonly specHeading: string;
  readonly spec: {
    readonly mileage: string;
    readonly regionalSpec: string;
    readonly transmission: string;
    readonly fuel: string;
    readonly engine: string;
    readonly drivetrain: string;
    readonly year: string;
    readonly colour: string;
    readonly reference: string;
  };
  /** Unit written after the mileage figure. */
  readonly kmUnit: string;

  readonly photosHeading: string;
  readonly photosUnavailable: string;
  readonly photoAlt: (title: string, position: number, count: number) => string;
  /** Gallery controls (accessible names). */
  readonly previousPhoto: string;
  readonly nextPhoto: string;
  readonly openPhotosFullscreen: string;
  readonly closePhotos: string;
  readonly photoThumbnails: string;
  /** Spoken counter and thumbnail name; the visible counter is the figures "1 / N". */
  readonly photoPosition: (position: number, count: number) => string;

  readonly actionsHeading: string;
  readonly chatOnWhatsApp: string;
  readonly requestViewing: string;
  readonly requestTestDrive: string;
  readonly actionsHint: string;

  readonly generalRequestTitle: string;
  readonly generalRequestText: string;
}

/** Picks the plural form for `count` and writes the grouped figure in place of `{n}`. */
function plural(locale: Locale, forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }) {
  const rules = new Intl.PluralRules(locale);
  return (count: number) => (forms[rules.select(count)] ?? forms.other).replace("{n}", formatNumber(count, locale));
}

const en: Messages = {
  skipToContent: "Skip to content",
  mainNavLabel: "Main",
  languageNavLabel: "Language",
  navCars: "Cars",

  homeTitle: "Cars in stock",
  carsTitle: "All cars",
  carsMetaTitle: "Cars",
  availableCount: plural("en", { one: "{n} car available", other: "{n} cars available" }),
  availableCarsLabel: "Available cars",

  emptyTitle: "No cars are listed right now",
  emptyText: "Please check back later.",
  unavailableTitle: "Inventory is temporarily unavailable",
  unavailableText: "We can't show our cars right now. Please try again later.",
  unavailableMetaTitle: "Inventory unavailable",

  vehicleDetailsTitle: "Car details",
  carNotFoundTitle: "Car not found",
  carNotFoundText: "This car is not listed.",
  pageNotFoundTitle: "Page not found",
  pageNotFoundText: "This page does not exist.",
  seeCarsInStock: "See cars in stock",
  allCars: "All cars",

  errorTitle: "Something went wrong",
  errorText: "Please try again.",
  tryAgain: "Try again",

  sold: "Sold",
  soldNotice: "This car has been sold.",

  specHeading: "Specification",
  spec: {
    mileage: "Mileage",
    regionalSpec: "Regional spec",
    transmission: "Transmission",
    fuel: "Fuel",
    engine: "Engine",
    drivetrain: "Drivetrain",
    year: "Year",
    colour: "Colour",
    reference: "Reference",
  },
  kmUnit: "km",

  photosHeading: "Photos",
  photosUnavailable: "Photos unavailable",
  photoAlt: (title, position, count) => `${title}, photo ${position} of ${count}`,
  previousPhoto: "Previous photo",
  nextPhoto: "Next photo",
  openPhotosFullscreen: "Open photos full screen",
  closePhotos: "Close photos",
  photoThumbnails: "Choose a photo",
  photoPosition: (position, count) => `Photo ${position} of ${count}`,

  actionsHeading: "Ask about this car",
  chatOnWhatsApp: "Chat on WhatsApp",
  requestViewing: "Request a viewing",
  requestTestDrive: "Request a test drive",
  actionsHint: "Opens WhatsApp with a message about this car.",

  generalRequestTitle: "Didn't find what you need?",
  generalRequestText: "Ask us about current availability on WhatsApp.",
};

const ar: Messages = {
  skipToContent: "انتقل إلى المحتوى",
  mainNavLabel: "القائمة الرئيسية",
  languageNavLabel: "اللغة",
  navCars: "السيارات",

  homeTitle: "السيارات المتوفرة",
  carsTitle: "جميع السيارات",
  carsMetaTitle: "السيارات",
  // Arabic plural categories: 1, 2, 3–10, 11–99, 100+ (Intl.PluralRules "ar").
  availableCount: plural("ar", {
    zero: "لا توجد سيارات متوفرة",
    one: "سيارة واحدة متوفرة",
    two: "سيارتان متوفرتان",
    few: "{n} سيارات متوفرة",
    many: "{n} سيارة متوفرة",
    other: "{n} سيارة متوفرة",
  }),
  availableCarsLabel: "السيارات المتوفرة",

  emptyTitle: "لا توجد سيارات معروضة حالياً",
  emptyText: "يرجى المراجعة لاحقاً.",
  unavailableTitle: "قائمة السيارات غير متاحة مؤقتاً",
  unavailableText: "لا يمكننا عرض سياراتنا الآن. يرجى المحاولة لاحقاً.",
  unavailableMetaTitle: "قائمة السيارات غير متاحة",

  vehicleDetailsTitle: "تفاصيل السيارة",
  carNotFoundTitle: "السيارة غير موجودة",
  carNotFoundText: "هذه السيارة غير معروضة.",
  pageNotFoundTitle: "الصفحة غير موجودة",
  pageNotFoundText: "هذه الصفحة غير موجودة.",
  seeCarsInStock: "عرض السيارات المتوفرة",
  allCars: "جميع السيارات",

  errorTitle: "حدث خطأ ما",
  errorText: "يرجى المحاولة مرة أخرى.",
  tryAgain: "إعادة المحاولة",

  sold: "مباعة",
  soldNotice: "تم بيع هذه السيارة.",

  specHeading: "المواصفات",
  spec: {
    mileage: "المسافة المقطوعة",
    regionalSpec: "المواصفات الإقليمية",
    transmission: "ناقل الحركة",
    fuel: "الوقود",
    engine: "المحرك",
    drivetrain: "نظام الدفع",
    year: "سنة الصنع",
    colour: "اللون",
    reference: "الرقم المرجعي",
  },
  kmUnit: "كم",

  photosHeading: "الصور",
  photosUnavailable: "الصور غير متوفرة",
  photoAlt: (title, position, count) => `${title}، الصورة ${position} من ${count}`,
  previousPhoto: "الصورة السابقة",
  nextPhoto: "الصورة التالية",
  openPhotosFullscreen: "عرض الصور بملء الشاشة",
  closePhotos: "إغلاق الصور",
  photoThumbnails: "اختر صورة",
  photoPosition: (position, count) => `الصورة ${position} من ${count}`,

  actionsHeading: "استفسر عن هذه السيارة",
  chatOnWhatsApp: "تواصل عبر واتساب",
  requestViewing: "طلب معاينة",
  requestTestDrive: "طلب تجربة قيادة",
  actionsHint: "يفتح واتساب برسالة عن هذه السيارة.",

  generalRequestTitle: "لم تجد ما تبحث عنه؟",
  generalRequestText: "اسألنا عبر واتساب عن السيارات المتوفرة حالياً.",
};

const ru: Messages = {
  skipToContent: "Перейти к содержанию",
  mainNavLabel: "Основное меню",
  languageNavLabel: "Язык",
  navCars: "Автомобили",

  homeTitle: "Автомобили в наличии",
  carsTitle: "Все автомобили",
  carsMetaTitle: "Автомобили",
  availableCount: plural("ru", {
    one: "{n} автомобиль в наличии",
    few: "{n} автомобиля в наличии",
    many: "{n} автомобилей в наличии",
    other: "{n} автомобиля в наличии",
  }),
  availableCarsLabel: "Автомобили в наличии",

  emptyTitle: "Сейчас нет автомобилей в каталоге",
  emptyText: "Загляните позже.",
  unavailableTitle: "Каталог временно недоступен",
  unavailableText: "Сейчас мы не можем показать автомобили. Попробуйте позже.",
  unavailableMetaTitle: "Каталог недоступен",

  vehicleDetailsTitle: "Об автомобиле",
  carNotFoundTitle: "Автомобиль не найден",
  carNotFoundText: "Этого автомобиля нет в каталоге.",
  pageNotFoundTitle: "Страница не найдена",
  pageNotFoundText: "Такой страницы нет.",
  seeCarsInStock: "Автомобили в наличии",
  allCars: "Все автомобили",

  errorTitle: "Что-то пошло не так",
  errorText: "Попробуйте ещё раз.",
  tryAgain: "Повторить",

  sold: "Продан",
  soldNotice: "Этот автомобиль продан.",

  specHeading: "Характеристики",
  spec: {
    mileage: "Пробег",
    regionalSpec: "Региональная спецификация",
    transmission: "Коробка передач",
    fuel: "Топливо",
    engine: "Двигатель",
    drivetrain: "Привод",
    year: "Год",
    colour: "Цвет",
    reference: "Номер",
  },
  kmUnit: "км",

  photosHeading: "Фото",
  photosUnavailable: "Фото недоступны",
  photoAlt: (title, position, count) => `${title}, фото ${position} из ${count}`,
  previousPhoto: "Предыдущее фото",
  nextPhoto: "Следующее фото",
  openPhotosFullscreen: "Открыть фото на весь экран",
  closePhotos: "Закрыть фото",
  photoThumbnails: "Выберите фото",
  photoPosition: (position, count) => `Фото ${position} из ${count}`,

  actionsHeading: "Спросить об этом автомобиле",
  chatOnWhatsApp: "Написать в WhatsApp",
  requestViewing: "Запросить осмотр",
  requestTestDrive: "Запросить тест-драйв",
  actionsHint: "Откроется WhatsApp с сообщением об этом автомобиле.",

  generalRequestTitle: "Не нашли то, что искали?",
  generalRequestText: "Спросите нас в WhatsApp о текущем наличии.",
};

export const MESSAGES: Readonly<Record<Locale, Messages>> = { en, ar, ru };

export function messages(locale: Locale): Messages {
  return MESSAGES[locale];
}
