import { ArrowUpRight, Bell, Route, createIcons } from 'lucide';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

const pageNames = {
    '': 'home',
    quote: 'quote',
    risk: 'risk',
    triage: 'triage',
    forecast: 'forecast',
    analytics: 'analytics',
    about: 'about',
};

async function request(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            Accept: 'application/json',
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]')?.content ?? '',
            ...options.headers,
        },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const validation = data.errors ? Object.values(data.errors).flat()[0] : null;
        throw new Error(validation || data.message || `Request failed (${response.status}).`);
    }
    return data;
}

function showLoading(container, message = 'Training prediction…') {
    container.innerHTML = `<div class="loading-state" role="status"><span class="loader" aria-hidden="true"></span>${escapeHtml(message)}</div>`;
}

function setError(id, message = '') {
    const node = document.getElementById(id);
    if (node) node.textContent = message;
}

function debounce(callback, delay = 120) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => callback(...args), delay);
    };
}

function setPage(name, updateHistory = false) {
    const page = pageNames[name] ?? 'home';
    $$('[data-page-view]').forEach((view) => {
        view.hidden = view.dataset.pageView !== page;
    });
    $$('[data-route]').forEach((link) => {
        const isActive = link.getAttribute('href') === (page === 'home' ? '/' : `/${page}`);
        if (link.closest('.nav-links')) {
            if (isActive) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        }
    });
    document.body.dataset.page = page;
    if (updateHistory) history.pushState({ page }, '', page === 'home' ? '/' : `/${page}`);
    $('.nav-links')?.classList.remove('open');
    $('.mobile-menu')?.setAttribute('aria-expanded', 'false');
    if (page === 'analytics') loadAnalytics();
    if (page === 'forecast') loadForecast();
    if (page === 'home') {
        loadNetwork();
        loadHomeDecision();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

$$('[data-route]').forEach((link) => {
    link.addEventListener('click', (event) => {
        const href = link.getAttribute('href');
        if (!href || !href.startsWith('/') || href.startsWith('/api/')) return;
        event.preventDefault();
        const page = href === '/' ? '' : href.slice(1);
        if (page in pageNames) setPage(page, true);
    });
});
window.addEventListener('popstate', () => setPage(location.pathname.replace(/^\/|\/$/g, '')));
$('.mobile-menu')?.addEventListener('click', (event) => {
    const button = event.currentTarget;
    const expanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!expanded));
    $('.nav-links')?.classList.toggle('open', !expanded);
});

$$('.response-icon').forEach((icon, index) => {
    icon.innerHTML = `<i data-lucide="${index === 0 ? 'route' : 'bell'}" aria-hidden="true"></i>`;
});
const staffingMark = $('.staffing-mark');
if (staffingMark) staffingMark.innerHTML = '<i data-lucide="arrow-up-right" aria-hidden="true"></i>';
createIcons({ icons: { ArrowUpRight, Bell, Route } });

function animateKpis() {
    $$('[data-count]').forEach((element) => {
        const target = Number(element.dataset.count);
        const start = performance.now();
        const duration = 650;
        const tick = (now) => {
            const progress = Math.min(1, (now - start) / duration);
            element.textContent = String(Math.round(target * (1 - (1 - progress) ** 3)));
            if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });
}

function updateClock() {
    const node = $('#live-clock');
    if (!node) return;
    node.textContent = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date()) + ' UTC';
}

