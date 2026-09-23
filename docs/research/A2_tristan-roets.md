# SEN381 Assignment 2: Tristan Roets Contribution

**Project:** CivicConnect\
**Contributor:** Tristan Roets\
**Sections:** Task 2: Persistence and Data Integrity; Task 3: APIs and Integration

## Task 2: Persistence and Data Integrity

### Request creation and reference generation

#### Engineering problem

CivicConnect must create a request correctly even when several users submit at nearly the same time. The operation captures the request data in FR-005, uses the controlled category list in FR-006, validates mandatory fields under FR-007, and must issue a unique human-readable reference that is never reused under FR-008. FR-009 then requires the acknowledgement to show the reference and recorded date and time.

A valid form is only part of the correctness problem. The request and its reference must be stored consistently, and concurrent submissions must never receive the same reference.

#### Transactions, validation and integrity

Request creation should be treated as one business operation. The application should validate the request, obtain a reference, insert the request and commit the result as one controlled operation. If any write fails, the operation should not leave a partially created request that appears successful.

Fowler (2002) describes a Service Layer as an application boundary that coordinates application operations and can control transactions. For CivicConnect this supports keeping request-creation orchestration in the application/service layer rather than spreading the complete business operation across the UI and database code.

Validation should not exist in only one place. Client-side validation gives immediate feedback, but the client cannot be the only enforcement point because requests can reach the server without using the intended UI. The service layer should enforce business rules again, including required values, formats and whether the selected category is allowed. The database should enforce structural integrity where possible. PostgreSQL documentation explains that a unique constraint ensures that a value, or combination of values, remains unique across rows (PostgreSQL Global Development Group, 2026a).

For CivicConnect, the UI should provide fast feedback, the service layer should own business validation and orchestration, and the database should protect integrity rules such as uniqueness, required data and valid relationships. Relying only on the UI risks invalid data bypassing it, while relying only on the database gives poor feedback and pushes too much business logic into persistence.

#### Concurrency and alternatives

The key concurrency case is two requesters submitting at the same time. A design that simply reads the current highest reference and adds one in application code is unsafe unless locking is added, because two requests could read the same value before either commits.

| Approach | Concurrency behaviour | Advantages | Limitations |
|:---|:---|:---|:---|
| Database-managed sequence plus unique constraint | Database allocates distinct values under concurrent access | Simple, fast and centralised | Numbers can have gaps after failed transactions |
| Application-generated reference plus unique constraint and retry | Database rejects collisions and application retries | Flexible format | More collision/retry logic and easier to implement incorrectly |
| Locked counter row inside the transaction | Counter update is serialised | Tight control over visible numbering | Extra locking, contention and complexity |

PostgreSQL provides a concrete example of the first approach. Its `nextval` operation is atomic, so concurrent sessions receive distinct sequence values (PostgreSQL Global Development Group, 2026b). The same documentation warns that sequence values are not reclaimed after an aborted transaction, so gaps can occur. This is acceptable for CivicConnect because FR-008 requires references to be unique and never reused; it does not require gapless numbering.

Caching the next reference number is not recommended. It is correctness-sensitive, and concurrent application instances could hold stale values. There is also no current CivicConnect evidence that reference generation is a performance bottleneck, so caching would add a consistency problem without a demonstrated need.

#### Recommendation and M2 link

For CivicConnect, the recommended design is a database-managed sequence or equivalent database-native atomic generator for the numeric part of the reference, with a database unique constraint as the final safeguard. The application can format that value into the human-readable reference required by FR-008. Request creation should be coordinated by the service layer inside a transaction, with validation divided between UI, service and database according to responsibility.

The database handles concurrent submissions, so no coordination between application instances is needed. A failed transaction may leave a numbering gap, but an allocated reference is not reused, which fits FR-008.

This research should inform **DEC-011 (persistence design)**, **DEC-004**, and the M2 data model. The exact mechanism must still be confirmed when the persistence technology is baselined in M2.

## Task 3: APIs and Integration

### Notifying the Requester when their request changes

#### Integration problem

FR-029 requires an in-application indication when a request is accepted, updated, rejected or completed, while DEC-005 currently keeps the baseline to in-application notification. Email and SMS remain deferred under SC-D-01 because background-processing capability has not yet been confirmed.

The **producer** is the application path that successfully changes the request. The **consumer** is the notification capability that makes the change visible to the requester. The exchanged information can include the request reference, type of change, new status where relevant and time of the change.

Failure matters because a requester who does not see an update may believe nothing happened and use another channel such as telephoning the organisation (STK-01). At the same time, notification failure should not automatically invalidate an otherwise valid request update. This dependency needs an explicit engineering decision.

#### Alternative 1: In-process interface

The simplest option is an in-process notification interface inside CivicConnect. The request-change service calls a notification component through a defined interface, and that component creates the in-application notification.

This has low runtime overhead because there is no network call or broker. It is straightforward to test with a test double, and deployment stays simple because both responsibilities remain in the same application. The disadvantage is stronger runtime coupling. A slow or defective synchronous notification operation could delay the request-change path, so the interface and transaction boundary must be kept clear.

For the current baseline, this simplicity is useful because only an in-application indication is required.

#### Alternative 2: HTTP/REST service

A second option is a separate notification service accessed through HTTP/REST. HTTP uses a client-server request/response model and is stateless at protocol level (MDN, 2026a). REST-style APIs can provide a clear contract and loose coupling between client and service (Microsoft, 2025). HTTP methods also have defined semantics; for example, `POST` submits data that can cause a state change, while response status codes indicate success or failure (MDN, 2025, 2026b).

