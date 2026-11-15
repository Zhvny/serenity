import { useEffect } from "react";

// Judul tab per halaman ("Menu · Serenity"); tanpa judul -> "Serenity".
export function usePageTitle(title: string | null): void {
  useEffect(() => {
    document.title = title === null || title === "" ? "Serenity" : `${title} · Serenity`;
  }, [title]);
}
