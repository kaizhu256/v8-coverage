/*jslint node*/
import coverageMerge from "./merge.mjs";
import moduleFs from "fs";

(function () {
    let {
        coverageFunctionListMerge,
        coverageProcessListMerge,
        coverageScriptListMerge
    } = coverageMerge;

    let testItList;

    // init debugInline
    let debugInline = (function () {
        let console_error = function () {
            return;
        };
        return function (...argv) {

    // This function will both print <argv> to stderr and return <argv>[0].

            console_error("\n\ndebugInline");
            console_error(...argv);
            console_error("\n");
            console_error = console.error;
            return argv[0];
        };
    }());

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

    async function describe(description, testDescribe) {
        let resultItList;
        testItList = [];
        testDescribe();
        resultItList = await Promise.all(testItList);
        console.error("describe " + description);
        resultItList.forEach(function ([
            err, description
        ]) {
            console.error(
                (
                    err
                    ? "\u2718 "
                    : "\u2714 "
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
            resolve([
                err, description
            ]);
        }));
    }

    describe("merge", function () {
    /**
     * Generate a Mocha test suite for the provided
     * implementation of `v8-coverage-tools`.
     */
        it("accepts empty arrays for `coverageProcessListMerge`", function () {
            assertJsonEqual(coverageProcessListMerge([]), {
                result: []
            });
        });
        it("accepts empty arrays for `coverageScriptListMerge`", function () {
            assertJsonEqual(coverageScriptListMerge([]), undefined);
        });
        it("accepts empty arrays for `coverageFunctionListMerge`", function () {
            assertJsonEqual(coverageFunctionListMerge([]), undefined);
        });
    });

    describe("merge", function () {
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
        it((
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
        it((
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
        it((
            "accepts arrays with a single item for `coverageFunctionListMerge`"
        ), function () {
            assertJsonEqual(
                [
                    coverageFunctionListMerge(JSON.parse(functionsInput))
                ],
                JSON.parse(functionsExpected)
            );
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
    //!! await import("./test_v8_coverage_node_sqlite.mjs");
    // Coverage-hack.
    debugInline();
}());
