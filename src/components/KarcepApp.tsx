"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { DataProvider, useData } from "@/state/DataProvider";
import { useSection, type SectionId } from "@/state/navigation";
import type { KeyValueStore } from "@/storage";
import { AppShell } from "./AppShell";
import { FeedbackProvider, useFeedback } from "./ui/feedback";
import { Notice } from "./ui/primitives";
import { AboutSection } from "./sections/About";
import { CalculatorSection } from "./sections/Calculator";
import { HistorySection } from "./sections/HistorySection";
import { OverviewSection } from "./sections/Overview";
import { ProductsSection } from "./sections/Products";
import { ScenariosSection } from "./sections/Scenarios";
import { SettingsSection } from "./sections/SettingsSection";

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
  const { ready, data, loadIssues, saveError, persistent } = useData();
  const { toast } = useFeedback();

  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.theme;
  }, [data.settings.theme]);

  useEffect(() => {
    if (saveError) toast("Veriler kaydedilemedi: tarayıcı depolama alanı dolu veya engellenmiş olabilir.", "error");
  }, [saveError, toast]);

  const banner =
    ready && (loadIssues.length > 0 || !persistent) ? (
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <Notice tone="warning" icon={<AlertTriangle className="size-4" />} title="Veri uyarısı">
          <ul className="list-disc pl-4">
            {!persistent && <li>Tarayıcı yerel depolamaya izin vermiyor; veriler sayfa kapanınca kaybolur.</li>}
            {loadIssues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </Notice>
      </div>
    ) : null;

  return (
    <AppShell current={section} onNavigate={navigate} banner={banner}>
      {ready ? (
        <Section id={section} navigate={navigate} />
      ) : (
        <p className="py-20 text-center text-sm text-muted" role="status">
          Yükleniyor…
        </p>
      )}
    </AppShell>
  );
}

function Section({ id, navigate }: { id: SectionId; navigate: (id: SectionId) => void }) {
  switch (id) {
    case "hesaplayici":
      return <CalculatorSection navigate={navigate} />;
    case "urunler":
      return <ProductsSection navigate={navigate} />;
    case "senaryolar":
      return <ScenariosSection navigate={navigate} />;
    case "ayarlar":
      return <SettingsSection />;
    case "gecmis":
      return <HistorySection navigate={navigate} />;
    case "hakkinda":
      return <AboutSection />;
    default:
      return <OverviewSection navigate={navigate} />;
  }
}
