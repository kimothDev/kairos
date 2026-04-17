# 📱 Kairos

> [!IMPORTANT]
> **ARCHIVED REPOSITORY**  
> This project has been succeeded by [**Kairos**](https://github.com/stillnorth-labs/kairos) (Private Repository — Access available upon request).  
> This repository is now read-only and will no longer receive updates.

**Kairos is an adaptive focus coach that learns your optimal session lengths and protects you from burnout.**

Instead of fixed Pomodoro-style timers (25/5), Kairos uses **Thompson Sampling** to find the _opportune moment_ for focus based on your energy levels and actual behavior.

> The goal: fewer abandoned sessions, intentional stretching of focus limits, and a system that adapts to you, not the other way around.

---

# Screenshots

## Dark Theme
<img width="225" alt="Screenshot_20260417-120438_Kairos" src="https://github.com/user-attachments/assets/aee69156-0833-4f1c-be2a-0fbf9048f32e" />
<img width="225" alt="Screenshot_20260417-120446_Kairos" src="https://github.com/user-attachments/assets/9964e01a-3c76-46db-ba03-ff2ba2fdf8df" />
<img width="225" alt="Screenshot_20260417-120453_Kairos" src="https://github.com/user-attachments/assets/b6646027-a6c7-48b3-8b6e-f3235771a839" />
<img width="225" alt="Screenshot_20260417-120520_Kairos" src="https://github.com/user-attachments/assets/b732f229-80ae-44c3-9fe2-e87e5d3d246b" />
<img width="225" alt="Screenshot_20260417-123928_Kairos" src="https://github.com/user-attachments/assets/997cd5b1-b02d-4465-9a17-3b3314dd08e5" />
<img width="225" alt="Screenshot_20260417-120526_Kairos" src="https://github.com/user-attachments/assets/6d3cd672-6216-4431-bb05-ec284b0404b2" />
<img width="225" alt="Screenshot_20260417-120534_Kairos" src="https://github.com/user-attachments/assets/358bc0b9-0702-4f64-bd7b-edc4b53685fb" />
<img width="225" alt="Screenshot_20260417-120538_Kairos" src="https://github.com/user-attachments/assets/20d7bb2a-76d3-4f83-8e32-e82c3908af1a" />
<img width="225" alt="Screenshot_20260417-120542_Kairos" src="https://github.com/user-attachments/assets/6e15b141-3fee-4eb3-8bc9-4c8fb0296da0" />
<img width="225" alt="Screenshot_20260417-120549_Kairos" src="https://github.com/user-attachments/assets/f1e1102c-3c17-4cc6-9a38-ac592b0176ef" />

---

## Light Theme

<img width="225" alt="Screenshot_20260417-121516_Kairos" src="https://github.com/user-attachments/assets/93a9f091-fcde-42ee-8cd0-262b128ce0b4" />
<img width="225" alt="Screenshot_20260417-121550_Kairos" src="https://github.com/user-attachments/assets/ca11eefb-b6b6-4c31-806f-31e8f786622a" />
<img width="225" alt="Screenshot_20260417-121600_Kairos" src="https://github.com/user-attachments/assets/efa1d3c0-9ba2-4e2b-a026-a8b18842148e" />
<img width="225" alt="Screenshot_20260417-121554_Kairos" src="https://github.com/user-attachments/assets/50c4a1ae-e28e-4eeb-bcb9-8ff21e3efd53" />



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

## 🚀 Installation (Legacy)
> [!WARNING]
> These instructions are for the archived version. For the current version, see [stillnorth-labs/kairos](https://github.com/stillnorth-labs/kairos).

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
