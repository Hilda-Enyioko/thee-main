# Handoff: Automated Customer Notifications + Plan Recommendations

**For:** Nedu
**You can read this without any technical background. Technical details are in the "For the workflow builder" boxes.**

---

## 1. What TheeInsurance is, in one minute

TheeInsurance sells insurance through other businesses (we call them **partners**). A partner's customer buys a policy, pays, and later may renew it. Customers **never log in to TheeInsurance**. They don't know our name. They know the partner's name.

So every message you send must look like it comes from the **partner**, never from "TheeInsurance".

## 2. What you are building

| # | Automation | In plain words |
|---|---|---|
| 1 | **Payment successful email** | Customer paid, so tell them they're covered. |
| 2 | **Payment failed email** | Their payment didn't go through, so tell them kindly and give them a button to try again. |
| 3 | **Renewal reminder email** | Their policy ends soon, so remind them 30, 7 and 1 days before, with a button to renew. |
| 4 | **Plan recommendation** | A partner asks "which plans suit this customer?" and you decide and send back the best 1 to 5 plans, with a reason for each. |

**Do NOT build: Approved / Rejected claim emails.** These are already handled as part of the Claims work you finished. Skip them.

All emails go to the **customer's email address**, which comes inside every message we send you.

## 3. How it works (the "doorbell" idea)

When something happens on our side (a payment succeeds, a renewal is coming up), our system rings your **doorbell**. The doorbell carries a package of information, called an **event**. Your workflow wakes up, reads the package, and sends the email.

You do not need to ask us for anything. **Everything you need to write the email is inside the package.**

Four doorbells, four automations:

| Doorbell name | Rings when | You do |
|---|---|---|
| `subscription.payment_succeeded` | A payment is confirmed | Send the "Payment received" email |
| `subscription.payment_failed` | The payment provider says the payment failed | Send the "Payment failed" email |
| `subscription.renewal_due` | A policy ends within 30, 7 or 1 days | Send the "Renewal reminder" email |
| `recommendation.requested` | A partner asks for recommendations | Run the recommendation (see section 6) |

> **For the workflow builder:** register one HTTPS URL per event with `POST /api/v1/service/register/` using your service-account token (body: `{"webhooks":[{"event":"...","url":"https://..."}]}`). One URL per event.

## 4. Before you start: what you need from us

We will send you these privately (never in a chat group or email):

1. **Client ID and Client Secret.** Your login for our system.
2. **Outbound token.** Proves a message really came from us.
3. **Signing secret.** Lets you check a message wasn't faked or changed.

Your login lasts **10 days**. After that, use the Client ID and Secret again to get a fresh one.

> **For the workflow builder:** get tokens at `POST /api/v1/auth/service-account/token/`. Incoming requests carry `Authorization: Bearer <outbound token>` plus `X-TheeInsurance-Timestamp` and `X-TheeInsurance-Signature` (`v1=` + HMAC-SHA256 of `"<timestamp>." + raw body` with the signing secret). Reject anything older than 5 minutes or with a bad signature.

## 5. Notification emails

### Rules that apply to all three emails

1. **Reply "OK" fast.** As soon as your workflow receives a package, answer straight away, then send the email. If you take longer than 10 seconds, our system thinks it failed and sends it again.
2. **Never send the same email twice.** Every package has a unique number in the `X-TheeInsurance-Event-Id` header. Keep a list of numbers you've handled. If you see one again, do nothing.
3. **Sign off as the partner.** Use `partner.name` as the sender name and sign-off.
4. **Use the customer's first name:** `customer.first_name`.
5. **Show money as Naira**, e.g. ₦85,000.00.
6. **Format dates in words**, e.g. "20 October 2026".
7. **Do not add anything private.** The package deliberately has no ID numbers or bank details.

### What is inside the package (all three emails)

| Field | Meaning | Example |
|---|---|---|
| `customer.email` | Where to send the email | chidi@example.com |
| `customer.first_name` | For "Hi Chidi," | Chidi |
| `plan.name` | The insurance product | Motor Comprehensive Plus |
| `plan.category` | Motor or Travel | Motor |
| `amount` | Price in Naira | 85000.00 |
| `start_date`, `end_date` | When cover starts and ends | 2026-10-20, 2027-10-20 |
| `provider.name` | The insurance company | Sunrise Assurance Plc |
| `distributor` | The seller, if there is one (can be empty) | QuickCover Ltd |
| `partner.name` | **The brand the customer knows. Use this as the sender.** | QuickCover Ltd |

### Email 1: Payment successful

Extra fields: `payment.reference`, `payment.amount`, `payment.paid_at`, and `payment.type`, which is `new_subscription` or `renewal`.

Say:
- Thank you, we received ₦{amount}.
- If `payment.type` is `renewal`: "Your cover has been extended until {end_date}". Otherwise: "You are covered from {start_date} to {end_date}".
- Show the plan name, provider name and payment reference.
- There is no button. Nothing for the customer to do.

### Email 2: Payment failed