let tickerTimer;
async function loadNetwork() {
    const routeGroup = $('#map-routes');
    if (!routeGroup || routeGroup.dataset.loaded === 'true') return;
    try {
        const data = await request('/api/network');
        const hubs = Object.fromEntries(data.hubs.map((hub) => [hub.name, { x: hub.x * 6, y: hub.y * 3.6 }]));
        const mapPath = (from, to, index) => {
            const a = hubs[from];
            const b = hubs[to];
            const bend = index % 2 === 0 ? 19 : -21;
            return `M ${a.x} ${a.y} Q ${(a.x + b.x) / 2 + bend} ${(a.y + b.y) / 2 - bend} ${b.x} ${b.y}`;
        };
        routeGroup.innerHTML = data.routes.map((route, index) => `<path id="route-${index}" class="map-route${route.delay ? ' delayed' : ''}" d="${mapPath(route.from, route.to, index)}"/>`).join('');
        $('#map-packets').innerHTML = data.routes.map((route, index) => `<circle class="map-packet${route.delay ? ' delayed' : ''}" r="${route.delay ? 3.4 : 2.7}"><animateMotion dur="${8 + index * 1.7}s" begin="${-index * 1.4}s" repeatCount="indefinite" path="${mapPath(route.from, route.to, index)}"/>${route.delay ? '<animate attributeName="r" values="2.5;5;2.5" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" values=".65;1;.65" dur="1.5s" repeatCount="indefinite"/>' : ''}</circle>`).join('');
        $('#map-hubs').innerHTML = data.hubs.map((hub) => {
            const x = hub.x * 6;
            const y = hub.y * 3.6;
            const labelY = y > 195 ? y + 22 : y - 15;
            return `<g><circle class="map-hub-ring" cx="${x}" cy="${y}" r="10"/><circle class="map-hub-core" cx="${x}" cy="${y}" r="4"/><text class="map-hub-label" x="${x + 13}" y="${labelY}">${escapeHtml(hub.name.toUpperCase())}</text></g>`;
        }).join('');
        const items = data.shipments.map((shipment) => `<span class="ticker-item"><b>${escapeHtml(shipment.id)}</b><span class="${shipment.status === 'REVIEW' ? 'delayed-text' : ''}">${escapeHtml(shipment.status)}</span><span>${escapeHtml(shipment.route)}</span><span>${escapeHtml(shipment.eta)}</span></span>`);
        const ticker = $('#shipment-ticker');
        ticker.innerHTML = items.slice(0, 4).join('');
        let offset = 0;
        clearInterval(tickerTimer);
        tickerTimer = setInterval(() => {
            offset = (offset + 1) % items.length;
            ticker.innerHTML = Array.from({ length: 4 }, (_, i) => items[(offset + i) % items.length]).join('');
        }, 3400);
        routeGroup.dataset.loaded = 'true';
    } catch (error) {
        routeGroup.dataset.loaded = 'true';
        $('#shipment-ticker').textContent = 'Route activity is temporarily unavailable.';
        console.error('Unable to load network activity:', error);
    }
}

async function loadHomeDecision() {
    const panel = $('.decision-path');
    if (!panel || panel.dataset.loaded === 'true') return;
    try {
        const data = await request('/api/risk', {
            method: 'POST',
            body: JSON.stringify({ weather: 'rain', hub_load: 'high', distance_km: 350 }),
        });
        const steps = data.decision_path.map((step, index) => `<div class="path-step"><span class="path-number">${String(index + 1).padStart(2, '0')}</span><div><small>LEARNED DECISION RULE</small><strong>${escapeHtml(step.rule)}</strong></div><span class="path-connector">↓</span></div>`).join('');
        panel.innerHTML = `<span class="path-caption">TRAINED TREE / RAIN · HIGH LOAD · 350 KM</span>${steps}<div class="path-result"><span>MODEL OUTPUT / HANDLING PRIORITY</span><strong>${escapeHtml(data.priority)}</strong><small>${data.actions.map(escapeHtml).join(' · ')}</small></div>`;
        panel.dataset.loaded = 'true';
    } catch (error) {
        panel.dataset.loaded = 'true';
        console.error('Unable to load the trained decision path:', error);
    }
}

