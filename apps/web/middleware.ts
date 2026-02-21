import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rewrite /docs/something.md → /api/docs/something.md (API strips .md)
  if (pathname.startsWith("/docs/") && pathname.endsWith(".md")) {
    const slug = pathname.slice("/docs/".length); // e.g. "quickstart.md"
    const url = request.nextUrl.clone();
    url.pathname = `/api/docs/${slug}`;
    return NextResponse.rewrite(url);
  }

  // Rewrite /docs.md → /api/docs/index.md (root doc)
  if (pathname === "/docs.md") {
    const url = request.nextUrl.clone();
    url.pathname = "/api/docs/index.md";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/docs/:path*.md", "/docs.md"],
};
