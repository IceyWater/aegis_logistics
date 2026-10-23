# Aegis Logistics — Model Lab

A responsive Laravel application for a fictional regional parcel carrier. It combines an operations-focused marketing site with six interactive logistics model demos, JSON endpoints, seeded synthetic datasets, and a private CSV export command.

> **Demo only:** the records and evaluation metrics are synthetic. Do not use these estimates for actual pricing, delivery commitments, customer support, or workforce decisions.

## Requirements

- PHP 8.3 or newer for the app runtime.
- Composer 2
- Node.js 20+ and npm

The application is built on the Laravel/Vite project already in this repository. It does not require Python, a database, external model downloads, or third-party charting libraries. Google Fonts are used as a progressive enhancement; local system fonts remain as fallbacks.

## Run locally

```powershell
composer install --no-dev
Copy-Item .env.example .env
php artisan key:generate
npm ci
npm run build
php artisan aegis:models:train
php artisan serve
```

Open `http://127.0.0.1:8000`. The training command warms the daily model cache before the first prediction. For frontend development with Vite HMR, run `npm run dev` in a second terminal.

The demo uses Laravel's file cache and file sessions for model/data persistence. No migrations are required. The model object is cached until the end of the day; seeded shipment and ticket records are reproducible, while hub history is dated relative to the current day.

### Inspect models and export data

```powershell
php artisan aegis:models:train
php artisan aegis:models:train --export
```

The optional export writes `shipments.csv`, `tickets.csv`, and `volumes.csv` to `storage/app/private/aegis-demo-data`. Dataset downloads are also available from the About page or `/api/dataset.csv?type=shipments|tickets|volumes`.

### Tests and production assets

```powershell
php artisan test
npm run build
```

The test suite has been run against the development dependencies present in this workspace. The repository's pre-existing `composer.lock` omits the Pest packages declared in `composer.json`; a fresh development install needs a consistent dev lockfile (and PHP 8.4.1+ for the declared Pest 5 constraint). This does not affect the production `--no-dev` install or Docker image.

## Application structure

```text
Browser
  ├── Blade shell + responsive operations UI
  ├── Vite CSS + JavaScript (routing, forms, SVG charts, network animation)
  └── Laravel JSON API
        └── LogisticsModels singleton
              ├── seeded shipment, support-ticket, and hub-volume data
              ├── linear regression + KNN quote predictors
              ├── linear SVM + CART decision tree
              ├── multinomial Naive Bayes ticket classifier
              └── feed-forward neural-network volume forecast
```

The model implementation and synthetic data generator live in `app/Services/LogisticsModels.php`. The service is resolved as a Laravel singleton and cached using Laravel's file cache. Only that application-owned class is permitted by Laravel's cache deserialization allowlist. `app/Http/Controllers/Api/LogisticsController.php` validates API inputs; page rendering and routes are in `routes/web.php`; the model warm-up/export command is in `routes/console.php`.

### Component tree

```text
AppShell
├── OperationsNav (sticky desktop links / responsive mobile drawer)
├── Home
│   ├── LiveNetworkMap + ShipmentTicker
│   ├── KPIImprovementBand
│   ├── ModelExplorer → ModelDetailPanel
│   └── TrainedDecisionPath
├── Quote → ShipmentProfileForm + PricingModelToggle + Estimate + NeighborScatter
├── Risk → RouteConditionsForm + SvmResult + DecisionTrace + ResponseActions
├── Triage → CustomerMessageForm + CategoryConfidenceList + DepartmentRoute
├── Forecast → Hub/Horizon/ScenarioControls + VolumeChart + StaffingInsight
├── Analytics → MetricCards + ConfusionMatrices + TreeImportance + ForecastErrors
├── About → CompanyStory + DatasetTable/Exports + ModelTable + Limitations
└── MissionFooter
```

## Model and data details

| Model | Training data / method | Demo output |
|---|---|---|
| Linear regression | 900 seeded shipments; least-squares fit, 80/20 shipment split | Estimated shipping price and ETA interval |
| K-nearest neighbors | Same 900 shipments; normalized Euclidean distance and distance-weighted five-neighbor price | Comparable quote and five shipment dots |
| Linear SVM | Shipment weather, hub-load, and distance features; hinge-loss SGD | On-time / at-risk class, score-derived probability, contributing signals |
| CART decision tree | Gini-selected splits on shipment conditions, maximum depth 3 | Human-readable decision path and handling priority |
| Multinomial Naive Bayes | 300 generated support messages across three classes; 80/20 ticket split | Top categories, confidence scores, support department |
| Feed-forward neural network | Two years of daily synthetic volume at each of three hubs; seasonal, weekly, trend, and hub features | 7/14/30 day forecast and staffing recommendation |

Synthetic records are generated in PHP with fixed pseudo-random seeds. A forecast history has 730 days per hub. Hub volume contains weekday, seasonal, gradual trend, and deterministic noise patterns. The model warm-up command reports measured regression and forecast holdout error; the analytics dashboard also shows classification confusion matrices and decision-tree feature importance. All scores describe only this generated data.

## Pages

| Path | Main components |
|---|---|
| `/` | Live simulated route network and ticker, target KPI band, model explorer, trained decision-path feature |
| `/quote` | Synchronized shipment sliders/numeric inputs, regression/KNN switch, price/ETA, nearest-neighbor scatter plot |
| `/risk` | Weather/hub-load/distance form, SVM risk score, learned tree priority, response actions |
| `/triage` | Customer message form, three Naive Bayes category scores, routed department |
| `/forecast` | Hub and horizon selectors, promotion/weather shifts, historical and forecast SVG chart, staffing estimate |
| `/analytics` | Held-out regression metrics, SVM and Naive Bayes confusion matrices, tree importance, forecast errors |
| `/about` | Company story, dataset exports, model table, limitations |

## Color tokens and visual system

- Primary ink navy: `#0B1F3A`
- Signal amber: `#F5A623`
- Surfaces: white and `#F7F9FC`; borders and labels use neutral gray-scale only.
- Display: Space Grotesk. Body/UI: Inter.
- Lucide line icons, no gradients, stock imagery, or traffic-light risk colors. Amber highlights calls to action, risk states, and data accents.

## API

All routes are served by Laravel. API validation errors use JSON responses.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Readiness and model count |
| `GET` | `/api/models` | Model descriptions and input/output schema |
| `GET` | `/api/analytics` | Held-out metrics, confusion matrices, feature importance, dataset sizes |
| `GET` | `/api/network` | Hub positions, route activity, synthetic shipment ticker |
| `GET` | `/api/forecast?hub=Northline&days=14&promotion=false&weather=false` | Historical and predicted hub volume |
| `GET` | `/api/dataset.csv?type=shipments` | Download shipments, tickets, or volume CSV |
| `POST` | `/api/quote` | Required: `distance_km`, `weight_kg`, `stops`; optional `model=regression\|knn` |
| `POST` | `/api/risk` | Required: `weather`, `hub_load`, `distance_km` |
| `POST` | `/api/triage` | Required: `message` (5–2,000 characters) |

## Deploy with Docker

Generate an application key and build/run the image:

```powershell
$env:APP_KEY = (php artisan key:generate --show)
docker build -t aegis-logistics .
docker run --rm -p 8080:8080 -e APP_KEY=$env:APP_KEY aegis-logistics
```

Open `http://localhost:8080`. The container uses file-backed cache and sessions and does not require a database. For a persistent deployment, mount a writable volume at `/var/www/html/storage`; configure platform secrets through the deployment environment rather than committing them.
