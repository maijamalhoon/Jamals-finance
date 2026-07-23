"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Save, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  FinanceFormField,
  FinanceModalBody,
  FinanceModalFooter,
  FinanceModalHeader,
  financeModalContentClass,
} from "@/components/ui/finance-modal";
import type { AppLanguage } from "@/lib/i18n/config";

type ResponseLength = "short" | "balanced" | "detailed";
type Tone = "simple" | "professional" | "friendly";
type RiskStyle = "conservative" | "balanced" | "growth";

type Preferences = {
  responseLength: ResponseLength;
  tone: Tone;
  riskStyle: RiskStyle;
  customInstructions: string;
};

const DEFAULT_PREFERENCES: Preferences = {
  responseLength: "short",
  tone: "simple",
  riskStyle: "balanced",
  customInstructions: "",
};

const COPY: Record<
  AppLanguage,
  {
    button: string;
    title: string;
    description: string;
    responseLength: string;
    tone: string;
    riskStyle: string;
    customInstructions: string;
    customHint: string;
    customPlaceholder: string;
    save: string;
    saving: string;
    saved: string;
    loadError: string;
    saveError: string;
    responseOptions: Record<ResponseLength, string>;
    toneOptions: Record<Tone, string>;
    riskOptions: Record<RiskStyle, string>;
  }
