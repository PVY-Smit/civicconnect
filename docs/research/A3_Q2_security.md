# Question 2: Security engineering and threat-based controls

**Scope.** This is research for Milestone 3. It examines how credible threats become security
requirements, engineering controls and verification evidence in a web-based information system that
holds personal data and separates users by role. No control described here is selected for
CivicConnect. Question 4 carries each finding forward as a decision M3 still has to make.

## Why security is engineered through development rather than tested at the end

Treating security as a penetration test before release places the check after every decision that
determines what the test can find. NIST's Secure Software Development Framework sets out practices to
be integrated across the development life cycle rather than applied as a closing activity, on the
reasoning that most vulnerabilities are cheaper to prevent than to discover and repair later
(Souppaya, Scarfone and Dodson, 2022).

The OWASP Top 10:2025 makes the same point from evidence rather than principle. Its list contains
Insecure Design as a category in its own right, which is a class of weakness that no amount of testing
of the finished build can remove, because the flaw is in what was built rather than in how it was
coded (OWASP, 2025c). A late test can find a missing check. It cannot supply a control that was never
designed.

## Threat modelling, and one structured method

Threat modelling is the activity that turns a design into a set of decisions about where security
effort is worth spending. The OWASP cheat sheet frames it around the four questions set out in the
Threat Modeling Manifesto: what are we working on, what can go wrong, what are we going to do about
it, and did we do a good enough job (OWASP, no date d; Threat Modeling Manifesto, no date). The fourth
question is what separates threat modelling from a brainstorm, because it asks for evidence that the
response was adequate.

**STRIDE** is the structured method examined here. Microsoft describes it as a way to formulate
pointed questions about a design, categorising threats as spoofing, tampering, repudiation,
information disclosure, denial of service and elevation of privilege (Microsoft, 2017). Its value for
engineering is that it attaches a question to each element and flow in a design. Asking what spoofing
means at a login boundary produces an authentication requirement. Asking what elevation of privilege
means at a record-retrieval boundary produces an authorisation requirement. The categories are
prompts that generate requirements, and that is why STRIDE supports decisions rather than producing a
list of threat vocabulary.

Two limitations matter. STRIDE reasons over a model of the system, so its output is only as accurate
as that model, and a component omitted from the diagram is a component nobody asked questions about.
OWASP also notes that established techniques often need adaptation for modern cloud or hybrid
architectures, where shared responsibility and managed services move parts of the attack surface
outside the team's own design (OWASP, no date d).

## Four concern areas

Each chain runs from a plausible threat, to the requirement or control objective it creates, to an
engineering control, to the evidence that could support a claim that the control works.

### 1. Authentication

**Threat.** An attacker obtains the credential store through any disclosure and recovers passwords
offline at leisure. This is spoofing in STRIDE terms, since the result is the attacker acting as a
legitimate user. A related misuse is enumeration, where error messages differ between an unknown
account and a wrong password, so the login page itself confirms which accounts exist.

**Requirement.** Stored passwords must resist offline attack, and authentication responses must not
disclose whether an account exists.

**Control.** NIST is specific: verifiers shall store passwords in a form resistant to offline attacks,
and passwords shall be salted and hashed using a suitable password hashing scheme, where the scheme
takes the password, a salt and a cost factor, with the salt and the resulting hash both stored
(National Institute of Standards and Technology, 2025). OWASP adds that every authentication
mechanism, including password reset and recovery, should respond with a generic message regardless of
whether the identifier was wrong, the account does not exist, or the account is locked (OWASP, no
date a).

**Verification evidence.** Inspection of stored values in a test environment showing no plaintext,
reversible or unsalted storage; a test asserting the configured hashing scheme and cost factor; and
automated tests asserting that responses for a known and an unknown account are indistinguishable in
content and in status code.

### 2. Authorisation and access control

