import { ArrowUpRight, BookOpenCheck } from "lucide-react";
import Link from "next/link";
import { ModelGuide } from "@/components/ModelGuide";
import { PageIntro, SectionLabel } from "@/components/SectionHeading";

export default function ModelGuidePage() {
  return (
    <>
      <PageIntro label="10 — MODEL FIELD GUIDE" title="What the models do." emphasis="How to read the screens.">
        A plain-language walkthrough of all six trained algorithms: who uses each one, what information it needs, what the interface displays, and how to interpret the result without treating it as a promise.
      </PageIntro>
      <section className="guide-context">
        <BookOpenCheck size={18} aria-hidden="true" />
        <p><b>Start with the model index.</b> Choose one algorithm at a time. The schematic explains the corresponding live page; values and bars in the drawing are illustrative, not model predictions.</p>
        <Link href="/analytics">Open the measured scorecard <ArrowUpRight size={14} /></Link>
      </section>
      <ModelGuide />
      <section className="guide-disclaimer">
        <SectionLabel>ONE IMPORTANT DISTINCTION</SectionLabel>
        <h2>A prediction supports a decision. It does not make the decision.</h2>
        <p>The CSVs are historical samples, the scores are held-out measurements, and several UI elements describe operating goals or planning assumptions. Aegis staff remain responsible for verifying a quote, reviewing a risk alert, contacting a customer, and making capacity decisions.</p>
      </section>
    </>
  );
}
