"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ErrorMessage, LoadingState, PageIntro, SectionLabel } from "@/components/SectionHeading";
import { api } from "@/lib/api";

type ModelMetrics = {
  datasets: Record<string, { file: string; rows: number }>;
  shipping_cost: { algorithm: string; holdout: { mae: number; rmse: number; r2: number; mape_pct: number }; comparison?: Record<string, { mape_pct: number; mae: number; rmse: number; r2: number }>; within_5_percent_target: boolean };
  delivery_time: { best_k: number; cv_mae_minutes: number; holdout_mae_minutes: number; holdout_rmse_minutes: number };
  late_risk: { labels: string[]; confusion_matrix: number[][]; late_class: { precision: number; recall: number; f1: number; roc_auc: number; prevalence: number }; cv_roc_auc_by_kernel: Record<string, number> };
  first_attempt_failure: { f1_macro: number; accuracy: number; feature_importance: { feature: string; importance: number }[] };
  customer_messages: { labels: string[]; confusion_matrix: number[][]; f1_macro: number; per_class: Record<string, { precision?: number; recall?: number; "f1-score"?: number; support?: number }> };
  daily_volume: { mae: number; mape_pct: number; holdout_start: string; holdout_end: string; holdout_error_series: { date: string; mae: number }[] };
};

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<ModelMetrics>("/api/metrics").then(setMetrics).catch((reason: Error) => setError(reason.message));
  }, []);

  return (
    <>
      <PageIntro label="08 — MODEL PERFORMANCE" title="Every metric," emphasis="from a holdout.">
        Validation results from reproducible splits of the six supplied datasets. No score is guaranteed outside those samples.
      </PageIntro>
      {error && <div className="page-error"><ErrorMessage>{error}</ErrorMessage></div>}
      {!metrics ? <div className="page-loading"><LoadingState label="Loading saved model metrics…" /></div> : (
        <>
          <section className="metric-grid">
            <Metric label="COST MODEL / MAE" value={`₱${metrics.shipping_cost.holdout.mae.toFixed(2)}`} caption={`${metrics.shipping_cost.holdout.mape_pct.toFixed(2)}% holdout MAPE`} foot="3,000 COST RECORDS" />
            <Metric label="COST MODEL / R²" value={metrics.shipping_cost.holdout.r2.toFixed(3)} caption={metrics.shipping_cost.within_5_percent_target ? "Meets the 5% MAPE target" : "Above the 5% MAPE target"} foot={metrics.shipping_cost.algorithm.replaceAll("_", " ").toUpperCase()} />
            <Metric label="SVC / LATE CLASS F1" value={metrics.late_risk.late_class.f1.toFixed(3)} caption={`Recall ${metrics.late_risk.late_class.recall.toFixed(3)} · AUC ${metrics.late_risk.late_class.roc_auc.toFixed(3)}`} foot="IMBALANCE-AWARE HOLDOUT" />
            <Metric label="ANN / DAILY VOLUME MAE" value={metrics.daily_volume.mae.toFixed(0)} caption={`${metrics.daily_volume.mape_pct.toFixed(1)}% MAPE`} foot="OCT–DEC 2025 HOLDOUT" />
          </section>
          <section className="analytics-grid">
            <article className="analytics-card"><CardTitle label="CLASSIFICATION / HELD-OUT" title="Late delivery · confusion matrix" badge="SVC" /><ConfusionMatrix labels={metrics.late_risk.labels.map((label) => label === "1" ? "Late" : "On time")} matrix={metrics.late_risk.confusion_matrix} /></article>
            <article className="analytics-card"><CardTitle label="TEXT ROUTING / STRATIFIED HOLDOUT" title="Support ticket · confusion matrix" badge="NAIVE BAYES" /><ConfusionMatrix labels={metrics.customer_messages.labels} matrix={metrics.customer_messages.confusion_matrix} /></article>
            <article className="analytics-card"><CardTitle label="GINI SPLIT IMPORTANCE" title="First-attempt failure signals" badge="TREE" /><div className="feature-chart">{metrics.first_attempt_failure.feature_importance.slice(0, 9).map((feature) => <div className="feature-row" key={feature.feature}><span>{feature.feature.replaceAll("categories__", "").replaceAll("numeric__", "").replaceAll("_", " ")}</span><div className="feature-track"><i style={{ width: `${Math.min(100, feature.importance * 100)}%` }} /></div><b>{(feature.importance * 100).toFixed(1)}%</b></div>)}</div><p className="matrix-caption">Feature importance from the fitted depth-{6} tree. Encoded columns are shown by their transformed names.</p></article>
            <article className="analytics-card"><CardTitle label={`TIME HOLDOUT / ${metrics.daily_volume.holdout_start} → ${metrics.daily_volume.holdout_end}`} title="Daily volume · forecast absolute error" badge="KERAS" /><div className="error-chart"><ResponsiveContainer width="100%" height={215}><LineChart data={metrics.daily_volume.holdout_error_series} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}><CartesianGrid stroke="#DFE4EA" strokeDasharray="3 4" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 8, fill: "#626D7B" }} interval={12} /><YAxis tick={{ fontSize: 9, fill: "#626D7B" }} width={45} /><Tooltip contentStyle={{ borderRadius: 0, borderColor: "#DFE4EA", fontSize: 10 }} /><Line type="monotone" dataKey="mae" name="Daily MAE (parcels)" stroke="#F5A623" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div><p className="matrix-caption">Daily absolute error averaged across all four hubs on the final 91 time-ordered dates.</p></article>
          </section>
          <section className="comparison-strip">
            <SectionLabel>REGRESSION COMPARISON / SAME HELD-OUT ROWS</SectionLabel>
            <div className="comparison-table"><div className="comparison-head"><span>MODEL</span><span>MAE</span><span>RMSE</span><span>R²</span><span>MAPE</span></div>{Object.entries(metrics.shipping_cost.comparison ?? { [metrics.shipping_cost.algorithm]: metrics.shipping_cost.holdout }).map(([name, value]) => <div className="comparison-row" key={name}><b>{name.replaceAll("_", " ")}</b><span>₱{value.mae.toFixed(2)}</span><span>₱{value.rmse.toFixed(2)}</span><span>{value.r2.toFixed(3)}</span><strong>{value.mape_pct.toFixed(2)}%</strong></div>)}</div>
            <p className="small-explanation">The selected pipeline is chosen by held-out MAPE. If both alternatives exceed 5%, the goal is explicitly shown as unmet.</p>
          </section>
          <section className="dataset-count-band"><SectionLabel>RECORDS USED ACROSS THE SIX PIPELINES</SectionLabel>{Object.entries(metrics.datasets).map(([name, data]) => <div key={name}><strong>{data.rows.toLocaleString()}</strong><span>{name.replaceAll("_", " ")}</span></div>)}</section>
        </>
      )}
    </>
  );
}