**Threat.** A user requests a record belonging to someone else by changing an identifier, or calls an
endpoint directly rather than through the interface, and the check that would have stopped them
exists only in the screen they bypassed. This is elevation of privilege.

**Requirement.** Every protected function is authorised on the server, access is denied by default,
and each user holds the least privilege their role requires.

**Control.** OWASP's recommendations are to enforce least privilege, deny by default, and validate
permissions on every request (OWASP, no date b). The 2025 Top 10 describes the failure mode directly:
violation of least privilege, commonly known as deny by default, where access should be granted only
for particular capabilities, roles or users but is available to anyone. That category has the highest
number of occurrences in the data contributed to the 2025 list (OWASP, 2025a).

**Verification evidence.** Negative tests derived from the role and function matrix, executed against
the endpoints rather than through the interface, so that the test exercises the same path an attacker
would. OWASP recommends unit and integration test cases for authorisation logic specifically, rather
than relying on manual checking (OWASP, no date b).

### 3. Secrets and configuration

**Threat.** A credential reaches the repository, a configuration file or build output. From that
moment it is exposed to everyone with read access, and deleting it from the current branch does not
remove it from history.

**Requirement.** Secrets are held outside source and configuration, and any secret that has been
exposed is treated as compromised rather than merely removed.

**Control.** OWASP records that organisations commonly hardcode secrets in repositories in plaintext
and scatter them through configuration, and sets out a lifecycle for secrets that includes creation,
rotation and revocation, with access control and auditing around the store (OWASP, no date c).
Rotation is the part that matters after exposure, because removal alone leaves a valid credential in
circulation.

**Verification evidence.** A scan of the full history returning no findings; a scan running on every
push so that a new secret is caught at the point of introduction; and evidence that the rotation
procedure exists and has been exercised at least once, since an untested procedure is a claim rather
than a control.

### 4. Dependency and supply chain vulnerabilities

**Threat.** A third-party component carrying a known vulnerability, an unmaintained component, or a
package substituted or compromised upstream, enters the build and ships with the product.

**Requirement.** The composition of what is built is known, and components with known vulnerabilities
or no maintenance are detected and resolved deliberately.

**Control.** Dependency scanning on every change, pinned versions through lockfiles, a recorded
justification when a dependency is added, and a generated inventory of what the build contains. OWASP
moved this risk from its 2013 form, "Using Components with Known Vulnerabilities", to the broader
Software Supply Chain Failures category in 2025, which now covers the whole chain rather than known
vulnerabilities alone. It was ranked first by exactly half of the respondents to the community survey,
and its mapped weaknesses include reliance on unmaintained third-party components and dependency on a
vulnerable third-party component (OWASP, 2025b).

**Verification evidence.** Scanner output attached to each change, a reviewed lockfile difference when
dependencies move, and a component inventory produced by the build rather than maintained by hand.

## Threat-to-Control Traceability Table

| Threat or misuse | Security requirement or control objective | Possible engineering control | Verification evidence | Residual risk or limitation |
|---|---|---|---|---|
| Credential store disclosed and passwords recovered offline; login responses reveal which accounts exist | Stored passwords resist offline attack; authentication responses do not disclose account existence | Salted hashing with a suitable scheme and cost factor; generic responses across login, reset and recovery (National Institute of Standards and Technology, 2025; OWASP, no date a) | Inspection of stored values in a test environment; test asserting scheme and cost factor; tests asserting identical responses for known and unknown accounts | Hashing does not protect a password already reused from another breach. The evidence proves the storage format, not that accounts cannot be taken over |
| A user retrieves or acts on a record outside their scope by changing an identifier or calling an endpoint directly | Server-side authorisation on every protected function; deny by default; least privilege | One policy component consulted by every protected operation, with read scope applied in the query (OWASP, no date b; OWASP, 2025a) | Negative tests for each role and function pair, executed against endpoints rather than the interface; unit and integration tests for the authorisation logic | Tests cover the matrix that was written. A function added later is unprotected by the evidence until the matrix is extended |
| A credential is committed, or printed into build output, and remains in history after deletion | Secrets held outside source and configuration; exposure treated as compromise | Secret store or injected environment configuration, ignore rules, scanning on every push, and a rotation and revocation lifecycle (OWASP, no date c) | Full-history scan with no findings; per-push scanning; evidence that rotation has been exercised | Scanning detects recognisable patterns. An unusual format, or a secret inside a built image, can pass. A clean scan does not prove a secret was never exposed |
| A dependency carrying a known vulnerability, or an unmaintained or substituted package, enters the build | Known composition; vulnerable or unmaintained components detected and resolved deliberately | Dependency scanning per change, pinned versions, justification for each new dependency, generated component inventory (OWASP, 2025b) | Scanner output per change; reviewed lockfile differences; build-generated inventory | Scanners report what is already known. A vulnerability with no advisory yet, or a malicious package that has not been reported, is not detected. An inventory proves composition, not safety |

