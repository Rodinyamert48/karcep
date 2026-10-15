"use client";

import { useEffect } from "react";
import { DataProvider, useData } from "@/state/DataProvider";
import { useSection, type SectionId } from "@/state/navigation";
import type { KeyValueStore } from "@/storage";
import { Shell } from "./Shell";
import { FeedbackProvider, useFeedback } from "./ui/feedback";
import { AboutPage } from "./pages/About";
import { CalculatorPage } from "./pages/Calculator";
import { HistoryPage } from "./pages/History";
import { OverviewPage } from "./pages/Overview";
import { ProductsPage } from "./pages/Products";
import { ScenariosPage } from "./pages/Scenarios";
import { SettingsPage } from "./pages/Settings";

export function KarcepApp({ store }: { store?: KeyValueStore }) {
  return (
    <FeedbackProvider>
      <DataProvider store={store}>
        <Root />
      </DataProvider>
    </FeedbackProvider>
  );
}

function Root() {
  const [section, navigate] = useSection();
  const { ready, loadIssues, saveError, persistent } = useData();
  const { toast } = useFeedback();

  useEffect(() => {
    if (saveError) toast("Veriler kaydedilemedi: tarayıcı depolama alanı dolu veya engellenmiş olabilir.", "error");
  }, [saveError, toast]);

  const issues = [...(!persistent ? ["Tarayıcı yerel depolamaya izin vermiyor; veriler sayfa kapanınca kaybolur."] : []), ...loadIssues];
  const banner =
    ready && issues.length > 0 ? (
      <div role="alert" className="border-b border-warn/40 bg-raised">
        <ul className="mx-auto max-w-6xl space-y-1 px-4 py-3 text-sm text-warn sm:px-6">
          {issues.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </div>
    ) : null;

  return (
    <Shell current={section} onNavigate={navigate} banner={banner}>
      {ready ? (
        <Page id={section} navigate={navigate} />
      ) : (
        <p role="status" className="py-24 text-center text-sm text-subtle">
          Yükleniyor…
        </p>
      )}
    </Shell>
  );
}

function Page({ id, navigate }: { id: SectionId; navigate: (id: SectionId) => void }) {
  switch (id) {
    case "hesaplayici":
      return <CalculatorPage navigate={navigate} />;
    case "urunler":
      return <ProductsPage navigate={navigate} />;
    case "senaryolar":
      return <ScenariosPage navigate={navigate} />;
    case "ayarlar":
      return <SettingsPage navigate={navigate} />;
    case "gecmis":
      return <HistoryPage navigate={navigate} />;
    case "hakkinda":
      return <AboutPage />;
    default:
      return <OverviewPage navigate={navigate} />;
  }
}
