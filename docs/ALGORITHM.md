# Algorithmic & Mathematical Decision Logic

This document details the original mathematical models, spatial projections, kinematic arrival estimators, risk evaluation functions, and alternative detour algorithms designed for the **Railway Gate Route Assistant**.

---

## 1. Train-to-Railway-Crossing Kinematic Prediction Engine

### Purpose
Estimates the precise gate closure interval $[T_{\text{close}}, T_{\text{reopen}}]$ when an approaching train is predicted to traverse a level crossing.

```
Station A (Passed)                   Crossing LC-X                    Station B (Next)
       |===================================|==================================|
       d_A                                d_LC                               d_B
       |------------ d_segment ------------|
       |------------------------ D_total -------------------------------------|
```

### Algorithmic Derivation

1. **Fractional Distance Ratio**:
   Let the railway crossing $LC$ lie on railway line $L$ between Station $A$ and Station $B$ with railway mileages $d_A$ and $d_B$.
   $$\alpha = \frac{d_{LC} - d_A}{d_B - d_A}, \quad 0 < \alpha < 1$$

2. **Scheduled Transit Duration**:
   $$\Delta T_{\text{station}} = T_{\text{arr}, B} - T_{\text{dep}, A}$$

3. **Scheduled Crossing Arrival Time**:
   $$T_{\text{crossing, sched}} = T_{\text{dep}, A} + \alpha \cdot \Delta T_{\text{station}}$$

4. **Live Delay Adjusted Predicted Arrival**:
   Given real-time delay $\delta_{\text{delay}}$ (in minutes):
   $$T_{\text{train, arr}} = T_{\text{crossing, sched}} + \delta_{\text{delay}}$$

5. **Gate Closure Interval**:
   Given physical gate configuration pre-closure buffer $t_{\text{pre}}$ ($360\text{s}$ for interlocked gates), train traversal clearance duration $t_{\text{clear}}$ ($120\text{s}$), and track safety buffer $t_{\text{buffer}}$:
   $$T_{\text{close}} = T_{\text{train, arr}} - t_{\text{pre}}$$
   $$T_{\text{reopen}} = T_{\text{train, arr}} + t_{\text{clear}}$$
   $$\text{Closure Window} = [T_{\text{close}}, T_{\text{reopen}}], \quad \Delta T_{\text{closure}} = t_{\text{pre}} + t_{\text{clear}}$$

---

## 2. User-to-Crossing Arrival Prediction Service

### Purpose
Calculates the user's driving travel duration and expected arrival window at each railway crossing along their chosen road route.

```
Origin (User Start)                  Crossing LC-X                    Destination
       |-----------------------------------|----------------------------------|
       0 m                                d_cross                           D_total
       t_dep                             T_user,arr                        T_dest
```

### Algorithmic Derivation

1. **Orthogonal Polyline Projection**:
   The road route geometry is a piecewise linear polyline $P = [p_1, p_2, \dots, p_n]$. For crossing coordinate $C = (\text{lat}_c, \text{lng}_c)$, we find the closest segment $S_k = [p_k, p_{k+1}]$ minimizing orthogonal Euclidean distance:
   $$d_{\text{min}} = \min_{1 \le k < n} \text{dist}(C, S_k)$$
   If $d_{\text{min}} \le \text{threshold}_{\text{buffer}}$ ($75\text{m} \dots 100\text{m}$), the crossing intersects the route.

2. **Cumulative Route Distance to Crossing**:
   $$d_{\text{cross}} = \sum_{i=1}^{k-1} \text{dist}(p_i, p_{i+1}) + \text{dist}(p_k, \text{proj}_{S_k}(C))$$

3. **Proportional Driving Travel Duration**:
   Given total route driving distance $D_{\text{total}}$ and duration $\Delta T_{\text{route}}$:
   $$\Delta t_{\text{user}} = \left( \frac{d_{\text{cross}}}{D_{\text{total}}} \right) \cdot \Delta T_{\text{route}}$$

4. **User Predicted Arrival Time**:
   $$T_{\text{user, arr}} = T_{\text{dep}} + \Delta t_{\text{user}}$$

5. **Bounded Uncertainty Window**:
   To prevent claiming false exact arrival times in traffic, uncertainty $\sigma$ is computed based on distance and traffic awareness:
   $$\sigma = \begin{cases} \max(60\text{s}, 0.08 \cdot \Delta t_{\text{user}}) & \text{if traffic-aware} \\ \max(120\text{s}, 0.15 \cdot \Delta t_{\text{user}}) & \text{if static speed profile} \end{cases}$$
   $$\text{User Window} = [T_{\text{user, arr}} - \sigma, T_{\text{user, arr}} + \sigma]$$