const modelInfo = {
    regression: ['01 / REGRESSION', 'A quote built from the route up.', 'Distance, parcel weight and delivery stops become a cost estimate and an arrival window. No opaque multiplier, just measurable inputs.', 'Distance · Weight · Stops', 'Price · ETA range', '±5% target accuracy', '/quote', 'Try the estimator'],
    knn: ['02 / K-NEAREST NEIGHBORS', 'Price it against journeys like this one.', 'Five nearby historical shipment profiles anchor the quote in comparable distances, parcel weights, and stop counts.', 'Shipment feature vectors', 'Weighted quote · Neighbors', '5 closest records', '/quote', 'Compare neighbors'],
    svm: ['03 / SUPPORT VECTOR MACHINE', 'A route signal before a route slips.', 'A trained linear SVM combines weather, hub load, and distance to classify a delivery as on time or at risk.', 'Weather · Hub load · Distance', 'Risk class · Probability', 'Held-out shipment sample', '/risk', 'Check a route'],
    tree: ['04 / DECISION TREE', 'A handling decision people can follow.', 'A CART model follows learned feature splits to a readable leaf. The route to each priority is visible, not hidden.', 'Weather · Hub load · Distance', 'Decision path · Priority', 'Depth-limited, interpretable', '/risk', 'Inspect a route'],
    bayes: ['05 / NAIVE BAYES', 'Customer intent, routed at first read.', 'Multinomial Naive Bayes scores a message against synthetic support language and sends it to the most relevant service desk.', 'Customer message text', 'Category · Department', '3 learned support queues', '/triage', 'Route a message'],
    neural: ['06 / NEURAL NETWORK', 'A better read on the next busy day.', 'A small feed-forward network learns weekly and seasonal patterns plus hub identity to forecast near-term parcel volume.', 'Season · Weekday · Hub', 'Daily parcel forecast', '730 days × 3 hubs', '/forecast', 'View the forecast'],
};

$$('.model-node').forEach((button) => button.addEventListener('click', () => {
    $$('.model-node').forEach((node) => {
        node.classList.toggle('active', node === button);
        node.setAttribute('aria-selected', String(node === button));
    });
    const info = modelInfo[button.dataset.model];
    const detail = $('#model-detail');
    detail.innerHTML = `<span class="model-index">MODEL ${escapeHtml(info[0])}</span><h3>${escapeHtml(info[1])}</h3><p>${escapeHtml(info[2])}</p><div class="model-io"><div><span>INPUTS</span><b>${escapeHtml(info[3])}</b></div><div><span>OUTPUT</span><b>${escapeHtml(info[4])}</b></div><div><span>VALIDATION</span><b>${escapeHtml(info[5])}</b></div></div><a class="text-link" href="${info[6]}" data-route="${info[6]}">${escapeHtml(info[7])} <span aria-hidden="true">↗</span></a>`;
    const link = $('.text-link[data-route]', detail);
    link.addEventListener('click', (event) => {
        event.preventDefault();
        const page = link.getAttribute('href').slice(1);
        setPage(page, true);
    });
}));

function syncRange(rangeId, numberId) {
    const range = document.getElementById(rangeId);
    const number = document.getElementById(numberId);
    if (!range || !number) return;
    range.addEventListener('input', () => {
        number.value = range.value;
        number.dispatchEvent(new Event('input', { bubbles: true }));
    });
    number.addEventListener('input', () => {
        const min = Number(number.min);
        const max = Number(number.max);
        const value = Number(number.value);
        if (number.value !== '' && Number.isFinite(value)) range.value = String(Math.max(min, Math.min(max, value)));
    });
}

syncRange('distance', 'distance-number');
syncRange('weight', 'weight-number');
syncRange('stops', 'stops-number');
syncRange('risk-distance', 'risk-distance-number');

function quoteFormValues() {
    return {
        distance_km: Number($('#distance-number').value),
        weight_kg: Number($('#weight-number').value),
        stops: Number($('#stops-number').value),
        model: $('input[name="quote-model"]:checked').value,
    };
}

