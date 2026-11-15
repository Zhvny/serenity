import { Icon } from "./Icon.tsx";
import { useT } from "../i18n/t.ts";
import { FULFIL_FLOW, STEP_LABEL, fulfilIndex } from "../utils/orderFlow.ts";

export function OrderStepper({ status }: { status: string }) {
  const t = useT();
  const at = fulfilIndex(status);
  if (at < 0) return null;
  return (
    <ol className="stepper" aria-label={t("orders.stepper.label")}>
      {FULFIL_FLOW.map((s, i) => {
        const state = i < at ? "is-done" : i === at ? "is-current" : "is-todo";
        return (
          <li key={s} className={state} aria-current={i === at ? "step" : undefined}>
            <span className="step-dot" aria-hidden="true">{i < at ? <Icon name="check" /> : i + 1}</span>
            <span className="step-label">{t(STEP_LABEL[s])}</span>
          </li>
        );
      })}
    </ol>
  );
}
