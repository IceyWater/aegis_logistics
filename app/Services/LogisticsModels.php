<?php

namespace App\Services;

use DateTimeImmutable;

class LogisticsModels
{
    private array $shipments = [];
    private array $tickets = [];
    private array $volumeHistory = [];
    private array $regression = [];
    private array $etaRegression = [];
    private array $svmWeights = [];
    private array $svmCalibration = [1.0, 0.0];
    private array $decisionTree = [];
    private array $bayes = [];
    private array $neuralWeights = [];
    private array $neuralBiases = [];
    private array $hubMeans = ['Northline' => 0.0, 'Riverside' => 0.0, 'Eastgate' => 0.0];
    private array $categoryNames = ['Address issue', 'Damaged parcel', 'Where is my parcel'];
    private array $stopWords = ['a', 'an', 'and', 'are', 'at', 'be', 'been', 'can', 'for', 'from', 'has', 'have', 'i', 'in', 'is', 'it', 'me', 'my', 'of', 'on', 'or', 'the', 'to', 'was', 'we', 'with', 'you', 'your'];

    public function __construct()
    {
        mt_srand(731904);
        $this->generateShipments();
        $this->generateTickets();
        $this->generateVolumes();
        $this->trainRegression();
        $this->trainSvm();
        $this->trainDecisionTree();
        $this->trainBayes();
        $this->trainNeuralNetwork();
    }

    public function models(): array
    {
        return [
            ['id' => 'regression', 'name' => 'Linear regression', 'use' => 'Price + ETA', 'inputs' => 'Distance, weight, stops', 'output' => 'A cost estimate and arrival window'],
            ['id' => 'knn', 'name' => 'K-nearest neighbors', 'use' => 'Comparable quotes', 'inputs' => 'Distance, weight, stops', 'output' => 'A quote grounded in five similar shipments'],
            ['id' => 'svm', 'name' => 'Support vector machine', 'use' => 'Delay risk', 'inputs' => 'Weather, hub load, distance', 'output' => 'On-time likelihood and contributing signals'],
            ['id' => 'tree', 'name' => 'Decision tree', 'use' => 'Failure handling', 'inputs' => 'Weather, hub load, distance', 'output' => 'A traceable risk path and priority'],
            ['id' => 'bayes', 'name' => 'Naive Bayes', 'use' => 'Ticket routing', 'inputs' => 'Customer message', 'output' => 'Category confidence and support queue'],
            ['id' => 'neural', 'name' => 'Neural network', 'use' => 'Hub volume', 'inputs' => 'Season, weekday, hub, trend', 'output' => 'A 7–30 day parcel forecast'],
        ];
    }

    public function quote(float $distance, float $weight, int $stops, string $model = 'regression'): array
    {
        $features = [$distance / 500, $weight / 50, $stops / 12];
        $cost = $this->regression[0] + $this->regression[1] * $features[0] + $this->regression[2] * $features[1] + $this->regression[3] * $features[2];
        $eta = $this->etaRegression[0] + $this->etaRegression[1] * $features[0] + $this->etaRegression[2] * $features[1] + $this->etaRegression[3] * $features[2];
        $neighbors = [];

        if ($model === 'knn') {
            $ranked = [];
            foreach ($this->shipments as $shipment) {
                $d = sqrt(
                    (($distance - $shipment['distance_km']) / 500) ** 2
                    + (($weight - $shipment['weight_kg']) / 50) ** 2
                    + (($stops - $shipment['stops']) / 12) ** 2
                );
                $ranked[] = ['distance' => $d, 'shipment' => $shipment];
            }
            usort($ranked, fn ($a, $b) => $a['distance'] <=> $b['distance']);
            $nearest = array_slice($ranked, 0, 5);
            $weightTotal = 0;
            $cost = 0;
            $eta = 0;
            foreach ($nearest as $item) {
                $factor = 1 / max($item['distance'], 0.002);
                $weightTotal += $factor;
                $cost += $item['shipment']['cost'] * $factor;
                $eta += $item['shipment']['eta_hours'] * $factor;
                $neighbors[] = [
                    'distance_km' => $item['shipment']['distance_km'],
                    'weight_kg' => $item['shipment']['weight_kg'],
                    'cost' => round($item['shipment']['cost'], 2),
                    'eta_hours' => round($item['shipment']['eta_hours'], 1),
                ];
            }
            $cost /= $weightTotal;
            $eta /= $weightTotal;
        }

        return [
            'model' => $model,
            'price' => round(max(4.5, $cost), 2),
            'eta' => ['min' => max(1, round($eta - 1)), 'max' => max(2, round($eta + 2))],
            'confidence' => 0.95,
            'neighbors' => $neighbors,
        ];
    }

