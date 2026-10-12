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
      "explorer",
      "compare",
      "analytics",
      "research",
      "research/new",
      "ai-assistant",
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
