import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch

fig, ax = plt.subplots(figsize=(13, 8), dpi=200)
ax.set_xlim(0, 13)
ax.set_ylim(0, 8.6)
ax.axis("off")

# Column headers
headers = ["Risk / quality concern", "Verification evidence", "What it proves / cannot prove", "Progression decision"]
xs = [0.2, 3.5, 6.7, 10.2]
widths = [3.1, 3.0, 3.3, 2.6]
for x, w, h in zip(xs, widths, headers):
    ax.add_patch(FancyBboxPatch((x, 8.0), w, 0.5, boxstyle="round,pad=0.02",
                 facecolor="#1F3864", edgecolor="none"))
    ax.text(x + w/2, 8.25, h, ha="center", va="center", color="white",
            fontsize=10.5, fontweight="bold", wrap=True)

rows = [
    ("Broken access control:\na user reaches a record\nor function outside\ntheir role/ownership",
     "Negative API/integration\ntests executed directly\nagainst endpoints, derived\nfrom the role/function\naccess matrix",
     "Proves: every mapped\nrole-function pair is\nenforced server-side.\nCannot prove: the matrix\nitself is complete",
     "Block merge on any\nfailing negative test;\nrelease gated on zero\nfailures across the\nfull matrix"),
    ("Concurrency defect:\ntwo simultaneous writes\nto one record produce\nan inconsistent or lost\nupdate",
     "Integration tests that\ndeliberately race two\nconcurrent operations\nagainst the same record",
     "Proves: the specific\nraces exercised are\nhandled correctly.\nCannot prove: every\npossible interleaving\nis safe",
     "Block merge if a\nmodelled race produces\ndata loss; unmodelled\nraces remain an\naccepted residual risk"),
    ("Performance degradation:\nresponse time exceeds\nan agreed target as\nreal data volume grows",
     "Load/performance testing\nagainst a seeded dataset\nat the target volume,\nmeasuring the response\ndistribution",
     "Proves: the system meets\nthe target under the\ntested load shape.\nCannot prove: behaviour\nunder an unmodelled\ntraffic pattern",
     "Warn below target;\nblock release if the\n95th percentile exceeds\nthe agreed threshold"),
    ("Vulnerable dependency:\na third-party package\ncarries a known CVE or\nis compromised upstream",
     "Automated dependency /\nsoftware composition\nscanning on every change,\nagainst a public\nadvisory database",
     "Proves: no scanned\ndependency matches a\nknown, published advisory.\nCannot prove: an\nunpublished or zero-day\nvulnerability is absent",
     "Warn on low/medium\nseverity; block merge\non high/critical severity\nfindings"),
]

y_top = 7.7
row_h = 1.85
for i, (risk, evid, proves, dec) in enumerate(rows):
    y = y_top - i*row_h
    colors = ["#DCE6F1", "#FCE9DA", "#E2EFDA", "#F2DCDB"]
    for x, w, text in zip(xs, widths, [risk, evid, proves, dec]):
        ax.add_patch(FancyBboxPatch((x, y-row_h+0.15), w, row_h-0.25, boxstyle="round,pad=0.02",
                     facecolor=colors[i], edgecolor="#888888", linewidth=0.6))
        ax.text(x + w/2, y - row_h/2 + 0.02, text, ha="center", va="center", fontsize=8.3)
    # arrows between columns
    for j in range(3):
        arrow = FancyArrowPatch((xs[j]+widths[j], y - row_h/2 + 0.02),
                                 (xs[j+1], y - row_h/2 + 0.02),
                                 arrowstyle="-|>", mutation_scale=12, color="#555555", linewidth=1.2)
        ax.add_patch(arrow)

ax.set_title("Risk-to-Verification Evidence Map\nFour example risks, traced from evidence to a progression decision, for a modern web-based information system",
              fontsize=12, fontweight="bold", pad=14)

plt.tight_layout()
plt.savefig("risk_verification_map.png", bbox_inches="tight", facecolor="white")
print("saved")