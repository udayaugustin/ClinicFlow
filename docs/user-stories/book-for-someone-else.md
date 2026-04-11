# User Story: Book Appointment for Someone Else

## Story

**As a** registered patient,  
**I want to** book an appointment on behalf of a family member or friend,  
**So that** their name appears on the token at the clinic even though I am the one booking and paying.

---

## Background / Motivation

A user in Chennai wants to book an appointment for their uncle in Coimbatore. Today the app has no location restriction — they can find the clinic and book — but the appointment is always registered under the booker's own name. The attender sees the booker's name on the token, not the actual patient's name, causing confusion at the clinic.

This feature allows the booker to enter the actual patient's name and phone number at booking time so the token shows the right person.

---

## Personas

| Persona | Description |
|---|---|
| **Booker** | The logged-in user who initiates and pays for the booking (e.g., person in Chennai) |
| **Beneficiary** | The actual patient who will attend the appointment (e.g., uncle in Coimbatore) |
| **Attender** | Clinic staff who manages the token queue and calls patients |

---

## Acceptance Criteria

### AC1 — Booking form has a "Book for someone else" toggle
- When booking an appointment, the patient sees a checkbox/toggle: **"This appointment is for someone else"**
- By default it is **off** (booking for self)
- When toggled **on**, two new required fields appear:
  - **Patient Name** (text, required)
  - **Patient Phone** (10-digit, required)

### AC2 — Booker's wallet is charged, not beneficiary's
- The ₹21 consultation fee is always deducted from the **booker's wallet**
- The beneficiary does not need to have an account on the app

### AC3 — Token shows beneficiary's name at clinic
- On the attender dashboard, the token row shows the **beneficiary's name** (not the booker's)
- A **"On behalf"** badge is shown alongside the name (similar to the "Walk-in" badge)
- Hovering or tapping the badge shows: *"Booked by [Booker Name]"*

### AC4 — Booking history shows both names
- In the booker's booking history, the appointment card shows:
  - Doctor and clinic name (as usual)
  - Token number (as usual)
  - A line: **"Patient: [Beneficiary Name]"** below the doctor name
  - The status and ETA behave identically to a self-booking

### AC5 — Cancellation and refund follow same rules
- The **booker** can cancel the appointment (subject to same restrictions — not after doctor arrives)
- Refund goes back to the **booker's wallet**
- Beneficiary's phone is notified via SMS if the SMS service is active

### AC6 — Attender can identify on-behalf bookings
- On the attender dashboard, on-behalf appointments are visually distinct from self-bookings and walk-ins
- The attender can see the booker's name in the appointment detail view if needed

---

## Out of Scope (this story)

- Beneficiary does not get app notifications (they may get SMS if phone is provided)
- Beneficiary cannot view or manage the appointment from the app
- No limit on how many on-behalf bookings a user can make
- No verification that the beneficiary's phone number is real

---

## Data Model Changes

### `appointments` table — reuse existing fields

| Field | Change | Purpose |
|---|---|---|
| `guestName` | Reuse (currently walk-in only) | Store beneficiary name |
| `guestPhone` | Reuse (currently walk-in only) | Store beneficiary phone |
| `isWalkIn` | No change | Stays `false` for on-behalf bookings |
| `patientId` | No change | Still the booker's user ID (for wallet, auth, history) |
| `isOnBehalf` | **New boolean field** (default `false`) | Distinguishes on-behalf from self and walk-in |

> `guestName` and `guestPhone` are already nullable columns used for walk-ins. On-behalf bookings reuse these same columns — `isOnBehalf = true` is the differentiator.

---

## API Changes

### `POST /api/appointments`
Add optional fields to the request body:
```json
{
  "doctorId": 34,
  "clinicId": 3,
  "scheduleId": 12,
  "date": "2026-04-08",
  "isOnBehalf": true,
  "guestName": "Rajan Kumar",
  "guestPhone": "9876543210"
}
```
**Validation:**
- If `isOnBehalf = true`, both `guestName` and `guestPhone` are required
- `patientId` is always set to `req.user.id` regardless

---

## UI Changes

### Patient Clinic Details page — Booking dialog
```
┌─────────────────────────────────────┐
│  Book Appointment                   │
│  Dr. Karthik Rajan — Apr 10, 2026  │
│                                     │
│  [ ] Booking for someone else       │  ← toggle
│                                     │
│  (when toggled on)                  │
│  Patient Name *                     │
│  [________________________]         │
│                                     │
│  Patient Phone *                    │
│  [________________________]         │
│                                     │
│  Fee: ₹21 from your wallet          │
│  [    Confirm Booking    ]          │
└─────────────────────────────────────┘
```

### Attender Dashboard — Token row
```
Token #  Patient              In Time   Status
  3      Rajan Kumar          -         Scheduled   [Start] [Hold] [No Show]
         On behalf ⓘ
         (tooltip: Booked by Ravi Krishnan)
```

### Patient Booking History — Appointment card
```
┌────────────────────────────────────────┐
│ Dr. Karthik Rajan        [Scheduled]  │
│ General Medicine                       │
│ Apr 10, 2026             Token #3     │
│ Patient: Rajan Kumar                   │  ← new line
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ Waiting for your appointment           │
└────────────────────────────────────────┘
```

---

## Edge Cases

| Scenario | Behaviour |
|---|---|
| Booker tries to book for themselves with toggle on | Allowed — they can enter their own name |
| Beneficiary name left blank with toggle on | Validation error: "Patient name is required" |
| Beneficiary phone is invalid format | Validation error: "Enter a valid 10-digit phone number" |
| Booker cancels an on-behalf appointment before doctor arrives | Full refund to booker's wallet |
| Booker tries to cancel after doctor arrives | Blocked — same rule as self-bookings |
| Two on-behalf bookings for same schedule | Allowed — each gets a separate token |
| Walk-in vs on-behalf conflict on token number | No conflict — on-behalf goes through normal online booking flow |

---

## Implementation Plan

1. **Schema** — Add `isOnBehalf boolean default false` to `appointments` table; migration required
2. **Server** — Update `POST /api/appointments` to accept and store `isOnBehalf`, `guestName`, `guestPhone`
3. **Client — Booking dialog** — Add "Book for someone else" toggle + conditional name/phone fields
4. **Client — Booking history** — Show beneficiary name when `isOnBehalf = true`
5. **Client — Attender dashboard** — Show "On behalf" badge with booker tooltip
6. **Test** — Book on behalf, verify token name, cancel and verify refund to booker

---

## Story Points Estimate

| Task | Effort |
|---|---|
| Schema migration | XS |
| API update | S |
| Booking dialog UI | M |
| Booking history UI | S |
| Attender dashboard badge | S |
| Testing | S |
| **Total** | **~M (2–3 days)** |
