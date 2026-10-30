# Aegis model guide

This guide explains what each of the six trained models does, who may use its output, and how to interpret what appears on its Aegis page. Each prediction is produced by a model fitted to its supplied CSV. Schematic graphics on `/guide` illustrate the page layout; they are not extra predictions.

For shorter, beginner-friendly explanations, see the separate guides: [shipping cost](./algorithms/linear-regression.md), [delivery time](./algorithms/knn-delivery-time.md), [late-delivery risk](./algorithms/late-delivery-risk.md), [first-attempt failure](./algorithms/first-attempt-failure.md), [customer-message triage](./algorithms/customer-message-triage.md), and [hub-volume forecasting](./algorithms/hub-volume-forecast.md).

## 1. Linear regression — shipping cost

**Business question:** Given a shipment's distance, weight, number of stops, and fuel price, what shipping cost is suggested by historical cost records?

- **Customer/sender:** Reviews a PHP estimate before choosing to send a parcel.
- **Company:** A pricing or customer-service agent can use it as an estimate when preparing a quote.
- **How it works:** It learns weights linking the shipment inputs with recorded costs, then combines those inputs through the fitted relationship to estimate a price.
- **What the model learns:** A regression relationship from the four numeric inputs to `actual_shipping_cost_php`. Features are standardized within a pipeline. Degree-two polynomial features are evaluated only if the linear model's held-out MAPE exceeds 5%.
- **What the screen shows:** Predicted cost; the selected regression model; model-wide holdout MAPE; and an ETA planning range from the separate KNN model. In the chart, historical points and a fitted line are a conceptual illustration.
- **How to read it:** The price is the model's estimate for the entered inputs. The 3.808% MAPE is the average percentage error on the held-out cost rows, not a guarantee or an individual quote's confidence interval.
- **Measured here:** MAE ₱8.4907, RMSE ₱10.5464, R² 0.99006, MAPE 3.808%.
- **Live page:** `/quote`, with **Linear cost** selected.

## 2. K-nearest neighbors — delivery time

**Business question:** How long did comparable past deliveries take?

- **Customer/sender/recipient:** Uses the result as an indicative delivery-time estimate.
- **Company:** Dispatch or customer-service staff can refer to similar shipments while planning or communicating an arrival estimate.
- **How it works:** It finds the most similar historical shipments. Closer matches have more influence on the delivery-time estimate than less similar ones.
- **What the model learns:** A `KNeighborsRegressor` compares one-hot encoded route type, area type, time of day, parcel size, and traffic, plus standardized distance. Its chosen neighbors' actual delivery times are combined with distance weights.
- **What the screen shows:** Predicted minutes, a list/scatter plot of nearest historical shipments, and the held-out mean absolute error. Each dot/list row corresponds to a real reference shipment.
- **How to read it:** The nearest records are analogies, not a route plan. The selected k is 15, chosen by cross-validation. Holdout MAE 6.4776 minutes summarizes the test split and is not a promised ± interval for one delivery.
- **Live page:** `/quote`, select **KNN delivery time**.

## 3. Support vector classifier — late-delivery risk

**Business question:** Given conditions known about a shipment, how strongly does the model score it as likely to be late?

- **Customer:** A recipient does not operate the checker. A company could use a reviewed warning to prepare a proactive update; this demo does not send one.
- **Company:** Dispatch can review the score, check capacity or alternate routing, and decide whether to communicate with a recipient.
- **How it works:** It learns a boundary between late and on-time examples and scores a new shipment. A training-fold-selected threshold turns that score into the displayed class.
- **What the model learns:** A class-balanced SVC using ordinal weather and scaled hub load, route distance, and driver workload. Linear and RBF kernels are compared with stratified cross-validation; the selected operating threshold is selected from out-of-fold training probabilities.
- **What the screen shows:** Late-class probability, ON TIME / AT RISK badge, threshold, and the three largest changes when one input at a time is replaced by a neutral profile (modal weather and median numeric values).
- **How to read it:** The badge uses the selected 23.865% threshold, not 50%. The factor list is a sensitivity comparison, not a causal explanation. It does not prove that changing a factor will change the outcome.
- **Measured here:** ROC-AUC 0.74213; late precision 0.35519, recall 0.50000, F1 0.41534. This is an imbalanced task: some alerts are false and some late deliveries are missed.
- **Live page:** `/risk`.

