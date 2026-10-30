"use client";

import {
  ArrowDown,
  ArrowRight,
  Boxes,
  BrainCircuit,
  GitBranch,
  MessageSquareText,
  Network,
  Route,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";

const guides = [
  {
    id: "cost",
    number: "01",
    algorithm: "Linear regression",
    shortName: "Shipping cost",
    icon: Route,
    screen: "Quote · Linear cost",
    principle: "It learns a set of weights that best connects shipment details with recorded cost. For a new shipment, it combines the inputs using that fitted relationship to estimate a price.",
    customer: "A sender or merchant gets a PHP shipping estimate before deciding how to send a parcel.",
    company: "A pricing or service agent can compare a shipment profile with historical costs when preparing a quote.",
    inputs: ["Distance (km)", "Weight (kg)", "Stops", "Fuel price (PHP/L)"],
    output: "A predicted shipping cost in PHP. The quote screen also shows the model-wide holdout MAPE and a separate KNN delivery-time planning range.",
    readouts: [
      ["Estimated cost", "The model's price estimate for the values entered; it is not a booked or guaranteed charge."],
      ["Holdout MAPE", "Average percentage error on unseen evaluation rows. It summarizes the model, not the uncertainty of this particular quote."],
      ["ETA planning range", "KNN's delivery-time estimate plus/minus its holdout MAE. This is a planning aid, not a calibrated confidence interval."],
    ],
    caveat: "The cost model uses its selected regression pipeline. Degree-2 polynomial features are compared only when linear MAPE exceeds 5%. The cost KPI is a target, not a service guarantee.",
    metric: "3.808% holdout MAPE",
    visual: "cost",
  },
  {
    id: "eta",
    number: "02",
    algorithm: "K-nearest neighbors",
    shortName: "Delivery time",
    icon: Network,
    screen: "Quote · KNN delivery time",
    principle: "It finds historical shipments most like the one entered. Closer matches have more influence on the estimated delivery time than less similar matches.",
    customer: "A sender or recipient can review a delivery-time estimate based on comparable past shipments.",
    company: "A dispatcher or service agent can use similar routes and conditions as a reference when communicating an arrival estimate.",
    inputs: ["Route type", "Area type", "Time of day", "Parcel size", "Distance", "Traffic"],
    output: "A predicted delivery time in minutes and the nearest historical shipment records, displayed as scatter-plot points and a compact neighbor list.",
    readouts: [
      ["Predicted minutes", "The distance-weighted average of the selected nearest shipments' observed delivery times."],
      ["Neighbor dots", "Each dot is an actual historical record; the list identifies its shipment ID, route distance, and observed delivery time."],
      ["Holdout MAE", "The average absolute miss on the evaluation split. It is context for planning, not a per-shipment error bar."],
    ],
    caveat: "The best k is selected by cross-validation (k = 15 for this dataset). The model compares the encoded categories and scaled distance; it does not calculate an optimal route.",
    metric: "6.4776 minutes holdout MAE · k = 15",
    visual: "eta",
  },
  {
    id: "risk",
    number: "03",
    algorithm: "Support vector classifier",
    shortName: "Late-delivery risk",
    icon: ShieldAlert,
    screen: "Delay risk",
    principle: "It learns a boundary between on-time and late examples. Its probability score is compared with a threshold chosen on training-only validation folds to produce the displayed label.",
    customer: "A recipient could receive a proactive update if an operations team reviews a route as at risk; this demo does not send notifications.",
    company: "A dispatcher can use the risk score to decide whether to investigate capacity, consider another route, or prepare a customer update.",
    inputs: ["Weather", "Hub load (%)", "Distance (km)", "Driver workload (stops)"],
    output: "A late-delivery probability, an ON TIME / AT RISK label, and the three largest feature changes versus a neutral training profile.",
    readouts: [
      ["Probability gauge", "The fitted SVC's estimated late-class probability for the entered conditions."],
      ["Status badge", "The label compares the probability with the training-selected threshold (23.865%), not a 50/50 cutoff."],
      ["Contributing factors", "Each value is a one-feature-at-a-time comparison with the dataset's neutral profile. It is an illustration of model sensitivity, not causal evidence."],
    ],
    caveat: "Late deliveries are a minority class. On the held-out split, late recall was 0.500 and precision 0.355; an AT RISK alert can be wrong, and some late deliveries are missed. Review before acting.",
    metric: "Late-class F1 0.415 · ROC-AUC 0.742",
    visual: "risk",
  },
  {
    id: "failure",
    number: "04",
    algorithm: "Decision tree classifier",
    shortName: "First-attempt failure",
    icon: GitBranch,
    screen: "Failure rules",
    principle: "It asks a sequence of learned yes/no questions. Each answer chooses a branch; the final leaf contains the predicted class and its estimated failure probability.",
    customer: "A recipient does not use this internal rule trace directly. A delivery team might use a risk signal to double-check instructions or contact details.",
    company: "A delivery coordinator can inspect the exact learned branch path and decide whether a manual follow-up is appropriate.",
    inputs: ["Address type", "Delivery time slot", "Day type", "Prior failed deliveries", "Customer responded"],
    output: "A likely-fail / likely-succeed label, estimated failure probability, a priority label, and the actual branch conditions followed through the fitted tree.",
    readouts: [
      ["Probability and label", "The leaf's fitted class probability is compared with 50% to produce the displayed prediction."],
      ["Rule path", "Each step is a real split from the trained tree, in order, and shows which branch this input followed."],
      ["Priority", "HIGH / STANDARD is a UI label derived from that same 50% cutoff; it is not a separate, independently trained severity model."],
    ],
    caveat: "The tree is limited to depth 6 for readability. Its paths describe learned associations in the supplied records, not proof that a condition causes a failed delivery.",
    metric: "Depth 6 · holdout macro-F1 0.570",
    visual: "failure",
  },
  {
    id: "triage",
    number: "05",
    algorithm: "TF-IDF + Multinomial Naive Bayes",
    shortName: "Customer-message triage",
    icon: MessageSquareText,
    screen: "Ticket triage",
    principle: "It turns message words and two-word phrases into weighted signals, then estimates which support category best fits those signals. The model uses a simplifying assumption that text features contribute independently.",
    customer: "A customer writes a message in their own words; the tool suggests what kind of help they may need.",
    company: "A support agent can use the top category and suggested department to prioritize a review. The demo does not create a ticket or route it in a real support system.",
    inputs: ["Customer message text"],
    output: "The top three of six categories, their model probability bars, and the department associated with the highest-ranked category.",
    readouts: [
      ["Category bars", "The model's probability estimates for its three leading labels: damaged parcel, address problem, tracking request, missing parcel, reschedule request, or shipping fee."],
      ["Routed department", "A lookup maps the most likely category to a suggested team; no live queue is changed."],
      ["Response-time target", "The −40% figure is a stated operational goal, not a measured result of this text classifier."],
    ],
    caveat: "The model uses word-level TF-IDF unigrams and bigrams. Informal wording, mixed requests, new phrases, or messages outside the training examples can change its ranking; an agent should confirm intent.",
    metric: "Holdout macro-F1 1.000 on the supplied split",
    visual: "triage",
  },
  {
    id: "volume",
    number: "06",
    algorithm: "Keras feed-forward neural network",
    shortName: "Daily hub volume",
    icon: BrainCircuit,
    screen: "Volume forecast",
    principle: "It combines hub identity, calendar patterns, promotions, weather, and recent parcel counts through learned neural-network layers to estimate a volume for each future day.",
    customer: "Customers do not see a staffing forecast directly; the goal is to help the company plan capacity before a busy day.",
    company: "A hub or workforce planner can compare recent parcel counts with expected demand and review a courier-capacity suggestion.",
    inputs: ["Hub", "Forecast horizon", "Promotion level", "Weather assumption", "Calendar and historical volume lags"],
    output: "A daily forecast line, recent observed history, a shaded historical-error band, the peak forecast day, and couriers estimated at 150 parcels each.",
    readouts: [
      ["Navy history / amber forecast", "The history shows the latest 45 observed days; the amber line shows the selected 7-, 14-, or 30-day forecast."],
      ["Shaded band", "A ± 90th-percentile absolute holdout-error range. It is based on past residuals and is not a calibrated probabilistic interval."],
      ["Courier estimate", "Peak-day forecast divided by 150 parcels per courier and rounded up. This is a planning assumption, not a staffing instruction."],
    ],
    caveat: "The shared network was evaluated on Oct–Dec 2025 and forecasts forward from the dataset's final date. Future predictions recursively use earlier predictions as lag inputs, so error can accumulate.",
    metric: "Time holdout MAE 311.575 parcels · MAPE 9.99%",
    visual: "volume",
  },
];

export function ModelGuide() {
  const [selectedId, setSelectedId] = useState("cost");
  const selected = guides.find((guide) => guide.id === selectedId) ?? guides[0];
  const SelectedIcon = selected.icon;

  return (
    <div className="guide-layout">
      <nav className="guide-index" aria-label="Choose a model to explain">
        <p className="guide-index-label">MODEL INDEX / 06</p>
        {guides.map((guide) => {
          const Icon = guide.icon;
          return (
            <button
              className={`guide-index-item${selected.id === guide.id ? " active" : ""}`}
              key={guide.id}
              type="button"
              aria-pressed={selected.id === guide.id}
              onClick={() => setSelectedId(guide.id)}
            >
              <span>{guide.number}</span>
              <Icon size={16} aria-hidden="true" />
              <span className="guide-index-copy"><b>{guide.shortName}</b><small>{guide.algorithm}</small></span>
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          );
        })}
        <p className="guide-index-foot">Select any model. The walkthrough on the right updates to explain its inputs, screen, and operational use.</p>
      </nav>

      <article className="guide-article" aria-live="polite">
        <div className="guide-article-head">
          <div>
            <span className="section-label">MODEL {selected.number} / {selected.screen.toUpperCase()}</span>
            <h2>{selected.algorithm}</h2>
            <p>{selected.shortName} · {selected.metric}</p>
          </div>
          <span className="guide-model-icon"><SelectedIcon size={22} aria-hidden="true" /></span>
        </div>

        <ModelIllustration kind={selected.visual} />

        <section className="guide-section">
          <h3>How the algorithm thinks</h3>
          <p className="guide-principle">{selected.principle}</p>
        </section>

        <section className="guide-section">
          <h3>What goes in</h3>
          <div className="guide-input-chips">{selected.inputs.map((input) => <span key={input}>{input}</span>)}</div>
        </section>

        <section className="guide-section">
          <h3>Who uses it, and why</h3>
          <div className="guide-audience-grid">
            <div><span className="guide-card-label">CUSTOMER / SENDER</span><p>{selected.customer}</p></div>
            <div><span className="guide-card-label">AEGIS OPERATIONS</span><p>{selected.company}</p></div>
          </div>
        </section>

        <section className="guide-section">
          <h3>What the screen is telling you</h3>
          <p className="guide-output-intro">{selected.output}</p>
          <ol className="guide-readouts">
            {selected.readouts.map(([title, explanation], index) => (
              <li key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><b>{title}</b><p>{explanation}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <aside className="guide-caveat">
          <ShieldAlert size={17} aria-hidden="true" />
          <div><b>How to use the result responsibly</b><p>{selected.caveat}</p></div>
        </aside>
      </article>
    </div>
  );
}

function ModelIllustration({ kind }: { kind: string }) {
  return (
    <div className="guide-visual" aria-label="Schematic illustration of the model's screen output">
      <div className="guide-visual-top"><span>SCREEN MAP / CONCEPTUAL</span><span>SCHEMATIC — NOT A LIVE PREDICTION</span></div>
      <div className={`guide-visual-body guide-visual-${kind}`}>
        {kind === "cost" && <CostVisual />}
        {kind === "eta" && <EtaVisual />}
        {kind === "risk" && <RiskVisual />}
        {kind === "failure" && <FailureVisual />}
        {kind === "triage" && <TriageVisual />}
        {kind === "volume" && <VolumeVisual />}
      </div>
      <div className="guide-visual-flow">
        <span><b>01</b> Enter details</span><ArrowRight size={13} aria-hidden="true" />
        <span><b>02</b> Trained model</span><ArrowRight size={13} aria-hidden="true" />
        <span><b>03</b> Review output</span>
      </div>
    </div>
  );
}

function CostVisual() {
  return (
    <div className="visual-cost-grid">
      <div className="visual-inputs">
        {["Distance", "Weight", "Stops", "Fuel price"].map((item) => <span key={item}><small>{item}</small><i /></span>)}
      </div>
      <div className="visual-regression">
        <span>HISTORICAL COST PATTERN</span>
        <svg viewBox="0 0 280 112" role="img" aria-label="Schematic fitted regression line">
          <path d="M22 8V92H267" fill="none" stroke="currentColor" />
          <path d="M35 78L249 24" fill="none" stroke="currentColor" strokeWidth="2" />
          <g fill="currentColor"><circle cx="53" cy="69" r="3" /><circle cx="78" cy="75" r="3" /><circle cx="103" cy="53" r="3" /><circle cx="142" cy="62" r="3" /><circle cx="166" cy="43" r="3" /><circle cx="203" cy="37" r="3" /><circle cx="228" cy="30" r="3" /></g>
        </svg>
        <div className="visual-result"><small>PREDICTED SHIPPING COST</small><b>₱ estimate</b><span>Holdout MAPE is model-wide</span></div>
      </div>
    </div>
  );
}

function EtaVisual() {
  return (
    <div className="visual-neighbor-grid">
      <div className="visual-query"><Network size={17} /><div><b>Shipment profile</b><span>Route · area · time · size · traffic · distance</span></div></div>
      <div className="visual-neighbor-list">
        {["Nearest record", "Next closest", "Another match"].map((item, index) => <div key={item}><i>{index + 1}</i><span><b>{item}</b><small>Observed distance · delivery time</small></span><b className="visual-minutes">min</b></div>)}
      </div>
      <div className="visual-eta-result"><small>WEIGHTED NEIGHBOR ESTIMATE</small><b>ETA in minutes</b><span>Similar records are references, not guarantees</span></div>
    </div>
  );
}

function RiskVisual() {
  return (
    <div className="visual-risk-layout">
      <div className="visual-risk-gauge"><div className="visual-gauge-ring"><ShieldAlert size={24} /></div><small>LATE PROBABILITY</small><b>Probability %</b><span>Compare score to trained threshold</span></div>
      <div className="visual-risk-details"><span className="visual-risk-badge">AT RISK / ON TIME</span><b>Top model signals</b>{["Weather", "Hub load", "Driver workload"].map((item) => <div className="visual-factor" key={item}><span>{item}</span><i /></div>)}<small>Signals compare one input with a neutral profile</small></div>
    </div>
  );
}

function FailureVisual() {
  return (
    <div className="visual-tree">
      <div className="visual-tree-node"><small>FIRST SPLIT</small><b>Fitted tree condition</b></div>
      <div className="visual-tree-branches"><span>YES</span><span>NO</span></div>
      <div className="visual-tree-pair"><div className="visual-tree-node"><small>NEXT SPLIT</small><b>Follow the matching branch</b></div><div className="visual-tree-node visual-tree-muted"><small>OTHER BRANCH</small><b>Alternative rule path</b></div></div>
      <ArrowDown className="visual-tree-down" size={16} aria-hidden="true" />
      <div className="visual-tree-leaf"><GitBranch size={16} /><span><small>DECISION LEAF</small><b>Prediction + probability</b></span></div>
    </div>
  );
}

function TriageVisual() {
  return (
    <div className="visual-triage">
      <div className="visual-message"><MessageSquareText size={17} /><span>Customer's message, in their own words…</span></div>
      <div className="visual-categories">
        {["Most likely category", "Second suggestion", "Third suggestion"].map((item, index) => <div className="visual-category" key={item}><span><b>{String(index + 1).padStart(2, "0")}</b>{item}</span><i><em style={{ width: `${[78, 51, 30][index]}%` }} /></i></div>)}
      </div>
      <div className="visual-department"><Boxes size={16} /><span><small>SUGGESTED DEPARTMENT</small><b>Agent reviews routing suggestion</b></span></div>
    </div>
  );
}

function VolumeVisual() {
  return (
    <div className="visual-volume">
      <div className="visual-volume-head"><span>OBSERVED HISTORY</span><span>FORECAST</span><span>PEAK / STAFFING</span></div>
      <svg viewBox="0 0 620 190" role="img" aria-label="Schematic historical and forecast line chart">
        <path d="M15 165H605M15 125H605M15 85H605M15 45H605" fill="none" stroke="currentColor" strokeDasharray="3 5" />
        <path d="M20 121L67 105L112 113L158 72L203 90L250 61L296 87L340 49L381 72L417 54L454 72L487 45" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M487 45L523 60L558 36L597 52" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="7 6" />
        <path d="M487 25L523 39L558 16L597 32V73L558 58L523 80L487 65Z" fill="currentColor" opacity=".14" />
        <path d="M487 20V170" fill="none" stroke="currentColor" strokeDasharray="3 5" />
      </svg>
      <div className="visual-volume-foot"><span>Latest 45 observed days</span><span>7 / 14 / 30 day estimate</span><span>Peak ÷ 150 parcels per courier</span></div>
    </div>
  );
}
