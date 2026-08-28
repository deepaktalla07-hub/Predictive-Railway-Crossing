# Kinematic Prediction & Risk Calculation Algorithm

## 1. Kinematic Crossing Arrival Model

Let a railway crossing $C$ be located along a rail line between Station $A$ and Station $B$.

### Train Passage Duration
$$t_{passage} = \frac{L_{train} + W_{road}}{v_{train}}$$

Where:
- $L_{train}$: Length of train in meters ($\approx 650\text{ m}$ for 24-coach passenger train).
- $W_{road}$: Width of road crossing ($\approx 15\text{ m}$).
- $v_{train}$: Speed in $\text{m/s}$ ($\frac{v_{kmh} \times 1000}{3600}$).

### Gate Closure Window
Railway level gates close in advance of train arrival for interlocking, signal clearance, and track circuit triggering:
$$T_{close} = T_{cross} - B_{pre}$$
$$T_{open} = T_{cross} + t_{passage} + B_{post}$$

- $B_{pre}$: Pre-closure buffer (typically $300\text{ to }480\text{ seconds}$).
- $B_{post}$: Post-clearance barrier lifting buffer (typically $90\text{ to }180\text{ seconds}$).

---

## 2. Road User Arrival Estimation

Given total driving route distance $D_{route}$ and duration $T_{route}$, the user's expected traversal time to crossing $C$ at distance $d_{crossing}$ is:
$$t_{travel} = T_{route} \cdot \left(\frac{d_{crossing}}{D_{route}}\right)$$

Road user arrival window with traffic buffer:
$$[T_{user\_min}, T_{user\_max}] = [T_{depart} + t_{travel} \cdot (1 - \delta_{traffic}), T_{depart} + t_{travel} \cdot (1 + \delta_{traffic})]$$

---

## 3. Temporal Overlap & Risk Score Formulation

### Overlap Duration
$$\text{Overlap} = \max\left(0, \min(T_{user\_max}, T_{open}) - \max(T_{user\_min}, T_{close})\right)$$

### Risk Score Formulation ($R \in [0, 100]$)
$$R = \min\left(100, \left(60 \cdot P_{closure} + 40 \cdot S_{delay}\right) \cdot M_{tracks} \cdot C_{confidence}\right)$$

Where:
- $P_{closure} = \min\left(1.0, \frac{\text{Overlap}}{T_{user\_max} - T_{user\_min}}\right)$
- $S_{delay} = \min\left(1.0, \frac{T_{open} - T_{user\_arr}}{\text{MaxAcceptableDelay}}\right)$
- $M_{tracks} = 1.0\text{ (single track)}, 1.15\text{ (double track)}, 1.25\text{ (>2 tracks)}$
- $C_{confidence} \in [0.4, 1.0]$: Provenance confidence coefficient.

### Risk Classification
| Score ($R$) | Tier | Recommendation |
| :--- | :--- | :--- |
| **0 – 20** | `CLEAR` | Proceed on primary route |
| **21 – 45** | `LOW_RISK` | Proceed with caution alert |
| **46 – 70** | `MODERATE_WARNING` | Consider departure shift or detour |
| **71 – 100** | `HIGH_RISK_BLOCK` | **Recommend Grade-Separated ROB/RUB Detour** |

---

## 4. Alternative Detour Trade-off Matrix

$$\text{Net Time Saved} = \text{Estimated Gate Wait Time} - \text{Detour Extra Driving Time}$$

If $\text{Net Time Saved} > 0$ or Risk Score $\ge 70$, the alternative route is marked `isRecommended: true`.
