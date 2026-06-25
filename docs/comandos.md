# Generar pago
curl -X POST https://payments-towit-six.vercel.app/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer qv4GdvIbtPVJJcZe6O7OmMWcOYA/l0VlSJtLQgjMnI0=" \
  -d '{
    "tripId": "TRP-TEST-005",
    "clerkId": "CLERK_ID",
    "amount": 15000.50
  }'

# Generar reembolso
curl -X POST https://payments-towit-six.vercel.app/api/refunds \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer qv4GdvIbtPVJJcZe6O7OmMWcOYA/l0VlSJtLQgjMnI0=" \
  -d '{
    "tripId": "TRP-TEST-005",
    "clerkId": "CLERK_ID",
    "refundType": "TOTAL"
  }'

# Generar desembolso
curl -X POST https://payments-towit-six.vercel.app/api/disbursements \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer qv4GdvIbtPVJJcZe6O7OmMWcOYA/l0VlSJtLQgjMnI0=" \
  -d '{
    "tripId": "TRP-TEST-005",
    "clerkId": "CLERK_ID",
    "feePercentage": 15
  }'