    public function risk(string $weather, string $load, float $distance): array
    {
        $x = $this->riskFeatures($weather, $load, $distance);
        $score = $this->svmCalibration[0] * $this->svmScore($x) + $this->svmCalibration[1];
        $probability = 1 / (1 + exp(-max(-12, min(12, $score))));
        $atRisk = $probability >= 0.5;
        $factors = [];
        if ($weather !== 'clear') {
            $factors[] = ucfirst($weather) . ' weather';
        }
        if ($load !== 'low') {
            $factors[] = ucfirst($load) . ' hub load';
        }
        if ($distance >= 250) {
            $factors[] = 'Long route distance';
        }
        if ($factors === []) {
            $factors[] = 'Clear conditions and available hub capacity';
        }

        $path = $this->treePath($x);

        return [
            'status' => $atRisk ? 'AT RISK' : 'ON TIME',
            'probability' => round($probability * 100),
            'on_time_probability' => round((1 - $probability) * 100),
            'factors' => $factors,
            'priority' => $path['priority'],
            'decision_path' => $path['steps'],
            'actions' => $atRisk ? ['Reserve an alternate route', 'Notify the customer with an updated window'] : ['Keep the planned route', 'Send the standard delivery update'],
        ];
    }

    public function triage(string $message): array
    {
        $scores = [];
        $tokens = $this->tokenize($message);
        $totalWords = array_sum($this->bayes['word_totals']);
        foreach ($this->categoryNames as $category => $name) {
            $score = log(($this->bayes['class_totals'][$category] + 1) / (count($this->tickets) + 3));
            foreach ($tokens as $token) {
                $count = $this->bayes['words'][$category][$token] ?? 0;
                $score += log(($count + 1) / ($this->bayes['word_totals'][$category] + max(1, $totalWords / 3)));
            }
            $scores[$category] = $score;
        }
        $max = max($scores);
        $exp = array_map(fn ($score) => exp($score - $max), $scores);
        $sum = array_sum($exp);
        arsort($exp);
        $departments = ['Address issue' => 'Address resolution', 'Damaged parcel' => 'Claims & care', 'Where is my parcel' => 'Shipment tracking'];

        return [
            'predictions' => array_map(fn ($index, $confidence) => ['category' => $this->categoryNames[$index], 'confidence' => round($confidence / $sum * 100)], array_keys($exp), array_values($exp)),
            'department' => $departments[$this->categoryNames[array_key_first($exp)]],
            'response_improvement' => 40,
        ];
    }

