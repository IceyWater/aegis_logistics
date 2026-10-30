<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="description"
        content="Aegis Logistics makes every delivery predictable — cost, arrival, and what to do next.">
    <title>Aegis Logistics — Predictable by design</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
        rel="stylesheet">
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>

<body data-page="{{ trim(request()->path(), '/') ?: 'home' }}">
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="topbar">
        <a class="brand" href="/" aria-label="Aegis Logistics home" data-route="/">
            <span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32">
                    <path d="M16 3 27 8v8c0 7-4.7 11.3-11 14C9.7 27.3 5 23 5 16V8l11-5Z" />
                    <path d="m11 16 3.2 3.2L21.5 12" />
                </svg></span>
            <span class="brand-name">AEGIS<span>LOGISTICS</span></span>
        </a>
        <button class="mobile-menu" type="button" aria-label="Open navigation" aria-expanded="false"
            aria-controls="primary-nav"><span></span><span></span></button>
        <nav class="nav-links" id="primary-nav" aria-label="Primary navigation">
            <a href="/" data-route="/">Overview</a>
            <a href="/quote" data-route="/quote">Quote</a>
            <a href="/risk" data-route="/risk">Risk</a>
            <a href="/triage" data-route="/triage">Triage</a>
            <a href="/forecast" data-route="/forecast">Forecast</a>
            <a href="/analytics" data-route="/analytics">Analytics</a>
            <a href="/about" data-route="/about">About</a>
        </nav>
        <div class="nav-status"><i></i><span>NETWORK LIVE</span><b>●</b></div>
    </header>

    <main id="main">
        <section class="page-view" id="page-home" data-page-view="home">
            <div class="hero-wrap">
                <div class="hero-copy">
                    <p class="eyebrow"><span class="eyebrow-line"></span> LAST-MILE, WITH A LONG VIEW</p>
                    <h1>Predictable delivery,<br>down to the <em>kilometer.</em></h1>
                    <p class="hero-sub">Every delivery is predictable — what it costs, when it arrives, and what to do
                        if something goes wrong.</p>
                    <div class="hero-actions"><a class="button button-amber" href="/quote" data-route="/quote">Price a
                            shipment <span aria-hidden="true">↗</span></a><a class="text-link" href="#models">See how
                            the models work <span aria-hidden="true">↓</span></a></div>
                    <div class="hero-meta"><span class="live-pulse"></span><span>LIVE OPERATIONS</span><span
                            class="meta-divider"></span><span id="live-clock">--:--:--</span><span
                            class="meta-divider"></span><span>3 HUBS · 1 NETWORK</span></div>
                </div>
                <div class="network-panel" aria-label="Live network map showing three hubs and active parcel routes">
                    <div class="network-head">
                        <div><span class="panel-label">NETWORK / REGION 04</span><strong>Route intelligence</strong>
                        </div><span class="live-tag"><i></i>LIVE SIMULATION</span>
                    </div>
                    <svg class="network-map" viewBox="0 0 600 360" role="img"
                        aria-label="Animated parcel routes between Northline, Riverside, and Eastgate hubs">
                        <defs>
                            <pattern id="map-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                                <path d="M32 0H0V32" fill="none" stroke="currentColor" stroke-width=".6" />
                            </pattern>
                        </defs>
                        <rect width="600" height="360" fill="url(#map-grid)" opacity=".48" />
                        <g class="map-contours">
                            <path
                                d="M23 209c55-52 76-31 116-72s72-71 113-61 44 44 95 37 75-45 124-18 62 45 111 33M14 250c73-30 81-8 143-44s70-59 110-50 67 35 103 21 72-44 111-29 65 33 110 15M21 104c54 26 76 20 110-7s86-44 122-17 61 51 96 46 58-34 106-20 64 29 115 6"
                                fill="none" stroke="currentColor" stroke-width="1" />
                        </g>
                        <g id="map-routes"></g>
                        <g id="map-packets"></g>
                        <g id="map-hubs"></g>
                    </svg>
                    <div class="network-legend"><span><i class="legend-dot navy-dot"></i>ACTIVE ROUTE</span><span><i
                                class="legend-dot amber-dot"></i>REVIEW REQUIRED</span><span class="map-scale">REGION
                            04 / 118 KM</span></div>
                    <div class="network-ticker"><span class="ticker-title">IN TRANSIT</span>
                        <div id="shipment-ticker" aria-live="polite"><span>Loading route activity…</span></div>
                    </div>
                </div>
            </div>
            <div class="kpi-band" aria-label="Operational improvement targets">
                <div class="kpi-intro"><span class="section-label">THE SERVICE STANDARD</span>
                    <p>Measured where it<br>matters: at the door.</p>
                </div>
                <div class="kpi-item"><span class="kpi-label">ON-TIME ARRIVALS</span><strong><span
                            data-count="85">85</span><small>%</small><i>→</i><span
                            data-count="95">95</span><small>%</small></strong><span class="kpi-caption">85% baseline
                        <b>·</b> 95% target</span>
                    <div class="slope-line"><span></span></div>
                </div>
                <div class="kpi-item"><span class="kpi-label">FAILED FIRST DELIVERIES</span><strong><i>−</i><span
                            data-count="30">30</span><small>%</small></strong><span class="kpi-caption">Fewer repeat
                        attempts</span>
                    <div class="slope-line slope-short"><span></span></div>
                </div>
                <div class="kpi-item"><span class="kpi-label">QUOTE ACCURACY</span><strong><i>±</i><span
                            data-count="5">5</span><small>%</small></strong><span class="kpi-caption">Against actual
                        shipping cost</span>
                    <div class="slope-line"><span></span></div>
                </div>
                <div class="kpi-item"><span class="kpi-label">RESPONSE TIME</span><strong><i>−</i><span
                            data-count="40">40</span><small>%</small></strong><span class="kpi-caption">Faster, more
                        relevant support</span>
                    <div class="slope-line slope-short"><span></span></div>
                </div>
            </div>
            <section class="content-section model-section" id="models">
                <div class="section-heading">
                    <div><span class="section-label">01 — COST INTELLIGENCE</span>
                        <h2>Six models. One clear answer.</h2>
                    </div>
                    <p>Every prediction has a job, an input, and a next step. Select a model to see what it does.</p>
                </div>
                <div class="model-explorer">
                    <div class="model-rail" role="tablist" aria-label="Logistics models">
                        <button class="model-node active" type="button" role="tab" aria-selected="true"
                            data-model="regression"><span>01</span><b>Linear regression</b><small>Cost +
                                ETA</small></button>
                        <button class="model-node" type="button" role="tab" aria-selected="false"
                            data-model="knn"><span>02</span><b>K-nearest neighbors</b><small>Comparable
                                quotes</small></button>
                        <button class="model-node" type="button" role="tab" aria-selected="false"
                            data-model="svm"><span>03</span><b>Support vector machine</b><small>Delay
                                risk</small></button>
                        <button class="model-node" type="button" role="tab" aria-selected="false"
                            data-model="tree"><span>04</span><b>Decision tree</b><small>Failure
                                handling</small></button>
                        <button class="model-node" type="button" role="tab" aria-selected="false"
                            data-model="bayes"><span>05</span><b>Naive Bayes</b><small>Ticket triage</small></button>
                        <button class="model-node" type="button" role="tab" aria-selected="false"
                            data-model="neural"><span>06</span><b>Neural network</b><small>Hub
                                forecasting</small></button>
                    </div>
                    <div class="model-detail" role="tabpanel" id="model-detail"><span class="model-index">MODEL 01 /
                            REGRESSION</span>
                        <h3>A quote built from the route up.</h3>
                        <p>Distance, parcel weight and delivery stops become a cost estimate and an arrival window. No
                            opaque multiplier, just measurable inputs.</p>
                        <div class="model-io">
                            <div><span>INPUTS</span><b>Distance · Weight · Stops</b></div>
                            <div><span>OUTPUT</span><b>Price · ETA range</b></div>
                            <div><span>VALIDATION</span><b>±5% target accuracy</b></div>
                        </div><a class="text-link" href="/quote" data-route="/quote">Try the estimator <span
                                aria-hidden="true">↗</span></a>
                    </div>
                    <div class="model-schematic" aria-hidden="true"><svg viewBox="0 0 220 170">
                            <path d="M30 28h70m-70 57h70m-70 57h70M100 28l38 57-38 57m38-57h51" fill="none"
                                stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 4" />
                            <circle cx="30" cy="28" r="6" />
                            <circle cx="30" cy="85" r="6" />
                            <circle cx="30" cy="142" r="6" />
                            <circle cx="138" cy="85" r="9" />
                            <rect x="178" y="73" width="16" height="24" rx="3" />
                        </svg><span>FEATURES → MODEL → DECISION</span></div>
                </div>
            </section>
            <section class="rule-feature">
                <div class="rule-intro"><span class="section-label">02 — DECISION TRACE</span>
                    <h2>Risk is a route,<br>not a black box.</h2>
                    <p>When a delivery needs attention, the decision tree shows its work. Each condition leads to a
                        clear handling priority.</p><a class="button button-outline" href="/risk"
                        data-route="/risk">Check a route <span aria-hidden="true">↗</span></a>
                </div>
                <div class="decision-path"><span class="path-caption">FAILURE HANDLING / EXAMPLE PATH</span>
                    <div class="path-step"><span class="path-number">01</span>
                        <div><small>WEATHER SIGNAL</small><strong>Rain detected</strong></div><span
                            class="path-connector">↓</span>
                    </div>
                    <div class="path-step"><span class="path-number">02</span>
                        <div><small>HUB CAPACITY</small><strong>Hub load = high</strong></div><span
                            class="path-connector">↓</span>
                    </div>
                    <div class="path-step"><span class="path-number">03</span>
                        <div><small>ROUTE DISTANCE</small><strong>Distance &gt; 250 km</strong></div><span
                            class="path-connector">↓</span>
                    </div>
                    <div class="path-result"><span>HANDLING PRIORITY</span><strong>HIGH PRIORITY</strong><small>Reroute
                            · Notify customer · Protect the promise</small></div>
                </div>
            </section>
        </section>

        <section class="page-view" id="page-quote" data-page-view="quote" hidden>
            <div class="page-intro"><span class="section-label">03 — COST & ETA</span>
                <h1>Know the number<br>before the <em>handoff.</em></h1>
                <p>One route, two ways to price it. Compare a fitted estimate against five real-like neighbors.</p>
            </div>
            <div class="tool-layout">
                <form class="tool-card" id="quote-form" novalidate>
                    <div class="tool-card-head"><span class="section-label">SHIPMENT PROFILE</span><span
                            class="model-chip">LIVE MODEL</span></div>
                    <div class="field-range">
                        <div class="field-head"><label for="distance">Distance</label>
                            <div class="number-wrap"><input type="number" id="distance-number" min="1"
                                    max="500" value="128" aria-label="Distance in kilometers"><span>km</span>
                            </div>
                        </div><input type="range" id="distance" min="1" max="500" value="128">
                        <div class="range-ends"><span>1 km</span><span>500 km</span></div>
                    </div>
                    <div class="field-range">
                        <div class="field-head"><label for="weight">Parcel weight</label>
                            <div class="number-wrap"><input type="number" id="weight-number" min="0.1"
                                    max="50" step="0.1" value="4.5"
                                    aria-label="Parcel weight in kilograms"><span>kg</span></div>
                        </div><input type="range" id="weight" min="0.1" max="50" step="0.1"
                            value="4.5">
                        <div class="range-ends"><span>0.1 kg</span><span>50 kg</span></div>
                    </div>
                    <div class="field-range">
                        <div class="field-head"><label for="stops">Delivery stops</label>
                            <div class="number-wrap"><input type="number" id="stops-number" min="1"
                                    max="12" value="3"
                                    aria-label="Number of delivery stops"><span>stops</span></div>
                        </div><input type="range" id="stops" min="1" max="12" value="3">
                        <div class="range-ends"><span>1 stop</span><span>12 stops</span></div>
                    </div>
                    <fieldset class="model-toggle">
                        <legend>Pricing method</legend><label><input type="radio" name="quote-model"
                                value="regression" checked><span>Linear regression</span></label><label><input
                                type="radio" name="quote-model" value="knn"><span>KNN neighbors</span></label>
                    </fieldset>
                    <p class="form-error" id="quote-error" aria-live="polite"></p><button type="submit"
                        class="button button-amber full-button">Calculate estimate <span
                            aria-hidden="true">↗</span></button>
                </form>
                <div class="result-column">
                    <article class="result-card" id="quote-result" aria-live="polite">
                        <div class="empty-state">
                            <div class="empty-route" aria-hidden="true"><span></span><span></span><span></span></div>
                            <span class="section-label">ESTIMATE READY WHEN YOU ARE</span>
                            <p>Enter shipment details to get a quote.</p>
                        </div>
                    </article>
                    <article class="neighbors-card">
                        <div class="card-title">
                            <div><span class="section-label">COMPARABLE SHIPMENTS</span>
                                <h2>Nearest neighbors</h2>
                            </div><span class="small-tag" id="neighbor-count">5 MATCHES</span>
                        </div>
                        <div id="neighbor-chart" class="neighbor-chart">
                            <p class="empty-note">Switch to KNN to see five comparable shipments plotted by distance
                                and weight.</p>
                        </div>
                        <div class="chart-legend"><span><i class="legend-dot navy-dot"></i>SIMILAR
                                SHIPMENTS</span><span><i class="legend-dot amber-dot"></i>YOUR SHIPMENT</span></div>
                    </article>
                    <div class="confidence-note"><span class="confidence-mark">±</span>
                        <p><b>Quote accuracy target: within 5%.</b><br>Estimates are trained against synthetic route
                            history.</p>
                    </div>
                </div>
            </div>
        </section>

        <section class="page-view" id="page-risk" data-page-view="risk" hidden>
            <div class="page-intro"><span class="section-label">04 — SERVICE RELIABILITY</span>
                <h1>See the risk.<br>Choose the <em>response.</em></h1>
                <p>Weather, hub capacity and distance shape whether a parcel arrives on time — and what we do next.</p>
            </div>
            <div class="tool-layout">
                <form class="tool-card" id="risk-form" novalidate>
                    <div class="tool-card-head"><span class="section-label">ROUTE CONDITIONS</span><span
                            class="model-chip">LINEAR SVM</span></div><label class="select-field"
                        for="weather">Weather outlook<select id="weather">
                            <option value="clear">Clear</option>
                            <option value="rain">Rain</option>
                            <option value="storm">Storm</option>
                        </select></label><label class="select-field" for="hub-load">Hub capacity<select
                            id="hub-load">
                            <option value="low">Low — capacity available</option>
                            <option value="medium" selected>Medium — normal flow</option>
                            <option value="high">High — near capacity</option>
                        </select></label>
                    <div class="field-range">
                        <div class="field-head"><label for="risk-distance">Route distance</label>
                            <div class="number-wrap"><input type="number" id="risk-distance-number" min="1"
                                    max="500" value="312"
                                    aria-label="Risk route distance in kilometers"><span>km</span></div>
                        </div><input type="range" id="risk-distance" min="1" max="500"
                            value="312">
                        <div class="range-ends"><span>1 km</span><span>500 km</span></div>
                    </div>
                    <p class="form-error" id="risk-error" aria-live="polite"></p><button type="submit"
                        class="button button-amber full-button">Check delivery risk <span
                            aria-hidden="true">↗</span></button>
                </form>
                <div class="result-column">
                    <article class="risk-result" id="risk-result" aria-live="polite">
                        <div class="empty-state">
                            <div class="empty-route" aria-hidden="true"><span></span><span></span><span></span></div>
                            <span class="section-label">ROUTE CHECK</span>
                            <p>Choose the conditions to see the delivery outlook.</p>
                        </div>
                    </article>
                    <article class="response-card"><span class="section-label">IF CONDITIONS CHANGE</span>
                        <h2>What we do about it</h2>
                        <div class="response-options">
                            <div><span class="response-icon">↗</span>
                                <p><b>Reroute</b><small>Reserve an alternate path before a delay compounds.</small></p>
                            </div>
                            <div><span class="response-icon">→</span>
                                <p><b>Notify</b><small>Share a clear, updated delivery window with the customer.</small>
                                </p>
                            </div>
                        </div>
                    </article>
                </div>
            </div>
        </section>

        <section class="page-view" id="page-triage" data-page-view="triage" hidden>
            <div class="page-intro"><span class="section-label">05 — SUPPORT INTELLIGENCE</span>
                <h1>Every message,<br>to the <em>right desk.</em></h1>
                <p>Paste a customer message. The model finds the likely issue, routes the team, and gets the
                    conversation moving.</p>
            </div>
            <div class="tool-layout triage-layout">
                <form class="tool-card" id="triage-form" novalidate>
                    <div class="tool-card-head"><span class="section-label">CUSTOMER MESSAGE</span><span
                            class="model-chip">MULTINOMIAL NB</span></div><label class="textarea-label"
                        for="ticket-message">What did the customer say?</label>
                    <textarea id="ticket-message" rows="7" maxlength="2000"
                        placeholder="Example: My parcel has not arrived and the tracking has not updated since yesterday…"></textarea>
                    <div class="textarea-footer"><span id="char-count">0 / 2000</span><button class="text-link"
                            id="sample-ticket" type="button">Use an example <span
                                aria-hidden="true">↗</span></button></div>
                    <p class="form-error" id="triage-error" aria-live="polite"></p><button type="submit"
                        class="button button-amber full-button">Route this message <span
                            aria-hidden="true">↗</span></button>
                </form>
                <div class="result-column">
                    <article class="result-card" id="triage-result" aria-live="polite">
                        <div class="empty-state">
                            <div class="empty-route" aria-hidden="true"><span></span><span></span><span></span></div>
                            <span class="section-label">TRIAGE RESULT</span>
                            <p>Paste a message to see the most likely support route.</p>
                        </div>
                    </article>
                    <article class="response-card response-stat"><span class="section-label">THE CUSTOMER
                            PROMISE</span><strong>−40<small>%</small></strong>
                        <h2>Faster first response</h2>
                        <p>Clear intent means less time in the wrong queue and more time solving the actual problem.</p>
                    </article>
                </div>
            </div>
        </section>

        <section class="page-view" id="page-forecast" data-page-view="forecast" hidden>
            <div class="page-intro"><span class="section-label">06 — CAPACITY PLANNING</span>
                <h1>Know the next<br>surge <em>before it lands.</em></h1>
                <p>Two years of daily hub activity, shaped into an actionable staffing outlook.</p>
            </div>
            <div class="forecast-controls"><label class="select-field compact-field" for="forecast-hub">Hub<select
                        id="forecast-hub">
                        <option>Northline</option>
                        <option>Riverside</option>
                        <option>Eastgate</option>
                    </select></label>
                <fieldset class="horizon-toggle">
                    <legend>Horizon</legend><label><input type="radio" name="forecast-days" value="7"><span>7
                            days</span></label><label><input type="radio" name="forecast-days" value="14"
                            checked><span>14 days</span></label><label><input type="radio" name="forecast-days"
                            value="30"><span>30 days</span></label>
                </fieldset><label class="toggle-control"><input type="checkbox" id="promotion-toggle"><span
                        class="toggle-ui"></span><span>Promotion</span></label><label class="toggle-control"><input
                        type="checkbox" id="weather-toggle"><span class="toggle-ui"></span><span>Weather
                        event</span></label>
            </div>
            <div class="forecast-chart-card">
                <div class="card-title">
                    <div><span class="section-label">DAILY PARCELS / PREDICTED VOLUME</span>
                        <h2 id="forecast-title">Northline — next 14 days</h2>
                    </div><span class="model-chip">NEURAL NETWORK</span>
                </div>
                <div id="forecast-chart" class="forecast-chart" role="img"
                    aria-label="Historical and forecast daily parcel volume chart">
                    <p class="empty-note">Loading trained forecast model…</p>
                </div>
                <div class="chart-legend"><span><i class="legend-line navy-line"></i>ACTUAL VOLUME</span><span><i
                            class="legend-line amber-line"></i>FORECAST</span><span><i
                            class="legend-band"></i>CONFIDENCE RANGE</span></div>
            </div>
            <div class="staffing-insight" id="staffing-insight">
                <div class="staffing-mark">↗</div>
                <div><span class="section-label">STAFFING INSIGHT</span>
                    <h2>Recommended couriers for peak day: <strong>—</strong></h2>
                    <p>Planning assumption: one courier can safely complete approximately 62 parcels per day.</p>
                </div><span class="insight-hub">NORTHLINE</span>
            </div>
        </section>

        <section class="page-view" id="page-analytics" data-page-view="analytics" hidden>
            <div class="page-intro"><span class="section-label">07 — MODEL PERFORMANCE</span>
                <h1>Predictions with<br>a <em>scorecard.</em></h1>
                <p>Evaluation snapshots on held-out or synthetic validation data. The models are useful demonstrations,
                    not operational guarantees.</p>
            </div>
            <div class="metric-grid">
                <article class="metric-card"><span class="section-label">PRICE MODEL / MAE</span><strong
                        id="regression-mae">—</strong>
                    <p>Average absolute cost error</p>
                    <div class="metric-foot">HELD-OUT / LINEAR REGRESSION</div>
                </article>
                <article class="metric-card"><span class="section-label">PRICE MODEL / R²</span><strong
                        id="regression-r2">—</strong>
                    <p>Variance explained in demo data</p>
                    <div class="metric-foot">HELD-OUT / LINEAR REGRESSION</div>
                </article>
                <article class="metric-card"><span class="section-label">FORECAST / MAE</span><strong
                        id="neural-mae">—</strong>
                    <p>Parcels per day, average error</p>
                    <div class="metric-foot">14-DAY HOLDOUT / NEURAL NETWORK</div>
                </article>
                <article class="metric-card"><span class="section-label">TRAINING SAMPLE</span><strong
                        id="dataset-count">—</strong>
                    <p>Generated, reproducible records</p>
                    <div class="metric-foot">SEE DATASET NOTES</div>
                </article>
            </div>
            <div class="analytics-grid">
                <article class="analytics-card">
                    <div class="card-title">
                        <div><span class="section-label">CLASSIFICATION / HOLDOUT</span>
                            <h2>Delay risk · confusion matrix</h2>
                        </div><span class="model-chip">SVM</span>
                    </div>
                    <div id="svm-matrix" class="matrix-wrap"></div>
                </article>
                <article class="analytics-card">
                    <div class="card-title">
                        <div><span class="section-label">TEXT CLASSIFICATION / SAMPLE</span>
                            <h2>Ticket routing · confusion matrix</h2>
                        </div><span class="model-chip">NAIVE BAYES</span>
                    </div>
                    <div id="bayes-matrix" class="matrix-wrap"></div>
                </article>
                <article class="analytics-card">
                    <div class="card-title">
                        <div><span class="section-label">GINI IMPORTANCE / RELATIVE</span>
                            <h2>Decision-tree signals</h2>
                        </div><span class="model-chip">DECISION TREE</span>
                    </div>
                    <div id="feature-chart" class="feature-chart"></div>
                </article>
                <article class="analytics-card">
                    <div class="card-title">
                        <div><span class="section-label">FORECAST ERROR / 14-DAY SNAPSHOT</span>
                            <h2>Neural network · parcels MAE</h2>
                        </div><span class="model-chip">NN</span>
                    </div>
                    <div id="error-chart" class="error-chart"></div>
                </article>
            </div>
        </section>

        <section class="page-view" id="page-about" data-page-view="about" hidden>
            <div class="page-intro"><span class="section-label">08 — ABOUT AEGIS</span>
                <h1>Predictability is<br>a <em>service.</em></h1>
                <p>We believe the best delivery updates are the ones that tell the truth early — about the price, the
                    timing, and what happens when a route changes.</p>
            </div>
            <section class="story-panel">
                <div><span class="section-label">THE AEGIS PRINCIPLE</span>
                    <h2>Make the uncertainty<br>useful.</h2>
                </div>
                <div>
                    <p>Aegis Logistics is a regional last-mile and mid-mile delivery company built around one simple
                        promise: every delivery should be predictable.</p>
                    <p>That means giving customers a cost they can plan for, an arrival window they can trust, and a
                        specific response when conditions shift. Our models turn everyday operational signals into
                        decisions a team can explain and act on.</p>
                    <div class="story-signature">EVERY PARCEL HAS A PLAN<span>— AEGIS OPERATIONS</span></div>
                </div>
            </section>
            <section class="content-section dataset-section">
                <div class="section-heading">
                    <div><span class="section-label">THE DEMO DATA</span>
                        <h2>Generated. Seeded. Inspectable.</h2>
                    </div>
                    <p>A fixed seed makes each training run repeatable. Export the generated examples below and inspect
                        exactly what powers the demo.</p>
                </div>
                <div class="dataset-table-wrap">
                    <table class="dataset-table">
                        <thead>
                            <tr>
                                <th>DATASET</th>
                                <th>ROWS</th>
                                <th>FIELDS / SIGNALS</th>
                                <th>DOWNLOAD</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><b>Shipment history</b><small>Seeded route examples</small></td>
                                <td>900</td>
                                <td>Distance · weight · stops · weather · hub load · outcome · price · ETA</td>
                                <td><a href="/api/dataset.csv?type=shipments" class="download-link">Export CSV ↗</a>
                                </td>
                            </tr>
                            <tr>
                                <td><b>Support tickets</b><small>Generated messages</small></td>
                                <td>300</td>
                                <td>Text · address issue · damaged parcel · where is my parcel</td>
                                <td><a href="/api/dataset.csv?type=tickets" class="download-link">Export CSV ↗</a>
                                </td>
                            </tr>
                            <tr>
                                <td><b>Hub volume</b><small>Two daily years / hub</small></td>
                                <td>2,190</td>
                                <td>Date · hub · daily parcel volume · seasonal &amp; weekday pattern</td>
                                <td><a href="/api/dataset.csv?type=volumes" class="download-link">Export CSV ↗</a>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
            <section class="limitations"><span class="section-label">IMPORTANT — MODEL LIMITATIONS</span>
                <h2>This is a working demo, not an operational promise.</h2>
                <p>All training records are synthetic and generated in code. They do not represent real Aegis customers,
                    routes, service levels, or production model evaluations. The reported metrics are illustrative; the
                    risk and staffing outputs must not be used to make real delivery, customer-support, or workforce
                    decisions. Real deployment requires representative, permissioned data, independent validation,
                    privacy review, monitoring, and human oversight.</p>
            </section>
            <section class="content-section model-table-section">
                <div class="section-heading">
                    <div><span class="section-label">THE MODEL SYSTEM</span>
                        <h2>What runs behind each answer.</h2>
                    </div>
                </div>
                <div class="model-table-wrap">
                    <table class="dataset-table">
                        <thead>
                            <tr>
                                <th>ALGORITHM</th>
                                <th>LOGISTICS USE</th>
                                <th>EXAMPLE DATA</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Linear regression</td>
                                <td>Cost &amp; ETA estimate</td>
                                <td>128 km · 4.5 kg · 3 stops</td>
                            </tr>
                            <tr>
                                <td>K-nearest neighbors</td>
                                <td>Comparable shipment quote</td>
                                <td>Five closest route profiles</td>
                            </tr>
                            <tr>
                                <td>Linear SVM</td>
                                <td>On-time / at-risk classifier</td>
                                <td>Rain · high hub load · 312 km</td>
                            </tr>
                            <tr>
                                <td>CART decision tree</td>
                                <td>Handling priority + decision path</td>
                                <td>Weather · hub capacity · distance</td>
                            </tr>
                            <tr>
                                <td>Multinomial Naive Bayes</td>
                                <td>Support-ticket routing</td>
                                <td>Customer message text</td>
                            </tr>
                            <tr>
                                <td>Feed-forward neural network</td>
                                <td>Daily volume forecast</td>
                                <td>730 days × 3 hubs</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
        </section>
    </main>
    <footer class="footer">
        <div class="footer-top">
            <div><a class="brand footer-brand" href="/" data-route="/"><span class="brand-mark"
                        aria-hidden="true"><svg viewBox="0 0 32 32">
                            <path d="M16 3 27 8v8c0 7-4.7 11.3-11 14C9.7 27.3 5 23 5 16V8l11-5Z" />
                            <path d="m11 16 3.2 3.2L21.5 12" />
                        </svg></span><span class="brand-name">AEGIS<span>LOGISTICS</span></span></a>
                <p>Every delivery is predictable — what it costs, when it arrives, and what to do if something goes
                    wrong.</p>
            </div>
            <div class="footer-links"><span class="section-label">MODEL LAB</span><a href="/quote"
                    data-route="/quote">Cost &amp; ETA</a><a href="/risk" data-route="/risk">Delay risk</a><a
                    href="/triage" data-route="/triage">Ticket triage</a><a href="/forecast"
                    data-route="/forecast">Hub forecast</a></div>
            <div class="footer-links"><span class="section-label">OPERATIONS</span><a href="/analytics"
                    data-route="/analytics">Model scorecard</a><a href="/about" data-route="/about">About the
                    data</a><a href="/api/health" target="_blank" rel="noreferrer">API status ↗</a></div>
        </div>
        <div class="footer-bottom"><span>© AEGIS LOGISTICS · MODEL LAB DEMO</span><span>SYNTHETIC DATA · HUMAN
                OVERSIGHT REQUIRED</span><span>REGION 04 / SERVICE SYSTEMS</span></div>
    </footer>
</body>

</html>
