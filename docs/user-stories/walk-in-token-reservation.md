# User Story: Walk-in Token Reservation

## Problem Statement

When an attender is creating a token for a walk-in patient (User B), there is a window of time before the booking is completed. During this window, an online patient (User C) can complete their booking and receive the next token number — effectively jumping ahead of the walk-in patient who was physically present first.

**Example scenario:**
- User A is on token 5 (in_progress)
- User B arrives at the clinic as a walk-in — attender starts creating token
- Attender takes 1 minute to complete the booking
- User C books online during that 1 minute and gets token 6
- User B ends up with token 7 — even though they arrived before User C booked

---

## User Story

**As an** attender,
**I want to** instantly reserve the next token number the moment a walk-in patient arrives,
**So that** online bookings cannot take that token while I'm filling in the patient's details.

---

## Acceptance Criteria

1. Attender dashboard has a **"New Walk-in"** button that **immediately reserves** the next token number upon click
2. Reserved token is locked for **5 minutes** — online patients cannot take that token during this window
3. Attender fills in patient details (name/phone) after reservation
4. On completion → appointment is created with the reserved token number
5. If attender cancels or the 5-minute window expires → reserved token is released and the next online/walk-in booking gets it
6. Reserved token is visually shown in the queue as **"Reserving..."** so the doctor/attender can see it in the live queue

---

## Technical Scope

| Area | Change |
|------|--------|
| DB | New `tokenReservations` table (`scheduleId`, `tokenNumber`, `reservedAt`, `expiresAt`, `status`) |
| Backend | `POST /api/schedules/:id/reserve-token` — reserve next token number instantly |
| Backend | `POST /api/schedules/:id/confirm-walkin` — complete walk-in with reserved token |
| Backend | Auto-expire reservations after 5 min (checked on next booking attempt) |
| Frontend | Split attender "New Walk-in" into 2-step flow: Reserve → Fill Details |

---

## Branch

`walk-in-token-reservation`

## Created

2026-04-08
