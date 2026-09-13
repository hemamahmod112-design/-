export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  // بريد صاحب المشروع. أول مستخدم يتسجل بيترقى admin تلقائياً بغض النظر عن
  // القيمة دي؛ الغرض من OWNER_EMAIL إنك تقدر ترقّي حساب معين لاحقاً حتى لو
  // مسجل بعد مستخدمين تانيين.
  ownerEmail: process.env.OWNER_EMAIL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