---

## 3. Railway Crossing Risk Engine

### Purpose
Evaluates whether the user's arrival window conflicts with the train closure window and classifies closure risk without making unqualified certainty claims.

### Algorithmic Derivation

1. **Absolute Time Difference**:
   $$\Delta t = |T_{\text{train, arr}} - T_{\text{user, arr}}|$$

2. **Temporal Overlap Assessment**:
   $$\text{Overlap} = \max(0, \min(T_{\text{user, max}}, T_{\text{reopen}}) - \max(T_{\text{user, min}}, T_{\text{close}}))$$

3. **Risk Level Classification**:
   - If crossing is grade-separated (ROB / RUB overpass / underpass): $\implies \mathbf{CLEAR}$ ($\text{Risk} = \text{LOW}$, $\text{Score} = 0$).
   - If $\Delta t \le 120\text{s}$ or $\text{Overlap} > 0$: $\implies \mathbf{HIGH}$ ($\text{Score} = 85 \dots 100$).
   - If $120\text{s} < \Delta t \le 420\text{s}$ ($7\text{ min}$): $\implies \mathbf{MODERATE}$ ($\text{Score} = 50 \dots 84$).
   - If $\Delta t > 420\text{s}$: $\implies \mathbf{LOW}$ ($\text{Score} = 0 \dots 49$).
   - If train schedule or telemetry is missing: $\implies \mathbf{UNKNOWN}$ ($\text{Score} = 0$).

4. **Qualified Non-Guaranteed Language Rule**:
   - Risk is a statistical prediction. The engine uses: *"High risk of encountering a closed railway crossing."*
   - The engine **never** claims: *"The railway gate WILL be closed."* unless an authoritative hardware sensor confirms it.

---

## 4. Alternative Route Engine & Avoidance Verification

### Purpose
Generates alternative routes when a crossing has `HIGH` or `MODERATE` risk, and geometrically verifies that the alternative detour avoids the affected crossing before recommending it.

### Algorithmic Derivation

1. **Avoidance Verification**:
   For candidate alternative route polyline $P_{\text{alt}}$, calculate minimum orthogonal distance to affected crossing coordinate $C_{\text{closed}}$:
   $$d_{\text{clearance}} = \min_{s \in P_{\text{alt}}} \text{dist}(C_{\text{closed}}, s)$$
   $$\text{avoidsAffectedCrossing} = \begin{cases} \mathbf{true} & \text{if } d_{\text{clearance}} > 75\text{m} \\ \mathbf{false} & \text{otherwise} \end{cases}$$

2. **Comparative Metrics**:
   $$\Delta D = D_{\text{alt}} - D_{\text{primary}} \quad (\text{e.g. } +1.7\text{ km})$$
   $$\Delta T = T_{\text{alt}} - T_{\text{primary}} \quad (\text{e.g. } +4\text{ min})$$

3. **Net Time Saved vs Gate Delay**:
   Given expected gate closure delay $W_{\text{gate}}$ ($8 \dots 12\text{ min}$):
   $$\text{Time Saved} = W_{\text{gate}} - \Delta T$$
   $$\text{isRecommended} = \text{avoidsAffectedCrossing} \land (\text{Time Saved} > 0 \lor \text{PrimaryRisk} = \text{HIGH})$$

---

## 5. Community 4-Factor Consensus Scoring Algorithm

Given crowdsourced reports $R = [r_1, r_2, \dots, r_k]$ submitted for crossing $C$:

1. **Time-Decay Weight ($w_t$)**:
   $$w_t(r_i) = e^{-\Delta t_i / 900}, \quad \text{where } \Delta t_i = \text{age in seconds}$$
2. **Proximity Weight ($w_d$)**:
   $$w_d(r_i) = 1.0 - \left( \frac{\text{dist}(r_i, C)}{800\text{m}} \right)^{1.5}$$
3. **Sample Size Multiplier ($M_n$)**:
   $$M_n = \min(1.0, 0.4 + 0.2 \cdot n_{\text{unique\_users}})$$
4. **Consensus Confidence**:
   $$\text{Confidence} = \left( \frac{\sum_{r_i \in \text{majority}} w_t(r_i) \cdot w_d(r_i)}{\sum w_t(r_i)} \right) \cdot M_n$$
