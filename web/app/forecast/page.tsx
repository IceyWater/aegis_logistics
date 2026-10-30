"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Users } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ErrorMessage, LoadingState, PageIntro, SectionLabel } from "@/components/SectionHeading";
import { post } from "@/lib/api";

type VolumePoint = { date: string; volume: number; lower?: number; upper?: number };
type Result = { hub: string; horizon_days: number; history: VolumePoint[]; forecast: VolumePoint[]; peak_day: string; peak_volume: number; recommended_couriers: number; confidence_interval_abs_error_90th: number };
const hubs = ["North Hub", "South Hub", "East Hub", "West Hub"];
const weatherOptions = ["clear", "cloudy", "light_rain", "heavy_rain", "storm"];

export default function ForecastPage() {
  const [hub, setHub] = useState("North Hub");
  const [horizon, setHorizon] = useState(14);
  const [promotion, setPromotion] = useState(0.25);
  const [weather, setWeather] = useState("clear");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setResult(await post<Result>("/api/forecast", {
        hub,
        horizon_days: horizon,
        promotion_level: promotion,
        weather_assumption: weather,
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The volume forecast could not run.");
    } finally {
      setLoading(false);
    }
  }, [hub, horizon, promotion, weather]);

  useEffect(() => {
    const timer = window.setTimeout(() => void run(), 180);
    return () => window.clearTimeout(timer);
  }, [run]);

  const chartData = result ? [
    ...result.history.map((item) => ({ ...item, date: displayDate(item.date), observed: item.volume, forecast: undefined as number | undefined, interval: undefined as [number, number] | undefined })),
    ...result.forecast.map((item) => ({ ...item, date: displayDate(item.date), observed: undefined as number | undefined, forecast: item.volume, interval: [item.lower ?? item.volume, item.upper ?? item.volume] as [number, number] })),
  ] : [];
  const chartDataConnected = result
    ? chartData.map((item, index) => index === result.history.length - 1
      ? { ...item, forecast: result.forecast[0]?.volume, interval: [result.forecast[0]?.lower ?? 0, result.forecast[0]?.upper ?? 0] as [number, number] }
      : item)
    : [];

  return (
    <>
      <PageIntro label="07 — CAPACITY PLANNING" title="Forecast the next" emphasis="busy day.">
        One Keras network learns across four hubs. It was validated on the final 91 days of the supplied time series; future estimates recursively use model-generated lag features.
      </PageIntro>
      <section className="forecast-controls">
        <label className="select-field">Hub<select value={hub} onChange={(event) => setHub(event.target.value)}>{hubs.map((item) => <option key={item}>{item}</option>)}</select></label>
        <fieldset className="horizon-toggle"><legend>Forecast horizon</legend>{[7, 14, 30].map((days) => <label className={horizon === days ? "selected" : ""} key={days}><input type="radio" name="horizon" checked={horizon === days} onChange={() => setHorizon(days)} />{days} days</label>)}</fieldset>
        <label className="range-field promotion-field"><span className="range-heading"><span>Promotion index</span><b>{promotion.toFixed(2)}</b></span><input aria-label="Promotion index" type="range" min="0" max="1" step="0.05" value={promotion} onChange={(event) => setPromotion(Number(event.target.value))} /><span className="range-limits"><span>0 · none</span><span>1 · maximum</span></span></label>
        <label className="select-field weather-field">Weather assumption<select value={weather} onChange={(event) => setWeather(event.target.value)}>{weatherOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
      </section>
      <section className="forecast-chart-card">
        <div className="card-title"><div><SectionLabel>06 — DAILY PARCEL VOLUME / HISTORICAL + FORECAST</SectionLabel><h2>{hub} · next {horizon} days</h2></div><span className="model-chip">KERAS · AUTOREGRESSIVE</span></div>
        <div className="volume-chart" role="img" aria-label={`Observed daily parcel volume and ${horizon}-day trained forecast for ${hub}`}>
          {loading && !result ? <LoadingState label="Forecasting from trained network…" /> : result ? (
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={chartDataConnected} margin={{ top: 16, right: 16, bottom: 8, left: 3 }}>
                <CartesianGrid stroke="#DFE4EA" strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#626D7B" }} interval={Math.ceil(chartDataConnected.length / 9)} minTickGap={18} />
                <YAxis tick={{ fontSize: 9, fill: "#626D7B" }} width={52} />
                <Tooltip contentStyle={{ borderRadius: 0, borderColor: "#DFE4EA", fontSize: 11 }} />
                <ReferenceLine x={displayDate(result.forecast[0]?.date ?? "")} stroke="#626D7B" strokeDasharray="3 4" label={{ value: "FORECAST START", position: "insideTopRight", fontSize: 9, fill: "#626D7B" }} />
                <Area type="monotone" dataKey="interval" stroke="none" fill="#F5A623" fillOpacity={0.17} name="90% absolute-error band" />
                <Line type="monotone" dataKey="observed" name="Observed CSV volume" stroke="#0B1F3A" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="forecast" name="ANN forecast" stroke="#F5A623" strokeWidth={2.5} strokeDasharray="6 5" dot={{ r: 2, fill: "#F5A623" }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><SectionLabel>VOLUME FORECAST</SectionLabel><p>Choose a hub to see observed CSV volumes and the trained network forecast.</p></div>}
        </div>
        <div className="chart-legend"><span><i className="legend-line navy-line" />ACTUAL CSV VOLUME</span><span><i className="legend-line amber-line" />KERAS FORECAST</span><span><i className="legend-band" />90% HOLDOUT ERROR RANGE</span></div>
        <ErrorMessage>{error}</ErrorMessage>
      </section>
      {result && <section className="staffing-insight"><div className="staffing-mark"><Users size={19} /></div><div><SectionLabel>STAFFING INSIGHT / {result.peak_day}</SectionLabel><h2>Peak estimate: {result.peak_volume.toLocaleString()} parcels · <strong>{result.recommended_couriers} couriers recommended</strong></h2><p>Capacity assumption: 150 parcels per courier. The amber band is based on the 90th percentile absolute error from the time-based holdout.</p></div><span className="peak-arrow"><ArrowUpRight size={17} /></span></section>}
    </>
  );
}

function displayDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString("en", { month: "short", day: "numeric" });
}
