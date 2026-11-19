import { cookies, headers } from "next/headers";

import { isLocale, LOCALE_COOKIE, pickLocale, translator } from "@/lib/i18n";

export async function serverTranslator() {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  const header = (await headers()).get("accept-language");
  const locale = isLocale(saved) ? saved : pickLocale(header);

  return translator(locale);
}
