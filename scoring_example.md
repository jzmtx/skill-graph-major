# Anatomy of a Hireability Score: A Realistic Example

Let's break down exactly how the mathematical algorithm works using a realistic, hypothetical student named **Alex**. 

We use a scale modeled after a **Credit Score (300 to 850)**.

### Alex's Profile:
1.  **Python**: Scored **100%** on the L1 Assessment, and passed the **L2 Project Interview**.
2.  **C++**: Scored **70%** on the L1 Assessment (Currently at Level 1).
3.  **Achievements**: Won **2 Hackathons** (We'll introduce an "External Proof" multiplier for this).

Here is exactly how the SkillGraph engine calculates Alex's final score:

---

### Step 1: The Base Score
Every student starts with a foundational score simply for entering the platform.
*   **Starting Baseline**: `300 points`
*   **Current Total**: `300`

---

### Step 2: Individual Skill Calculation
The engine evaluates each skill based on its base points (derived from assessment performance) multiplied by its Verification Depth.

**Skill 1: Python (Level 2 - Mastered)**
*   *Base Points*: Alex got 100% on the L1 Assessment, giving him a base of `50 points` (calculated as 100% / 2).
*   *L2 Project Bonus*: Passing the rigorous Level 2 Anti-Plagiarism interview grants a flat `+100 points`.
*   *Subtotal*: 150 points.
*   *Depth Multiplier*: Because it is Level 2 (Project Verified), the subtotal is multiplied by `3x`.
*   *Python Final Score*: 150 * 3 = **450 points**.

**Skill 2: C++ (Level 1 - Verified)**
*   *Base Points*: Alex got 70% on the L1 Assessment, giving him a base of `35 points` (calculated as 70% / 2).
*   *L2 Project Bonus*: 0 (Has not taken it yet).
*   *Subtotal*: 35 points.
*   *Depth Multiplier*: Because it is Level 1 (Assessment Verified), the subtotal is multiplied by `2x`.
*   *C++ Final Score*: 35 * 2 = **70 points**.

*   **Current Total**: 300 (Base) + 450 (Python) + 70 (C++) = `820 points`

---

### Step 3: Synergy and Consistency Bonuses
Employers don't just look at isolated skills; they look at how a candidate's brain works across multiple paradigms.

*   **Stack Synergy Bonus**: Python (Scripting/Backend) and C++ (Low-level/Systems) demonstrate a diverse range of programming knowledge. The algorithm recognizes this "Systems + Scripting" synergy and applies a **+5% bonus** to the total skill points.
    *   *Synergy calculation*: 5% of 520 (450+70) = `+26 points`.
*   **Consistency Bonus**: Alex has zero "Level 0" (unverified/self-reported) skills dragging him down. Because 100% of his listed skills are Level 1 or higher, he gets a Consistency Bonus of **+5%**.
    *   *Consistency calculation*: 5% of 520 = `+26 points`.

*   **Current Total**: 820 + 26 + 26 = `872 points`

---

### Step 4: External Achievements (The Hackathon Factor)
While internal assessments are great, external validation is the ultimate proof of employability. 

*   **Hackathon Wins**: Each verified hackathon win acts as a heavy flat bonus, because it proves teamwork, time management, and practical application.
    *   *Bonus per win*: `+25 points`
    *   *Alex's Bonus*: 2 wins * 25 = `+50 points`

*   **Current Total**: 872 + 50 = `922 points`

---

### Step 5: Final Normalization (The Asymptotic Curve)
Just like a real credit score, the Hireability Index uses an **Asymptotic Curve**. This means the score mathematically approaches 850 but never actually reaches it. This guarantees that nobody can achieve a "perfect" score, making the highest tiers exponentially harder to reach.

The engine uses this exact exponential decay formula: 
`Final Score = 300 + 550 * (1 - e^(-Raw Score / 1000))`

Let's plug Alex's raw score (`922`) into the curve:
1.  **Exponential Term**: `e^(-922 / 1000)` = `e^(-0.922)` ≈ `0.397`
2.  **Multiplier**: `1 - 0.397` = `0.603`
3.  **Curve Application**: `550 * 0.603` = `331.6`
4.  **Final Score**: `300 + 331.6` = **631**

*   **Alex's Final Hireability Score: 631 (Strong Senior)**

### Summary of Alex's Journey
Because Alex didn't just claim he knew Python, but actually **passed an AI interview about his own project code**, his Python score alone contributed massively. The addition of C++ showed versatility (triggering the Synergy bonus), and his real-world Hackathon wins solidified his status as an elite junior developer. 

Even with all these incredible achievements, the **Asymptotic Curve** keeps him at a realistic 631. To push past 750, Alex would need to verify 2 or 3 *more* skills at Level 2. This proves to employers that a score of 700+ is genuinely elite and mathematically impossible to fake.
