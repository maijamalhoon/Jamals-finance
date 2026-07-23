const PHRASE_REPLACEMENTS: readonly [RegExp, string][] = [
  // Roman Urdu / Urdu mixed wording.
  [/\bkitna\s+(?:paisa\s+)?(?:kharch|kharach|spend)(?:\s+hua|\s+hoa|\s+kiya)?\b/giu, "how much did i spend"],
  [/\b(?:kharch|kharach|expense|expenses)\b/giu, "spending"],
  [/\b(?:kamaya|kamai|kamayi|earning|earnings|income)\b/giu, "income"],
  [/\b(?:aaj|aj)\b/giu, "today"],
  [/\b(?:kal|guzishta\s+din|pichlay\s+din)\b/giu, "yesterday"],
  [/\b(?:is|iss)\s+mahine\b/giu, "this month"],
  [/\b(?:pichlay|pichle|last)\s+mahine\b/giu, "last month"],
  [/\b(?:is|iss)\s+haftay\b/giu, "this week"],
  [/\b(?:pichlay|pichle)\s+haftay\b/giu, "last week"],
  [/\b(?:is|iss)\s+saal\b/giu, "this year"],
  [/\b(?:pichlay|pichle)\s+saal\b/giu, "last year"],
  [/\b(?:abhi|filhal)\s+(?:kitna\s+)?(?:dena|payable)\b/giu, "currently payable"],
  [/\b(?:qarz|udhar|payable|payables|liabilit(?:y|ies))\b/giu, "payables"],
  [/\b(?:munafa|faida|profit)\b/giu, "profit"],
  [/\b(?:nuqsan|nuksan|loss)\b/giu, "loss"],
  [/\b(?:khata|khate|account|accounts)\b/giu, "accounts"],
  [/\b(?:sarmaya|investment|investments|asset|assets)\b/giu, "assets"],
  [/\b(?:tamam|saray|saare|overall)\b/giu, "all time"],
  [/\b(?:kitne|kitni|kitna)\b/giu, "how many"],

  // Urdu script.
  [/آج/gu, " today "],
  [/کل/gu, " yesterday "],
  [/اس\s+مہینے/gu, " this month "],
  [/پچھلے\s+مہینے/gu, " last month "],
  [/اس\s+ہفتے/gu, " this week "],
  [/پچھلے\s+ہفتے/gu, " last week "],
  [/اس\s+سال/gu, " this year "],
  [/پچھلے\s+سال/gu, " last year "],
  [/(?:خرچ|اخراجات)/gu, " spending "],
  [/(?:آمدن|کمائی)/gu, " income "],
  [/(?:اکاؤنٹ|کھاتے)/gu, " accounts "],
  [/(?:سرمایہ|اثاثے|سرمایہ کاری)/gu, " assets "],
  [/(?:واجب الادا|قرض|ادائیگی)/gu, " payables "],
  [/منافع/gu, " profit "],
  [/نقصان/gu, " loss "],
  [/(?:کتنا|کتنی|کتنے)/gu, " how much "],

  // Hindi.
  [/आज/gu, " today "],
  [/कल/gu, " yesterday "],
  [/इस\s+महीने/gu, " this month "],
  [/पिछले\s+महीने/gu, " last month "],
  [/इस\s+हफ्ते/gu, " this week "],
  [/पिछले\s+हफ्ते/gu, " last week "],
  [/इस\s+साल/gu, " this year "],
  [/पिछले\s+साल/gu, " last year "],
  [/(?:खर्च|व्यय)/gu, " spending "],
  [/(?:आय|कमाई)/gu, " income "],
  [/(?:खाता|खाते|अकाउंट)/gu, " accounts "],
  [/(?:निवेश|संपत्ति|एसेट)/gu, " assets "],
  [/(?:देय|कर्ज|उधार)/gu, " payables "],
  [/लाभ/gu, " profit "],
  [/नुकसान/gu, " loss "],
  [/(?:कितना|कितनी|कितने)/gu, " how much "],

  // Arabic.
  [/اليوم/gu, " today "],
  [/أمس/gu, " yesterday "],
  [/هذا\s+الشهر/gu, " this month "],
  [/الشهر\s+الماضي/gu, " last month "],
  [/هذا\s+الأسبوع/gu, " this week "],
  [/الأسبوع\s+الماضي/gu, " last week "],
  [/هذه\s+السنة/gu, " this year "],
  [/السنة\s+الماضية/gu, " last year "],
  [/(?:مصروفات|إنفاق|أنفقت)/gu, " spending "],
  [/(?:دخل|إيراد|أرباحي)/gu, " income "],
  [/(?:حساب|حسابات)/gu, " accounts "],
  [/(?:استثمار|استثمارات|أصول)/gu, " assets "],
  [/(?:مستحقات|ديون|قرض)/gu, " payables "],
  [/ربح/gu, " profit "],
  [/خسارة/gu, " loss "],
  [/(?:كم|ما\s+مقدار)/gu, " how much "],

  // Spanish.
  [/\bhoy\b/giu, "today"],
  [/\bayer\b/giu, "yesterday"],
  [/\beste\s+mes\b/giu, "this month"],
  [/\bmes\s+pasado\b/giu, "last month"],
  [/\besta\s+semana\b/giu, "this week"],
  [/\bsemana\s+pasada\b/giu, "last week"],
  [/\beste\s+año\b/giu, "this year"],
  [/\baño\s+pasado\b/giu, "last year"],
  [/\b(?:gasto|gastos|gasté|gaste|gastado)\b/giu, "spending"],
  [/\b(?:ingreso|ingresos|gané|gane|ganado)\b/giu, "income"],
  [/\b(?:cuenta|cuentas)\b/giu, "accounts"],
  [/\b(?:activo|activos|inversión|inversiones)\b/giu, "assets"],
  [/\b(?:deuda|deudas|pagadero|pendiente)\b/giu, "payables"],
  [/\b(?:beneficio|ganancia)\b/giu, "profit"],
  [/\bpérdida\b/giu, "loss"],
  [/\bcuánto(?:s|as)?\b/giu, "how much"],
];

const TYPO_REPLACEMENTS: readonly [RegExp, string][] = [
  [/\bspnd\b/giu, "spend"],
  [/\bexpence(?:s)?\b/giu, "expenses"],
  [/\bincom\b/giu, "income"],
  [/\bprofitt?\b/giu, "profit"],
  [/\bpayble\b/giu, "payable"],
  [/\binvestmnt(?:s)?\b/giu, "investments"],
  [/\bacount(?:s)?\b/giu, "accounts"],
  [/\byestarday\b/giu, "yesterday"],
  [/\bmont?h\b/giu, "month"],
];

export function normalizeMultilingualFinanceQuestion(question: string) {
  let normalized = question.normalize("NFKC");

  for (const [pattern, replacement] of TYPO_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }

  for (const [pattern, replacement] of PHRASE_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized.replace(/\s+/g, " ").trim().slice(0, 500);
}
