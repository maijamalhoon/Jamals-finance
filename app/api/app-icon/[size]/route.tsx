import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const SUPPORTED_SIZES = new Set([192, 512]);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ size: string }> },
) {
  const { size } = await context.params;
  const parsedSize = Number(size);
  const dimension = SUPPORTED_SIZES.has(parsedSize) ? parsedSize : 512;
  const isMaskable = request.nextUrl.searchParams.get("maskable") === "1";

  return new ImageResponse(
    (
      <svg
        height={dimension}
        viewBox="0 0 512 512"
        width={dimension}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="app-icon-bg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#11769A" />
            <stop offset="0.48" stopColor="#07365F" />
            <stop offset="1" stopColor="#03132F" />
          </linearGradient>
        </defs>

        <rect
          fill="url(#app-icon-bg)"
          height="512"
          rx={isMaskable ? 0 : 112}
          width="512"
        />

        <g
          fill="none"
          stroke="#FFFFFF"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M105 405 C158 404 219 406 296 405" strokeWidth="12" />
          <path
            d="M124 387 L122 302 Q122 294 130 294 L165 292 Q172 292 172 300 L174 385 Q174 392 166 392 L132 393 Q124 393 124 387 Z"
            strokeWidth="12"
          />
          <path
            d="M195 386 L194 255 Q194 247 202 246 L238 244 Q246 244 246 252 L248 383 Q248 392 240 392 L203 393 Q195 393 195 386 Z"
            strokeWidth="12"
          />
          <path
            d="M269 283 L268 207 Q268 199 276 198 L312 196 Q320 196 320 204 L321 248"
            strokeWidth="12"
          />
          <path
            d="M129 255 L203 180 Q207 176 212 181 L236 205 Q242 211 248 205 L329 124"
            strokeWidth="13"
          />
          <path d="M299 126 L334 116 L331 151" strokeWidth="13" />
          <circle cx="350" cy="319" r="78" strokeWidth="13" />
          <path d="M355 269 L352 367" strokeWidth="11" />
          <path
            d="M375 283 C365 272 333 272 328 292 C324 311 344 316 356 320 C373 326 382 336 378 350 C373 369 340 374 322 358"
            strokeWidth="12"
          />
        </g>
      </svg>
    ),
    {
      height: dimension,
      width: dimension,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
