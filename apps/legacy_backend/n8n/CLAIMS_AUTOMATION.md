# Claims Automation Handoff (n8n), version 2

A simple walkthrough for building the **claims workflows** in n8n. No coding background needed. Where code is required, it is ready to copy and paste.

## What Changed Since Version 1 (read this first if you already built it)

TheeInsurance now works like a payment gateway. Businesses we work with (**partners**) send us their existing customers. **Customers never register or log in with us**, and they don't know our name. This changes your workflows in six small ways:

1. **Sign every customer email as the partner**, using `data.partner.name`. Never write "TheeInsurance" as the sender or sign-off.
2. **Never tell a customer to "log in", "open your dashboard" or "upload documents".** They can't. The partner does that for them.
3. **You now own all customer emails.** The backend no longer emails customers about claims. If you skip one, nobody sends it.
4. **The "more information needed" email (Job 4) now covers staff requests too**, and carries the reviewer's note in `data.note`.
5. **Every event has new fields**: `data.partner`, `data.subscription_id`, and extra customer fields (see "What Every Event Looks Like").
6. **Staff alerts should name the partner and customer**, so staff know who to call.

Everything else (events, callbacks, token, Security Check node) is unchanged.

## What You Are Building

When a partner files an insurance claim for their customer, a chain of steps happens:

**Claim filed → AI check → forward or flag → provider decides → payout + receipt → everyone is told**

The TheeInsurance backend runs the chain and keeps all the records. **You are the "do the work" part.** The backend sends n8n a message ("hey, a claim needs an AI check"). n8n does the work (runs the AI, sends emails, makes a receipt). Then n8n reports back ("here is the AI result").

```text
Backend ── sends an event ──▶ n8n does the work ── reports back ──▶ Backend
                                                                      │
                                                  Backend moves the claim forward
                                                  and sends the next event
```

You never change a claim directly. You only **report results**, and the backend decides what happens next.

## The Life of a Claim

| Claim status | What it means | Who moves it forward |
|---|---|---|
| `submitted` | The partner filed it for their customer and is still uploading documents | Partner |
| `ai_check_pending` | All documents uploaded, waiting for your AI check | **You (n8n)** |
| `flagged` | AI found something suspicious | TheeInsurance staff |
| `forwarded` | Looks fine, sent to the insurance provider | Provider |
| `more_info_required` | The provider or staff asked for more | Partner (uploads, then resubmits) |
| `approved` / `rejected` | Provider made a decision | Backend starts the payout if approved |
| `paid` | Money has been sent | **You (n8n)** make the receipt |
| notified | Everyone has been told. This is the end. | **You (n8n)** |

A claim can go round again: after "more info", the partner resubmits and the claim returns to `forwarded` or `flagged`. You will receive those events a second time. That is normal, and each one is a new event.

## Words You Will See

- **Partner**: the business that sells to the customer and files claims for them (for example a bank app or an insurance marketplace). The customer knows the partner's name, not ours.
- **Provider**: the insurance company that decides the claim.
- **Event**: a message the backend sends to n8n, such as `claim.approved`.
- **Webhook**: the address in n8n where the backend delivers events.
- **Callback**: when n8n sends a result back to the backend.
- **Service account**: a robot login for n8n, made of a `client_id` and a `client_secret`.
- **Token**: a temporary pass you get by logging in. You show it on every callback.

## Before You Start: Ask the Backend Engineer For

1. Your `client_id` and `client_secret` (sent privately, never pasted in chat or docs).
2. The **inbound token**: a long password the backend sends with every event so n8n knows the message is really from us.

## Setup in 5 Steps

**Base URL:** `https://theeinsurance-backend-staging.onrender.com`

The URLs in this guide start with `/api/v1/`. If any call returns 404, ask the backend engineer to confirm the exact path in Swagger (`/api/docs`).

The staging server can be slow to wake up on the first request. Set your HTTP Request nodes to wait up to 60 seconds.

### Step 1: Save your password in n8n

- Create a **Header Auth credential**. Name: `Authorization`. Value: `Bearer <the inbound token>`.

That is the only secret n8n needs for receiving events.

**Free plan notes**
- A free trial ends after about 14 days. Workflows stop, and events are lost after the retries run out.
- Free plans have a monthly execution limit. Each claim uses roughly 6 to 8 executions, so don't run big tests.
- If your n8n address changes (a restart, or a new tunnel), register your Production URLs again (Step 4).

### Step 2: Create one workflow per job

Each job below gets its own workflow. Every one **starts with a Webhook node**.

For every Webhook node, set:
- **HTTP Method:** POST
- **Authentication:** Header Auth (the credential from Step 1)
- **Respond:** *Immediately*. The backend gives up after 10 seconds, and the AI check takes longer than that. Always answer fast, then do the work.

