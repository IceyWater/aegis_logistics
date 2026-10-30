# Delivery-Time Estimate

## What it does

This model estimates how long a delivery might take by finding past shipments that were similar to the one you entered.

## What information it uses

- Route type and area type
- Time of day
- Parcel size
- Distance
- Traffic level

## What you see on the screen

On the **Quote** page, choose **KNN delivery time** to see an estimated number of minutes. The chart and list show nearby examples from the real shipment records, including their delivery times. The model gives more influence to the closest matches.

The page also shows an average error measured when the model was tested on separate past examples. This helps describe the model overall; it is not a guaranteed error range for your delivery.

## Who might use it

A sender or recipient can use the estimate to get a rough idea of the wait. Dispatch or customer-service staff can look at similar past shipments when discussing an arrival time.

## Keep in mind

Similar past deliveries are only examples. This model does not find the best route, check live traffic, or guarantee an arrival time.
