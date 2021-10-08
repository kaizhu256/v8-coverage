import chai from "chai";
/**
 * Generate a Mocha test suite for the provided
 * implementation of `v8-coverage-tools`.
 */
export function testImpl(lib) {
    describe("merge", () => {
        it("accepts empty arrays for `mergeProcessCovs`", () => {
            const inputs = [];
            const expected = { result: [] };
            const actual = lib.mergeProcessCovs(inputs);
            chai.assert.deepEqual(actual, expected);
        });
        it("accepts empty arrays for `mergeScriptCovs`", () => {
            const inputs = [];
            const expected = undefined;
            const actual = lib.mergeScriptCovs(inputs);
            chai.assert.deepEqual(actual, expected);
        });
        it("accepts empty arrays for `mergeFunctionCovs`", () => {
            const inputs = [];
            const expected = undefined;
            const actual = lib.mergeFunctionCovs(inputs);
            chai.assert.deepEqual(actual, expected);
        });
    });
}
//# sourceMappingURL=index.js.map