### Step 3: Add the Security Check node

Put the **Security Check** node (appendix) right after every Webhook node. It rejects old messages and skips messages that were already processed. Copy it exactly and don't edit it.

### Step 4: Register your addresses with the backend

Each Webhook node has two URLs: **Test** and **Production**. **Register the Production URL.** The Test URL only works while you are watching the screen. Registering it is the most common beginner mistake.

First get a token (see "Calling Back" below), then:

```
POST /api/v1/webhooks/service/register/
Authorization: Bearer <access token>

{
  "webhooks": [
    {"event": "claim.ai_check_requested", "url": "https://<your-n8n>/webhook/claim-ai-check"},
    {"event": "claim.flagged",            "url": "https://<your-n8n>/webhook/claim-flagged"},
    {"event": "claim.forwarded",          "url": "https://<your-n8n>/webhook/claim-forwarded"},
    {"event": "provider.claim_decision",  "url": "https://<your-n8n>/webhook/claim-decision"},
    {"event": "claim.approved",           "url": "https://<your-n8n>/webhook/claim-approved"},
    {"event": "claim.rejected",           "url": "https://<your-n8n>/webhook/claim-rejected"},
    {"event": "payment.completed",        "url": "https://<your-n8n>/webhook/payment-completed"},
    {"event": "payment.failed",           "url": "https://<your-n8n>/webhook/payment-failed"},
    {"event": "receipt.generated",        "url": "https://<your-n8n>/webhook/receipt-generated"}
  ]
}
```

**One address per event.** If two things must happen for one event, do both inside the same workflow. Running this call again is safe: it simply updates the addresses.

### Step 5: Activate every workflow

Switch each one to **Active**. If n8n is off or a workflow is inactive, the backend retries after 1 min, 5 min, 30 min, 2 hours and 6 hours, then gives up.

## Rules for Every Customer Email

1. **Sender name and sign-off: `data.partner.name`.** Never "TheeInsurance".
2. **Greet by first name:** `data.customer.first_name`.
3. **Send to:** `data.customer.email`.
4. **No instructions the customer can't follow.** No "log in", "dashboard" or "upload here". When something is needed from them, say "{partner name} will contact you".
5. **Naira and plain dates**, e.g. ₦120,000.00 and "6 October 2026".
6. **Claim emails always go out**, even if the customer later withdrew data-sharing consent. The claim is about a policy they already hold.
7. **Keep it short and kind.** The reader may be stressed about a loss.

## What Every Event Looks Like

All events share the same outer shape:

```json
{
  "id": "evt_9f2c...",
  "type": "claim.forwarded",
  "created_at": "2026-10-04T10:15:00Z",
  "correlation_id": "<the claim's id>",
  "data": {
    "claim_id": "<uuid>",
    "claim_reference": "CLM-1A2B3C4D5E6F7A8B",
    "claim_type": "motor_accident",
    "status": "forwarded",
    "subscription_id": "<uuid>",
    "customer": {
      "id": "<uuid>",
      "external_id": "cust_1042",
      "email": "ada@example.com",
      "first_name": "Ada",
      "last_name": "Okafor",
      "kyc_status": "verified"
    },
    "partner": {"id": "<uuid>", "name": "QuickCover Ltd"},
    "provider": {"id": "<uuid>", "name": "Acme Insurance", "admin_emails": ["claims@acme.com"]}
  }
}
```

The details always live inside `data`. Contact details are in every claim event, so you never have to look anything up.

- `partner` is the business the customer knows. Use it for every sign-off.
- `customer.external_id` is the partner's own ID for the customer. It is useful in staff alerts.
- `customer.kyc_status` is **the partner's own statement** about checking the customer's identity (`verified`, `unverified` or `not_provided`). We don't check it, so treat it as a hint, never as proof.
- The `id` is unique per event. The backend may send the same event twice, and the Security Check node ignores repeats.

## The Jobs

### Job 1: AI check (the main one)

**Trigger:** `claim.ai_check_requested`

**You receive**, in `data`:
- Claim details: `claim_type`, `claimed_amount`, `incident_date`, `incident_description`
- `plan`: what the policy covers (`coverage_amount`, `premium`, `duration_months`). This can be empty.
- `documents`: a list of `{type, url}` for every uploaded file
- `customer.kyc_status`: the partner's own claim about identity checks (a hint only)

**You do:** run your AI check. Ideas for what to look at:
- Is the claimed amount more than the plan's `coverage_amount`?
- Does the incident description match the documents provided?
- Is the incident date believable?
- Are any documents unreadable?
- Is `kyc_status` `not_provided` on a large claim? That is worth a mention, but not a reason to flag by itself.

**You report back:**

