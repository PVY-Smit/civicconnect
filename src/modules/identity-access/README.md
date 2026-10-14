# Identity and access

Sign-in, sessions, the permission check every protected route uses, and the Manager-assisted password
reset (FR-001 to FR-004, NFR-004, ADR-006). The rules are in the code's comments; this page covers what
someone operating the service needs to know about the reset. The tests are TC-08 to TC-11 and TC-36 in
`docs/quality/test-catalogue.md`.

## How the reset works

A Manager issues a one-time code for an account from user administration and gives it to the user, who
enters it with a new password (FR-004, as agreed on #109). The code lasts 24 hours unless the caller chooses
up to 7 days, as #115 does for a new account's first password (FR-003). Five wrong tries withdraw it, and
the Manager issues a new one. A reset ends every session the account had.

## What the account events show, and what they do not

Each step writes an account event in the same transaction as the change. An event records who did what to
which account and when, never the code.

| Event | Written when | What it shows |
|---|---|---|
| `reset-code-issued` | A Manager issues a code | Who issued it, for which account, when, and when it expires |
| `reset-code-withdrawn` | The fifth wrong try | The account and the time. No actor: the tries came from the public route |
| `password-reset` | The code is used | The account and the time. The actor is the account itself |

**The reset event cannot show who used the code.** Anyone holding the code and the account's email could
have used it, and that includes the Manager who issued it. Read `password-reset` as "the code was used",
never as proof that the user did it. The evidence of who could have used it is the `reset-code-issued`
event before it.

## Decisions and limits

- **Five wrong tries withdraw a live code, whoever sends them.** Anyone who knows an account's email can
  withdraw its code, including a new user's first-password code before they use it. This is the cost of
  the limit, accepted in the review of #146: the user asks the Manager for a new code. It is to be recorded
  in the Technical Debt Register (#125) with the missing rate limiting by address.
- **At most 4 argon2 checks run at once** (`concurrency.js`), across sign-in, the reset and issuing codes.
  With ADR-002's 19 MiB per check, 4 hold about 76 MiB. Without the cap, about 30 at once would need some
  570 MiB, more than the 512 MB of the free web service (PED s24), so a burst on a public route could stop
  the whole instance (NFR-003). With the cap, a burst waits its turn instead.
- **No common-password check.** A new password needs 8 to 128 characters and nothing else. A check against
  a list of common passwords is to be recorded in the Technical Debt Register (#125).

## When the only Manager is locked out

A Manager's code has to come from another Manager, and the seed data creates one Manager (#109). If that
Manager cannot sign in, the route is a break-glass script, run once:

- **Who may run it:** only a team member holding the database credentials for that environment. For
  staging, the member who deployed it (#122). Nobody runs it for another role: a Manager issues those
  codes.
- **What it does:** it issues a code for the named Manager account through the same store write as the
  application (`users.setResetCode`). It writes the same `reset-code-issued` event, with no actor and the
  name of the person who ran it, so the audit shows the code came from outside the application. It then
  prints the code once.
- **Where it is:** the script needs the persistence adapter, so it is written with #109 and goes in
  `tools/`. Until then, a second Manager account in the seed data avoids the problem.
