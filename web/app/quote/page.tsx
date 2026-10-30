"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Clock3, Fuel, Weight } from "lucide-react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ErrorMessage, LoadingState, PageIntro, SectionLabel } from "@/components/SectionHeading";
import { post } from "@/lib/api";

type QuoteResult = { predicted_cost_php: number; mape_pct: number; algorithm: string };
type Neighbor = { shipment_id: string; feature_distance: number; distance_km: number; delivery_time_min: number };
type ETAResult = { predicted_delivery_time_min: number; k: number; neighbors: Neighbor[]; holdout_mae_min: number };

const initial = { distance: 22.99, weight: 4.9, stops: 6, fuel: 56.63, route: "suburban", area: "suburban", time: "morning", size: "small", traffic: "medium" };
const limits = {
  distance: { min: 1, max: 91.53, step: 0.1, unit: "km" },
  weight: { min: 0.25, max: 30.84, step: 0.05, unit: "kg" },
  stops: { min: 1, max: 12, step: 1, unit: "stops" },
  fuel: { min: 48, max: 82, step: 0.1, unit: "PHP/L" },
} as const;

export default function QuotePage() {
  const [values, setValues] = useState(initial);
  const [method, setMethod] = useState<"cost" | "eta">("cost");
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [eta, setEta] = useState<ETAResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const predict = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [price, time] = await Promise.all([
        post<QuoteResult>("/api/quote", {
          distance_km: values.distance,
          weight_kg: values.weight,
          stops: values.stops,
          fuel_price: values.fuel,
        }),
        post<ETAResult>("/api/eta", {
          route_type: values.route,
          area_type: values.area,
          time_of_day: values.time,
          parcel_size: values.size,
          distance_km: values.distance,
          traffic_level: values.traffic,
        }),
      ]);
      setQuote(price);
      setEta(time);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The model request failed.");
    } finally {
      setLoading(false);
    }
  }, [values]);

  useEffect(() => {
    const timer = window.setTimeout(() => void predict(), 160);
    return () => window.clearTimeout(timer);
  }, [predict]);

  const money = useMemo(
    () => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }),
    [],
  );
  const etaPlanningRange = eta
    ? `${Math.max(0, Math.round(eta.predicted_delivery_time_min - eta.holdout_mae_min))}–${Math.round(eta.predicted_delivery_time_min + eta.holdout_mae_min)} min`
    : "—";
  const valid =
    values.distance >= limits.distance.min &&
    values.distance <= limits.distance.max &&
    values.weight >= limits.weight.min &&
    values.weight <= limits.weight.max &&
    values.stops >= limits.stops.min &&
    values.stops <= limits.stops.max &&
    values.fuel >= limits.fuel.min &&
    values.fuel <= limits.fuel.max;

  function numberField(key: keyof typeof limits, label: string, Icon: typeof Fuel) {
    const range = limits[key];
    return (
      <div className="range-field" key={key}>
        <div className="range-heading">
          <label htmlFor={`${key}-range`}><Icon size={15} />{label}</label>
          <div className="number-entry">
            <input
              aria-label={`${label} value`}
              type="number"
              min={range.min}
              max={range.max}
              step={range.step}
              value={values[key]}
              onChange={(event) =>
                setValues((current) => ({ ...current, [key]: Number(event.target.value) }))
              }
            />
            <span>{range.unit}</span>
          </div>
        </div>
        <input
          id={`${key}-range`}
          aria-label={label}
          type="range"
          min={range.min}
          max={range.max}
          step={range.step}
          value={values[key]}
          onChange={(event) =>
            setValues((current) => ({ ...current, [key]: Number(event.target.value) }))
          }
        />
        <div className="range-limits"><span>{range.min} {range.unit}</span><span>{range.max} {range.unit} · training range</span></div>
      </div>
    );
  }

  return (
    <>
      <PageIntro label="03 — COST INTELLIGENCE" title="Price the journey." emphasis="Plan the arrival.">
        Shipping cost is learned from your 3,000 cost records. Delivery time is a separate KNN model, compared against similar real training shipments.
      </PageIntro>
      <section className="tool-layout">
        <form className="tool-card" onSubmit={(event) => { event.preventDefault(); void predict(); }}>
          <div className="tool-card-head"><SectionLabel>SHIPMENT PROFILE / PHP</SectionLabel><span className="model-chip">CSV-TRAINED</span></div>
          {numberField("distance", "Route distance", Fuel)}
          {numberField("weight", "Parcel weight", Weight)}
          {numberField("stops", "Stops on route", ArrowUpRight)}
          {numberField("fuel", "Fuel price", Fuel)}
          <fieldset className="model-toggle">
            <legend>Inspect prediction</legend>
            <label className={method === "cost" ? "selected" : ""}><input type="radio" name="model-view" checked={method === "cost"} onChange={() => setMethod("cost")} />Linear cost</label>
            <label className={method === "eta" ? "selected" : ""}><input type="radio" name="model-view" checked={method === "eta"} onChange={() => setMethod("eta")} />KNN delivery time</label>
          </fieldset>
          {method === "eta" && (
            <div className="knn-inputs">
              <p className="field-note">Nearest-neighbor context</p>
              <div className="select-grid">
                <Select label="Route type" value={values.route} values={["suburban", "urban", "rural"]} onChange={(route) => setValues((old) => ({ ...old, route }))} />
                <Select label="Area type" value={values.area} values={["suburban", "urban", "rural"]} onChange={(area) => setValues((old) => ({ ...old, area }))} />
                <Select label="Time of day" value={values.time} values={["morning", "afternoon", "evening", "night"]} onChange={(time) => setValues((old) => ({ ...old, time }))} />
                <Select label="Parcel size" value={values.size} values={["small", "medium", "large"]} onChange={(size) => setValues((old) => ({ ...old, size }))} />
                <Select label="Traffic level" value={values.traffic} values={["low", "medium", "high"]} onChange={(traffic) => setValues((old) => ({ ...old, traffic }))} />
              </div>
            </div>
          )}
          {!valid && <ErrorMessage>Values must stay inside the ranges represented in the training data.</ErrorMessage>}
          <button className="button button-amber full-button" type="submit" disabled={!valid || loading}>
            {loading ? "Scoring records…" : "Update model prediction"} <ArrowUpRight size={14} />
          </button>
        </form>
        <div className="result-column">
          <article className="result-card prediction-result" aria-live="polite">
            {loading && !quote ? <LoadingState /> : quote ? (
              <>
                <div className="estimate-head"><div><SectionLabel>{method === "cost" ? "LINEAR REGRESSION / ESTIMATED COST" : "KNN / ESTIMATED DELIVERY TIME"}</SectionLabel><strong className="estimate-price">{method === "cost" ? money.format(quote.predicted_cost_php) : eta ? `${eta.predicted_delivery_time_min.toFixed(0)} min` : "—"}</strong></div><span className="confidence-pill">{method === "cost" ? `HOLDOUT MAPE ${quote.mape_pct.toFixed(2)}%` : `HOLDOUT MAE ±${eta?.holdout_mae_min.toFixed(2) ?? "—"} min`}</span></div>
                <div className="estimate-footer">{method === "cost" ? <><span><Clock3 size={14} />{etaPlanningRange} ETA planning range</span><span><Weight size={14} />{values.weight} kg</span><span>{values.stops} stops</span></> : <><span><Clock3 size={14} />{eta?.k ?? "—"} nearest shipments</span><span>Cost estimate {money.format(quote.predicted_cost_php)}</span><span>{values.distance} km</span></>}</div>
                <p className="small-explanation">{method === "cost" ? `Prediction from ${quote.algorithm.replaceAll("_", " ")} fitted on 2,400 shipment rows. The ETA planning range uses ±${eta?.holdout_mae_min.toFixed(2) ?? "—"} minutes holdout MAE, not a calibrated confidence interval.` : `KNN prediction uses ${eta?.k ?? "—"} comparable records. The displayed holdout MAE is measured on the delivery-time test split.`}</p>
              </>
            ) : <EmptyState label="COST PREDICTION" text="Enter the shipment profile to request a trained quote." />}
            <ErrorMessage>{error}</ErrorMessage>
          </article>
          {method === "eta" && <article className="neighbors-card">
            <div className="card-title"><div><SectionLabel>02 — NEAREST DELIVERY PROFILES</SectionLabel><h2>Similar historical shipments</h2></div><span className="small-tag">{eta ? `${eta.k} NEIGHBORS` : "KNN MODEL"}</span></div>
            {loading && !eta ? <LoadingState label="Finding nearest training records…" /> : eta ? (
              <div className="neighbor-plot">
                <ResponsiveContainer width="100%" height={230}>
                  <ScatterChart margin={{ top: 10, right: 12, bottom: 8, left: 0 }}>
                    <CartesianGrid stroke="#DFE4EA" strokeDasharray="3 4" />
                    <XAxis type="number" dataKey="x" name="Distance" unit=" km" tick={{ fontSize: 10, fill: "#626D7B" }} label={{ value: "Training distance (km)", position: "insideBottom", offset: -3, fontSize: 10, fill: "#626D7B" }} />
                    <YAxis type="number" dataKey="y" name="Delivery time" unit=" min" tick={{ fontSize: 10, fill: "#626D7B" }} />
                    <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ borderRadius: 0, borderColor: "#DFE4EA", fontSize: 11 }} />
                    <Scatter name="Nearest CSV records" data={eta.neighbors.map((item) => ({ x: item.distance_km, y: item.delivery_time_min, shipment: item.shipment_id }))} fill="#0B1F3A" />
                    <Scatter name="Predicted profile" data={[{ x: values.distance, y: eta.predicted_delivery_time_min, shipment: "This profile" }]} fill="#F5A623" />
                  </ScatterChart>
                </ResponsiveContainer>
                <div className="neighbor-list">{eta.neighbors.map((item) => <span key={item.shipment_id}><b>{item.shipment_id}</b>{item.distance_km.toFixed(1)} km · {item.delivery_time_min} min</span>)}</div>
              </div>
            ) : <EmptyState label="KNN NEIGHBORS" text="Similar shipment records appear here alongside the predicted ETA." />}
          </article>}
          <aside className="confidence-note"><span className="confidence-mark">±</span><p><b>Measured, not promised.</b><br />{method === "cost" ? "See the current held-out MAPE from the supplied data. The 5% service KPI remains a target unless the trained result reaches it." : `KNN's current held-out mean absolute error is ${eta?.holdout_mae_min.toFixed(2) ?? "—"} minutes.`}</p></aside>
        </div>
      </section>
    </>
  );
}

function Select({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) {
  return <label className="select-field">{label}<select value={value} onChange={(event) => onChange(event.target.value)}>{values.map((entry) => <option key={entry} value={entry}>{entry.replaceAll("_", " ")}</option>)}</select></label>;
}

function EmptyState({ label, text }: { label: string; text: string }) {
  return <div className="empty-state"><div className="empty-route"><i /><i /><i /></div><SectionLabel>{label}</SectionLabel><p>{text}</p></div>;
}
