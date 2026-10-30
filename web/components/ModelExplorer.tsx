"use client";

import { Activity, ArrowUpRight, Boxes, BrainCircuit, GitBranch, MessageSquareText, Network, Route } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Metrics = {
  shipping_cost: { holdout: { mape_pct: number } };
  delivery_time: { holdout_mae_minutes: number; best_k: number };
  late_risk: { late_class: { f1: number; roc_auc: number } };
  first_attempt_failure: { f1_macro: number };
  customer_messages: { f1_macro: number };
  daily_volume: { mape_pct: number; mae: number };
};

const models = [
  { id: "cost", number: "01", name: "Linear regression", use: "Shipping cost", features: "Distance · weight · stops · fuel price", metric: "Holdout MAPE from CSV", href: "/quote", Icon: Route },
  { id: "eta", number: "02", name: "K-nearest neighbors", use: "Delivery time", features: "Route · area · time · size · traffic · distance", metric: "Cross-validated minutes MAE", href: "/quote", Icon: Network },
  { id: "risk", number: "03", name: "Support vector machine", use: "Late risk", features: "Weather · hub load · distance · workload", metric: "Late-class F1 + ROC-AUC", href: "/risk", Icon: Activity },
  { id: "failure", number: "04", name: "Decision tree", use: "First-attempt failure", features: "Address · time slot · day · prior attempts · response", metric: "Held-out failure F1", href: "/failure", Icon: GitBranch },
  { id: "triage", number: "05", name: "Multinomial Naive Bayes", use: "Support message", features: "TF-IDF word unigrams and bigrams", metric: "Six-class macro F1", href: "/triage", Icon: MessageSquareText },
  { id: "volume", number: "06", name: "Keras neural network", use: "Daily hub volume", features: "Calendar · promotion · weather · parcel lags · hub", metric: "Last-quarter MAE + MAPE", href: "/forecast", Icon: BrainCircuit },
];

export function ModelExplorer() {
  const [selected, setSelected] = useState(models[0]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metricsError, setMetricsError] = useState("");
  const Icon = selected.Icon;

  useEffect(() => {
    api<Metrics>("/api/metrics")
      .then(setMetrics)
      .catch((reason: Error) => setMetricsError(reason.message));
  }, []);

  const measuredMetric = metrics
    ? selected.id === "cost"
      ? `${metrics.shipping_cost.holdout.mape_pct}% holdout MAPE`
      : selected.id === "eta"
        ? `${metrics.delivery_time.holdout_mae_minutes} min MAE · k=${metrics.delivery_time.best_k}`
        : selected.id === "risk"
          ? `F1 ${metrics.late_risk.late_class.f1} · AUC ${metrics.late_risk.late_class.roc_auc}`
          : selected.id === "failure"
            ? `Macro-F1 ${metrics.first_attempt_failure.f1_macro}`
            : selected.id === "triage"
              ? `Macro-F1 ${metrics.customer_messages.f1_macro}`
              : `${metrics.daily_volume.mape_pct}% MAPE · MAE ${metrics.daily_volume.mae}`
    : null;

  return (
    <div className="model-explorer">
      <div className="model-rail" role="tablist" aria-label="Trained logistics models">
        {models.map(({ Icon: ModelIcon, ...model }) => (
          <button
            className={`model-node${selected.id === model.id ? " active" : ""}`}
            key={model.id}
            role="tab"
            aria-selected={selected.id === model.id}
            aria-controls="model-detail"
            onClick={() => setSelected(models.find((item) => item.id === model.id)!)}
          >
            <span>{model.number}</span>
            <b>{model.name}</b>
            <small>{model.use}</small>
          </button>
        ))}
      </div>
      <section className="model-detail" id="model-detail" role="tabpanel">
        <div className="detail-icon"><Icon size={20} aria-hidden="true" /></div>
        <span className="section-label">MODEL {selected.number} / {selected.use.toUpperCase()}</span>
        <h3>{selected.name}</h3>
        <p>Trained and evaluated directly on the Aegis shipment and service CSV records. The API returns predictions from this saved model.</p>
        <div className="model-io">
          <div><span>INPUT FEATURES</span><b>{selected.features}</b></div>
          <div><span>HELD-OUT VALIDATION</span><b>{measuredMetric ?? (metricsError || selected.metric)}</b></div>
        </div>
        <Link className="text-link" href={selected.href}>Open live model <ArrowUpRight size={14} /></Link>
      </section>
      <div className="model-schematic" aria-hidden="true">
        <svg viewBox="0 0 210 170">
          <path d="M24 28h63m-63 57h63m-63 57h63M87 28l39 57-39 57m39-57h48" fill="none" stroke="currentColor" strokeDasharray="4 4" />
          <circle cx="24" cy="28" r="6" /><circle cx="24" cy="85" r="6" /><circle cx="24" cy="142" r="6" />
          <circle cx="126" cy="85" r="9" /><rect x="168" y="73" width="16" height="24" rx="3" />
        </svg>
        <span>FEATURES → TRAINED MODEL → DECISION</span>
      </div>
    </div>
  );
}
