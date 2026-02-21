import { source } from "@/lib/source";
import { DocsPage, DocsBody } from "fumadocs-ui/layouts/docs/page";
import { notFound } from "next/navigation";
import { CopyForAgents } from "@/components/docs/copy-for-agents";
import defaultMdxComponents from "fumadocs-ui/mdx";

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const slugStr = params.slug?.join("/") ?? "";

  return (
    <DocsPage toc={page.data.toc}>
      <DocsBody>
        <div className="flex items-center justify-end mb-4 -mt-2">
          <CopyForAgents slug={slugStr} />
        </div>
        <MDX components={{ ...defaultMdxComponents }} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}