    public function forecast(string $hub, int $days, bool $promotion = false, bool $weather = false): array
    {
        $hub = array_key_exists($hub, $this->hubMeans) ? $hub : 'Northline';
        $lastDate = new DateTimeImmutable('yesterday');
        $start = $lastDate->modify('-729 days');
        $hubIndex = array_search($hub, array_keys($this->hubMeans), true);
        $history = array_slice($this->volumeHistory[$hub], -45);
        $items = [];
        for ($offset = 1; $offset <= $days; $offset++) {
            $date = $lastDate->modify("+{$offset} days");
            $dayIndex = 730 + $offset;
            $prediction = $this->neuralPredict($dayIndex, $date, (int) $hubIndex);
            $adjustment = ($promotion ? 0.16 : 0) + ($weather ? 0.11 : 0);
            $prediction = (int) round($prediction * (1 + $adjustment));
            $spread = (int) max(8, round($prediction * (0.08 + $offset * 0.001)));
            $items[] = [
                'date' => $date->format('M j'),
                'value' => max(0, $prediction),
                'low' => max(0, $prediction - $spread),
                'high' => $prediction + $spread,
            ];
        }
        $peak = max(array_column($items, 'value'));

        return [
            'hub' => $hub,
            'days' => $days,
            'history' => array_map(fn ($row) => ['date' => (new DateTimeImmutable($row['date']))->format('M j'), 'value' => $row['value']], $history),
            'forecast' => $items,
            'peak' => $peak,
            'couriers' => (int) ceil($peak / 62),
        ];
    }

    public function network(): array
    {
        $routes = [
            ['from' => 'Northline', 'to' => 'Riverside', 'delay' => false],
            ['from' => 'Northline', 'to' => 'Eastgate', 'delay' => true],
            ['from' => 'Riverside', 'to' => 'Eastgate', 'delay' => false],
            ['from' => 'Eastgate', 'to' => 'Northline', 'delay' => false],
            ['from' => 'Riverside', 'to' => 'Northline', 'delay' => true],
        ];
        $recent = array_slice($this->shipments, -8);

        return [
            'hubs' => [
                ['name' => 'Northline', 'x' => 19, 'y' => 36, 'volume' => $this->hubMeans['Northline']],
                ['name' => 'Riverside', 'x' => 52, 'y' => 66, 'volume' => $this->hubMeans['Riverside']],
                ['name' => 'Eastgate', 'x' => 79, 'y' => 29, 'volume' => $this->hubMeans['Eastgate']],
            ],
            'routes' => $routes,
            'shipments' => array_map(fn ($item, $index) => [
                'id' => 'AG-' . str_pad((string) (($index * 173 + 2841) % 99999), 5, '0', STR_PAD_LEFT),
                'status' => $item['on_time'] ? 'ON ROUTE' : 'REVIEW',
                'route' => $routes[$index % count($routes)]['from'] . ' → ' . $routes[$index % count($routes)]['to'],
                'eta' => (int) round($item['eta_hours']) . 'h',
            ], $recent, array_keys($recent)),
        ];
    }

