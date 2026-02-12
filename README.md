# 📱 Kairos

**Kairos is an adaptive focus coach that learns your optimal session lengths and protects you from burnout.**

Instead of fixed Pomodoro-style timers (25/5), Kairos uses **Thompson Sampling** to find the _opportune moment_ for focus based on your energy levels and actual behavior.

> The goal: fewer abandoned sessions, intentional stretching of focus limits, and a system that adapts to you, not the other way around.

---

<img src="https://github.com/user-attachments/assets/99b5143d-55e6-4c8a-86a9-ea8ec86523a8" width="500" />
<img src="https://github.com/user-attachments/assets/edd75225-8ec0-4e00-97cb-beed00fd5745" width="600" />
<img src="https://github.com/user-attachments/assets/24dac44f-55d8-4ec5-ac2b-84b09d68ec13" width="145"/>
<img src="https://github.com/user-attachments/assets/9cd45cd7-59d3-469e-b956-fab8134de5d0" width="500" />

---

## 🧠 How It Works

Each focus session is a coaching opportunity:

1. **You tell Kairos** your current energy level (low/mid/high) and task type
2. **The app negotiates** a focus duration based on your "Slope" and capacity
3. **You complete (or skip) the session**
4. **The model learns** and improves future recommendations

The system balances **exploration** (trying new durations) with **exploitation** (reusing what worked).

---

## 📈 Why This Is Different From a Normal Pomodoro App

- **Pomodoro vs. Kairos**: Fixed timers assume all users focus the same way. Kairos finds the _right_ time for the _right_ duration.
- **Capacity Shields**: The system detects burnout and prevents you from setting targets you're likely to fail.
- **Stretch Bonus**: When you're in the "zone," the coach nudges you to expand your limits.

---

## 🔑 Key Features

### Adaptive Coaching

- **Zone-based learning:** Short (10-30m), Long (25-60m), and **Extended (50-120m)** zones
- **Energy-aware:** Low energy users aren't pushed to do longer sessions
- **Break scaling:** Break duration scales with focus (max break = focus ÷ 3)

### Smart Learning

- **Intent Multipliers:** Manual overrides are rewarded 1.5x more than accepted recommendations.
- **Upward Spillover:** Successes "warm up" longer durations.
- **Capacity tracking:** Personalized rewards for stretching your focus limits.

### UX Improvements

- **Inline Scroll Picker:** Smoothly adjust time from 10m to 120m with a single swipe
- **Haptic & Audio Feedback:** Satisfying interactions for timer adjustments

### Offline-First

- All learning happens locally using SQLite
- No backend dependency
- Your data stays on your device

---

## 🧪 What Didn't Work (and What I Learned)

- Tracking time of day (too much noise) -> switched to energy levels.
- Optimistic priors (random winners) -> switched to pessimistic priors.
- Ignoring failed sessions -> added capacity tracking to stay realistic.

---

## 🧩 Tech Stack

- **Frontend:** React Native (Expo Bare Workflow)
- **Persistence:** SQLite (offline-first)
- **Learning:** Thompson Sampling with zone-based action spaces
- **Testing:** Jest with 70+ unit tests

---

## 🚀 Installation

```bash
# Clone the repository
git clone https://github.com/kimothDev/kairos.git
cd kairos

# Install dependencies
npm install

# Run on Android
npx expo run:android
```

---

## 📄 License

This project is licensed under the Apache-2.0 license - see the LICENSE file for details.