## How secure design, secure coding and security checking relate

The three cover different classes of defect, and each is weak where another is strong.

**Secure design** decides what controls exist. Threat modelling belongs here, and so does the OWASP
category Insecure Design, which exists precisely because some weaknesses are properties of the design
rather than of the code (OWASP, 2025c). No scanner reports a missing authorisation model, because
nothing in the code is wrong. The control was never specified.

**Secure coding** decides whether the designed control is implemented correctly. This is where
input handling, output encoding and correct use of a hashing library live. A correct design
implemented carelessly still fails.

**Security checking** covers what the first two miss and what changes after them. Dependency scanning
addresses risk the team inherits rather than writes, and it has to run repeatedly, because a component
that was clean when chosen becomes vulnerable when an advisory is published.

They are complements rather than substitutes, and the evidence supports treating them that way.
Research on code review reports that only about one percent of review comments address security
issues (Bacchelli and Bird, 2013 and di Biase et al., 2016, both cited in Yang et al., 2026), so human review
alone systematically under-covers this area. Automated analysis compensates for part of that, and it
is bounded in turn by what it can recognise.

## Limitations of automated tools and AI-generated security recommendations

**Automated tools report what they can recognise, which excludes the design and the policy.** A
scanner can confirm that a parameter is validated. It cannot confirm that the authorisation rule
being enforced is the correct rule, because correctness depends on intent the tool does not hold. This
is consistent with Broken Access Control remaining the category with the highest number of occurrences
in the 2025 data, despite scanning being widely available (OWASP, 2025a). Static analysis also
overlaps only partly with what people find: in a review of modern code review research, static
analysis tools such as PMD address about sixteen percent of the issues identified in manual reviews
(Singh et al., 2017, cited in Yang et al., 2026).

**AI-generated security recommendations can be wrong and confidently presented.** Pearce et al. (2022)
prompted GitHub Copilot across 89 scenarios relevant to high-risk weaknesses, producing 1,689
programs, and found approximately forty percent of them vulnerable. Perry et al. (2023) ran a
controlled user study and found that participants with access to an AI assistant wrote significantly
less secure code than those without, and were more likely to believe their code was secure. The second
finding is the more serious one for an engineering process, because it describes a control failure in
the reviewer rather than in the tool: confidence rises while security falls, which removes the doubt
that would otherwise trigger verification.

A third limitation follows from both. Tool output and generated advice describe the checks that ran.
Neither describes the threats nobody modelled, so neither can be evidence that the threat coverage is
complete.

## Critical question: what a clean scanner report does not prove

A scanner reporting no high-severity findings supports one narrow claim: within the rules it holds,
across the code it examined, at the time it ran, it recognised nothing serious. Several important
claims remain unproven.

- **That the authorisation model is correct.** The tool checks whether checks exist, and not whether
  the policy they enforce matches the intended access matrix.
- **That the design is sound.** Insecure Design is a distinct category for the reason above (OWASP,
  2025c).
