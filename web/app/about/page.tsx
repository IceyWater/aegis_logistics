import { ArrowDownToLine, ArrowUpRight, BookOpenCheck, Database, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { PageIntro, SectionLabel } from "@/components/SectionHeading";

const datasets = [
  { file: "01_linear_regression_shipping_cost.csv", rows: "3,000", purpose: "Shipping-cost regression", fields: "distance_km · weight_kg · number_of_stops · fuel_price_php_per_liter · actual_shipping_cost_php" },
  { file: "02_knn_delivery_time.csv", rows: "3,000", purpose: "Delivery-time neighbors", fields: "route_type · area_type · time_of_day · parcel_size · distance_km · traffic_level · actual_delivery_time_min" },
  { file: "03_svm_late_delivery_risk.csv", rows: "3,500", purpose: "Late-delivery classification", fields: "weather_conditions · hub_load_pct · distance_km · driver_workload_stops · was_late" },
  { file: "04_decision_tree_first_attempt_failure.csv", rows: "3,000", purpose: "First-attempt failure rules", fields: "address_type · delivery_time_slot · day_type · previous_failed_deliveries · customer_responded · first_attempt_failed" },
  { file: "05_naive_bayes_customer_messages.csv", rows: "3,600", purpose: "Six-class ticket routing", fields: "message_text · category (six labeled classes)" },
  { file: "06_ann_daily_parcel_volume.csv", rows: "2,892", purpose: "Four-hub volume forecasting", fields: "date · hub · day_of_week · month · promotion_index · weather_severity · holiday_flag · lag features · parcel_volume" },
];

const models = [
  ["Linear regression / polynomial comparison", "Cost quote in Philippine pesos", "Distance · weight · stops · fuel price"],
  ["KNeighborsRegressor / tuned k", "Historical delivery-time analogues", "Route · area · time · size · traffic · distance"],
  ["Probability SVC / balanced classes", "Late-delivery probability", "Weather · hub load · distance · driver workload"],
  ["Depth-limited decision tree", "First-attempt failure prediction", "Address · time slot · day · prior attempts · customer response"],
  ["TF-IDF + Multinomial Naive Bayes", "Customer message triage", "Unigram/bigram terms · six labeled categories"],
  ["Keras neural network / one model", "Daily parcel-volume forecast", "Calendar · hub · promotions · weather · parcel lags"],
];

export default function AboutPage() {
  return (
    <>
      <PageIntro label="09 — ABOUT AEGIS" title="Predictability is" emphasis="a service.">
        Aegis Logistics is a fictional regional parcel carrier built around a practical promise: a useful price, a clear arrival estimate, and a response when the route changes.
      </PageIntro>
      <section className="story-panel">
        <div><SectionLabel>THE AEGIS PRINCIPLE</SectionLabel><h2>Make uncertainty<br />useful.</h2><Database className="story-icon" size={27} /></div>
        <div><p>Delivery reliability is not a single number. It is the combined work of pricing a journey honestly, learning from historical conditions, identifying likely first-attempt failures, and sending support requests to the right team.</p><p>This model lab puts those decisions in the open. Each predictor is trained from the CSV supplied for its task, each validation score is reported from a held-out split, and each form is wired to the same API used by the dashboard.</p><div className="story-signature">EVERY PARCEL HAS A PLAN<span>— AEGIS OPERATIONS</span></div></div>
      </section>
      <section className="guide-callout"><BookOpenCheck size={20} aria-hidden="true" /><div><SectionLabel>NEW / MODEL FIELD GUIDE</SectionLabel><h2>Understand each prediction before you use it.</h2><p>Walk through the six algorithms, the role each plays in delivery operations, and what every chart or badge on the live pages actually means.</p></div><Link className="button button-amber" href="/guide">Read the visual guide <ArrowUpRight size={14} /></Link></section>
      <section className="content-section dataset-section">
        <div className="section-heading"><div><SectionLabel>THE SIX PROVIDED DATASETS</SectionLabel><h2>Inspect the source of every prediction.</h2></div><p>These are the CSV files in <code>/data</code>. No synthetic replacement records are generated for model fitting.</p></div>
        <div className="dataset-table-wrap"><table className="dataset-table"><thead><tr><th>CSV FILE</th><th>ROWS</th><th>MODELING USE</th><th>FEATURES / TARGET</th><th>DATA</th></tr></thead><tbody>{datasets.map((dataset) => <tr key={dataset.file}><td><b>{dataset.file}</b></td><td>{dataset.rows}</td><td>{dataset.purpose}</td><td>{dataset.fields}</td><td><a className="download-link" href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/datasets/${dataset.file}`}><ArrowDownToLine size={13} /> CSV</a></td></tr>)}</tbody></table></div>
      </section>
      <section className="content-section model-table-section"><div className="section-heading"><div><SectionLabel>THE TRAINED MODEL SYSTEM</SectionLabel><h2>Algorithm → use → inputs.</h2></div></div><div className="model-table-wrap"><table className="dataset-table"><thead><tr><th>ALGORITHM</th><th>LOGISTICS USE</th><th>TRAINING FEATURES</th></tr></thead><tbody>{models.map(([algorithm, use, features]) => <tr key={algorithm}><td><b>{algorithm}</b></td><td>{use}</td><td>{features}</td></tr>)}</tbody></table></div></section>
      <section className="limitations"><SectionLabel><ShieldAlert size={13} /> MODEL LIMITATIONS / READ BEFORE USE</SectionLabel><h2>These models are real; production readiness is not implied.</h2><p>The saved models are genuinely trained on the six supplied files, and the dashboard reports measurable held-out performance. Those datasets are small snapshots, not a representative live fleet or independently audited operational history. KNN and regression predictions outside observed feature ranges are rejected; in-range predictions can still be wrong. Future volume forecasts recursively feed model predictions back into lag features and can accumulate error. Synthetic or provided historical patterns may not continue. Do not make customer, staffing, pricing, or safety decisions solely from this demo. Production use requires permissioned representative data, independent validation, privacy review, calibration, monitoring, and human oversight.</p></section>
    </>
  );
}
