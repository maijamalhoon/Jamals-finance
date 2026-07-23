"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, Calculator, ChartNoAxesCombined, ShieldCheck, X } from "lucide-react";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { AppLanguage } from "@/lib/i18n/config";

const ONBOARDING_KEY = "jamals-finance-ai-onboarding-v1";

const COPY: Record<
  AppLanguage,
  {
    eyebrow: string;
    title: string;
    description: string;
    features: [string, string, string];
    planTitle: string;
    plan: [string, string, string];
    dismiss: string;
    close: string;
  }
> = {
  en: {
    eyebrow: "Your finance intelligence",
    title: "Meet Jamals Finance AI",
    description:
      "Ask naturally—even with mixed wording or spelling mistakes. Answers use your own verified finance records and selected website language.",
    features: [
      "Exact income, spending, savings, debt, and investment calculations",
      "Monthly averages, peak spending, inflation, and long-term projections",
      "Local calculations stay available even when external AI is unavailable",
    ],
    planTitle: "Best first setup",
    plan: [
      "Add at least one account and its current balance",
      "Record income and expenses with clear sources and categories",
      "Ask: “What should I improve first?”",
    ],
    dismiss: "Start exploring",
    close: "Close AI onboarding",
  },
  ur: {
    eyebrow: "آپ کی مالی ذہانت",
    title: "Jamals Finance AI سے ملیں",
    description:
      "قدرتی انداز میں پوچھیں، چاہے زبان ملی جلی ہو یا اسپیلنگ غلط ہو۔ جواب آپ کے تصدیق شدہ مالی ریکارڈ اور منتخب ویب سائٹ زبان کے مطابق ہوگا۔",
    features: [
      "آمدنی، خرچ، بچت، قرض اور سرمایہ کاری کے درست حساب",
      "ماہانہ اوسط، سب سے زیادہ خرچ، مہنگائی اور طویل مدتی پیش گوئیاں",
      "بیرونی AI دستیاب نہ ہو تب بھی مقامی حساب جاری رہتے ہیں",
    ],
    planTitle: "بہترین ابتدائی سیٹ اپ",
    plan: [
      "کم از کم ایک اکاؤنٹ اور موجودہ بیلنس شامل کریں",
      "آمدنی اور خرچ واضح ذرائع اور کیٹیگریز کے ساتھ ریکارڈ کریں",
      "پوچھیں: “مجھے سب سے پہلے کیا بہتر کرنا چاہیے؟”",
    ],
    dismiss: "شروع کریں",
    close: "AI تعارف بند کریں",
  },
  ar: {
    eyebrow: "ذكاؤك المالي",
    title: "تعرّف على Jamals Finance AI",
    description:
      "اسأل بطريقتك الطبيعية حتى مع خلط اللغات أو أخطاء الكتابة. تعتمد الإجابات على سجلاتك المالية الموثقة ولغة الموقع المختارة.",
    features: [
      "حسابات دقيقة للدخل والإنفاق والادخار والديون والاستثمارات",
      "متوسطات شهرية وأعلى إنفاق وتضخم وتوقعات طويلة الأجل",
      "تبقى الحسابات المحلية متاحة عند تعطل مزود الذكاء الخارجي",
    ],
    planTitle: "أفضل إعداد أولي",
    plan: [
      "أضف حسابًا واحدًا على الأقل ورصيده الحالي",
      "سجّل الدخل والمصروفات بمصادر وفئات واضحة",
      "اسأل: «ما أول شيء يجب أن أحسّنه؟»",
    ],
    dismiss: "ابدأ الاستكشاف",
    close: "إغلاق مقدمة الذكاء",
  },
  hi: {
    eyebrow: "आपकी वित्तीय बुद्धिमत्ता",
    title: "Jamals Finance AI से मिलें",
    description:
      "स्वाभाविक रूप से पूछें, चाहे भाषा मिली-जुली हो या वर्तनी गलत हो। उत्तर आपके सत्यापित वित्त रिकॉर्ड और चुनी हुई वेबसाइट भाषा का उपयोग करते हैं।",
    features: [
      "आय, खर्च, बचत, कर्ज और निवेश की सटीक गणना",
      "मासिक औसत, सबसे अधिक खर्च, महंगाई और दीर्घकालिक अनुमान",
      "बाहरी AI उपलब्ध न होने पर भी स्थानीय गणना जारी रहती है",
    ],
    planTitle: "सबसे अच्छा पहला सेटअप",
    plan: [
      "कम से कम एक खाता और उसका मौजूदा बैलेंस जोड़ें",
      "आय और खर्च साफ स्रोतों और श्रेणियों के साथ दर्ज करें",
      "पूछें: “मुझे सबसे पहले क्या सुधारना चाहिए?”",
    ],
    dismiss: "शुरू करें",
    close: "AI परिचय बंद करें",
  },
  es: {
    eyebrow: "Tu inteligencia financiera",
    title: "Conoce Jamals Finance AI",
    description:
      "Pregunta con naturalidad, incluso mezclando idiomas o con errores. Las respuestas usan tus registros verificados y el idioma seleccionado del sitio.",
    features: [
      "Cálculos exactos de ingresos, gastos, ahorro, deuda e inversiones",
      "Promedios mensuales, gasto máximo, inflación y proyecciones a largo plazo",
      "Los cálculos locales siguen disponibles si falla la IA externa",
    ],
    planTitle: "Mejor configuración inicial",
    plan: [
      "Añade al menos una cuenta y su saldo actual",
      "Registra ingresos y gastos con fuentes y categorías claras",
      "Pregunta: “¿Qué debería mejorar primero?”",
    ],
    dismiss: "Empezar",
    close: "Cerrar introducción de IA",
  },
};

const FEATURE_ICONS = [Calculator, ChartNoAxesCombined, ShieldCheck] as const;

export default function AIInsightsOnboarding() {
  const { language } = useLanguage();
  const copy = COPY[language];
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(window.localStorage.getItem(ONBOARDING_KEY) !== "dismissed");
  }, []);

  function dismiss() {
    window.localStorage.setItem(ONBOARDING_KEY, "dismissed");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <section className="mb-7 overflow-hidden rounded-[26px] bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6 lg:p-7">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-flex size-11 items-center justify-center rounded-[16px] bg-active/10 text-active">
            <BrainCircuit size={22} aria-hidden="true" />
          </span>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-active">
            {copy.eyebrow}
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
            {copy.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
            {copy.description}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={copy.close}
          className="finance-focus inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-text-secondary hover:bg-hover hover:text-text-primary"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {copy.features.map((feature, index) => {
          const Icon = FEATURE_ICONS[index];
          return (
            <div
              key={feature}
              className="flex min-w-0 items-start gap-3 rounded-[18px] bg-surface-secondary px-4 py-3.5"
            >
              <Icon size={17} className="mt-0.5 shrink-0 text-active" aria-hidden="true" />
              <p className="text-xs leading-5 text-text-secondary">{feature}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-col gap-4 rounded-[20px] bg-active/5 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-text-primary">{copy.planTitle}</p>
          <ol className="mt-2 space-y-1.5 text-xs leading-5 text-text-secondary">
            {copy.plan.map((step, index) => (
              <li key={step}>
                <span className="font-semibold text-active">{index + 1}.</span>{" "}
                {step}
              </li>
            ))}
          </ol>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="finance-focus inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-active px-4 text-xs font-semibold text-text-inverse hover:opacity-90"
        >
          {copy.dismiss}
        </button>
      </div>
    </section>
  );
}
