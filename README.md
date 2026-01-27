# 📱 SmartFocusTimer
**SmartFocusTimer is a Pomodoro-style focus app that learns when users are most likely to stay engaged and adapts session and break durations to reduce abandoned focus sessions.**

Instead of fixed 25/5 timers, the app uses a **Contextual Bandit (Thompson Sampling)** to continuously experiment with session lengths and learn what works best for each user based on real behavior.

> The goal: fewer abandoned sessions, longer sustained focus, and better adherence over time.

---

<img src="https://github.com/user-attachments/assets/99b5143d-55e6-4c8a-86a9-ea8ec86523a8" width="500" />
<img src="https://github.com/user-attachments/assets/edd75225-8ec0-4e00-97cb-beed00fd5745" width="600" />
<img src="https://github.com/user-attachments/assets/24dac44f-55d8-4ec5-ac2b-84b09d68ec13" width="145"/>
<img src="https://github.com/user-attachments/assets/9cd45cd7-59d3-469e-b956-fab8134de5d0" width="500" />

---

## 🧠 How it works (plain English)

Each focus session is treated as a decision:

- **Action:** choose a focus / break duration pair  
- **Context:** time of day, previous session outcomes, streak state, fatigue signals  
- **Reward:** session completed vs abandoned (with partial credit for duration)

A Contextual Bandit balances:
- **exploration** (trying new durations)
- **exploitation** (reusing what previously worked)

This allows the app to adapt per user without manual tuning or fixed rules.

---

## 📈 Why this is different from a normal Pomodoro app

- Fixed timers assume all users focus the same way (they don’t).
- Rule-based systems don’t adapt well to changing behavior.
- This system **learns from mistakes**, including failed sessions.

The model updates locally and improves incrementally as more sessions are logged.

---

## 🔑 Key Features
- **Adaptive Focus Recommendations**  
  Session and break durations adjust over time based on actual user behavior.

- **Baseline Comparison**  
  Supports fixed Pomodoro intervals to compare against adaptive recommendations.

- **Progress & Adherence Tracking**  
  Tracks completed sessions, abandonment rates, and streak stability.

- **Offline-First by Design**  
  All learning and data storage happens locally using SQLite, no backend dependency.

- **Failure-Aware Learning**  
  Abandoned or interrupted sessions directly influence future recommendations.

---

## 🧪 What didn’t work (and what I learned)

- Cold-start recommendations were noisy → mitigated with conservative priors  
- Aggressive exploration hurt UX early on → added exploration caps  
- User behavior was inconsistent → rewards had to be simplified to stay stable  

These tradeoffs shaped both the ML logic and the app UX.

---

## 🧩 Tech Stack & Architecture

- **Frontend:** React Native Bare Workflow (Expo Ejected)
- **Persistence:** SQLite (offline-first)
- **Learning Algorithm:** Contextual Bandits (w/ Thompson Sampling)
- **Architecture:** Modular state management with clear separation between UI, data, and learning logic

The system is designed to be inspectable, debuggable, and extendable.

---

## Installation
**Run the following command to clone the repository:**
- Clone the Repository
   ```bash
   git clone https://github.com/kimothDev/smart-focus-timer.git
   cd smart-focus-timer
  ```
- Install Dependencies
  ```bash
   npm install
  ```
- Run on Android
  ```bash
  npx expo run:android
  ```
  Make sure you have Android Studio and an emulator or device connected.
  
## License
This project is licensed under the Apache-2.0 license - see the LICENSE file for details.
