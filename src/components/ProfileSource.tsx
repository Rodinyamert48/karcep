"use client";

import { AlertTriangle, BadgeCheck, PenLine } from "lucide-react";
import type { CommissionProfile } from "@/storage";
import { daysSince, formatDate } from "@/lib/format";
import { safeHttpUrl } from "@/lib/browser";
import { Badge } from "./ui/primitives";

export const STALE_AFTER_DAYS = 90;

export type SourceStatus = "user" | "unverified" | "stale" | "recent";

export function profileStatus(p: Pick<CommissionProfile, "origin" | "verifiedAt" | "source">, now = new Date()): SourceStatus {
  if (p.origin !== "source") return "user";
  if (!p.verifiedAt || !p.source.trim()) return "unverified";
  const d = daysSince(p.verifiedAt, now);
  return d === null || d > STALE_AFTER_DAYS ? "stale" : "recent";
}

export function ProfileSourceBadge({ profile }: { profile: CommissionProfile }) {
  const status = profileStatus(profile);
  if (status === "user")
    return (
      <Badge tone="warning">
        <PenLine className="size-3" aria-hidden="true" />
        Kullanıcı girişi
      </Badge>
    );
  if (status === "unverified")
    return (
      <Badge tone="warning">
        <AlertTriangle className="size-3" aria-hidden="true" />
        Kaynak/tarih eksik
      </Badge>
    );
  if (status === "stale")
    return (
      <Badge tone="warning">
        <AlertTriangle className="size-3" aria-hidden="true" />
        {STALE_AFTER_DAYS} günden eski
      </Badge>
    );
  return (
    <Badge tone="success">
      <BadgeCheck className="size-3" aria-hidden="true" />
      Kaynaklı
    </Badge>
  );
}

export function ProfileSourceDetail({ profile }: { profile: CommissionProfile }) {
  const status = profileStatus(profile);
  const url = profile.source ? safeHttpUrl(profile.source) : null;
  return (
    <div className="space-y-1 text-xs text-muted">
      <div className="flex flex-wrap items-center gap-2">
        <ProfileSourceBadge profile={profile} />
        {profile.verifiedAt && <span>Son doğrulama: {formatDate(profile.verifiedAt)}</span>}
      </div>
      {profile.origin === "source" && profile.source && (
        <p className="break-words">
          Kaynak:{" "}
          {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="text-info underline">
              {profile.source}
            </a>
          ) : (
            profile.source
          )}
        </p>
      )}
      {status === "user" && <p>Bu oran sizin girdiğiniz bir değerdir; kaynağı doğrulanmadı.</p>}
      {status === "stale" && <p>Oranın güncelliğini pazaryeri panelinizden yeniden kontrol edin.</p>}
      {status === "unverified" && <p>Kaynak veya doğrulama tarihi girilmediği için oran doğrulanmamış sayılır.</p>}
      {status === "recent" && <p>Kaynak ve tarih sizin beyanınızdır; KârCep oranı otomatik doğrulamaz.</p>}
    </div>
  );
}
