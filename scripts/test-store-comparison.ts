import assert from "node:assert/strict";
import { parseComparison, toggleComparison } from "../lib/store-comparison";

const stores = Array.from({ length: 6 }, (_, index) => ({ id: `store-${index}`, name: "Same display name" }));
const selected = stores.reduce(toggleComparison, []);
assert.equal(selected.length, 5);
assert.deepEqual(parseComparison(JSON.stringify(selected)), selected, "Selection survives storage round-trip");
assert.deepEqual(toggleComparison(selected, stores[5]), selected, "Sixth store cannot be added");
const removed = toggleComparison(selected, stores[1]);
assert.equal(removed.length, 4);
assert.ok(!removed.some(store => store.id === stores[1].id));
assert.equal(toggleComparison(removed, stores[5]).length, 5);
assert.equal(parseComparison(JSON.stringify([...stores, stores[0]])).length, 5);
assert.deepEqual(parseComparison("invalid-json"), []);
assert.deepEqual(parseComparison('{"id":"not-an-array"}'), []);
assert.deepEqual(parseComparison('[null,1,{}, {"id":"","name":"Invalid"}]'), []);
assert.deepEqual(parseComparison(JSON.stringify([stores[0], stores[0], stores[1]])), stores.slice(0, 2));
console.log("Comparison selection limit, identity, removal and persistence tests passed.");
