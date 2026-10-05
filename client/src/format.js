// Dates are shown in South African time whatever the device's own time zone, so a requester and the
// staff member they phone see the same time for the same event (FR-009, FR-011).

const DATE_TIME = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" });
const DATE = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeZone: "Africa/Johannesburg" });

export const formatDateTime = (value) => (value ? DATE_TIME.format(new Date(value)) : "");
export const formatDate = (value) => (value ? DATE.format(new Date(value)) : "");

// What each FR-029 event means to the requester, in words.
export const EVENT_TEXT = Object.freeze({
  accepted: "was accepted",
  updated: "has an update",
  rejected: "was rejected",
  completed: "was completed",
});