REST APIs are organised around resources identified by URIs, and Microsoft recommends resource-oriented URIs based on nouns rather than action verbs (Microsoft, 2025). If CivicConnect used REST here, notifications could be represented as a resource or collection. Errors should use suitable HTTP status codes and useful error information; for example, Microsoft documents `400 Bad Request` for invalid request data and `409 Conflict` when a request conflicts with the current resource state (Microsoft, 2025).

The benefit is a clearer independent service boundary. The cost is network latency, service authentication, failure handling, API compatibility, deployment and monitoring. For a three-person team and a capability that currently only needs to work inside the application, that network boundary is difficult to justify.

#### Alternative 3: Asynchronous event/message

A third option is to publish an event such as `RequestStatusChanged` and allow a notification consumer to process it asynchronously. Microsoft (2026) explains that a message broker can decouple producers and consumers and provide temporal decoupling, so they do not have to be available at the same time. Durable messaging can also retain work while a consumer is temporarily unavailable.

Messaging becomes attractive if CivicConnect later adds email or SMS, because several consumers could react to the same change and a slow external provider would not need to block the main request update. However, messaging adds infrastructure and new failure cases. Delayed or duplicate delivery must be handled, retries are needed, and a broker/background worker must be operated. Whether that infrastructure can run depends on FEC-03, DEC-010, RSK-02 and the free-tier constraint.

#### Comparison

| Concern | In-process interface | HTTP/REST service | Asynchronous event/message |
|:---|:---|:---|:---|
| Coupling | Moderate, controlled by interface | Lower implementation coupling, API-contract coupling | Low direct producer/consumer coupling |
| Performance | Fast, no network boundary | Adds network latency | Producer can continue while consumer works later |
| Failure behaviour | Local and simpler | Network/service failures | Broker/consumer failures, retries and duplicates |
| Testability | Simple unit/integration tests | API and contract tests needed | Event-contract and messaging tests needed |
| Deployment | One application | Extra service | Broker/worker infrastructure |
| Security | Existing application boundary | New service security boundary | Broker permissions/message security |
| Versioning | Internal interface compatibility | API compatibility | Event-schema compatibility |
| Current fit | Strong | Weak without independent deployment need | Stronger later if external channels return |

#### Recommendation and M2 link

For the current CivicConnect baseline, an **in-process notification interface** is the most proportionate choice. It satisfies the existing in-application requirement without introducing a network boundary that the project does not currently need. The notification responsibility should still be separated behind a clear interface so that it does not become tangled with request-change logic.

The design should leave an extension point for asynchronous events later. If SC-D-01 is reconsidered and email or SMS becomes required, asynchronous messaging should be evaluated again because those channels may justify background processing. That decision should wait until the selected platform's background-processing capability and free-tier limitations are known.

A separate REST service is not recommended at this stage. Although REST offers a clear contract, the extra network, security, deployment and operational boundaries do not currently solve a CivicConnect requirement.

This recommendation should inform **DEC-009 (architecture style)**, **DEC-010**, **DEC-005**, the architecture/interface design and an ADR for the notification mechanism. **SC-D-01** should remain deferred until M2 provides enough platform evidence.

## References

Fowler, M. (2002) *Patterns of enterprise application architecture*. Boston, MA: Addison-Wesley.

MDN (2025) *HTTP request methods*. Mozilla Developer Network. Available at: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods (Accessed: 15 September 2026).

MDN (2026a) *HTTP: Hypertext Transfer Protocol*. Mozilla Developer Network. Available at: https://developer.mozilla.org/en-US/docs/Web/HTTP (Accessed: 15 September 2026).

MDN (2026b) *HTTP response status codes*. Mozilla Developer Network. Available at: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status (Accessed: 15 September 2026).

Microsoft (2025) *Web API design best practices*. Azure Architecture Center. Available at: https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design (Accessed: 15 September 2026).

Microsoft (2026) *Asynchronous messaging options*. Azure Architecture Center. Available at: https://learn.microsoft.com/en-us/azure/architecture/guide/technology-choices/messaging (Accessed: 15 September 2026).

PostgreSQL Global Development Group (2026a) *Constraints*. PostgreSQL Documentation. Available at: https://www.postgresql.org/docs/18/ddl-constraints.html (Accessed: 15 September 2026).

PostgreSQL Global Development Group (2026b) *Sequence Manipulation Functions*. PostgreSQL Documentation. Available at: https://www.postgresql.org/docs/18/functions-sequence.html (Accessed: 15 September 2026).

## AI assistance note for the team register

- **Date:** 15 September 2026
- **Student:** Tristan Roets
- **Tool:** ChatGPT (OpenAI, GPT-5.6 Sol)
- **Engineering task:** Researching and drafting Assignment 2 Task 2 and Task 3.
- **AI contribution:** Assisted with structuring the sections, comparing alternatives, drafting, and identifying authoritative sources.
- **Verification performed:** PostgreSQL claims were checked against PostgreSQL documentation; REST/HTTP claims against Microsoft Learn and MDN; messaging claims against Microsoft Azure Architecture Center; CivicConnect-specific identifiers against the team's A2 notes and M1 evidence.
- **Decision:** Accepted after revision.
- **Issues found:** The first draft linked NFR-002 to possible duplicate resubmission without addressing duplicate prevention, so that sentence was removed. The REST section initially omitted explicit resource and error handling discussion, so this was added from the Microsoft API-design source. DEC-009 was also added to the Task 3 recommendation because the in-process versus separate-service choice affects architecture.