function renderNeighbors(neighbors, values) {
    const chart = $('#neighbor-chart');
    if (!neighbors?.length) {
        chart.innerHTML = '<p class="empty-note">Switch to KNN to see five comparable shipments plotted by distance and weight.</p>';
        $('#neighbor-count').textContent = 'KNN ONLY';
        return;
    }
    $('#neighbor-count').textContent = `${neighbors.length} MATCHES`;
    const width = 560, height = 140, left = 38, right = 535, top = 12, bottom = 112;
    const points = neighbors.map((item) => `<circle cx="${left + item.distance_km / 500 * (right - left)}" cy="${bottom - item.weight_kg / 50 * (bottom - top)}" r="4" fill="#0B1F3A"><title>${item.distance_km} km · ${item.weight_kg} kg · $${item.cost}</title></circle>`).join('');
    const qx = left + values.distance_km / 500 * (right - left);
    const qy = bottom - values.weight_kg / 50 * (bottom - top);
    chart.innerHTML = `<svg class="scatter-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Five nearest shipment neighbors plotted by distance and parcel weight"><path d="M${left} ${top}V${bottom}H${right}" fill="none" stroke="#DFE4EA"/><path d="M${left} ${bottom - 50}H${right}M${left + 249} ${top}V${bottom}" stroke="#DFE4EA" stroke-dasharray="2 4"/><text x="${left}" y="129" fill="#626D7B" font-size="9">0 km</text><text x="${right}" y="129" text-anchor="end" fill="#626D7B" font-size="9">500 km</text><text x="6" y="14" fill="#626D7B" font-size="9">50 kg</text><text x="12" y="112" fill="#626D7B" font-size="9">0 kg</text>${points}<circle cx="${qx}" cy="${qy}" r="7" fill="#F5A623" stroke="#0B1F3A" stroke-width="1.5"><title>Your shipment</title></circle></svg>`;
}

async function predictQuote() {
    const values = quoteFormValues();
    if (!Number.isFinite(values.distance_km) || values.distance_km < 1 || values.distance_km > 500
        || !Number.isFinite(values.weight_kg) || values.weight_kg < 0.1 || values.weight_kg > 50
        || !Number.isInteger(values.stops) || values.stops < 1 || values.stops > 12) {
        setError('quote-error', 'Use a distance of 1–500 km, weight of 0.1–50 kg, and 1–12 stops.');
        return;
    }
    setError('quote-error');
    showLoading($('#quote-result'), 'Comparing route examples…');
    try {
        const data = await request('/api/quote', { method: 'POST', body: JSON.stringify(values) });
        const method = data.model === 'knn' ? 'K-NEAREST NEIGHBORS' : 'LINEAR REGRESSION';
        $('#quote-result').innerHTML = `<div class="estimate-top"><div><span class="section-label">${method} / ESTIMATED SHIPMENT COST</span><div class="estimate-price">$${data.price.toFixed(2)}</div></div><span class="confidence-pill">±5% TARGET</span></div><div class="estimate-meta"><b>ETA ${data.eta.min}–${data.eta.max} hours</b><span>·</span><span>${values.distance_km} km</span><span>·</span><span>${values.weight_kg.toFixed(1)} kg</span><span>·</span><span>${values.stops} stops</span></div><p class="estimate-meta">Estimate from ${data.model === 'knn' ? 'five distance-weighted neighbors' : 'a fitted linear cost model'} on reproducible synthetic data.</p>`;
        renderNeighbors(data.neighbors, values);
    } catch (error) {
        $('#quote-result').innerHTML = `<div class="empty-state"><span class="section-label">QUOTE UNAVAILABLE</span><p>${escapeHtml(error.message)}</p></div>`;
        setError('quote-error', error.message);
    }
}

const quoteForm = $('#quote-form');
const debouncedQuote = debounce(predictQuote);
quoteForm?.addEventListener('submit', (event) => { event.preventDefault(); predictQuote(); });
quoteForm?.addEventListener('input', debouncedQuote);
$$('input[name="quote-model"]').forEach((input) => input.addEventListener('change', predictQuote));

