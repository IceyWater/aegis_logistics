"use client";

import { useCallback, useState } from "react";
import { ArrowRight, GitBranch, TriangleAlert } from "lucide-react";
import { ErrorMessage, LoadingState, PageIntro, SectionLabel } from "@/components/SectionHeading";
import { post } from "@/lib/api";

type FailureResult = { prediction: string; probability: number; priority: string; rule_path: { step: number; condition: string; branch: string }[] };

export default function FailurePage() {
  const [values, setValues] = useState({ address_type: "apartment", delivery_time_slot: "evening", day_type: "weekday", previous_failed_deliveries: 0, customer_responded: 1 });
  const [result, setResult] = useState<FailureResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const predict = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setResult(await post<FailureResult>("/api/failure", values));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The decision tree could not run.");
    } finally {
      setLoading(false);
    }
  }, [values]);

  return (
    <>
      <PageIntro label="05 — FIRST-ATTEMPT SUCCESS" title="Follow the branch." emphasis="See the actual rule.">
        A depth-limited decision tree trained on 3,000 delivery outcomes. The stepper below is read from the exact branch this shipment follows.
      </PageIntro>
      <section className="tool-layout failure-layout">
        <form className="tool-card" onSubmit={(event) => { event.preventDefault(); void predict(); }}>
          <div className="tool-card-head"><SectionLabel>DELIVERY PROFILE</SectionLabel><span className="model-chip">TREE DEPTH ≤ 6</span></div>
          <Select label="Address type" value={values.address_type} values={["house", "office", "apartment", "commercial"]} onChange={(address_type) => setValues((old) => ({ ...old, address_type }))} />
          <Select label="Delivery time slot" value={values.delivery_time_slot} values={["morning", "afternoon", "evening"]} onChange={(delivery_time_slot) => setValues((old) => ({ ...old, delivery_time_slot }))} />
          <Select label="Day type" value={values.day_type} values={["weekday", "weekend"]} onChange={(day_type) => setValues((old) => ({ ...old, day_type }))} />
          <label className="select-field">Previous failed deliveries<select value={values.previous_failed_deliveries} onChange={(event) => setValues((old) => ({ ...old, previous_failed_deliveries: Number(event.target.value) }))}>{[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
          <label className="select-field">Customer responded<select value={values.customer_responded} onChange={(event) => setValues((old) => ({ ...old, customer_responded: Number(event.target.value) }))}><option value={1}>Yes</option><option value={0}>No</option></select></label>
          <button type="submit" className="button button-amber full-button" disabled={loading}><GitBranch size={15} />{loading ? "Walking tree…" : "Trace the fitted decision tree"}</button>
        </form>
        <article className="rule-result" aria-live="polite">
          <div className="rule-result-head"><div><SectionLabel>MODEL D / ACTUAL DECISION PATH</SectionLabel><h2>First delivery attempt</h2></div><span className="model-chip">TRAINED CLASSIFIER</span></div>
          {loading && !result ? <LoadingState label="Following learned tree branches…" /> : result ? (
            <>
              <div className="failure-prediction"><div><span>FAILURE PROBABILITY</span><strong>{result.probability.toFixed(1)}%</strong></div><div className={`failure-badge${result.priority === "HIGH PRIORITY" ? " at-risk" : ""}`}><TriangleAlert size={14} />{result.prediction}</div></div>
              <div className="rule-stepper">
                {result.rule_path.map((step, index) => <div className="tree-step" key={`${step.step}-${step.condition}`}><span className="tree-step-number">{String(step.step).padStart(2, "0")}</span><div><small>{index === 0 ? "ROOT CONDITION" : "TREE BRANCH"}</small><strong>{step.condition}</strong><span>Branch taken: {step.branch}</span></div><ArrowRight size={14} /></div>)}
                <div className="tree-leaf"><SectionLabel>DECISION LEAF</SectionLabel><strong>{result.prediction}</strong><span>{result.priority} · {result.probability.toFixed(1)}% fitted probability</span></div>
              </div>
              <p className="small-explanation">Rules, branch order, and leaf probability are produced by the saved scikit-learn tree, not hand-written sample rules.</p>
            </>
          ) : <EmptyState />}
          <ErrorMessage>{error}</ErrorMessage>
        </article>
      </section>
    </>
  );
}

function Select({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) {
  return <label className="select-field">{label}<select value={value} onChange={(event) => onChange(event.target.value)}>{values.map((entry) => <option key={entry}>{entry}</option>)}</select></label>;
}

function EmptyState() {
  return <div className="empty-state"><div className="empty-route"><i /><i /><i /></div><SectionLabel>ACTUAL TREE PATH</SectionLabel><p>Set delivery conditions, then inspect each learned split and the final leaf.</p></div>;
}
