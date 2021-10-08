/*jslint beta, node*/
import fs from "fs";
import {mergeProcessCovs} from "./lib/index.js";
(async function () {
    let data1;
    let data2;

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
        "v8-coverage-node-sqlite-merged.json",
        "v8-coverage-node-sqlite-10880-1633662346331-0.json",
        "v8-coverage-node-sqlite-11656-1633662282219-0.json",
        "v8-coverage-node-sqlite-12292-1633662282282-0.json",
        "v8-coverage-node-sqlite-13216-1633662333140-0.json",
        "v8-coverage-node-sqlite-14020-1633662282250-0.json",
        "v8-coverage-node-sqlite-2084-1633662269154-0.json",
        "v8-coverage-node-sqlite-9620-1633662346393-0.json",
        "v8-coverage-node-sqlite-9884-1633662346346-0.json"
    ].map(async function (file, ii) {
        file = await fs.promises.readFile(file, "utf8");
        if (ii > 0) {
            file = JSON.parse(file);
        }
        return file;
    }));
    data2 = data1.shift();
    data1 = mergeProcessCovs(data1);
    data1 = objectDeepCopyWithKeysSorted(data1);
    data1 = JSON.stringify(data1, undefined, 4) + "\n";
    await fs.promises.writeFile(".v8_coverage_node_sqlite_merged.json", data1);
    assert_or_throw(data1 === data2);
}());
