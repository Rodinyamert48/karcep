"use client";

import type { CommissionProfile } from "@/storage";
import { safeHttpUrl } from "@/lib/browser";
import { daysSince, formatDate } from "@/lib/format";
import { Tag } from "./ui/layout";

export const STALE_AFTER_DAYS = 90;

export type SourceStatus = "user" | "unverified" | "stale" | "recent";

export function profileStatus(p: Pick<CommissionProfile, "origin" | "verifiedAt" | "source">, now = new Date()): SourceStatus {
  if (p.origin !== "source") return "user";
  if (!p.verifiedAt || !p.source.trim()) return "unverified";
  const d = daysSince(p.verifiedAt, now);
  return d === null || d > STALE_AFTER_DAYS ? "stale" : "recent";
}

const LABEL: Record<SourceStatus, { text: string; tone: "warn" | "accent" }> = {
  user: { text: "Kullanıcı girişi", tone: "warn" },
  unverified: { text: "Kaynak/tarih eksik", tone: "warn" },
  stale: { text: `${STALE_AFTER_DAYS} günden eski`, tone: "warn" },
  recent: { text: "Kaynaklı", tone: "accent" },
};

export function SourceTag({ profile }: { profile: CommissionProfile }) {
  const s = LABEL[profileStatus(profile)];
  return <Tag tone={s.tone}>{s.text}</Tag>;
}

export function SourceDetail({ profile }: { profile: CommissionProfile }) {
  const status = profileStatus(profile);
  const url = profile.source ? safeHttpUrl(profile.source) : null;
  const sentence: Record<SourceStatus, string> = {
    user: "Bu oran sizin girdiğiniz bir değerdir; kaynağı doğrulanmadı.",
    unverified: "Kaynak veya doğrulama tarihi eksik; oran doğrulanmamış sayılır.",
    stale: "Oranın güncelliğini pazaryeri panelinizden yeniden kontrol edin.",
    recent: "Kaynak ve tarih sizin beyanınızdır; KârCep oranı otomatik doğrulamaz.",
  };
  return (
    <div className="space-y-1 text-[13px] text-subtle">
      <div className="flex flex-wrap items-center gap-2">
        <SourceTag profile={profile} />
        {profile.verifiedAt && <span>Son doğrulama: {formatDate(profile.verifiedAt)}</span>}
      </div>
      {profile.origin === "source" && profile.source && (
        <p className="break-words">
          Kaynak:{" "}
          {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="text-info underline underline-offset-2">
              {profile.source}
            </a>
          ) : (
            profile.source
          )}
        </p>
      )}
      <p>{sentence[status]}</p>
    </div>
  );
}
