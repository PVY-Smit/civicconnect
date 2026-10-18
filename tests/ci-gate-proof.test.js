// A deliberately failing test, on a throwaway branch, to show that a failing test blocks a merge into main
// (#110, NFR-012). This pull request is closed without merging and the branch deleted.

import { test } from "node:test";
import assert from "node:assert/strict";

test("CI gate proof: this test fails on purpose, so the required check must block the merge", () => {
  assert.equal(1 + 1, 3);
});