    public function analytics(): array
    {
        $svmMatrix = [[0, 0], [0, 0]];
        $total = count($this->shipments);
        $regressionTest = array_slice($this->shipments, (int) ($total * 0.8));
        $svmTest = array_slice($this->shipments, (int) ($total * 0.85));
        $absoluteError = 0.0;
        $actualCosts = array_column($regressionTest, 'cost');
        $actualMean = array_sum($actualCosts) / max(1, count($actualCosts));
        $squaredError = 0.0;
        $totalVariance = 0.0;
        foreach ($regressionTest as $shipment) {
            $costError = $this->regressionPrediction($shipment['distance_km'], $shipment['weight_kg'], $shipment['stops']) - $shipment['cost'];
            $absoluteError += abs($costError);
            $squaredError += $costError ** 2;
            $totalVariance += ($shipment['cost'] - $actualMean) ** 2;
        }
        foreach ($svmTest as $shipment) {
            $actual = $shipment['on_time'] ? 0 : 1;
            $predicted = $this->risk($shipment['weather'], $shipment['hub_load'], $shipment['distance_km'])['status'] === 'AT RISK' ? 1 : 0;
            $svmMatrix[$actual][$predicted]++;
        }
        $bayesMatrix = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
        foreach ($this->tickets as $index => $ticket) {
            if ($index % 100 >= 80) {
                $predictions = $this->triage($ticket['message'])['predictions'];
                $predicted = array_search($predictions[0]['category'], $this->categoryNames, true);
                $bayesMatrix[$ticket['category']][$predicted]++;
            }
        }
        $forecastErrors = array_fill(0, 14, 0.0);
        $forecastErrorCount = 0;
        $historyStart = (new DateTimeImmutable('yesterday'))->modify('-729 days');
        foreach (array_keys($this->hubMeans) as $hubIndex => $hub) {
            for ($day = 716; $day < 730; $day++) {
                $date = $historyStart->modify("+{$day} days");
                $forecastErrors[$day - 716] += abs($this->neuralPredict($day, $date, $hubIndex) - $this->volumeHistory[$hub][$day]['value']);
                $forecastErrorCount++;
            }
        }
        $neuralMae = array_sum($forecastErrors) / max(1, $forecastErrorCount);
        $forecastErrors = array_map(fn ($error) => round($error / count($this->hubMeans)), $forecastErrors);
        $importance = array_fill(0, 5, 0.0);
        $this->collectTreeImportance($this->decisionTree, $importance);
        $importanceTotal = array_sum($importance);
        $importanceNames = ['Rain', 'Storm', 'Medium hub load', 'High hub load', 'Distance'];
        $features = [];
        foreach ($importance as $index => $value) {
            if ($value > 0) {
                $features[] = ['name' => $importanceNames[$index], 'value' => (int) round($value / $importanceTotal * 100)];
            }
        }
        usort($features, fn ($a, $b) => $b['value'] <=> $a['value']);

        return [
            'regression' => ['mae' => round($absoluteError / max(1, count($regressionTest)), 2), 'r2' => round(1 - ($squaredError / max(0.001, $totalVariance)), 3)],
            'svm' => ['labels' => ['On time', 'At risk'], 'matrix' => $svmMatrix],
            'bayes' => ['labels' => $this->categoryNames, 'matrix' => $bayesMatrix],
            'tree' => ['features' => $features],
            'neural' => ['mae' => round($neuralMae, 1), 'points' => $forecastErrors],
            'dataset' => ['shipments' => count($this->shipments), 'tickets' => count($this->tickets), 'hub_days' => array_sum(array_map('count', $this->volumeHistory))],
        ];
    }

    public function exportShipments(): array
    {
        return $this->shipments;
    }

    public function exportTickets(): array
    {
        return array_map(fn ($ticket) => ['message' => $ticket['message'], 'category' => $this->categoryNames[$ticket['category']]], $this->tickets);
    }

    public function exportVolumes(): array
    {
        $rows = [];
        foreach ($this->volumeHistory as $hub => $history) {
            foreach ($history as $entry) {
                $rows[] = ['date' => $entry['date'], 'hub' => $hub, 'parcel_volume' => $entry['value']];
            }
        }
        return $rows;
    }

    private function generateShipments(): void
    {
        $weatherWeights = ['clear' => 0.62, 'rain' => 0.29, 'storm' => 0.09];
        $loads = ['low', 'medium', 'high'];
        for ($i = 0; $i < 900; $i++) {
            $distance = mt_rand(1, 500);
            $weight = mt_rand(1, 500) / 10;
            $stops = mt_rand(1, 12);
            $roll = mt_rand(1, 100) / 100;
            $weather = $roll <= $weatherWeights['clear'] ? 'clear' : ($roll <= 0.91 ? 'rain' : 'storm');
            $load = $loads[mt_rand(0, 2)];
            $risk = -3.1 + ($weather === 'rain' ? 0.85 : ($weather === 'storm' ? 1.8 : 0))
                + ($load === 'medium' ? 0.75 : ($load === 'high' ? 1.55 : 0))
                + ($distance / 500 * 1.35);
            $onTime = (mt_rand(1, 1000) / 1000) > (1 / (1 + exp(-$risk)));
            $noise = (mt_rand(0, 200) - 100) / 100;
            $this->shipments[] = [
                'distance_km' => $distance,
                'weight_kg' => $weight,
                'stops' => $stops,
                'weather' => $weather,
                'hub_load' => $load,
                'on_time' => $onTime ? 1 : 0,
                'cost' => max(4.5, 4.5 + 0.42 * $distance + 0.34 * $weight + 1.8 * $stops + $noise),
                'eta_hours' => $distance / 46 + $stops * 0.2 + $weight * 0.009 + abs($noise) * 0.4,
            ];
        }
    }

