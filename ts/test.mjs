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
// Coverage-hack.
debugInline();

(function () {
    let {
        coverageFunctionListMerge,
        coverageProcessListMerge,
        coverageScriptListMerge
    } = coverageMerge;
    let testItList;

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

    async function testDescribe(description, testDescribe) {
        let resultItList;
        testItList = [];
        testDescribe();
        resultItList = await Promise.all(testItList);
        console.error("\n  test describe - " + description);
        resultItList.forEach(function ([
            err, description
        ]) {
            if (err) {
                console.error(
                    "    \u001b[1;31m\u2718 it " + description + "\n"
                    + err.stack
                    + "\u001b[39m"
                );
                return;
            }
            console.error(
                "    \u001b[1;32m\u2714 it " + description + "\u001b[39m"
            );
        });
    }

    function testIt(description, testIt) {
        testItList.push(new Promise(async function (resolve) {
            let err;
            try {
                await testIt();
            } catch (errCaught) {
                err = errCaught;
            }
            resolve([
                err, description
            ]);
        }));
    }

    testDescribe("coverage - merge empty arrays", function () {
    /**
     * Generate a Mocha test suite for the provided
     * implementation of `v8-coverage-tools`.
     */
        testIt((
            "accepts empty arrays for `coverageProcessListMerge`"
        ), function () {
            assertJsonEqual(coverageProcessListMerge([]), {
                result: []
            });
        });
        testIt((
            "accepts empty arrays for `coverageScriptListMerge`"
        ), function () {
            assertJsonEqual(coverageScriptListMerge([]), undefined);
        });
        testIt((
            "accepts empty arrays for `coverageFunctionListMerge`"
        ), function () {
            assertJsonEqual(coverageFunctionListMerge([]), undefined);
        });
    });

    testDescribe("coverage - merge non-empty arrays", function () {
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
        testIt((
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
        testIt((
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
        testIt((
            "accepts arrays with a single item for `coverageScriptListMerge`"
        ), function () {
            assertJsonEqual(coverageScriptListMerge([
                {
                    functions: JSON.parse(functionsInput),
                    moduleUrl: "/lib.js",
                    scriptId: "123"
                }
            ]), {
                functions: JSON.parse(functionsExpected),
                moduleUrl: "/lib.js",
                scriptId: "123"
            });
        });
        testIt((
            "accepts arrays with a single item for `coverageFunctionListMerge`"
        ), function () {
            assertJsonEqual(
                [
                    coverageFunctionListMerge(JSON.parse(functionsInput))
                ],
                JSON.parse(functionsExpected)
            );
        });
    });

    testDescribe("coverage - merge multiple files", function () {
        testIt("merge test files`", async function () {
            await Promise.all([
                "test_merge_is_block_coverage_test.json",
                "test_merge_issue_2_mixed_is_block_coverage_test.json",
                // "test_merge_node_10_11_0_test.json",
                "test_merge_node_10_internal_errors_one_of_test.json",
                // "test_merge_npm_6_4_1_test.json",
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
    });

    testDescribe("coverage - merge multiple files", function () {
        testIt("merge multiple node-sqlite coverage files`", async function () {
            let data1 = await Promise.all([
                "test_v8_coverage_node_sqlite_merged.json",
                "test_v8_coverage_node_sqlite_10880_1633662346331_0.json",
                "test_v8_coverage_node_sqlite_11656_1633662282219_0.json",
                "test_v8_coverage_node_sqlite_12292_1633662282282_0.json",
                "test_v8_coverage_node_sqlite_13216_1633662333140_0.json",
                "test_v8_coverage_node_sqlite_14020_1633662282250_0.json",
                "test_v8_coverage_node_sqlite_2084_1633662269154_0.json",
                "test_v8_coverage_node_sqlite_9620_1633662346393_0.json",
                "test_v8_coverage_node_sqlite_9884_1633662346346_0.json"
            ].map(async function (file, ii) {
                file = await moduleFs.promises.readFile(file, "utf8");
                if (ii > 0) {
                    file = JSON.parse(file);
                }
                return file;
            }));
            let data2 = data1.shift();
            data1 = coverageProcessListMerge(data1);
            data1 = coverageProcessListMerge([data1]);
            data1 = objectDeepCopyWithKeysSorted(data1);
            data1 = JSON.stringify(data1, undefined, 4) + "\n";
            // debug data1
            await moduleFs.promises.writeFile(
                ".v8_coverage_node_sqlite_merged.json",
                data1
            );
            assertOrThrow(data1 === data2);
        });
    });
}());
