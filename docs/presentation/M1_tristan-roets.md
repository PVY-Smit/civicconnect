# M1 presentation — Tristan Roets's segment

Risk Register and Forward Engineering Considerations. Roughly three minutes, per the
allocation in the close-out plan.

Content supplied by Tristan Roets. Committed from Jean Smit's account because he could not
reach a machine on the evening of 9 September; at his request the commit is not attributed
to him.

**Show the live registers, not slides.** M1 s7 requires controlled evidence, and Master
Brief s23 says screenshots do not replace live artefacts where those are available.

---

## Before speaking

| Tab | On |
|---|---|
| 1 | Registers workbook — **Risk Register** sheet |
| 2 | Registers workbook — **Forward Considerations** sheet |
| 3 | PED s10 and s11, the mirrored copies |

---

## The segment

My section covers the Risk Register and Forward Engineering Considerations.

The Risk Register records uncertainties that could affect the project, including
probability, impact, mitigation, contingency, ownership and status.

One real example from this milestone is **review capacity**. Requiring two non-author
approvals improves quality and accountability, but in a three-person team it can delay
progress when somebody is unavailable. During M1 this stopped being only a hypothetical
risk, which is why we updated the relevant risk evidence.

> **Show RSK-04 and RSK-07.** Both moved from Open to Materialised on 9 September. RSK-07
> also moved from probability 2 to 3, taking exposure from 8 to 12 and the band from Medium
> to High.

Another issue we found was **reproducibility of generated artefacts**. Figure 2 had a
label-placement defect, but only the rendered image was retained, not the editable source
or generation script. That makes correction harder, and is why we record generated-artefact
reproducibility as a risk going forward.

> **Show RSK-15**, and the limitation in PED s16.1 if there is time.

**Forward Engineering Considerations are different from risks.** A risk is uncertainty that
could negatively affect the project. An FEC records an important future engineering decision
that we need to keep visible now without deciding it prematurely.

Deployment, hosting and rollback are examples: they matter, but M1 is not the right
milestone to lock the final implementation choices.

The main idea is that the Risk Register manages uncertainty, while the FEC register prevents
us from forgetting important future decisions or making them too early.

---

## Likely questions

| Question | Where to go | The answer |
|---|---|---|
| Which risk deserves the most attention now? | Risk Register | RSK-04 and RSK-07, because they have already materialised rather than being predicted |
| What is the difference between a risk and an FEC? | both sheets | A risk is uncertainty that could harm the project; an FEC is a decision that must stay visible without being taken early |
| Why is deployment relevant in M1 when it is built in M3? | FEC-05 | Staged rollout and rollback are architectural properties. The M2 platform choice closes those options, so the concern has to be open before the decision |
| What changed in your review pass? | RSK-04, RSK-07, RSK-15 | Two statuses moved to Materialised, one probability moved 2 to 3, and RSK-15 was added from the Figure 2 defect |
| Who owns which risk? | Owner column | Mine are RSK-01, 02, 05, 10 and 13 |

---

## Delivery

- Three minutes. The two worked examples matter more than covering every row.
- Explain rather than read; delivery is marked separately from the evidence.
- Hand over by naming what the next person adds.