    private function generateTickets(): void
    {
        $examples = [
            ['I entered the wrong address and the apartment number is missing', 'Please correct my delivery address before the courier arrives', 'The street address on my order is incorrect', 'The driver cannot find my building entrance', 'I need to change the delivery address'],
            ['My parcel arrived broken and the box is crushed', 'The item inside is damaged from shipping', 'The package was torn open and contents are missing', 'I received a cracked item in a damaged box', 'Please help me file a damage claim'],
            ['Where is my parcel? The tracking has not updated', 'Can you tell me when my delivery will arrive?', 'My package is still in transit after three days', 'The tracking says delayed and I need an update', 'I have not received my shipment yet'],
        ];
        for ($category = 0; $category < 3; $category++) {
            for ($i = 0; $i < 100; $i++) {
                $message = $examples[$category][$i % count($examples[$category])];
                if ($i % 4 === 0) {
                    $message .= ' ' . ['please', 'today', 'urgent', 'thank you'][$i % 4];
                }
                $this->tickets[] = ['message' => $message, 'category' => $category];
            }
        }
    }

    private function generateVolumes(): void
    {
        $hubs = ['Northline' => 248, 'Riverside' => 191, 'Eastgate' => 226];
        $today = new DateTimeImmutable('yesterday');
        $start = $today->modify('-729 days');
        foreach ($hubs as $hub => $baseline) {
            $this->volumeHistory[$hub] = [];
            $sum = 0;
            for ($i = 0; $i < 730; $i++) {
                $date = $start->modify("+{$i} days");
                $season = sin(($i / 365.25) * M_PI * 2 - 0.8);
                $week = cos(((int) $date->format('N') - 2) / 7 * M_PI * 2);
                $noise = sin($i * 12.9898 + array_search($hub, array_keys($hubs), true) * 78.233) * 15;
                $value = max(0, (int) round($baseline + $season * 24 + $week * 17 + ($i / 730 * 13) + $noise));
                $this->volumeHistory[$hub][] = ['date' => $date->format('Y-m-d'), 'value' => $value];
                $sum += $value;
            }
            $this->hubMeans[$hub] = $sum / 730;
        }
    }

    private function trainRegression(): void
    {
        $costMatrix = array_fill(0, 4, array_fill(0, 5, 0.0));
        $etaMatrix = array_fill(0, 4, array_fill(0, 5, 0.0));
        foreach (array_slice($this->shipments, 0, (int) (count($this->shipments) * 0.8)) as $row) {
            $x = [1, $row['distance_km'] / 500, $row['weight_kg'] / 50, $row['stops'] / 12];
            foreach ($x as $i => $value) {
                for ($j = 0; $j < 4; $j++) {
                    $costMatrix[$i][$j] += $value * $x[$j];
                    $etaMatrix[$i][$j] += $value * $x[$j];
                }
                $costMatrix[$i][4] += $value * $row['cost'];
                $etaMatrix[$i][4] += $value * $row['eta_hours'];
            }
        }
        $this->regression = $this->solve($costMatrix);
        $this->etaRegression = $this->solve($etaMatrix);
    }

