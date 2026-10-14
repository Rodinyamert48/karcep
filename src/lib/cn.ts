import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn/ui'nin standart sınıf birleştirme yardımcısı: koşullu sınıfları birleştirir, çakışan Tailwind sınıflarında sonuncuyu kazandırır. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
