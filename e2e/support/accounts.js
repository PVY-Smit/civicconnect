// The seeded accounts the journeys sign in with. Their credentials are configuration, read from the
// environment, so no password is ever committed (NFR-007). The seed data (#109) and staging (#122) define
// these accounts; E2E_STAFF_NAME and E2E_CATEGORY must match them: a Staff member authorised for that
// category, so the Coordinator can assign a request in it to them (FR-015).

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name}. The journeys read the seeded accounts from the environment; see e2e/README.md.`);
  return value;
}

const account = (role) => ({
  role,
  email: required(`E2E_${role.toUpperCase()}_EMAIL`),
  password: required(`E2E_${role.toUpperCase()}_PASSWORD`),
});

export const accounts = () => ({
  requester: account("Requester"),
  coordinator: account("Coordinator"),
  staff: { ...account("Staff"), name: required("E2E_STAFF_NAME") },
});

export const category = () => required("E2E_CATEGORY");