    private function trainSvm(): void
    {
        $this->svmWeights = array_fill(0, 6, 0.0);
        $trainingEnd = (int) (count($this->shipments) * 0.7);
        $calibrationEnd = (int) (count($this->shipments) * 0.85);
        $training = array_slice($this->shipments, 0, $trainingEnd);
        for ($epoch = 0; $epoch < 24; $epoch++) {
            $rate = 0.025 / (1 + $epoch * 0.04);
            foreach ($training as $row) {
                $x = $this->riskFeatures($row['weather'], $row['hub_load'], $row['distance_km']);
                $label = $row['on_time'] ? -1 : 1;
                $margin = $this->svmWeights[0];
                foreach ($x as $index => $value) {
                    $margin += $this->svmWeights[$index + 1] * $value;
                }
                $violatesMargin = $label * $margin < 1;
                if ($violatesMargin) {
                    $this->svmWeights[0] += $rate * $label;
                }
                for ($i = 0; $i < count($x); $i++) {
                    $this->svmWeights[$i + 1] *= (1 - $rate * 0.001);
                    if ($violatesMargin) {
                        $this->svmWeights[$i + 1] += $rate * $label * $x[$i];
                    }
                }
            }
            $this->calibrateSvm(array_slice($this->shipments, $trainingEnd, $calibrationEnd - $trainingEnd));
        }
    }

    private function trainDecisionTree(): void
    {
        $rows = array_map(fn ($row) => [
            'x' => $this->riskFeatures($row['weather'], $row['hub_load'], $row['distance_km']),
            'label' => $row['on_time'] ? 0 : 1,
        ], array_slice($this->shipments, 0, (int) (count($this->shipments) * 0.8)));
        $this->decisionTree = $this->buildTree($rows, 0);
    }

    private function trainBayes(): void
    {
        $this->bayes = ['words' => [[], [], []], 'word_totals' => [0, 0, 0], 'class_totals' => [0, 0, 0]];
        foreach ($this->tickets as $index => $ticket) {
            if ($index % 100 >= 80) {
                continue;
            }
            $class = $ticket['category'];
            $this->bayes['class_totals'][$class]++;
            foreach ($this->tokenize($ticket['message']) as $token) {
                $this->bayes['words'][$class][$token] = ($this->bayes['words'][$class][$token] ?? 0) + 1;
                $this->bayes['word_totals'][$class]++;
            }
        }
    }

    private function trainNeuralNetwork(): void
    {
        $inputs = 8;
        $hidden = 9;
        $this->neuralWeights = [[], []];
        $this->neuralBiases = [array_fill(0, $hidden, 0.0), [0.0]];
        for ($h = 0; $h < $hidden; $h++) {
            for ($i = 0; $i < $inputs; $i++) {
                $this->neuralWeights[0][$h][$i] = (mt_rand(0, 1000) / 1000 - 0.5) * 0.25;
            }
            $this->neuralWeights[1][0][$h] = (mt_rand(0, 1000) / 1000 - 0.5) * 0.25;
        }
        $examples = [];
        $trainingStart = (new DateTimeImmutable('yesterday'))->modify('-729 days');
        foreach (array_keys($this->hubMeans) as $hubIndex => $hub) {
            foreach ($this->volumeHistory[$hub] as $day => $row) {
                if ($day >= 716) {
                    continue;
                }
                $date = $trainingStart->modify("+{$day} days");
                $target = ($row['value'] - 180) / 100;
                $examples[] = [$this->neuralFeatures($day, $date, $hubIndex), $target];
            }
        }
        for ($epoch = 0; $epoch < 18; $epoch++) {
            $rate = 0.0035 / (1 + $epoch * 0.025);
            foreach ($examples as [$x, $target]) {
                $hiddenValues = [];
                foreach ($this->neuralWeights[0] as $index => $weights) {
                    $sum = $this->neuralBiases[0][$index];
                    foreach ($weights as $j => $weight) {
                        $sum += $weight * $x[$j];
                    }
                    $hiddenValues[$index] = tanh($sum);
                }
                $prediction = $this->neuralBiases[1][0];
                foreach ($hiddenValues as $index => $value) {
                    $prediction += $this->neuralWeights[1][0][$index] * $value;
                }
                $error = max(-3, min(3, $prediction - $target));
                foreach ($hiddenValues as $index => $value) {
                    $outputWeight = $this->neuralWeights[1][0][$index];
                    $this->neuralWeights[1][0][$index] -= $rate * $error * $value;
                    $gradient = $error * $outputWeight * (1 - $value * $value);
                    foreach ($x as $j => $input) {
                        $this->neuralWeights[0][$index][$j] -= $rate * $gradient * $input;
                    }
                    $this->neuralBiases[0][$index] -= $rate * $gradient;
                }
                $this->neuralBiases[1][0] -= $rate * $error;
            }
        }
    }

