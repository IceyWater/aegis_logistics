# First-Delivery-Attempt Check

## What it does

This model estimates whether the first attempt to deliver a parcel may fail.

## What information it uses

- Type of address
- Delivery time
- Whether it is a weekday or weekend
- How many earlier delivery attempts failed
- Whether the customer responded

## What you see on the screen

On the **Failure rules** page, you see a likely-to-fail or likely-to-succeed result, a percentage, and the questions the model followed to reach its result.

The questions are the actual steps in the trained decision tree. Each answer sends the shipment down a different branch until the model reaches its final result. The page also displays a priority label based on the same 50% cutoff as the prediction.

## Who might use it

Delivery staff can review the result and decide whether to double-check address details or contact the recipient. The model does not contact anyone automatically.

## Keep in mind

The rules describe patterns found in past records. They do not prove why a delivery failed, and the prediction should be checked by a person before acting on it.
