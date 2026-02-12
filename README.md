# 📱 SmartFocusTimer

**SmartFocusTimer is a Pomodoro-style focus app that learns your optimal session lengths and adapts to reduce abandoned focus sessions.**

Instead of fixed 25/5 timers, the app uses **Thompson Sampling** to continuously learn what works best for you based on your actual behavior.

> The goal: fewer abandoned sessions, longer sustained focus, and better adherence over time.

---

<img src="https://github.com/user-attachments/assets/99b5143d-55e6-4c8a-86a9-ea8ec86523a8" width="500" />
<img src="https://github.com/user-attachments/assets/edd75225-8ec0-4e00-97cb-beed00fd5745" width="600" />
<img src="https://github.com/user-attachments/assets/24dac44f-55d8-4ec5-ac2b-84b09d68ec13" width="145"/>
<img src="https://github.com/user-attachments/assets/9cd45cd7-59d3-469e-b956-fab8134de5d0" width="500" />

---

## 🧠 How It Works

Each focus session is a learning opportunity:

1. **You tell the app** your current energy level (low/mid/high) and task type
2. **The app recommends** a focus duration based on what's worked for you before
3. **You complete (or skip) the session**
4. **The model learns** and improves future recommendations

The system balances **exploration** (trying new durations) with **exploitation** (reusing what worked). After 5-7 sessions per context, recommendations converge on your actual preference.

---

## 📈 Why This Is Different From a Normal Pomodoro App

- Fixed timers assume all users focus the same way (they don't).
- Rule-based systems don't adapt well to changing behavior.
- This system **learns from mistakes**, including failed sessions.

The model updates locally and improves incrementally as more sessions are logged.

---

## 🔑 Key Features

### Adaptive Recommendations

- **Zone-based learning:** Short (10-30m), Long (25-60m), and **Extended (50-120m)** zones
- **Energy-aware:** Low energy users aren't pushed to do longer sessions
- **Break scaling:** Break duration scales with focus (max break = focus ÷ 3)

### Smart Learning

- **4x faster learning** than before (simplified context)
- **Upward Spillover** warms up longer durations when you succeed
- **Capacity tracking** rewards you for stretching your focus limits

### UX Improvements

- **Inline Scroll Picker:** Smoothly adjust time from 10m to 120m with a single swipe
- **Haptic & Audio Feedback:** Satisfying interactions for timer adjustments

### Offline-First

- All learning happens locally using SQLite
- No backend dependency
- Your data stays on your device

---

## 🧪 What Didn't Work (and What I Learned)

- The model was tracking time of day, but users already report their energy level → removed it, got 4x faster learning
- Unexplored durations would randomly beat proven favorites because of optimistic priors → switched to pessimistic priors, problem gone
- Users who consistently quit early were still getting ambitious recommendations → added capacity tracking to stay realistic
- **Users got stuck at 25 min because the model didn't know 30 min was similar** → added upward spillover to "warm up" next level
- Low-energy users kept getting pushed to do longer sessions → made capacity adjustment respect energy level

These tradeoffs shaped both the ML logic and the app UX.

---

## 🧩 Tech Stack

- **Frontend:** React Native (Expo Bare Workflow)
- **Persistence:** SQLite (offline-first)
- **Learning:** Thompson Sampling with zone-based action spaces
- **Testing:** Jest with 57 unit tests (RL logic + store)

---

## 🚀 Installation

```bash
# Clone the repository
git clone https://github.com/kimothDev/smart-focus-timer.git
cd smart-focus-timer

# Install dependencies
npm install

# Run on Android
npx expo run:android
```

Make sure you have Android Studio and an emulator or device connected.

---

## 📄 License

This project is licensed under the Apache-2.0 license - see the LICENSE file for details.