Extra fields: `reason` (the bank's message, such as "Insufficient Funds"), `payment.reference`, and **`action_url`**.

Say:
- Be kind, not alarming. "Your payment of ₦{amount} for {plan.name} didn't go through."
- Put `reason` in friendly words. Don't paste it raw if it looks technical.
- One big button: **"Try payment again"** that opens `action_url`.
- Tell them nothing was charged (if the reason says so) and the plan isn't active until payment succeeds.

### Email 3: Renewal reminder

Extra fields: `days_left` (the real number of days), `window` (30, 7 or 1), and **`action_url`**.

Say, by `window`:
- **30:** friendly heads-up. "Your {plan.name} ends on {end_date}. Renew early to stay covered."
- **7:** gentle urgency. "Only {days_left} days left."
- **1:** clear urgency. "Your cover ends tomorrow. Renew today so there is no gap."
- One big button: **"Renew now"** that opens `action_url`. The renewal price is `amount`.

### About `action_url`

It's a private link made for this one customer. Clicking it takes them straight to the payment page. **Do not shorten, change or add anything to it.** It stays valid for 30 days.

### Sample package (payment failed)

```json
{
  "type": "subscription.payment_failed",
  "data": {
    "customer": { "email": "chidi@example.com", "first_name": "Chidi", "last_name": "Okafor" },
    "plan": { "name": "Motor Comprehensive Plus", "category": "Motor" },
    "amount": "85000.00",
    "currency": "NGN",
    "start_date": "2026-10-20",
    "end_date": "2027-10-20",
    "provider": { "name": "Sunrise Assurance Plc" },
    "distributor": { "name": "QuickCover Ltd" },
    "partner": { "name": "QuickCover Ltd" },
    "payment": { "reference": "TII-9F3A7C1D2B4E6A80", "amount": "85000.00" },
    "reason": "Insufficient Funds",
    "action_url": "https://api.theeinsurance.com/api/v1/payments/link/..."
  }
}
```

## 6. Plan recommendation

### The idea

A partner's app asks: "What should this customer buy?" We tell you who the customer is (in a privacy-safe way) and what they asked for. You pick the best plans and send them back.

### What you receive (`recommendation.requested`)

| Field | Meaning |
|---|---|
| `request_id` | The ticket number. You must send it back with your answer. |
| `partner.id` | Whose plans you may recommend from. |
| `customer.age`, `customer.gender` | Basic profile. Can be empty. |
| `customer.extra_data` | Extra facts the partner gave, such as vehicle type, trip plans or income band. Can be empty. |
| `criteria` | What was asked: maybe a `category` (motor or travel), a `budget` in Naira, a `coverage_level`, or free-text `notes`. All optional. |

You will **not** receive the customer's name, email, phone or ID number. That is on purpose, because the customer's personal details should not go to an AI.

### Your steps

1. **Get the list of plans you may choose from.**
   `GET /api/v1/plans/context/?partner_id=<partner.id>`
   (Use your login token. This list only contains plans this partner is allowed to sell.)
2. **Decide.** Choose 1 to 5 plans that fit the customer and `criteria`. For each, write a short reason (maximum 500 characters) a normal person understands, e.g. "Fits your budget and covers theft, which matters for a car parked outside."
3. **Send your answer back.**
   `POST /api/v1/service/recommendations/<request_id>/result/`

```json
{
  "status": "ready",
  "summary": "Two good options within your budget.",
  "recommendations": [
    { "plan_id": "c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f", "reason": "Full cover incl. theft within your budget." },
    { "plan_id": "…second plan id…", "reason": "Cheaper, covers third-party damage only." }
  ]
}
```

Put the best plan first.

**If you can't produce a recommendation**, send:
`{ "status": "failed", "failure_reason": "short explanation" }`
Never leave a request unanswered.

### Rules

- Only use plan IDs from the list in step 1. If you send any other, we reject the whole answer (error 400).
- One answer per request. A second answer is refused (409).
- Maximum 5 plans, no repeats.
- Keep reasons honest and plain. Don't promise things the plan description doesn't say.
- The customer is **not** emailed. We pass your answer to the partner, who shows it in their own app.

## 7. How to test

1. Ask us to switch on the **staging** environment. We create a test partner, a test customer and Paystack test payments.
2. Register your four URLs on staging first.
3. **Payment emails:** we make a test purchase. A paid test card gives you Email 1, and a declined test card gives you Email 2. Use your own email as the customer's.
4. **Renewal reminders:** we set a test policy to end in 30, 7 and 1 days and run the reminder job. Check all three versions.
5. **Recommendations:** we send a request for the test customer. Check we receive your answer and that the plans listed exist.
6. **Duplicate check:** ask us to resend an event. You should send **no second email**.

## 8. Done means

- [ ] All four URLs registered and receiving packages
- [ ] Bad or unsigned packages are rejected
- [ ] Each email uses the partner's name, not TheeInsurance
- [ ] Re-sent packages never create a second email
- [ ] The renewal email has three tones (30, 7, 1)
- [ ] Failed recommendations are reported back as `failed`
- [ ] You tested on staging with real-looking data

## 9. If something goes wrong

If a package doesn't arrive, we retry automatically 5 more times over about 9 hours (after 1 minute, 5 minutes, 30 minutes, 2 hours and 6 hours). After that we mark it failed and stop. If your workflow was down, tell us and we will resend the missed ones.

Questions about the content of an email, the amounts or the dates? Ask the backend team before guessing.
