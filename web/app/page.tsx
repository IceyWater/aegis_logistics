import { ArrowDown, ArrowUpRight, BookOpenCheck } from "lucide-react";
import Link from "next/link";
import { ModelExplorer } from "@/components/ModelExplorer";
import { NetworkMap } from "@/components/NetworkMap";
import { TrainedDecisionPath } from "@/components/TrainedDecisionPath";
import { SectionLabel } from "@/components/SectionHeading";

const targets = [
  { label: "ON-TIME ARRIVALS", before: "85%", sign: "→", after: "95%", caption: "85% baseline · 95% target", rising: true },
  { label: "FAILED FIRST DELIVERIES", before: "−", sign: "", after: "30%", caption: "Fewer repeat attempts", rising: false },
  { label: "QUOTE ACCURACY", before: "±", sign: "", after: "5%", caption: "Against actual shipping cost", rising: true },
  { label: "SUPPORT RESPONSE TIME", before: "−", sign: "", after: "40%", caption: "Faster first response", rising: false },
];

export default function HomePage() {
  return (
    <>
      <section className="hero-wrap">
        <div className="hero-copy">
          <p className="eyebrow"><span /> PREDICTABILITY, IN EVERY PARCEL</p>
          <h1>Predictable delivery,<br />down to the <em>kilometer.</em></h1>
          <p className="hero-sub">
            Every delivery is predictable — what it costs, when it arrives, and
            what to do if something goes wrong.
          </p>
          <div className="hero-actions">
            <Link className="button button-amber" href="/quote">Price a shipment <ArrowUpRight size={15} /></Link>
            <a className="text-link" href="#models">Explore the model system <ArrowDown size={14} /></a>
          </div>
          <div className="hero-meta"><i /><span>LIVE MODEL NETWORK</span><b /> FOUR HUBS · SIX TRAINED MODELS</div>
        </div>
        <NetworkMap />
      </section>
      <section className="kpi-band" aria-label="Operational service targets">
        <div className="kpi-intro">
          <SectionLabel>THE SERVICE STANDARD</SectionLabel>
          <p>Measured where it<br />matters: at the door.</p>
        </div>
        {targets.map((target) => (
          <div className="kpi-item" key={target.label}>
            <span className="kpi-label">{target.label}</span>
            <strong><span>{target.before}</span>{target.sign && <i>{target.sign}</i>}<span>{target.after}</span></strong>
            <span className="kpi-caption">{target.caption}</span>
            <div className={`slope-line${target.rising ? "" : " slope-short"}`}><span /></div>
          </div>
        ))}
      </section>
      <section className="content-section" id="models">
        <div className="section-heading">
          <div><SectionLabel>01 — MODEL INTELLIGENCE</SectionLabel><h2>Six trained models.<br />Answers you can act on.</h2></div>
          <div className="section-heading-aside"><p>Each model uses its own provided dataset. Select a model to explore its actual inputs, validation score, and live demo.</p><Link className="text-link" href="/guide">How to read each model <BookOpenCheck size={14} /></Link></div>
        </div>
        <ModelExplorer />
      </section>
      <section className="rule-feature">
        <div className="rule-intro">
          <SectionLabel>02 — THE FAILURE PATH</SectionLabel>
          <h2>Real rules from<br />real delivery records.</h2>
          <p>The decision tree learns first-attempt failure conditions from the supplied data. Every prediction returns the actual path through its fitted branches.</p>
          <Link className="button button-outline" href="/failure">Trace a delivery <ArrowUpRight size={14} /></Link>
        </div>
        <TrainedDecisionPath />
      </section>
    </>
  );
}
