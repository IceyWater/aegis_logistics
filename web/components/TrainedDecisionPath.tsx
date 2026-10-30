"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ErrorMessage, LoadingState } from "@/components/SectionHeading";

type FailureExample = {
  input: Record<string, string | number>;
  prediction: string;
  probability: number;
  priority: string;
  rule_path: { step: number; condition: string; branch: string }[];
};

export function TrainedDecisionPath() {
  const [example, setExample] = useState<FailureExample | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<FailureExample>("/api/failure/example")
      .then(setExample)
      .catch((reason: Error) => setError(reason.message));
  }, []);

  return (
    <div className="decision-path" aria-live="polite">
      <span className="path-caption">ACTUAL CLASSIFIER / SOURCE CSV EXAMPLE</span>
      {example ? (
        <>
          <div className="path-inputs">
            {Object.entries(example.input).map(([field, value]) => (
              <span key={field}><small>{field.replaceAll("_", " ")}</small><b>{value}</b></span>
            ))}
          </div>
          {example.rule_path.map((step) => (
            <div className="path-step" key={step.step}>
              <span>{String(step.step).padStart(2, "0")}</span>
              <div><small>BRANCH {step.branch.toUpperCase()}</small><strong>{step.condition}</strong></div>
              {step.step < example.rule_path.length && <b aria-hidden="true">↓</b>}
            </div>
          ))}
          <div className="path-result">
            <span>FITTED TREE OUTPUT / {example.priority}</span>
            <strong>{example.prediction}</strong>
            <small>Failure probability {example.probability}% · path for a real training-record input</small>
          </div>
        </>
      ) : error ? (
        <ErrorMessage>{error}</ErrorMessage>
      ) : (
        <LoadingState label="Loading a fitted decision path…" />
      )}
    </div>
  );
}
