import Platform from "@/components/platform";
import { notFound } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const page = slug.join("/");
  if (
    ![
      "sea",
      "explorer",
      "compare",
      "analytics",
      "forecast",
      "research",
      "research/new",
      "ai-assistant",
      "shoreline-ai",
      "gallery",
      "methodology",
      "about",
      "sources",
      "dashboard",
    ].includes(page)
  )
    notFound();
  return <Platform page={page} />;
}
