export type Filter = { kind: "all" } | { kind: "category"; id: string } | { kind: "tag"; tag: string };
export function FilterBar({ categories, value, onChange }: { categories: { id: string; name: string }[]; value: Filter; onChange: (f: Filter) => void }) {
  const tags = ["Vegan", "Gluten-Free", "High-Protein"];
  const chip = (label: string, active: boolean, onClick: () => void) => (
    <button key={label} type="button" className={active ? "chip chip--active" : "chip"} aria-pressed={active} onClick={onClick}>{label}</button>
  );
  return (
    <div className="filter-bar" role="toolbar" aria-label="Filter menu">
      {chip("Semua", value.kind === "all", () => onChange({ kind: "all" }))}
      {categories.map((c) => chip(c.name, value.kind === "category" && value.id === c.id, () => onChange({ kind: "category", id: c.id })))}
      {tags.map((t) => chip(t, value.kind === "tag" && value.tag === t.toLowerCase(), () => onChange({ kind: "tag", tag: t.toLowerCase() })))}
    </div>
  );
}
