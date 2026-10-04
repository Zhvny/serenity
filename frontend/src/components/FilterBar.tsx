import { useT } from "../i18n/t.ts";
import { useLang } from "../i18n/useLang.ts";
import { categoryLabel } from "../i18n/content.ts";

export type Filter = { kind: "all" } | { kind: "category"; id: string } | { kind: "tag"; tag: string };
export function FilterBar({ categories, value, onChange }: { categories: { id: string; name: string }[]; value: Filter; onChange: (f: Filter) => void }) {
  const t = useT();
  const [lang] = useLang();
  const tags = ["Vegan", "Gluten-Free", "High-Protein"];
  const chip = (label: string, active: boolean, onClick: () => void) => (
    <button key={label} type="button" className={active ? "chip chip--active" : "chip"} aria-pressed={active} onClick={onClick}>{label}</button>
  );
  return (
    <div className="filter-bar" role="toolbar" aria-label={t("menu.filter.label")}>
      {chip(t("menu.filter.all"), value.kind === "all", () => onChange({ kind: "all" }))}
      {categories.map((c) => chip(categoryLabel(c, lang), value.kind === "category" && value.id === c.id, () => onChange({ kind: "category", id: c.id })))}
      {tags.map((tg) => chip(tg, value.kind === "tag" && value.tag === tg.toLowerCase(), () => onChange({ kind: "tag", tag: tg.toLowerCase() })))}
    </div>
  );
}