    private function neuralPredict(int $dayIndex, DateTimeImmutable $date, int $hubIndex): float
    {
        $x = $this->neuralFeatures($dayIndex, $date, $hubIndex);
        $output = $this->neuralBiases[1][0];
        foreach ($this->neuralWeights[0] as $index => $weights) {
            $sum = $this->neuralBiases[0][$index];
            foreach ($weights as $j => $weight) {
                $sum += $weight * $x[$j];
            }
            $output += $this->neuralWeights[1][0][$index] * tanh($sum);
        }
        return max(20, 180 + $output * 100);
    }

    private function neuralFeatures(int $dayIndex, DateTimeImmutable $date, int $hubIndex): array
    {
        $dayOfYear = (int) $date->format('z');
        $dayOfWeek = (int) $date->format('N');
        return [
            sin(($dayOfYear / 365.25) * M_PI * 2),
            cos(($dayOfYear / 365.25) * M_PI * 2),
            sin(($dayOfWeek / 7) * M_PI * 2),
            cos(($dayOfWeek / 7) * M_PI * 2),
            min(1, $dayIndex / 730),
            $hubIndex === 0 ? 1 : 0,
            $hubIndex === 1 ? 1 : 0,
            $hubIndex === 2 ? 1 : 0,
        ];
    }

    private function riskFeatures(string $weather, string $load, float $distance): array
    {
        return [
            $weather === 'rain' ? 1 : 0,
            $weather === 'storm' ? 1 : 0,
            $load === 'medium' ? 1 : 0,
            $load === 'high' ? 1 : 0,
            $distance / 500,
        ];
    }

    private function svmScore(array $features): float
    {
        $score = $this->svmWeights[0];
        foreach ($features as $index => $value) {
            $score += $this->svmWeights[$index + 1] * $value;
        }
        return $score;
    }

    private function calibrateSvm(array $rows): void
    {
        $slope = 1.0;
        $intercept = 0.0;
        for ($iteration = 0; $iteration < 500; $iteration++) {
            $slopeGradient = 0.0;
            $interceptGradient = 0.0;
            foreach ($rows as $row) {
                $score = $this->svmScore($this->riskFeatures($row['weather'], $row['hub_load'], $row['distance_km']));
                $prediction = 1 / (1 + exp(-max(-12, min(12, $slope * $score + $intercept))));
                $label = $row['on_time'] ? 0 : 1;
                $slopeGradient += ($prediction - $label) * $score;
                $interceptGradient += $prediction - $label;
            }
            $rate = 0.1 / count($rows);
            $slope = max(0.05, min(10, $slope - $rate * $slopeGradient));
            $intercept = max(-8, min(8, $intercept - $rate * $interceptGradient));
        }
        $this->svmCalibration = [$slope, $intercept];
    }

    private function treePath(array $features): array
    {
        $node = $this->decisionTree;
        $steps = [];
        $names = ['Rain', 'Storm', 'Medium hub load', 'High hub load', 'Distance'];
        while (isset($node['feature'])) {
            $value = $features[$node['feature']];
            $left = $value <= $node['threshold'];
            $steps[] = [
                'rule' => $names[$node['feature']] . ($node['feature'] === 4 ? ($left ? ' ≤ ' : ' > ') . (int) ($node['threshold'] * 500) . ' km' : ($left ? ' = no' : ' = yes')),
                'result' => $left ? 'continue' : 'elevated signal',
            ];
            $node = $left ? $node['left'] : $node['right'];
        }
        return ['steps' => $steps, 'priority' => $node['label'] === 1 ? 'HIGH PRIORITY' : 'STANDARD PRIORITY'];
    }

