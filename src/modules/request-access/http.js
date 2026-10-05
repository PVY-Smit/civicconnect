// HTTP boundary for the requester's list and the request detail. Runs behind authenticate (#111).
// Not found and not permitted give the same 404 and the same body, so the answer never reveals that a
// reference exists (FR-012).

import { getRequestDetail, listOwnRequests } from "./views.js";

export const NOT_FOUND = "No request with that reference was found.";

export function createRequestAccessHandlers({ requests }) {
  async function listMine(req, res) {
    const result = await listOwnRequests(req.actor, { requests });
    if (!result.ok) return res.status(403).json({ error: "You are not authorised to do this." });
    return res.status(200).json({ requests: result.requests });
  }

  async function detail(req, res) {
    const result = await getRequestDetail(req.actor, req.params?.reference, { requests });
    if (!result.ok) return res.status(404).json({ error: NOT_FOUND });
    return res.status(200).json({ request: result.request });
  }

  return { listMine, detail };
}