- **That the scan covered what matters.** Coverage depends on configuration, on the languages and
  dependency manifests the tool understands, and on what was excluded.
- **That no secret has already been exposed.** A clean result today says nothing about a credential
  that was committed, removed and never rotated (OWASP, no date c).
- **That unknown vulnerabilities are absent.** A dependency scanner reports advisories that exist. A
  vulnerability not yet published is indistinguishable from none (OWASP, 2025b).
- **That a failure would be noticed.** Detection is a separate capability, which the 2025 list carries
  as Security Logging and Alerting Failures (OWASP, 2025c).

The defensible reading of a clean report is that it removes a set of known, recognisable defects from
consideration, and that it says nothing about the classes of failure it was never able to examine.

## References

Microsoft (2017) *Threats: Microsoft Threat Modeling Tool*. Microsoft Learn. Available at:
https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats (Accessed: 21
September 2026).

National Institute of Standards and Technology (2025) *SP 800-63B-4: digital identity guidelines,
authentication and authenticator management*. Gaithersburg, MD: NIST. Available at:
https://pages.nist.gov/800-63-4/sp800-63b.html (Accessed: 21 September 2026).

OWASP (2025a) *A01:2025 broken access control*. OWASP Top 10:2025. Available at:
https://top10.owasp.org/2025/A01_2025-Broken_Access_Control/ (Accessed: 21 September 2026).

OWASP (2025b) *A03:2025 software supply chain failures*. OWASP Top 10:2025. Available at:
https://top10.owasp.org/2025/A03_2025-Software_Supply_Chain_Failures/ (Accessed: 21 September 2026).

OWASP (2025c) *OWASP Top 10:2025 introduction*. Available at:
https://top10.owasp.org/2025/0x00_2025-Introduction/ (Accessed: 21 September 2026).

OWASP (no date a) *Authentication cheat sheet*. OWASP Cheat Sheet Series. Available at:
https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html (Accessed: 21 September
2026).

OWASP (no date b) *Authorization cheat sheet*. OWASP Cheat Sheet Series. Available at:
https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html (Accessed: 21 September
2026).

OWASP (no date c) *Secrets management cheat sheet*. OWASP Cheat Sheet Series. Available at:
https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html (Accessed: 21
September 2026).

OWASP (no date d) *Threat modeling cheat sheet*. OWASP Cheat Sheet Series. Available at:
https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html (Accessed: 21
September 2026).

Pearce, H., Ahmad, B., Tan, B., Dolan-Gavitt, B. and Karri, R. (2022) 'Asleep at the keyboard?
Assessing the security of GitHub Copilot's code contributions', in *2022 IEEE Symposium on Security
and Privacy (SP)*. Preprint available at: https://arxiv.org/abs/2108.09293 (Accessed: 21 September
2026).

Perry, N., Srivastava, M., Kumar, D. and Boneh, D. (2023) 'Do users write more insecure code with AI
assistants?', in *Proceedings of the 2023 ACM SIGSAC Conference on Computer and Communications
Security (CCS 2023)*. doi: 10.1145/3576915.3623157.

Souppaya, M., Scarfone, K. and Dodson, D. (2022) *SP 800-218: secure software development framework
(SSDF) version 1.1, recommendations for mitigating the risk of software vulnerabilities*.
Gaithersburg, MD: NIST. Available at: https://csrc.nist.gov/pubs/sp/800/218/final (Accessed: 21
September 2026).

Threat Modeling Manifesto (no date) *Threat Modeling Manifesto*. Available at:
https://www.threatmodelingmanifesto.org/ (Accessed: 21 September 2026).

Yang, Z., Gao, C., Guo, Z., Li, Z., Liu, K., Xia, X. and Zhou, Y. (2026) 'A roadmap on modern code
review: challenges and opportunities', arXiv preprint arXiv:2405.18216v2. Available at:
https://arxiv.org/abs/2405.18216v2 (Accessed: 15 September 2026).