function Metric({ label, value, caption, foot }: { label: string; value: string; caption: string; foot: string }) {
  return <article className="metric-card"><SectionLabel>{label}</SectionLabel><strong>{value}</strong><p>{caption}</p><div className="metric-foot">{foot}</div></article>;
}

function CardTitle({ label, title, badge }: { label: string; title: string; badge: string }) {
  return <div className="card-title"><div><SectionLabel>{label}</SectionLabel><h2>{title}</h2></div><span className="model-chip">{badge}</span></div>;
}

function ConfusionMatrix({ labels, matrix }: { labels: string[]; matrix: number[][] }) {
  return <div className="matrix-wrap"><div className="matrix-axis">PREDICTED CLASS →</div><table className="matrix-table" aria-label="Confusion matrix: rows are actual class and columns are predicted class"><thead><tr><th>ACTUAL ↓</th>{labels.map((label) => <th key={label} title={label}>{compact(label)}</th>)}</tr></thead><tbody>{matrix.map((row, rowIndex) => <tr key={labels[rowIndex]}><th title={labels[rowIndex]}>{compact(labels[rowIndex])}</th>{row.map((count, columnIndex) => <td className={rowIndex === columnIndex ? "diagonal" : ""} key={columnIndex}>{count}</td>)}</tr>)}</tbody></table><p className="matrix-caption">Rows = actual · columns = predicted. Dark diagonal cells are correct classifications.</p></div>;
}

function compact(value: string) {
  return value.length > 14 ? `${value.slice(0, 12)}…` : value;
}
