import assert from "node:assert/strict";
import { applicationResumeFilter } from "./application-access";

assert.deepEqual(applicationResumeFilter(13, 8, false), { id: 13, studentId: 8 });
assert.deepEqual(applicationResumeFilter(13, 8, true), { id: 13 });

console.log("Application resume ownership checks passed.");
