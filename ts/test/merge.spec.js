import chai from "chai";
import fs from "fs";
import sysPath from "path";
import path from "path";
import url from "url";
import { mergeFunctionCovs, mergeProcessCovs, mergeScriptCovs } from "../lib/index.js";
import { testImpl } from "@v8-coverage-tools/mocha";
const REPO_ROOT = path.join(url.fileURLToPath(import.meta.url), "..", "..", "..");
const MERGE_TESTS_DIR = path.join(REPO_ROOT, "tests", "merge");
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
testImpl({ mergeProcessCovs, mergeScriptCovs, mergeFunctionCovs });
describe("merge", () => {
    describe("custom", () => {
        it("accepts arrays with a single item for `mergeProcessCovs`", () => {
            const inputs = [
                {
                    result: [
                        {
                            scriptId: "123",
                            url: "/lib.js",
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
                        url: "/lib.js",
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
            const actual = mergeProcessCovs(inputs);
            chai.assert.deepEqual(actual, expected);
        });
        it("accepts arrays with a single item for `mergeScriptCovs`", () => {
            const inputs = [
                {
                    scriptId: "123",
                    url: "/lib.js",
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
                url: "/lib.js",
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
            const actual = mergeScriptCovs(inputs);
            chai.assert.deepEqual(actual, expected);
        });
        it("accepts arrays with a single item for `mergeFunctionCovs`", () => {
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
            const actual = mergeFunctionCovs(inputs);
            chai.assert.deepEqual(actual, expected);
        });
    });
    for (const mergeTest of getMergeTests()) {
        it(mergeTest.name, test);
        function test() {
            this.timeout(MERGE_TIMEOUT);
            const items = JSON.parse(fs.readFileSync(mergeTest.testPath, { encoding: "utf-8" }));
            for (const item of items) {
                const actual = mergeProcessCovs(item.inputs);
                chai.assert.deepEqual(actual, item.expected);
            }
        }
    }
});
function* getMergeTests() {
    for (const dirEnt of fs.readdirSync(MERGE_TESTS_DIR, { withFileTypes: true })) {
        if (!dirEnt.isDirectory()) {
            continue;
        }
        const testName = dirEnt.name;
        const testDir = sysPath.join(MERGE_TESTS_DIR, testName);
        if (BLACKLIST.has(testName)) {
            continue;
        }
        else if (WHITELIST.size > 0 && !WHITELIST.has(testName)) {
            continue;
        }
        const testPath = sysPath.join(testDir, "test.json");
        yield { name: testName, testPath };
    }
}
//# sourceMappingURL=merge.spec.js.map