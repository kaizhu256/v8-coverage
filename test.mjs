/*
shRunWithCoverage node --unhandled-rejections=strict test.mjs
*/
/*jslint beta, node*/
import coverageMerge from "./merge.mjs";
import moduleFs from "fs";

// init debugInline
let debugInline = (function () {
    let consoleError = function () {
        return;
    };
    return function (...argv) {

// This function will both print <argv> to stderr and return <argv>[0].

        consoleError("\n\ndebugInline");
        consoleError(...argv);
        consoleError("\n");
        consoleError = console.error;
        return argv[0];
    };
}());
let jstestCountFailed = 0;
let jstestCountTotal = 0;
let jstestItList = [];
let jstestOnExit;
let jstestTimeStart = Date.now();

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

//!! function assertOrThrow(condition, message) {

//!! // This function will throw <message> if <condition> is falsy.

    //!! if (!condition) {
        //!! throw (
            //!! (!message || typeof message === "string")
            //!! ? new Error(String(message).slice(0, 2048))
            //!! : message
        //!! );
    //!! }
//!! }

async function jstestDescribe(description, testFunction) {
    let result;

// Init jstestOnExit.

    if (!jstestOnExit) {
        jstestOnExit = function (exitCode) {
            console.error(
                (
                    jstestCountFailed
                    ? "\n\u001b[31m"
                    : "\n\u001b[32m"
                )
                + "  tests total  - " + jstestCountTotal + "\n"
                + "  tests failed - " + jstestCountFailed + "\n"
                + "\u001b[39m"
            );
            if (!exitCode && jstestCountFailed) {
                process.exit(1);
            }
        };
        process.on("exit", jstestOnExit);
    }

// Init jstestItList.

    jstestItList = [];
    testFunction();

// Wait for jstestItList to resolve.

    result = await Promise.all(jstestItList);

// Print test results.

    console.error(
        "\n  " + (Date.now() - jstestTimeStart) + "ms"
        + " - test describe - " + description
    );
    result.forEach(function ([
        err, description
    ]) {
        if (err) {
            jstestCountFailed += 1;
            console.error(
                "    \u001b[31m\u2718 it " + description + "\n"
                + err.stack
                + "\u001b[39m"
            );
            return;
        }
        console.error(
            "    \u001b[32m\u2714 it " + description + "\u001b[39m"
        );
    });
}

