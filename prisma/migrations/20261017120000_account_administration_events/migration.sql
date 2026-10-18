-- FR-003, FR-028: account creation and deactivation are recorded as account events, beside the reset
-- events (#146), so who created or deactivated which account and when is kept (NFR-011).
ALTER TABLE "account_events" DROP CONSTRAINT "chk_account_event_type";

ALTER TABLE "account_events"
    ADD CONSTRAINT "chk_account_event_type"
        CHECK (
            "type" IN (
                'reset-code-issued',
                'reset-code-withdrawn',
                'password-reset',
                'account-created',
                'account-deactivated'
            )
        );
