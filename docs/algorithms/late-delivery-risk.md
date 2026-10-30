# Late-Delivery Risk

## What it does

This model estimates how likely a shipment is to be late based on its conditions.

## What information it uses

- Weather
- How busy the hub is
- Route distance
- The driver's number of stops

## What you see on the screen

On the **Risk** page, enter those conditions to see a late-delivery percentage and an **AT RISK** or **ON TIME** label.

The label uses a cutoff learned while checking the model. It is not simply based on whether the percentage is above 50%. The page also lists conditions that changed the score most when compared one at a time with a typical example from the data.

## Who might use it

Dispatch staff can review the result and decide whether to check the route, look at available capacity, or prepare a customer update. The demo does not reroute a parcel or send a notification.

## Keep in mind

The percentage is an estimate, not certainty. The listed conditions show how the model's score changes; they do not prove that a condition caused a delay. Some alerts will be wrong, and some late deliveries will not be flagged.