async function predictRisk() {
    const distance = Number($('#risk-distance-number').value);
    if (!Number.isFinite(distance) || distance < 1 || distance > 500) {
        setError('risk-error', 'Route distance must be between 1 and 500 km.');
        return;
    }
    setError('risk-error');
    showLoading($('#risk-result'), 'Checking route conditions…');
    try {
        const data = await request('/api/risk', {
            method: 'POST',
            body: JSON.stringify({ weather: $('#weather').value, hub_load: $('#hub-load').value, distance_km: distance }),
        });
        const risk = data.status === 'AT RISK';
        $('#risk-result').innerHTML = `<div class="risk-top"><div><span class="section-label">PREDICTED DELIVERY STATUS</span><div class="risk-probability">${data.probability}<small>% risk</small></div><p class="risk-caption">${data.on_time_probability}% estimated probability of arriving on time</p></div><span class="risk-badge${risk ? ' at-risk' : ''}">${escapeHtml(data.status)}</span></div><div class="risk-meter" aria-label="${data.probability}% delay risk"><span style="width:${data.probability}%"></span></div><p class="risk-factors"><b>Signals:</b> ${data.factors.map(escapeHtml).join(' · ')}</p><div class="risk-trace"><span>TREE PRIORITY</span><b>${escapeHtml(data.priority)}</b></div>`;
    } catch (error) {
        $('#risk-result').innerHTML = `<div class="empty-state"><span class="section-label">RISK CHECK UNAVAILABLE</span><p>${escapeHtml(error.message)}</p></div>`;
        setError('risk-error', error.message);
    }
}

const riskForm = $('#risk-form');
const debouncedRisk = debounce(predictRisk);
riskForm?.addEventListener('submit', (event) => { event.preventDefault(); predictRisk(); });
riskForm?.addEventListener('input', debouncedRisk);
riskForm?.addEventListener('change', debouncedRisk);

const messageField = $('#ticket-message');
messageField?.addEventListener('input', () => { $('#char-count').textContent = `${messageField.value.length} / 2000`; });
$('#sample-ticket')?.addEventListener('click', () => {
    messageField.value = 'My parcel has not arrived and the tracking has not updated since yesterday. Can you tell me when it will arrive?';
    messageField.dispatchEvent(new Event('input', { bubbles: true }));
    messageField.focus();
});
$('#triage-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = messageField.value.trim();
    if (message.length < 5) {
        setError('triage-error', 'Enter at least 5 characters so the model has a message to classify.');
        messageField.focus();
        return;
    }
    setError('triage-error');
    showLoading($('#triage-result'), 'Scoring support categories…');
    try {
        const data = await request('/api/triage', { method: 'POST', body: JSON.stringify({ message }) });
        const rows = data.predictions.map((prediction) => `<div class="prediction-item"><span>${escapeHtml(prediction.category)}</span><b>${prediction.confidence}%</b><div class="confidence-track"><i style="width:${prediction.confidence}%"></i></div></div>`).join('');
        $('#triage-result').innerHTML = `<div class="triage-result-head"><div><span class="section-label">TOP CATEGORY</span><br><strong>${escapeHtml(data.predictions[0].category)}</strong></div><span class="model-chip">NAIVE BAYES</span></div><div class="prediction-list">${rows}</div><div class="routing-footer"><span>ROUTED DEPARTMENT</span><b>${escapeHtml(data.department)}</b></div><p class="estimate-meta">Intent score from trained synthetic ticket language. Response-time improvement target: ${data.response_improvement}%.</p>`;
    } catch (error) {
        $('#triage-result').innerHTML = `<div class="empty-state"><span class="section-label">TRIAGE UNAVAILABLE</span><p>${escapeHtml(error.message)}</p></div>`;
        setError('triage-error', error.message);
    }
});

function linePath(points) {
    return points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
}