## 4. Decision tree classifier — first-attempt failure

**Business question:** Based on the recorded delivery context, does the tree classify the first attempt as likely to fail?

- **Customer/recipient:** This is mainly an internal signal; an operations team may use it to check instructions or contact details.
- **Company:** A delivery coordinator can inspect the conditions the fitted tree actually followed and decide whether manual follow-up is justified.
- **How it works:** The tree asks learned yes/no questions one at a time. Each answer chooses a branch until the input reaches a leaf with a class and probability.
- **What the model learns:** A maximum-depth-6 `DecisionTreeClassifier` using one-hot address, time-slot and day-type fields, plus previous failed deliveries and customer response.
- **What the screen shows:** Predicted class, failure probability, actual branch-by-branch path through the fitted tree, and a priority badge.
- **How to read it:** Each rule-path step is an actual split and branch for the submitted input. The output is a learned association, not proof of cause. The UI's HIGH/STANDARD priority badge is derived from the same 50% probability cutoff; it is not a separately trained severity model.
- **Measured here:** Holdout macro-F1 0.57017.
- **Live page:** `/failure`. The home page also displays a source-row example of a real tree path.

## 5. TF-IDF + Multinomial Naive Bayes — customer-message triage

**Business question:** Which support category most resembles a customer's written message?

- **Customer:** Enters a message and sees the leading suggested category.
- **Company:** A support agent can use the top category and suggested department as a triage aid. The demo does not create a ticket or change a live queue.
- **How it works:** Text is converted into weighted word and two-word-phrase signals. Naive Bayes estimates which category best matches those signals, assuming the text features contribute independently.
- **What the model learns:** Word-level TF-IDF unigrams and bigrams (`min_df=2`) feeding a Multinomial Naive Bayes classifier. It predicts six categories: damaged parcel, address problem, tracking request, missing parcel, reschedule request, and shipping fee.
- **What the screen shows:** The three leading class probabilities as horizontal bars, the top label, and a department suggestion mapped from that label.
- **How to read it:** These are the classifier's probabilities over its learned categories. A message can have mixed intent, unfamiliar wording, or little overlap with training language, so a person should confirm the routing.
- **Measured here:** Holdout macro-F1 1.000 on the supplied stratified split. This unusually strong score only describes this dataset/split and does not establish real-world support accuracy.
- **Response-time note:** The displayed −40% response-time improvement is an operational target, not a measured effect of this classifier.
- **Live page:** `/triage`.

## 6. Keras feed-forward neural network — hub volume

**Business question:** How many parcels might arrive at a selected hub each day over a chosen future horizon?

- **Customer:** Does not normally see the internal forecast; better planning may help the company prepare capacity.
- **Company:** A hub or workforce planner can review expected demand and use the peak-day estimate as one input to staffing discussions.
- **How it works:** Neural-network layers combine the hub, calendar, promotion, weather, and recent-volume features to predict each future day's parcel count.
- **What the model learns:** One network shared across North, South, East, and West hubs. Inputs include day-of-week, month, promotion, weather severity, holiday flag, parcel-volume lag features, rolling average, and hub one-hot features.
- **What the screen shows:** The latest 45 observed days (navy); forecast days in amber; a shaded absolute-error band; and the peak date/volume with a courier estimate.
- **How to read it:** The forecast horizon is 7, 14, or 30 days. The band is ± the 90th-percentile absolute error on the time holdout, not a calibrated probability interval. Couriers are estimated as `ceil(peak parcels / 150)`, based on a stated capacity assumption.
- **Measured here:** The final 91 dates per hub (2025-10-01 through 2025-12-30) were held out in time order; MAE 311.575 parcels and MAPE 9.99%. Forecasts start after the dataset's last recorded date (2025-12-30); recursive future lags can compound error.
- **Live page:** `/forecast`.

## Related screens

- **Model performance:** `/analytics` displays held-out confusion matrices, cost regression metrics, decision-tree feature importances, and daily forecast errors. In a confusion matrix, rows are actual labels and columns are predicted labels; diagonal cells are correct classifications.
- **Data and limitations:** `/about` lists the six CSVs and their fields. The records are not a representative live fleet or independently audited operational history.

Treat every output as decision support. Verify quotes, review alerts, keep a person responsible for customer contact and staffing decisions, and validate on representative data before any production use.