> = {
  en: {
    button: "AI settings",
    title: "AI settings",
    description:
      "Control answer length, tone, risk approach, and account-level instructions.",
    responseLength: "Answer length",
    tone: "Tone",
    riskStyle: "Risk approach",
    customInstructions: "Custom instructions",
    customHint: "Up to 2,000 characters. These never override verified figures or safety rules.",
    customPlaceholder:
      "Example: Keep answers practical and always highlight avoidable spending.",
    save: "Save AI Settings",
    saving: "Saving...",
    saved: "AI settings saved.",
    loadError: "AI settings could not be loaded. Defaults are shown.",
    saveError: "AI settings could not be saved. Please try again.",
    responseOptions: {
      short: "Short",
      balanced: "Balanced",
      detailed: "Detailed",
    },
    toneOptions: {
      simple: "Simple",
      professional: "Professional",
      friendly: "Friendly",
    },
    riskOptions: {
      conservative: "Conservative",
      balanced: "Balanced",
      growth: "Growth focused",
    },
  },
  ur: {
    button: "AI سیٹنگز",
    title: "AI سیٹنگز",
    description:
      "جواب کی لمبائی، انداز، رسک اپروچ اور اکاؤنٹ کی ہدایات کنٹرول کریں۔",
    responseLength: "جواب کی لمبائی",
    tone: "انداز",
    riskStyle: "رسک اپروچ",
    customInstructions: "اپنی ہدایات",
    customHint: "زیادہ سے زیادہ 2,000 حروف۔ یہ تصدیق شدہ اعداد یا حفاظتی اصول تبدیل نہیں کر سکتیں۔",
    customPlaceholder:
      "مثال: جواب عملی رکھیں اور غیر ضروری خرچ ہمیشہ نمایاں کریں۔",
    save: "AI سیٹنگز محفوظ کریں",
    saving: "محفوظ ہو رہا ہے...",
    saved: "AI سیٹنگز محفوظ ہوگئیں۔",
    loadError: "AI سیٹنگز لوڈ نہیں ہو سکیں۔ ڈیفالٹ دکھائے جا رہے ہیں۔",
    saveError: "AI سیٹنگز محفوظ نہیں ہو سکیں۔ دوبارہ کوشش کریں۔",
    responseOptions: {
      short: "مختصر",
      balanced: "متوازن",
      detailed: "تفصیلی",
    },
    toneOptions: {
      simple: "سادہ",
      professional: "پروفیشنل",
      friendly: "دوستانہ",
    },
    riskOptions: {
      conservative: "محتاط",
      balanced: "متوازن",
      growth: "ترقی پر مبنی",
    },
  },
  ar: {
    button: "إعدادات الذكاء",
    title: "إعدادات الذكاء",
    description: "تحكم في طول الإجابة والنبرة ومنهج المخاطر والتعليمات الخاصة بالحساب.",
    responseLength: "طول الإجابة",
    tone: "النبرة",
    riskStyle: "منهج المخاطر",
    customInstructions: "تعليمات مخصصة",
    customHint: "حتى 2,000 حرف. لا تتجاوز الأرقام الموثقة أو قواعد الأمان.",
    customPlaceholder: "مثال: اجعل الإجابات عملية وأبرز الإنفاق القابل للتجنب.",
    save: "حفظ إعدادات الذكاء",
    saving: "جارٍ الحفظ...",
    saved: "تم حفظ إعدادات الذكاء.",
    loadError: "تعذر تحميل الإعدادات. يتم عرض القيم الافتراضية.",
    saveError: "تعذر حفظ الإعدادات. حاول مرة أخرى.",
    responseOptions: {
      short: "قصيرة",
      balanced: "متوازنة",
      detailed: "مفصلة",
    },
    toneOptions: {
      simple: "بسيطة",
      professional: "مهنية",
      friendly: "ودودة",
    },
    riskOptions: {
      conservative: "محافظ",
      balanced: "متوازن",
      growth: "يركز على النمو",
    },
  },
  hi: {
    button: "AI सेटिंग्स",
    title: "AI सेटिंग्स",
    description: "उत्तर की लंबाई, लहजा, जोखिम दृष्टिकोण और खाते की निर्देशों को नियंत्रित करें।",
    responseLength: "उत्तर की लंबाई",
    tone: "लहजा",
    riskStyle: "जोखिम दृष्टिकोण",
    customInstructions: "कस्टम निर्देश",
    customHint: "अधिकतम 2,000 अक्षर। ये सत्यापित आंकड़ों या सुरक्षा नियमों को नहीं बदलते।",
    customPlaceholder: "उदाहरण: उत्तर व्यावहारिक रखें और टाले जा सकने वाले खर्च को दिखाएँ।",
    save: "AI सेटिंग्स सेव करें",
    saving: "सेव हो रहा है...",
    saved: "AI सेटिंग्स सेव हो गईं।",
    loadError: "AI सेटिंग्स लोड नहीं हो सकीं। डिफ़ॉल्ट दिखाए जा रहे हैं।",
    saveError: "AI सेटिंग्स सेव नहीं हो सकीं। फिर कोशिश करें।",
    responseOptions: {
      short: "संक्षिप्त",
      balanced: "संतुलित",
      detailed: "विस्तृत",
    },
    toneOptions: {
      simple: "सरल",
      professional: "पेशेवर",
      friendly: "मैत्रीपूर्ण",
    },
    riskOptions: {
      conservative: "सावधान",
      balanced: "संतुलित",
      growth: "वृद्धि केंद्रित",
    },
  },
  es: {
    button: "Ajustes de IA",
    title: "Ajustes de IA",
    description:
      "Controla la longitud, el tono, el enfoque de riesgo y las instrucciones de tu cuenta.",
    responseLength: "Longitud de respuesta",
    tone: "Tono",
    riskStyle: "Enfoque de riesgo",
    customInstructions: "Instrucciones personalizadas",
    customHint: "Hasta 2.000 caracteres. No sustituyen cifras verificadas ni reglas de seguridad.",
    customPlaceholder:
      "Ejemplo: Mantén las respuestas prácticas y destaca el gasto evitable.",
    save: "Guardar ajustes de IA",
    saving: "Guardando...",
    saved: "Ajustes de IA guardados.",
    loadError: "No se pudieron cargar los ajustes. Se muestran los valores predeterminados.",
    saveError: "No se pudieron guardar los ajustes. Inténtalo de nuevo.",
    responseOptions: {
      short: "Corta",
      balanced: "Equilibrada",
      detailed: "Detallada",
    },
    toneOptions: {
      simple: "Simple",
      professional: "Profesional",
      friendly: "Amable",
    },
    riskOptions: {
      conservative: "Conservador",
      balanced: "Equilibrado",
      growth: "Orientado al crecimiento",
    },
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isResponseLength(value: unknown): value is ResponseLength {
  return value === "short" || value === "balanced" || value === "detailed";
}

function isTone(value: unknown): value is Tone {
  return value === "simple" || value === "professional" || value === "friendly";
}

function isRiskStyle(value: unknown): value is RiskStyle {
  return value === "conservative" || value === "balanced" || value === "growth";
}

function parsePreferences(value: unknown): Preferences {
  if (!isRecord(value)) return DEFAULT_PREFERENCES;
  return {
    responseLength: isResponseLength(value.responseLength)
      ? value.responseLength
      : DEFAULT_PREFERENCES.responseLength,
    tone: isTone(value.tone) ? value.tone : DEFAULT_PREFERENCES.tone,
    riskStyle: isRiskStyle(value.riskStyle)
      ? value.riskStyle
      : DEFAULT_PREFERENCES.riskStyle,
    customInstructions:
      typeof value.customInstructions === "string"
        ? value.customInstructions.slice(0, 2000)
        : "",
  };
}

export default function AISettingsPanel() {
  const { language } = useLanguage();
  const copy = COPY[language];
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);

  async function openSettings() {
    setOpen(true);
    if (loaded || loading) return;
    setLoading(true);

    try {
      const response = await fetch("/api/ai-insights/preferences", {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok || !isRecord(payload)) throw new Error("load_failed");
      setPreferences(parsePreferences(payload.preferences));
      setLoaded(true);
    } catch {
      toast.error(copy.loadError);
      setPreferences(DEFAULT_PREFERENCES);
    } finally {
      setLoading(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);

    try {
      const response = await fetch("/api/ai-insights/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });
      if (!response.ok) throw new Error("save_failed");
      setLoaded(true);
      setOpen(false);
      toast.success(copy.saved);
    } catch {
      toast.error(copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openSettings}
        className="finance-focus inline-flex min-h-10 items-center gap-2 rounded-full bg-surface-secondary px-4 text-xs font-semibold text-text-primary transition-colors hover:bg-hover"
      >
        <Settings2 size={15} aria-hidden="true" />
        {copy.button}
      </button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!saving) setOpen(nextOpen);
        }}
      >
        <DialogContent className={financeModalContentClass}>
          <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
            <FinanceModalHeader
              title={copy.title}
              description={copy.description}
              icon={Settings2}
              tone="info"
            />
            <FinanceModalBody>
              {loading ? (
                <div className="grid min-h-52 place-items-center text-text-secondary">
                  <Loader2 size={22} className="animate-spin" aria-hidden="true" />
                </div>
              ) : (
                <div className="space-y-5">
                  <FinanceFormField
                    label={copy.responseLength}
                    htmlFor="ai-response-length"
                  >
                    <select
                      id="ai-response-length"
                      value={preferences.responseLength}
                      onChange={(event) =>
                        setPreferences((current) => ({
                          ...current,
                          responseLength: event.target.value as ResponseLength,
                        }))
                      }
                      className="field-input"
                    >
                      {(Object.keys(copy.responseOptions) as ResponseLength[]).map(
                        (value) => (
                          <option key={value} value={value}>
                            {copy.responseOptions[value]}
                          </option>
                        ),
                      )}
                    </select>
                  </FinanceFormField>

                  <FinanceFormField label={copy.tone} htmlFor="ai-tone">
                    <select
                      id="ai-tone"
                      value={preferences.tone}
                      onChange={(event) =>
                        setPreferences((current) => ({
                          ...current,
                          tone: event.target.value as Tone,
                        }))
                      }
                      className="field-input"
                    >
                      {(Object.keys(copy.toneOptions) as Tone[]).map((value) => (
                        <option key={value} value={value}>
                          {copy.toneOptions[value]}
                        </option>
                      ))}
                    </select>
                  </FinanceFormField>

                  <FinanceFormField
                    label={copy.riskStyle}
                    htmlFor="ai-risk-style"
                  >
                    <select
                      id="ai-risk-style"
                      value={preferences.riskStyle}
                      onChange={(event) =>
                        setPreferences((current) => ({
                          ...current,
                          riskStyle: event.target.value as RiskStyle,
                        }))
                      }
                      className="field-input"
                    >
                      {(Object.keys(copy.riskOptions) as RiskStyle[]).map((value) => (
                        <option key={value} value={value}>
                          {copy.riskOptions[value]}
                        </option>
                      ))}
                    </select>
                  </FinanceFormField>

                  <FinanceFormField
                    label={copy.customInstructions}
                    htmlFor="ai-custom-instructions"
                    hint={copy.customHint}
                  >
                    <textarea
                      id="ai-custom-instructions"
                      value={preferences.customInstructions}
                      onChange={(event) =>
                        setPreferences((current) => ({
                          ...current,
                          customInstructions: event.target.value.slice(0, 2000),
                        }))
                      }
                      maxLength={2000}
                      rows={6}
                      placeholder={copy.customPlaceholder}
                      className="field-input min-h-32 resize-y py-3"
                    />
                  </FinanceFormField>
                </div>
              )}
            </FinanceModalBody>
            <FinanceModalFooter>
              <Button
                type="submit"
                size="lg"
                disabled={saving || loading}
                className="min-h-[var(--oneui-control-height-lg)] w-full"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Save size={16} aria-hidden="true" />
                )}
                {saving ? copy.saving : copy.save}
              </Button>
            </FinanceModalFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