```
POST /api/v1/service/claims/<claim_id>/ai-result/
Authorization: Bearer <access token>

{
  "score": 0.82,
  "flags": ["claimed amount above plan coverage"],
  "summary": "Claim is larger than the policy covers.",
  "recommendation": "flag"
}
```

- `score`: a number from 0 to 1. We suggest higher means more suspicious. Agree on this with the backend engineer and keep it consistent.
- `flags`: a list of problems found, or an empty list `[]`.
- `summary`: a short plain-English explanation.
- `recommendation`: exactly `"forward"` or `"flag"`.
- **If `flags` has anything in it, the claim is flagged, whatever the recommendation says.**

The backend answers `{"status": "forwarded"}` or `{"status": "flagged"}`. If it answers `"replayed": true`, that is fine. It means the result was already saved.

### Job 2: Flagged claim

**Trigger:** `claim.flagged`
**You do:** alert the TheeInsurance staff (email or Slack). Include the claim reference, the partner name (`data.partner.name`), the customer's `external_id`, and the reasons from `data.ai.flags` and `data.ai.summary`. Staff review it in the staff dashboard.
**Report back:** nothing.

This can fire a second time for the same claim, after the partner resubmits missing documents. Send the alert again.

### Job 3: Claim forwarded to the provider

**Trigger:** `claim.forwarded`
**You do:** email everyone in `data.provider.admin_emails`, saying a new claim is waiting for their review. Include the claim reference, the amount, and the partner name (`data.partner.name`).
**Report back:** nothing.

This also fires again after a resubmission. Say "updated documents received" if you can tell from context, but sending the normal email is fine.

### Job 4: More information needed

**Trigger:** `provider.claim_decision`
**You do:** nothing, unless `data.decision` is `"more_info_required"`. This now happens when **either the provider or TheeInsurance staff** asks for more. In that case, email the customer:

- Say we need a little more information to continue with claim `claim_reference`.
- Include the reviewer's message from `data.note` word for word, inside the email.
- Close with: "**{partner.name} will contact you to collect it.**" Do **not** ask the customer to upload anything or log in.

For `approved` and `rejected`, the next two jobs cover it. The backend emails the partner itself with the technical steps, so you don't email the partner.
**Report back:** nothing.

### Job 5: Approved or rejected

**Trigger:** `claim.approved` and `claim.rejected` (two workflows)

- **Approved:** email the customer: "Your claim was approved for ₦`approved_amount`. Payment is on its way." Sign off as the partner.
- **Rejected:** email the customer the `reason`, kindly. Sign off as the partner. Email the provider a copy as well. Then tell the backend everyone has been informed:

```
POST /api/v1/service/claims/<claim_id>/notified/
Authorization: Bearer <access token>
```

No body is needed. The backend only accepts this for claims that are finished (paid or rejected). Otherwise it answers with an error, which is expected.

### Job 6: Payment finished, make the receipt

**Trigger:** `payment.completed`
**You do:** create a receipt (a PDF or web page showing the claim reference, amount and payment reference from `data.payment`). Store it somewhere with a link that people can open.
**You report back:**

```
POST /api/v1/service/claims/<claim_id>/receipt/
Authorization: Bearer <access token>

{ "receipt_url": "https://..." }
```

Use a hard-to-guess link, because a receipt contains money details. The backend then sends `receipt.generated`.

### Job 7: Payment failed

**Trigger:** `payment.failed`
**You do:** alert the TheeInsurance staff with the claim reference, the partner name, and `data.payment.failure_reason`. The claim stays `approved`, and the provider can retry the payout from their dashboard once the problem is fixed. Do not email the customer.
**Report back:** nothing.

### Job 8: Receipt ready, tell everyone (the finish line)

**Trigger:** `receipt.generated`
**You do:** email the customer and the provider with the receipt link (`data.receipt.url`). The customer's email says the money has been sent and is signed by the partner. Then report that everyone has been informed:

```
POST /api/v1/service/claims/<claim_id>/notified/
Authorization: Bearer <access token>
```

The backend then sends `claim.parties_notified`. That is the last event, and nothing needs to listen to it.

## Calling Back: How to Get a Token

Every callback needs a token. Fetch a **fresh one at the start of each callback workflow**. That way you never worry about expiry.

```
POST /api/v1/auth/service-account/token/

{ "client_id": "<client_id>", "client_secret": "<client_secret>" }
```

Use the `access` value as `Authorization: Bearer <access>`. If any call returns **401**, your token expired, so fetch a new one and try again.

## Quick Reference

