"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, BellRing, GitBranch, ShieldAlert } from "lucide-react";
import { ErrorMessage, LoadingState, PageIntro, SectionLabel } from "@/components/SectionHeading";
import { post } from "@/lib/api";

type RiskResult = {
  label: "AT RISK" | "ON TIME";
  probability: number;
  threshold: number;
  top_contributing_factors: { factor: string; value: string | number; probability_change_pp: number; direction: string }[];
};

const weather = ["clear", "cloudy", "light_rain", "heavy_rain", "storm"];

export default function RiskPage() {
  const [values, setValues] = useState({ weather: "clear", hub_load_pct: 68, distance_km: 24, workload_stops: 13 });
  const [result, setResult] = useState<RiskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setResult(await post<RiskResult>("/api/risk", values));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The risk model could not run.");
    } finally {
      setLoading(false);
    }
  }, [values]);

  useEffect(() => {
    const timer = window.setTimeout(() => void run(), 150);
    return () => window.clearTimeout(timer);
  }, [run]);

  return (
    <>
      <PageIntro label="04 — ROUTE RELIABILITY" title="Read the conditions." emphasis="Act before the delay.">
        A probability from the balanced SVC trained on 3,500 labeled deliveries. Its explanations show how this shipment compares with a neutral training profile.
      </PageIntro>
      <section className="tool-layout">
        <form className="tool-card" onSubmit={(event) => { event.preventDefault(); void run(); }}>
          <div className="tool-card-head"><SectionLabel>DELIVERY CONDITIONS</SectionLabel><span className="model-chip">SVC · {values.weather.toUpperCase()}</span></div>
          <label className="select-field">Weather conditions<select value={values.weather} onChange={(event) => setValues((old) => ({ ...old, weather: event.target.value }))}>{weather.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
          <SliderField label="Hub load" unit="%" min={35} max={100} value={values.hub_load_pct} onChange={(hub_load_pct) => setValues((old) => ({ ...old, hub_load_pct }))} />
          <SliderField label="Route distance" unit="km" min={1} max={107.75} step={0.1} value={values.distance_km} onChange={(distance_km) => setValues((old) => ({ ...old, distance_km }))} />
          <SliderField label="Driver workload" unit="stops" min={3} max={24} value={values.workload_stops} onChange={(workload_stops) => setValues((old) => ({ ...old, workload_stops }))} />
          <button className="button button-amber full-button" type="submit" disabled={loading}><ShieldAlert size={15} />{loading ? "Scoring route…" : "Recheck delivery risk"}</button>
        </form>
        <div className="result-column">
          <article className="risk-result" aria-live="polite">
            {loading && !result ? <LoadingState label="Evaluating trained SVC…" /> : result ? (
              <>
                <div className="risk-top"><div><SectionLabel>MODEL CLASS / PROBABILITY</SectionLabel><strong className="risk-probability">{result.probability.toFixed(1)}<small>%</small></strong><p className="small-explanation">Probability of a late delivery · class threshold {result.threshold}%</p></div><span className={`risk-badge${result.label === "AT RISK" ? " at-risk" : ""}`}>{result.label}</span></div>
                <div className="risk-meter" role="meter" aria-label="Late delivery probability" aria-valuemin={0} aria-valuemax={100} aria-valuenow={result.probability}><i style={{ width: `${result.probability}%` }} /></div>
                <div className="factor-list"><SectionLabel>LOCAL MODEL SIGNALS / PERCENTAGE-POINT CHANGE FROM NEUTRAL INPUT</SectionLabel>{result.top_contributing_factors.map((factor) => <div className="factor-row" key={factor.factor}><span>{factor.factor.replaceAll("_", " ")}</span><b>{String(factor.value).replaceAll("_", " ")}</b><strong>{factor.probability_change_pp > 0 ? "+" : ""}{factor.probability_change_pp.toFixed(1)} pp</strong></div>)}</div>
              </>
            ) : <EmptyState />}
            <ErrorMessage>{error}</ErrorMessage>
          </article>
          <article className="response-card">
            <SectionLabel>PREPARED RESPONSE</SectionLabel><h2>Make the probability actionable.</h2>
            <div className="response-options">
              <div><span className="response-icon"><GitBranch size={16} /></span><p><b>Check an alternate route</b><small>Compare capacity before the predicted delay compounds.</small></p></div>
              <div><span className="response-icon"><BellRing size={16} /></span><p><b>Notify with a real update</b><small>Share the new delivery window when conditions change.</small></p></div>
            </div>
            <p className="small-explanation">Recommendations are operational options, not actions automatically taken by this demo.</p>
          </article>
        </div>
      </section>
    </>
  );
}

function SliderField({ label, unit, min, max, step = 1, value, onChange }: { label: string; unit: string; min: number; max: number; step?: number; value: number; onChange: (value: number) => void }) {
  return <div className="range-field"><div className="range-heading"><label>{label}</label><span className="range-current">{value} {unit}</span></div><input aria-label={`${label} ${unit}`} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /><div className="range-limits"><span>{min} {unit}</span><span>{max} {unit} · CSV range</span></div></div>;
}

function EmptyState() {
  return <div className="empty-state"><div className="empty-route"><i /><i /><i /></div><SectionLabel>RISK CHECK</SectionLabel><p>Choose route conditions to see a trained-model probability.</p><ArrowRight size={15} /></div>;
}
