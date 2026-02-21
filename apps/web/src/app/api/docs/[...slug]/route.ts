import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

const DOCS_DIR = join(process.cwd(), "content", "docs");

// Map slug to filename — "index" is the root doc
function slugToFile(slugParts: string[]): string {
  const name = slugParts.join("/");
  // Strip .md extension if present
  const clean = name.replace(/\.md$/, "");
  return clean || "index";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const filename = slugToFile(slug);
  const filepath = join(DOCS_DIR, `${filename}.mdx`);

  try {
    const raw = await readFile(filepath, "utf-8");

    // Strip MDX frontmatter (---...---)
    const stripped = raw.replace(/^---[\s\S]*?---\n*/, "");

    return new NextResponse(stripped.trim(), {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=60, s-maxage=300",
      },
    });
  } catch {
    return NextResponse.json(
      { error: `Doc not found: ${filename}` },
      { status: 404 }
    );
  }
}
