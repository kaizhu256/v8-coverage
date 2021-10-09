import moduleChai from "chai";
import moduleFs from "fs";
import moduleSysPath from "path";
import modulePath from "path";
import moduleUrl from "url";
import coverageMerge from "../merge.mjs";

let {
    coverageFunctionListMerge,
    coverageProcessListMerge,
    coverageScriptListMerge
} = coverageMerge;

/**
 * Generate a Mocha test suite for the provided
 * implementation of `v8-coverage-tools`.
 */
export function testImpl(lib) {
    describe("merge", () => {
        it("accepts empty arrays for `coverageProcessListMerge`", () => {
            const inputs = [];
            const expected = { result: [] };
            const actual = lib.coverageProcessListMerge(inputs);
            moduleChai.assert.deepEqual(actual, expected);
        });
        it("accepts empty arrays for `coverageScriptListMerge`", () => {
            const inputs = [];
            const expected = undefined;
            const actual = lib.coverageScriptListMerge(inputs);
            moduleChai.assert.deepEqual(actual, expected);
        });
        it("accepts empty arrays for `coverageFunctionListMerge`", () => {
            const inputs = [];
            const expected = undefined;
            const actual = lib.coverageFunctionListMerge(inputs);
            moduleChai.assert.deepEqual(actual, expected);
        });
    });
}
const REPO_ROOT = modulePath.join(moduleUrl.fileURLToPath(import.meta.url), "..", "..", "..");
const MERGE_TESTS_DIR = modulePath.join(REPO_ROOT, "tests", "merge");
const MERGE_TIMEOUT = 30000; // 30sec
// `BLACKLIST` can be used to forcefully skip some tests.
const BLACKLIST = new Set([
    ...["node-10.11.0", "npm-6.4.1", "yargs-12.0.2"],
    // ...(process.env.CI === "true" ? ["node-10.11.0", "npm-6.4.1"] : []),
]);
// `WHITELIST` can be used to only enable a few tests.
const WHITELIST = new Set([
// "simple",
]);
testImpl({ coverageProcessListMerge, coverageScriptListMerge, coverageFunctionListMerge });
describe("merge", () => {
    describe("custom", () => {
        it("accepts arrays with a single item for `coverageProcessListMerge`", () => {
            const inputs = [
                {
                    result: [
                        {
                            scriptId: "123",
                            moduleUrl: "/lib.js",
                            functions: [
                                {
                                    functionName: "test",
                                    isBlockCoverage: true,
                                    ranges: [
                                        { startOffset: 0, endOffset: 4, count: 2 },
                                        { startOffset: 1, endOffset: 2, count: 1 },
                                        { startOffset: 2, endOffset: 3, count: 1 },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ];
            const expected = {
                result: [
                    {
                        scriptId: "0",
                        moduleUrl: "/lib.js",
                        functions: [
                            {
                                functionName: "test",
                                isBlockCoverage: true,
                                ranges: [
                                    { startOffset: 0, endOffset: 4, count: 2 },
                                    { startOffset: 1, endOffset: 3, count: 1 },
                                ],
                            },
                        ],
                    },
                ],
            };
            const actual = coverageProcessListMerge(inputs);
            moduleChai.assert.deepEqual(actual, expected);
        });
        it("accepts arrays with a single item for `coverageScriptListMerge`", () => {
            const inputs = [
                {
                    scriptId: "123",
                    moduleUrl: "/lib.js",
                    functions: [
                        {
                            functionName: "test",
                            isBlockCoverage: true,
                            ranges: [
                                { startOffset: 0, endOffset: 4, count: 2 },
                                { startOffset: 1, endOffset: 2, count: 1 },
                                { startOffset: 2, endOffset: 3, count: 1 },
                            ],
                        },
                    ],
                },
            ];
            const expected = {
                scriptId: "123",
                moduleUrl: "/lib.js",
                functions: [
                    {
                        functionName: "test",
                        isBlockCoverage: true,
                        ranges: [
                            { startOffset: 0, endOffset: 4, count: 2 },
                            { startOffset: 1, endOffset: 3, count: 1 },
                        ],
                    },
                ],
            };
            const actual = coverageScriptListMerge(inputs);
            moduleChai.assert.deepEqual(actual, expected);
        });
        it("accepts arrays with a single item for `coverageFunctionListMerge`", () => {
            const inputs = [
                {
                    functionName: "test",
                    isBlockCoverage: true,
                    ranges: [
                        { startOffset: 0, endOffset: 4, count: 2 },
                        { startOffset: 1, endOffset: 2, count: 1 },
                        { startOffset: 2, endOffset: 3, count: 1 },
                    ],
                },
            ];
            const expected = {
                functionName: "test",
                isBlockCoverage: true,
                ranges: [
                    { startOffset: 0, endOffset: 4, count: 2 },
                    { startOffset: 1, endOffset: 3, count: 1 },
                ],
            };
            const actual = coverageFunctionListMerge(inputs);
            moduleChai.assert.deepEqual(actual, expected);
        });
    });
    for (const mergeTest of getMergeTests()) {
        it(mergeTest.name, test);
        function test() {
            this.timeout(MERGE_TIMEOUT);
            const items = JSON.parse(moduleFs.readFileSync(mergeTest.testPath, { encoding: "utf-8" }));
            for (const item of items) {
                const actual = coverageProcessListMerge(item.inputs);
                moduleChai.assert.deepEqual(actual, item.expected);
            }
        }
    }
});
function* getMergeTests() {
    for (const dirEnt of moduleFs.readdirSync(MERGE_TESTS_DIR, { withFileTypes: true })) {
        if (!dirEnt.isDirectory()) {
            continue;
        }
        const testName = dirEnt.name;
        const testDir = moduleSysPath.join(MERGE_TESTS_DIR, testName);
        if (BLACKLIST.has(testName)) {
            continue;
        }
        else if (WHITELIST.size > 0 && !WHITELIST.has(testName)) {
            continue;
        }
        const testPath = moduleSysPath.join(testDir, "test.json");
        yield { name: testName, testPath };
    }
}

await import("../test_v8_coverage_node_sqlite.mjs");
