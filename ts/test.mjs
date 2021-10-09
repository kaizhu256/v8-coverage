/*jslint node*/
import moduleChai from "chai";
import moduleFs from "fs";
import moduleSysPath from "path";
import modulePath from "path";
import moduleUrl from "url";
import coverageMerge from "./merge.mjs";

let {
    coverageFunctionListMerge,
    coverageProcessListMerge,
    coverageScriptListMerge
} = coverageMerge;

//!! let testDescribeList = [];
let testItList;

async function describe(description, testDescribe) {
    testItList = [];
    testDescribe();
    testItList = await Promise.all(testItList);
    throw description;
    console.error(description);
    testItList.forEach(function ([
        err, description
    ]) {
        console.error(
            (
                err
                ? "\u2714 "
                : "\u2718 "
            ) + description
        );
        if (err) {
            console.error(err);
        }
    });
}

function it(description, testIt) {
    testItList.push(new Promise(async function (resolve) {
        let err;
        try {
            await testIt();
        } catch (errCaught) {
            err = errCaught;
        }
        return [
            err, description
        ];
    }));
}

/**
 * Generate a Mocha test suite for the provided
 * implementation of `v8-coverage-tools`.
 */
describe("merge", function () {
    it("accepts empty arrays for `coverageProcessListMerge`", function () {
        const inputs = [];
        const expected = { result: [] };
        const actual = coverageProcessListMerge(inputs);
        moduleChai.assert.deepEqual(actual, expected);
    });
    it("accepts empty arrays for `coverageScriptListMerge`", function () {
        const inputs = [];
        const expected = undefined;
        const actual = coverageScriptListMerge(inputs);
        moduleChai.assert.deepEqual(actual, expected);
    });
    it("accepts empty arrays for `coverageFunctionListMerge`", function () {
        const inputs = [];
        const expected = undefined;
        const actual = coverageFunctionListMerge(inputs);
        moduleChai.assert.deepEqual(actual, expected);
    });
});
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

describe("merge", function () {
    function assertJsonEqual(aa, bb) {

// this function will assert JSON.stringify(<aa>) === JSON.stringify(<bb>)

        aa = JSON.stringify(objectDeepCopyWithKeysSorted(aa));
        bb = JSON.stringify(objectDeepCopyWithKeysSorted(bb));
        if (aa !== bb) {
            throw new Error(
                JSON.stringify(aa) + " !== " + JSON.stringify(bb)
            );
        }
    }

    function assertOrThrow(condition, message) {

// This function will throw <message> if <condition> is falsy.

        if (!condition) {
            throw (
                typeof message === "string"
                ? new Error(message.slice(0, 2048))
                : message
            );
        }
    }

    function noop(val) {

// this function will do nothing except return <val>

        return val;
    }

    function objectDeepCopyWithKeysSorted(obj) {

// this function will recursively deep-copy <obj> with keys sorted

        let sorted;
        if (typeof obj !== "object" || !obj) {
            return obj;
        }

// recursively deep-copy list with child-keys sorted

        if (Array.isArray(obj)) {
            return obj.map(objectDeepCopyWithKeysSorted);
        }

// recursively deep-copy obj with keys sorted

        sorted = {};
        Object.keys(obj).sort().forEach(function (key) {
            sorted[key] = objectDeepCopyWithKeysSorted(obj[key]);
        });
        return sorted;
    }

    it("accepts arrays with a single item for `coverageProcessListMerge`", function () {
        assertJsonEqual(coverageProcessListMerge([
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
        ]), {
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
        });
    });
    it("accepts arrays with a single item for `coverageScriptListMerge`", function () {
        assertJsonEqual(coverageScriptListMerge([
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
        ]), {
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
        });
    });
    it("accepts arrays with a single item for `coverageFunctionListMerge`", function () {
        assertJsonEqual(coverageFunctionListMerge([
            {
                functionName: "test",
                isBlockCoverage: true,
                ranges: [
                    { startOffset: 0, endOffset: 4, count: 2 },
                    { startOffset: 1, endOffset: 2, count: 1 },
                    { startOffset: 2, endOffset: 3, count: 1 },
                ],
            },
        ]), {
            functionName: "test",
            isBlockCoverage: true,
            ranges: [
                { startOffset: 0, endOffset: 4, count: 2 },
                { startOffset: 1, endOffset: 3, count: 1 },
            ],
        });
    });
    Promise.all([
        "test_merge_is_block_coverage_test.json",
        "test_merge_issue_2_mixed_is_block_coverage_test.json",
        //!! "test_merge_node_10_11_0_test.json",
        "test_merge_node_10_internal_errors_one_of_test.json",
        //!! "test_merge_npm_6_4_1_test.json",
        "test_merge_reduced_test.json",
        "test_merge_simple_test.json",
        "test_merge_various_test.json"
    ].map(async function (pathname) {
        JSON.parse(
            await moduleFs.promises.readFile(pathname, "utf8")
        ).forEach(function ({
            expected,
            inputs
        }) {
            assertJsonEqual(coverageProcessListMerge(inputs), expected);
        });
    }));
});
await import("./test_v8_coverage_node_sqlite.mjs");