let forecastRequest = 0;
async function loadForecast() {
    if (!$('#forecast-chart')) return;
    const requestId = ++forecastRequest;
    showLoading($('#forecast-chart'), 'Forecasting hub volume…');
    const hub = $('#forecast-hub').value;
    const days = Number($('input[name="forecast-days"]:checked').value);
    const query = new URLSearchParams({
        hub,
        days: String(days),
        promotion: String($('#promotion-toggle').checked),
        weather: String($('#weather-toggle').checked),
    });
    try {
        const data = await request(`/api/forecast?${query}`);
        if (requestId !== forecastRequest) return;
        renderForecast(data);
    } catch (error) {
        if (requestId !== forecastRequest) return;
        $('#forecast-chart').innerHTML = `<p class="empty-note">Forecast unavailable: ${escapeHtml(error.message)}</p>`;
    }
}

function renderForecast(data) {
    $('#forecast-title').textContent = `${data.hub} — next ${data.days} days`;
    $('#staffing-insight h2 strong').textContent = data.couriers;
    $('.insight-hub').textContent = data.hub.toUpperCase();
    const width = 920, height = 260, left = 44, right = 904, top = 14, bottom = 221;
    const history = data.history;
    const forecasts = data.forecast;
    const combinedLength = history.length + forecasts.length;
    const values = [...history.map((row) => row.value), ...forecasts.flatMap((row) => [row.low, row.high])];
    const min = Math.floor(Math.min(...values) / 25) * 25;
    const max = Math.ceil(Math.max(...values) / 25) * 25;
    const x = (index) => left + (index / Math.max(1, combinedLength - 1)) * (right - left);
    const y = (value) => bottom - ((value - min) / Math.max(1, max - min)) * (bottom - top);
    const historyPoints = history.map((row, index) => ({ x: x(index), y: y(row.value) }));
    const forecastPoints = forecasts.map((row, index) => ({ x: x(history.length - 1 + index + 1), y: y(row.value) }));
    const upper = forecasts.map((row, index) => ({ x: forecastPoints[index].x, y: y(row.high) }));
    const lower = forecasts.map((row, index) => ({ x: forecastPoints[index].x, y: y(row.low) })).reverse();
    const areaPath = `${linePath(upper)} ${lower.map((point) => `L${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ')} Z`;
    const dividerX = x(history.length - 1);
    const grid = Array.from({ length: 5 }, (_, index) => {
        const value = min + ((max - min) * index / 4);
        return `<line class="grid-line" x1="${left}" y1="${y(value)}" x2="${right}" y2="${y(value)}"/><text x="${left - 8}" y="${y(value) + 3}" text-anchor="end">${Math.round(value)}</text>`;
    }).join('');
    const labels = [0, 10, 20, 30, 40, history.length - 1].filter((index, i, values) => index >= 0 && values.indexOf(index) === i).map((index) => `<text x="${x(index)}" y="${bottom + 20}" text-anchor="middle">${escapeHtml(history[index]?.date ?? '')}</text>`).join('');
    const forecastLabels = forecasts.filter((_, index) => index === 0 || index === forecasts.length - 1 || (data.days === 30 && index % 7 === 0)).map((row, index) => {
        const forecastIndex = forecasts.indexOf(row);
        return `<text x="${forecastPoints[forecastIndex].x}" y="${bottom + 20}" text-anchor="middle">${escapeHtml(row.date)}</text>`;
    }).join('');
    const svg = `<svg class="forecast-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${data.hub}, ${data.days}-day volume forecast with ${history.length} historical days"><title>${escapeHtml(data.hub)} hub volume forecast</title>${grid}<path class="confidence-area" d="${areaPath}"/><line class="divider-line" x1="${dividerX}" y1="${top}" x2="${dividerX}" y2="${bottom}"/><path class="actual-line" d="${linePath(historyPoints)}"/><path class="forecast-line" d="M${historyPoints.at(-1).x} ${historyPoints.at(-1).y} ${linePath(forecastPoints).replace(/^M/, 'L')}"/>${forecastPoints.map((point) => `<circle class="forecast-point" cx="${point.x}" cy="${point.y}" r="3"><title>${forecasts[forecastPoints.indexOf(point)].date}: ${forecasts[forecastPoints.indexOf(point)].value} parcels</title></circle>`).join('')}<text x="${left}" y="${height - 3}">HISTORY</text><text x="${Math.min(dividerX + 8, right - 55)}" y="${height - 3}">FORECAST</text>${labels}${forecastLabels}</svg>`;
    $('#forecast-chart').innerHTML = svg;
}

$('#forecast-hub')?.addEventListener('change', debounce(loadForecast, 100));
$$('input[name="forecast-days"], #promotion-toggle, #weather-toggle').forEach((input) => input.addEventListener('change', debounce(loadForecast, 100)));

function renderMatrix(element, labels, matrix) {
    const shortLabels = labels.map((label) => label.length > 18 ? label.slice(0, 17) + '…' : label);
    const header = shortLabels.map((label) => `<th>${escapeHtml(label)}</th>`).join('');
    const rows = matrix.map((row, index) => `<tr><th>${escapeHtml(shortLabels[index])}</th>${row.map((value, col) => `<td class="${index === col ? `diagonal${index === 0 ? ' amber' : ''}` : ''}">${value}</td>`).join('')}</tr>`).join('');
    element.innerHTML = `<table class="matrix-table" aria-label="Confusion matrix. Rows are actual class; columns are predicted class."><thead><tr><th>ACTUAL ↓ / PREDICTED →</th>${header}</tr></thead><tbody>${rows}</tbody></table><p class="matrix-caption">Rows: actual class · columns: predicted class</p>`;
}

let analyticsLoaded = false;
async function loadAnalytics() {
    if (analyticsLoaded) return;
    try {
        const data = await request('/api/analytics');
        $('#regression-mae').textContent = `$${data.regression.mae.toFixed(2)}`;
        $('#regression-r2').textContent = data.regression.r2.toFixed(3);
        $('#neural-mae').textContent = data.neural.mae.toFixed(1);
        renderMatrix($('#svm-matrix'), data.svm.labels, data.svm.matrix);
        renderMatrix($('#bayes-matrix'), data.bayes.labels, data.bayes.matrix);
        $('#dataset-count').textContent = (data.dataset.shipments + data.dataset.tickets + data.dataset.hub_days).toLocaleString();
        $('#feature-chart').innerHTML = data.tree.features.map((feature) => `<div class="feature-row"><span>${escapeHtml(feature.name)}</span><div class="feature-track"><i style="width:${feature.value}%"></i></div><b>${feature.value}%</b></div>`).join('');
        const values = data.neural.points;
        const max = Math.max(...values);
        $('#error-chart').innerHTML = `<svg class="analytics-svg" viewBox="0 0 500 175" role="img" aria-label="Neural network daily forecast error in parcels"><title>Forecast error by day</title>${[0, 1, 2, 3].map((n) => `<line class="grid-line" x1="28" y1="${18 + n * 40}" x2="490" y2="${18 + n * 40}"/>`).join('')}${values.map((value, index) => { const barWidth = 21, gap = 10, x = 35 + index * (barWidth + gap), h = value / max * 125; return `<rect class="error-bar" x="${x}" y="${148 - h}" width="${barWidth}" height="${h}" rx="1"><title>Day ${index + 1}: ${value} parcels MAE</title></rect>`; }).join('')}<text x="28" y="168">DAY 01</text><text x="490" y="168" text-anchor="end">DAY 14</text></svg><p class="matrix-caption">Illustrative holdout MAE by forecast day. Overall MAE: ${data.neural.mae} parcels.</p>`;
        analyticsLoaded = true;
    } catch (error) {
        ['svm-matrix', 'bayes-matrix', 'feature-chart', 'error-chart'].forEach((id) => {
            const node = document.getElementById(id);
            if (node) node.innerHTML = `<p class="empty-note">Performance data unavailable: ${escapeHtml(error.message)}</p>`;
        });
        console.error('Unable to load model analytics:', error);
    }
}

updateClock();
setInterval(updateClock, 1000);
animateKpis();
setPage(document.body.dataset.page);
