import { NextRequest, NextResponse } from "next/server";

import {
  detectAccountBrand,
  shouldAttemptAccountLogo,
} from "@/lib/account-identity";

const USER_AGENT =
  "JamalsFinance/1.0 (account logo resolver; https://jamals-finance-sable.vercel.app)";
const CACHE_CONTROL =
  "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000";
const MISS_CACHE_CONTROL =
  "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
const FINANCIAL_ENTITY_PATTERN =
  /\b(bank|banking|financial|finance|fintech|payments?|wallet|credit union|building society|money transfer|e-?money)\b/i;

type WikidataSearchResult = {
  id?: string;
  label?: string;
  description?: string;
  aliases?: string[];
};

type WikidataSearchResponse = {
  search?: WikidataSearchResult[];
};

type WikidataClaim = {
  rank?: string;
  mainsnak?: {
    datavalue?: {
      value?: unknown;
    };
  };
};

type WikidataEntity = {
  claims?: Record<string, WikidataClaim[]>;
};

type WikidataEntityResponse = {
  entities?: Record<string, WikidataEntity>;
};

type ClearbitCompany = {
  name?: string;
  domain?: string;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cleanSearchName(value: string) {
  const cleaned = value
    .replace(
      /\b(savings?|current|salary|personal|business|corporate|account|wallet)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length >= 2 ? cleaned : value.trim();
}

function getTokens(value: string) {
  const ignored = new Set([
    "the",
    "of",
    "and",
    "bank",
    "limited",
    "ltd",
    "plc",
    "inc",
    "company",
    "financial",
    "finance",
    "services",
    "group",
  ]);

  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 1 && !ignored.has(token));
}

function isLikelyFinancialEntity(name: string, description = "") {
  return FINANCIAL_ENTITY_PATTERN.test(`${name} ${description}`);
}

function scoreMatch(query: string, candidate: string, description = "") {
  const normalizedQuery = normalize(query);
  const normalizedCandidate = normalize(candidate);

  if (!normalizedCandidate) return 0;
  if (normalizedCandidate === normalizedQuery) return 120;

  let score = 0;
  if (
    normalizedCandidate.includes(normalizedQuery) ||
    normalizedQuery.includes(normalizedCandidate)
  ) {
    score += 45;
  }

  const queryTokens = getTokens(query);
  const candidateTokens = new Set(getTokens(candidate));
  const overlap = queryTokens.filter((token) => candidateTokens.has(token)).length;
  score += overlap * 18;

  if (isLikelyFinancialEntity(candidate, description)) {
    score += 15;
  }

  return score;
}

function readCommonsFilename(entity: WikidataEntity) {
  for (const property of ["P154", "P2910"]) {
    const claims = entity.claims?.[property] ?? [];
    const sorted = [...claims].sort((left, right) => {
      if (left.rank === right.rank) return 0;
      if (left.rank === "preferred") return -1;
      if (right.rank === "preferred") return 1;
      return 0;
    });
    for (const claim of sorted) {
      const value = claim.mainsnak?.datavalue?.value;
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }

  return null;
}

async function resolveWikidataLogo(searchName: string) {
  try {
    const searchUrl = new URL("https://www.wikidata.org/w/api.php");
    searchUrl.searchParams.set("action", "wbsearchentities");
    searchUrl.searchParams.set("search", searchName);
    searchUrl.searchParams.set("language", "en");
    searchUrl.searchParams.set("uselang", "en");
    searchUrl.searchParams.set("type", "item");
    searchUrl.searchParams.set("limit", "6");
    searchUrl.searchParams.set("format", "json");
    searchUrl.searchParams.set("origin", "*");

    const searchResponse = await fetch(searchUrl, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 2_592_000 },
    });
    if (!searchResponse.ok) return null;

    const searchData = (await searchResponse.json()) as WikidataSearchResponse;
    const ranked = (searchData.search ?? [])
      .map((item) => ({
        item,
        score: scoreMatch(
          searchName,
          item.label ?? item.aliases?.[0] ?? "",
          item.description,
        ),
      }))
      .filter(({ item, score }) => {
        const identityText = `${item.label ?? ""} ${(item.aliases ?? []).join(" ")}`;
        return (
          Boolean(item.id) &&
          score >= 18 &&
          isLikelyFinancialEntity(identityText, item.description)
        );
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, 4);

    for (const { item } of ranked) {
      const entityResponse = await fetch(
        `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(
          item.id!,
        )}.json`,
        {
          headers: { "User-Agent": USER_AGENT },
          next: { revalidate: 2_592_000 },
        },
      );
      if (!entityResponse.ok) continue;

      const entityData = (await entityResponse.json()) as WikidataEntityResponse;
      const entity = entityData.entities?.[item.id!];
      if (!entity) continue;

      const filename = readCommonsFilename(entity);
      if (!filename) continue;

      return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(
        filename,
      )}?width=192`;
    }
  } catch {
    return null;
  }

  return null;
}

async function resolveCompanyDomain(searchName: string) {
  try {
    const response = await fetch(
      `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(
        searchName,
      )}`,
      {
        headers: { "User-Agent": USER_AGENT },
        next: { revalidate: 2_592_000 },
      },
    );
    if (!response.ok) return null;

    const companies = (await response.json()) as ClearbitCompany[];
    const best = companies
      .map((company) => ({
        company,
        score: scoreMatch(searchName, company.name ?? ""),
      }))
      .filter(({ company, score }) => {
        const identityText = `${company.name ?? ""} ${company.domain ?? ""}`.replace(
          /[.-]/g,
          " ",
        );
        return (
          Boolean(company.domain) &&
          score >= 18 &&
          isLikelyFinancialEntity(identityText)
        );
      })
      .sort((left, right) => right.score - left.score)[0]?.company;

    const domain = best?.domain?.trim().toLowerCase();
    return domain && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain) ? domain : null;
  } catch {
    return null;
  }
}

function faviconUrl(domain: string) {
  const website = `https://${domain}`;
  return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(
    website,
  )}&sz=128`;
}

function redirectToLogo(url: string) {
  const response = NextResponse.redirect(new URL(url), 307);
  response.headers.set("Cache-Control", CACHE_CONTROL);
  return response;
}

function logoNotFound() {
  return NextResponse.json(
    { error: "No verified logo was found for this account name." },
    {
      status: 404,
      headers: { "Cache-Control": MISS_CACHE_CONTROL },
    },
  );
}

export async function GET(request: NextRequest) {
  const rawName = request.nextUrl.searchParams.get("name")?.trim().slice(0, 120);
  const rawType = request.nextUrl.searchParams.get("type")?.trim().slice(0, 40);
  const rawIconKey = request.nextUrl.searchParams
    .get("iconKey")
    ?.trim()
    .slice(0, 120);

  if (
    !rawName ||
    !shouldAttemptAccountLogo(rawName, rawIconKey, rawType)
  ) {
    return logoNotFound();
  }

  const knownBrand = detectAccountBrand(rawName, rawIconKey);
  const searchName = knownBrand?.label ?? cleanSearchName(rawName);
  const wikidataLogo = await resolveWikidataLogo(searchName);
  if (wikidataLogo) return redirectToLogo(wikidataLogo);

  const domain = knownBrand?.domain ?? (await resolveCompanyDomain(searchName));
  if (domain) return redirectToLogo(faviconUrl(domain));

  return logoNotFound();
}