| Job | Event you receive | Your callback (if any) |
|---|---|---|
| AI check | `claim.ai_check_requested` | `POST /api/v1/service/claims/<id>/ai-result/` |
| Alert staff | `claim.flagged` | none |
| Alert provider | `claim.forwarded` | none |
| Ask customer for more info | `provider.claim_decision` | none |
| Tell customer | `claim.approved` | none |
| Tell customer, finish | `claim.rejected` | `POST /api/v1/service/claims/<id>/notified/` |
| Make receipt | `payment.completed` | `POST /api/v1/service/claims/<id>/receipt/` |
| Alert staff | `payment.failed` | none |
| Send receipt, finish | `receipt.generated` | `POST /api/v1/service/claims/<id>/notified/` |

| Step | Method | Endpoint |
|---|---|---|
| Get token | `POST` | `/api/v1/auth/service-account/token/` |
| Register your addresses | `POST` | `/api/v1/webhooks/service/register/` |

## Safe to Repeat

Every callback can be sent twice without harm. If your request times out, send it again. The backend replies `"replayed": true` and does nothing extra.

## Testing

1. Ask the backend engineer to file a test claim on staging for a test customer, using a test partner key, and upload all the documents.
2. Watch **Executions** in n8n. The AI-check workflow should start within seconds.
3. After your callback, ask the backend engineer to confirm the claim moved to `forwarded` or `flagged`.
4. Ask them to approve the claim as a test provider and watch the next workflows fire.
5. Ask them to send a claim back for "more information" **twice**: once as the provider, once as staff. Both should give the customer the same kind of email, with the note inside it.
6. Check every customer email: the sender and sign-off are the partner's name, and nothing says "log in" or "upload".
7. Ask them to resend an event. You should send **no second email**.

## If Something Goes Wrong

| What you see | Likely reason |
|---|---|
| Nothing arrives in n8n | The workflow isn't Active, or you registered the **Test** URL instead of the **Production** URL |
| Nothing arrives, and the Webhook node shows an auth error | The Header Auth value doesn't match the inbound token. Ask for it again |
| n8n shows "stale timestamp" | n8n's clock is wrong, or an old message was replayed. Ignore one-offs |
| Events processed twice | The duplicate check only works when the workflow is **Active**, not when testing manually |
| Events stopped arriving after a few days | The free trial ended, or your n8n address changed. Re-activate and register again (Step 4) |
| Callback returns 401 | Expired token. Fetch a new one |
| Callback returns 404 | Wrong claim id (use `data.claim_id`), or the URL path is wrong. Check Swagger |
| Callback returns 409 | The claim isn't in the right stage yet (for example, "notified" before payment) |
| Callback returns 400 | Check the body. `recommendation` must be exactly `forward` or `flag` |
| `data.partner` or `data.note` is missing | The backend update isn't deployed on that server yet. Ask the backend engineer |

## Don't Confuse These Events

Several event names look alike but belong to different jobs. Only register the ones in Step 4 for claims.

| Looks like | Belongs to | Not part of this handoff |
|---|---|---|
| `payment.completed`, `payment.failed` | Claim **payouts** (money going **to** the customer) | This handoff |
| `payment.successful`, `charge.failed` | The payment **dunning** workflow (failed renewals, retries on day 1, 3 and 7) | Separate job. Don't change it |
| `subscription.payment_succeeded`, `subscription.payment_failed`, `subscription.renewal_due` | Customer **premium** emails | The Automated Notifications handoff |

Each event takes **one** address per service account, so never register the same event twice. Do not copy the Security Check node into the dunning workflow. Ask the backend engineer before changing how it receives events.

## Open Items

- The money-sending step to Nomba is still being connected on the backend. Until then you won't see real `payment.completed` events. Ask for test ones.
- Tell the backend engineer your real Production Webhook URLs before go-live.
- Distributors (partners that sell a provider's plans) get their own claim emails from the backend. You don't need to email them.
- **Before production:** the backend still signs every event, but n8n does not check the signature yet. The backend engineer will give you a signing secret and an updated Security Check node before go-live.

---

## Appendix: Security Check node

Add a **Code** node straight after each Webhook node. Mode: *Run Once for All Items*. Paste this and don't change it.

```javascript
const item = $input.first();
const h = item.json.headers;
const body = item.json.body;
const ts = h['x-theeinsurance-timestamp'];

// 1. reject old messages
if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) throw new Error('stale timestamp');

// 2. skip messages we have already handled
const sd = $getWorkflowStaticData('global');
sd.seen = sd.seen || {};
const id = h['x-theeinsurance-event-id'];
if (sd.seen[id]) return [];
sd.seen[id] = Date.now();
for (const k of Object.keys(sd.seen)) if (Date.now() - sd.seen[k] > 86400000) delete sd.seen[k];

return [{ json: body }];
```

After this node, the data is the event itself: `id`, `type`, `data` and so on. Use `data` for everything in the jobs above.
