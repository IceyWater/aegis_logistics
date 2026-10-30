"use client";

import { useState } from "react";
import { ArrowUpRight, MessageSquareText, Send } from "lucide-react";
import { ErrorMessage, LoadingState, PageIntro, SectionLabel } from "@/components/SectionHeading";
import { post } from "@/lib/api";

type Result = { predictions: { category: string; probability: number }[]; routed_department: string; response_time_improvement_pct: number };
const example = "Good day, the courier delivered a torn package and the item inside is unusable. I need help reporting this damage.";

export default function TriagePage() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function classify(event?: React.FormEvent) {
    event?.preventDefault();
    if (message.trim().length < 5) {
      setError("Enter at least 5 characters to classify a ticket.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setResult(await post<Result>("/api/triage", { message_text: message.trim() }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The ticket classifier could not run.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageIntro label="06 — CUSTOMER OPERATIONS" title="Get the message" emphasis="to the right desk.">
        A TF-IDF + Multinomial Naive Bayes model trained on 3,600 labeled customer messages — 600 for each support category.
      </PageIntro>
      <section className="tool-layout triage-layout">
        <form className="tool-card" onSubmit={classify}>
          <div className="tool-card-head"><SectionLabel>CUSTOMER MESSAGE / RAW TEXT</SectionLabel><span className="model-chip">N-GRAM NB</span></div>
          <label className="textarea-label" htmlFor="ticket-message">Paste a support message</label>
          <textarea id="ticket-message" rows={8} maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Example: My parcel has not arrived and the tracking page has not updated since yesterday…" />
          <div className="textarea-footer"><span>{message.length} / 2,000 characters · minimum 5</span><button type="button" className="text-link" onClick={() => { setMessage(example); setError(""); }}>Load a sample message <ArrowUpRight size={13} /></button></div>
          <ErrorMessage>{error}</ErrorMessage>
          <button type="submit" className="button button-amber full-button" disabled={loading}><Send size={14} />{loading ? "Scoring ticket language…" : "Classify & route message"}</button>
        </form>
        <div className="result-column">
          <article className="result-card triage-result" aria-live="polite">
            {loading ? <LoadingState label="Running trained text classifier…" /> : result ? (
              <>
                <div className="triage-heading"><div><SectionLabel>MOST LIKELY CATEGORY</SectionLabel><h2>{result.predictions[0]?.category.replaceAll("_", " ")}</h2></div><MessageSquareText size={21} /></div>
                <div className="prediction-list">{result.predictions.map((item, index) => <div className="prediction-item" key={item.category}><span>{String(index + 1).padStart(2, "0")} · {item.category.replaceAll("_", " ")}</span><b>{item.probability.toFixed(1)}%</b><div className="confidence-track"><i className={index === 0 ? "top-score" : ""} style={{ width: `${item.probability}%` }} /></div></div>)}</div>
                <div className="routing-footer"><span>ROUTED DEPARTMENT</span><b>{result.routed_department}</b></div>
                <p className="small-explanation">Confidence values are the saved MultinomialNB model’s predicted class probabilities.</p>
              </>
            ) : <EmptyState />}
          </article>
          <article className="response-card response-stat">
            <SectionLabel>OPERATIONS TARGET</SectionLabel><strong>−40<small>%</small></strong><h2>Faster first response</h2>
            <p>Correct intent routing reduces transfers and helps the team resolve the actual issue sooner.</p>
          </article>
        </div>
      </section>
    </>
  );
}

function EmptyState() {
  return <div className="empty-state"><div className="empty-route"><i /><i /><i /></div><SectionLabel>MODEL E / TICKET TRIAGE</SectionLabel><p>Paste a customer message to see its top three categories and assigned support desk.</p></div>;
}