function jstestIt(description, testFunction) {
    jstestCountTotal += 1;
    jstestItList.push(new Promise(async function (resolve) {
        let err;
        try {
            await testFunction();
        } catch (errCaught) {
            err = errCaught;
        }
        resolve([
            err, description
        ]);
    }));
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

// Coverage-hack.
debugInline();

(async function () {
    let {
        coverageProcessListMerge
    } = coverageMerge;
    let testCoverageMergeData = JSON.parse(
        await moduleFs.promises.readFile(
            "test_coverage_merge_data.json",
            "utf8"
        )
    );

    jstestDescribe("v8-coverage-merge non-empty arrays", function () {
    /**
     * Generate a Mocha test suite for the provided
     * implementation of `v8-coverage-tools`.
     */
        jstestIt((
            "accepts empty arrays for `coverageProcessListMerge`"
        ), function () {
            assertJsonEqual(coverageProcessListMerge([]), {
                result: []
            });
        });
        jstestIt("funcCovs.length === 1", function () {
            assertJsonEqual(coverageProcessListMerge([
                {
                    result: [
                        {
                            functions: [
                                {
                                    functionName: "test",
                                    isBlockCoverage: true,
                                    ranges: [
                                        {
                                            count: 2,
                                            endOffset: 4,
                                            startOffset: 0
                                        }
                                    ]
                                }
                            ],
                            moduleUrl: "/lib.js",
                            scriptId: "1"
                        }
                    ]
                },
                {
                    result: [
                        {
                            functions: [],
                            moduleUrl: "/lib.js",
                            scriptId: "2"
                        }
                    ]
                }
            ]), {
                result: [
                    {
                        functions: [
                            {
                                functionName: "test",
                                isBlockCoverage: true,
                                ranges: [
                                    {
                                        count: 2,
                                        endOffset: 4,
                                        startOffset: 0
                                    }
                                ]
                            }
                        ],
                        scriptId: "0"
                    }
                ]
            });
        });
    });

    jstestDescribe("coverage - merge non-empty arrays", function () {
        let functionsExpected = JSON.stringify([
            {
                functionName: "test",
                isBlockCoverage: true,
                ranges: [
                    {
                        count: 2,
                        endOffset: 4,
                        startOffset: 0
                    },
                    {
                        count: 1,
                        endOffset: 3,
                        startOffset: 1
                    }
                ]
            }
        ]);
        let functionsInput = JSON.stringify([
            {
                functionName: "test",
                isBlockCoverage: true,
                ranges: [
                    {
                        count: 2,
                        endOffset: 4,
                        startOffset: 0
                    },
                    {
                        count: 1,
                        endOffset: 2,
                        startOffset: 1
                    },
                    {
                        count: 1,
                        endOffset: 3,
                        startOffset: 2
                    }
                ]
            }
        ]);
        jstestIt((
            "accepts arrays with a single item for `coverageProcessListMerge`"
        ), function () {
            assertJsonEqual(coverageProcessListMerge([
                {
                    result: [
                        {
                            functions: JSON.parse(functionsInput),
                            moduleUrl: "/lib.js",
                            scriptId: "123"
                        }
                    ]
                }
            ]), {
                result: [
                    {
                        functions: JSON.parse(functionsExpected),
                        moduleUrl: "/lib.js",
                        scriptId: "0"
                    }
                ]
            });
        });
        jstestIt((
            "accepts arrays with two identical items for"
            + " `coverageProcessListMerge`"
        ), function () {
            assertJsonEqual(coverageProcessListMerge([
                {
                    result: [
                        {
                            functions: JSON.parse(functionsInput),
                            scriptId: "123",
                            url: "/lib.js"
                        }, {
                            functions: JSON.parse(functionsInput),
                            scriptId: "123",
                            url: "/lib.js"
                        }
                    ]
                }
            ]), {
                result: [
                    {
                        functions: JSON.parse(functionsExpected),
                        scriptId: "0",
                        url: "/lib.js"
                    },
                    {
                        functions: JSON.parse(functionsExpected),
                        scriptId: "1",
                        url: "/lib.js"
                    }
                ]
            });
        });
    });

    jstestDescribe("coverage - merge test files", function () {
        jstestIt("merge test files", function () {
            [
                "test_coverage_merge_is_block_coverage_test.json",
                "test_coverage_merge_issue_2_mixed_is_block_coverage_test.json",
                "test_coverage_merge_node_10_internal_errors_one_of_test.json",
                "test_coverage_merge_reduced_test.json",
                "test_coverage_merge_simple_test.json",
                "test_coverage_merge_various_test.json"
            ].forEach(function (file) {
                file = testCoverageMergeData[file];
                file.forEach(function ({
                    expected,
                    inputs
                }) {
                    assertJsonEqual(coverageProcessListMerge(inputs), expected);
                });
            });
        });
    });

    jstestDescribe("coverage - merge multiple files", function () {
        jstestIt((
            "merge multiple node-sqlite coverage files"
        ), function () {
            let data1 = [
                "test_v8_coverage_node_sqlite_9884_1633662346346_0.json",
                "test_v8_coverage_node_sqlite_13216_1633662333140_0.json"
            ].map(function (file) {
                return testCoverageMergeData[file];
            });
            let data2 = testCoverageMergeData[
                "test_v8_coverage_node_sqlite_merged.json"
            ];
            data1 = coverageProcessListMerge(data1);
            data1 = coverageProcessListMerge([data1]);

// Debug data1.
// await moduleFs.promises.writeFile(
//     ".test_v8_coverage_node_sqlite_merged.json",
//     JSON.stringify(objectDeepCopyWithKeysSorted(data1), undefined, 4) + "\n"
// );

            assertJsonEqual(data1, data2);
        });
    });
}());
