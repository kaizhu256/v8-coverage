/*
NODE_OPTIONS="--unhandled-rejections=strict" shRunWithCoverage ./node_modules/.bin/mocha test/merge.spec.js
*/
/*jslint beta, node*/
import fs from "fs";
import coverageMerge from "./merge.mjs";
(async function () {
    let {
        coverageFunctionListMerge,
        coverageProcessListMerge,
        coverageScriptListMerge
    } = coverageMerge;
    let data1;
    let data2;

    function assert_json_equal(aa, bb) {

// this function will assert JSON.stringify(<aa>) === JSON.stringify(<bb>)

        aa = JSON.stringify(objectDeepCopyWithKeysSorted(aa));
        bb = JSON.stringify(objectDeepCopyWithKeysSorted(bb));
        if (aa !== bb) {
            throw new Error(
                JSON.stringify(aa) + " !== " + JSON.stringify(bb)
            );
        }
    }

    function assert_or_throw(condition, message) {

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

    data1 = await Promise.all([
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
        file = await fs.promises.readFile(file, "utf8");
        if (ii > 0) {
            file = JSON.parse(file);
        }
        return file;
    }));
    data2 = data1.shift();
    data1 = coverageProcessListMerge(data1);
    data1 = coverageProcessListMerge([data1]);
    data1 = objectDeepCopyWithKeysSorted(data1);
    data1 = JSON.stringify(data1, undefined, 4) + "\n";
    await fs.promises.writeFile(".v8_coverage_node_sqlite_merged.json", data1);
    assert_or_throw(data1 === data2);

    (function () {
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
            "result": [
                {
                    "functions": [
                        {
                            "functionName": "test",
                            "isBlockCoverage": true,
                            "ranges": [
                                {
                                    "count": 2,
                                    "endOffset": 4,
                                    "startOffset": 0
                                },
                                {
                                    "count": 1,
                                    "endOffset": 3,
                                    "startOffset": 1
                                }
                            ]
                        }
                    ],
                    "scriptId": "0",
                    "url": "/lib.js"
                },
                {
                    "functions": [
                        {
                            "functionName": "test",
                            "isBlockCoverage": true,
                            "ranges": [
                                {
                                    "count": 2,
                                    "endOffset": 4,
                                    "startOffset": 0
                                },
                                {
                                    "count": 1,
                                    "endOffset": 3,
                                    "startOffset": 1
                                }
                            ]
                        }
                    ],
                    "scriptId": "1",
                    "url": "/lib.js"
                }
            ]
        };
        const actual = coverageProcessListMerge(inputs);
        assert_json_equal(actual, expected);
    }());

    console.error("finished test_v8_coverage_node_sqlite.mjs");

    // coverage-hack
    noop();
}());
