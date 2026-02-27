# 📱 Kairos

**Kairos is an adaptive focus coach that learns your optimal session lengths and protects you from burnout.**

Instead of fixed Pomodoro-style timers (25/5), Kairos uses **Thompson Sampling** to find the _opportune moment_ for focus based on your energy levels and actual behavior.

> The goal: fewer abandoned sessions, intentional stretching of focus limits, and a system that adapts to you, not the other way around.

---

# Screenshots

## Dark Theme

<img width="225" alt="Screenshot_20260219-143458_Kairos" src="https://github.com/user-attachments/assets/2adcba4b-8cfc-4cfd-acc9-dc8b1566d4db" />
<img width="225" alt="Screenshot_20260219-143509_Kairos" src="https://github.com/user-attachments/assets/70551514-111d-4c34-98e5-abc8b149d3d5" />
<img width="225" alt="Screenshot_20260219-143516_Kairos" src="https://github.com/user-attachments/assets/8aa217f1-cee6-44a0-9e75-c4ce2752f574" />
<img width="225" alt="Screenshot_20260219-143533_Kairos" src="https://github.com/user-attachments/assets/6dd42ee9-26a1-42b6-b7fb-13af716e6612" />
<img width="225" alt="Screenshot_20260219-143539_Kairos" src="https://github.com/user-attachments/assets/f625eee5-3004-4278-b38c-23b7b70badf6" />
<img width="225" alt="Screenshot_20260219-143549_Kairos" src="https://github.com/user-attachments/assets/bd7864b8-3e67-43a4-9015-e034ca5a23a5" />
<img width="225" alt="Screenshot_20260219-143619_Kairos" src="https://github.com/user-attachments/assets/c8e2b53c-dcdd-43f7-b16a-886e4fa4516e" />

---

## Light Theme

<img width="225" alt="Screenshot_20260219-150940_Kairos" src="https://github.com/user-attachments/assets/52439996-e3f3-499f-b057-77d687666c21" />
<img width="225" alt="Screenshot_20260219-151000_Kairos" src="https://github.com/user-attachments/assets/b0a31e45-5e28-48ce-a0ae-11119ffba13c" />
<img width="225" alt="Screenshot_20260219-151004_Kairos" src="https://github.com/user-attachments/assets/0f8db4f5-f250-4a6a-bbde-0ebbec9a0d50" />
<img width="225" alt="Screenshot_20260219-151013_Kairos" src="https://github.com/user-attachments/assets/db5f2ec2-443f-4a57-a5b9-b71902d8a44f" />

---

## 🧠 How It Works

Each focus session is a coaching opportunity:

1. **You tell Kairos** your current focus mood and task type
2. **The app recommends** a focus duration based on your history (EWMA in early sessions, Thompson Sampling after 5+ sessions)
3. **You complete (or skip) the session**
4. **The model learns** and improves future recommendations

The system uses a hybrid **EWMA Bootstrap → Thompson Sampling** pipeline: your own average is the recommendation during early sessions, then Thompson Sampling takes over once it has enough evidence.

---

## 📈 Why This Is Different From a Normal Pomodoro App

- **Pomodoro vs. Kairos**: Fixed timers assume all users focus the same way. Kairos finds the _right_ time for the _right_ duration.
- **Capacity Shields**: The system detects burnout and prevents you from setting targets you're likely to fail.
- **Stretch Bonus**: When you're in the "zone," the coach nudges you to expand your limits.

---

## 🔑 Key Features

### Adaptive Coaching

- **EWMA Bootstrap:** Mirrors your actual behavior from session 2, no random exploration
- **Zone based learning:** Short (10-30m), Long (25-60m), and Extended (50-120m) zones
- **Focus mood aware:** Low focus mood users aren't pushed to do longer sessions
- **Break scaling:** Break duration scales with focus (max break = focus ÷ 3)

### Smart Learning

- **Intent Multipliers:** Manual overrides are rewarded 1.5x more than accepted recommendations.
- **Upward Spillover:** Successes "warm up" longer durations.
- **Capacity tracking:** Personalized rewards for stretching your focus limits.

### Offline-First

- All learning happens locally using SQLite
- No backend dependency
- Your data stays on your device

---

## 🧪 What Didn't Work (and What I Learned)

- Tracking time of day (too much noise) -> switched to focus mood levels.
- Optimistic priors (random winners) -> switched to pessimistic priors.
- Ignoring failed sessions -> added capacity tracking to stay realistic.

---

## 🧩 Tech Stack

- **Frontend:** React Native (Expo Bare Workflow)
- **Persistence:** SQLite (offline-first)
- **Learning:** EWMA Bootstrap + Thompson Sampling with zone-based action spaces
- **Testing:** Jest with 80 unit tests

---

## 🚀 Installation

```bash
# Clone the repository
git clone https://github.com/kimothDev/kairos.git
cd kairos

# Install dependencies
bun install

# Run on Android
bunx expo run:android
```

---

## 📄 License

This project is licensed under the Apache-2.0 license - see the LICENSE file for details.