    private function regressionPrediction(float $distance, float $weight, int $stops): float
    {
        return $this->regression[0]
            + $this->regression[1] * ($distance / 500)
            + $this->regression[2] * ($weight / 50)
            + $this->regression[3] * ($stops / 12);
    }

    private function collectTreeImportance(array $node, array &$importance): void
    {
        if (! isset($node['feature'])) {
            return;
        }
        $importance[$node['feature']] += $node['gain'] * $node['samples'];
        $this->collectTreeImportance($node['left'], $importance);
        $this->collectTreeImportance($node['right'], $importance);
    }

    private function buildTree(array $rows, int $depth): array
    {
        $positives = array_sum(array_column($rows, 'label'));
        $majority = $positives >= count($rows) / 2 ? 1 : 0;
        if ($depth >= 3 || count($rows) < 24 || $positives === 0 || $positives === count($rows)) {
            return ['label' => $majority];
        }
        $best = null;
        $parentGini = $this->gini($rows);
        for ($feature = 0; $feature < 4; $feature++) {
            foreach ([0.5] as $threshold) {
                $candidate = $this->splitRows($rows, $feature, $threshold);
                if (count($candidate[0]) < 8 || count($candidate[1]) < 8) {
                    continue;
                }
                $score = (count($candidate[0]) * $this->gini($candidate[0]) + count($candidate[1]) * $this->gini($candidate[1])) / count($rows);
                if ($best === null || $score < $best['score']) {
                    $best = ['feature' => $feature, 'threshold' => $threshold, 'groups' => $candidate, 'score' => $score];
                }
            }
        }
        foreach ([0.25, 0.4, 0.55, 0.7, 0.85] as $threshold) {
            $candidate = $this->splitRows($rows, 4, $threshold);
            if (count($candidate[0]) < 8 || count($candidate[1]) < 8) {
                continue;
            }
            $score = (count($candidate[0]) * $this->gini($candidate[0]) + count($candidate[1]) * $this->gini($candidate[1])) / count($rows);
            if ($best === null || $score < $best['score']) {
                $best = ['feature' => 4, 'threshold' => $threshold, 'groups' => $candidate, 'score' => $score];
            }
        }
        if ($best === null || $best['score'] >= $parentGini) {
            return ['label' => $majority];
        }
        return [
            'feature' => $best['feature'],
            'threshold' => $best['threshold'],
            'gain' => $parentGini - $best['score'],
            'samples' => count($rows),
            'left' => $this->buildTree($best['groups'][0], $depth + 1),
            'right' => $this->buildTree($best['groups'][1], $depth + 1),
        ];
    }

    private function splitRows(array $rows, int $feature, float $threshold): array
    {
        $groups = [[], []];
        foreach ($rows as $row) {
            $groups[$row['x'][$feature] <= $threshold ? 0 : 1][] = $row;
        }
        return $groups;
    }

    private function gini(array $rows): float
    {
        if ($rows === []) {
            return 0;
        }
        $positive = array_sum(array_column($rows, 'label')) / count($rows);
        return 2 * $positive * (1 - $positive);
    }

    private function tokenize(string $text): array
    {
        preg_match_all('/[a-z]{2,}/', strtolower($text), $matches);
        return array_values(array_filter($matches[0], fn ($word) => ! in_array($word, $this->stopWords, true)));
    }

    private function solve(array $matrix): array
    {
        $size = count($matrix);
        for ($column = 0; $column < $size; $column++) {
            $pivot = $matrix[$column][$column];
            for ($j = $column; $j <= $size; $j++) {
                $matrix[$column][$j] /= $pivot;
            }
            for ($row = 0; $row < $size; $row++) {
                if ($row === $column) {
                    continue;
                }
                $factor = $matrix[$row][$column];
                for ($j = $column; $j <= $size; $j++) {
                    $matrix[$row][$j] -= $factor * $matrix[$column][$j];
                }
            }
        }
        return array_map(fn ($row) => $row[$size], $matrix);
    }
}
