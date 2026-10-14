import type { MetadataRoute } from "next";
import { RELEASE_DATE } from "@/lib/appInfo";

export const dynamic = "force-static";

// KârCep tek sayfalık bir uygulamadır (hash tabanlı bölüm yönlendirmesi kullanır);
// bu yüzden sitemap tek bir girdi içerir.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://rodinyamert48.github.io/karcep/",
      lastModified: RELEASE_DATE,
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
