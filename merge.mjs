/*
shRunWithCoverage node --unhandled-rejections=strict test.mjs
*/
/*jslint beta, node*/

function v8CoverageListMerge(processCovs) {

// Merges a list of v8 process coverages.
// The result is normalized.
// The input values may be mutated, it is not safe to use them after passing
// them to this function.
// The computation is synchronous.
// @param processCovs Process coverages to merge.
// @return Merged process coverage.

    let resultMerged = [];      // List of merged scripts from processCovs.
    let urlToScriptDict = new Map();    // Map scriptCov.url to scriptCovs.

    function compareRangeList(aa, bb) {

// Compares two range coverages.
// The ranges are first ordered by ascending `startOffset` and then by
// descending `endOffset`.
// This corresponds to a pre-order tree traversal.

        if (aa.startOffset !== bb.startOffset) {
            return aa.startOffset - bb.startOffset;
        }
        return bb.endOffset - aa.endOffset;
    }

    function dictKeyValueAppend(dict, key, val) {

// This function will append <val> to list <dict>[<key>].

        let list = dict.get(key);
        if (list === undefined) {
            list = [];
            dict.set(key, list);
        }
        list.push(val);
    }

    function mergeTreeList(parentTrees) {

// This function will return RangeTree object with <parentTrees> merged into
// property-children.
// @precondition Same `start` and `end` for all the parentTrees

        if (parentTrees.length <= 1) {
            return parentTrees[0];
        }

// new RangeTree().

        return {

// Merge parentTrees into property-children.

            children: mergeTreeListToChildren(parentTrees),
            delta: parentTrees.reduce(function (aa, bb) {
                return aa + bb.delta;
            }, 0),
            end: parentTrees[0].end,
            start: parentTrees[0].start
        };
    }

    function mergeTreeListToChildren(parentTrees) {

// This function will return <resultChildren> with <parentTrees> merged.

        let openRange;
        let parentToChildDict = new Map();      // Map parent to child.
        let queueList;
        let queueListIi = 0;
        let queueOffset;
        let queueTrees;
        let resultChildren = [];
        let startToTreeDict = new Map();        // Map tree.start to tree.
        function nextXxx() {

// Increment nextOffset, nextTrees.

            let [
                nextOffset, nextTrees
            ] = queueList[queueListIi] || [];
            let openRangeEnd;
            if (queueTrees === undefined) {
                queueListIi += 1;

// Increment nextOffset, nextTrees.

            } else if (nextOffset === undefined || nextOffset > queueOffset) {
                nextOffset = queueOffset;
                nextTrees = queueTrees;
                queueTrees = undefined;

// Concat queueTrees to nextTrees.

            } else {
                if (nextOffset === queueOffset) {
                    queueTrees.forEach(function (tree) {
                        nextTrees.push(tree);
                    });
                    queueTrees = undefined;
                }
                queueListIi += 1;
            }

// Reached end of queueList.

            if (nextOffset === undefined) {
                if (openRange !== undefined) {

// Append nested-children from parentToChildDict (within openRange) to
// resultChildren.

                    resultAppendNextChild();
                }
                return true;
            }
            if (openRange !== undefined && openRange.end <= nextOffset) {

// Append nested-children from parentToChildDict (within openRange) to
// resultChildren.

                resultAppendNextChild();
                openRange = undefined;
            }
            if (openRange === undefined) {
                openRangeEnd = nextOffset + 1;
                nextTrees.forEach(function ({
                    parentIi,
                    tree
                }) {
                    openRangeEnd = Math.max(openRangeEnd, tree.end);

// Append children from nextTrees to parentToChildDict.

                    dictKeyValueAppend(parentToChildDict, parentIi, tree);
                });
                queueOffset = openRangeEnd;
                openRange = {
                    end: openRangeEnd,
                    start: nextOffset
                };
            } else {
                nextTrees.forEach(function ({
                    parentIi,
                    tree
                }) {
                    let right;
                    if (tree.end > openRange.end) {
                        right = treeSplit(tree, openRange.end);
                        if (queueTrees === undefined) {
                            queueTrees = [];
                        }

// new RangeTreeWithParent().

                        queueTrees.push({
                            parentIi,
                            tree: right
                        });
                    }

// Append children from nextTrees to parentToChildDict.

                    dictKeyValueAppend(parentToChildDict, parentIi, tree);
                });
            }
        }
        function resultAppendNextChild() {

// This function will append next child to <resultChildren>.

            let treesMatching = [];
            parentToChildDict.forEach(function (nested) {
                if (
                    nested.length === 1
                    && nested[0].start === openRange.start
                    && nested[0].end === openRange.end
                ) {
                    treesMatching.push(nested[0]);
                } else {

// new rangeTreeCreate().

                    treesMatching.push({
                        children: nested,
                        delta: 0,
                        end: openRange.end,
                        start: openRange.start
                    });
                }
            });
            parentToChildDict.clear();

// Recurse mergeTreeList().

            resultChildren.push(mergeTreeList(treesMatching));
        }
        function treeSplit(tree, offset) {

// This function will split <tree> along <offset> and return the right-side.
// @precondition `tree.start < offset && offset < tree.end`
// @return RangeTree Right part

            let child;
            let ii = 0;
            let leftChildLen = tree.children.length;
            let mid;
            let resultTree;
            let rightChildren;

// TODO(perf): Binary search (check overhead) //jslint-quiet

            while (ii < tree.children.length) {
                child = tree.children[ii];
                if (child.start < offset && offset < child.end) {

// Recurse treeSplit().

                    mid = treeSplit(child, offset);
                    leftChildLen = ii + 1;
                    break;
                }
                if (child.start >= offset) {
                    leftChildLen = ii;
                    break;
                }
                ii += 1;
            }
            rightChildren = tree.children.splice(
                leftChildLen,
                tree.children.length - leftChildLen
            );
            if (mid !== undefined) {
                rightChildren.unshift(mid);
            }

// new rangeTreeCreate().

            resultTree = {
                children: rightChildren,
                delta: tree.delta,
                end: tree.end,
                start: offset
            };
            tree.end = offset;
            return resultTree;
        }

// Init startToTreeDict.

        parentTrees.forEach(function (parentTree, parentIi) {
            parentTree.children.forEach(function (child) {

// Append child with child.start to startToTreeDict.

                dictKeyValueAppend(startToTreeDict, child.start, {
                    parentIi,
                    tree: child
                });
            });
        });

// init queueList.

        queueList = Array.from(startToTreeDict).map(function ([
            startOffset, trees
        ]) {

// new StartEvent().

            return [
                startOffset, trees
            ];
        }).sort(function (aa, bb) {
            return aa[0] - bb[0];
        });
        while (true) {
            if (nextXxx()) {
                break;
            }
        }
        return resultChildren;
    }

    function sortFunc(funcCov) {

// This function will normalize-and-sort <funcCov>.ranges.
// Sorts the ranges (pre-order sort).
// TODO: Tree-based normalization of the ranges. //jslint-quiet
// @param funcCov Function coverage to normalize.

        funcCov.ranges = treeToRanges(treeFromSortedRanges(
            funcCov.ranges.sort(compareRangeList)
        ));
        return funcCov;
    }

    function sortProcess(processCov) {

// This function will sort <processCov>.result.
// Sorts the scripts alphabetically by `url`.
// Reassigns script ids: the script at index `0` receives `"0"`, the script at
// index `1` receives `"1"` etc.

        Object.entries(processCov.result.sort(function (aa, bb) {
            return (
                aa.url < bb.url
                ? -1
                : aa.url > bb.url
                ? 1
                : 0
            );
        })).forEach(function ([
            scriptId, scriptCov
        ]) {
            scriptCov.scriptId = scriptId.toString(10);
        });
        return processCov;
    }

    function sortScript(scriptCov) {

// This function will normalize-and-sort <scriptCov>.functions.

// Normalize-and-sort functions[xxx].ranges.

        scriptCov.functions.forEach(function (funcCov) {
            sortFunc(funcCov);
        });

// Sort functions by root range (pre-order sort).

        scriptCov.functions.sort(function (aa, bb) {
            return compareRangeList(aa.ranges[0], bb.ranges[0]);
        });
        return scriptCov;
    }

    function treeFromSortedRanges(ranges) {

// @precondition `ranges` are well-formed and pre-order sorted

        let root;
        let stack = [];   // Stack of parent trees and parent counts.
        ranges.forEach(function (range) {

// new rangeTreeCreate().

            let node = {
                children: [],
                delta: range.count,
                end: range.endOffset,
                start: range.startOffset
            };
            let parent;
            let parentCount;
            if (root === undefined) {
                root = node;
                stack.push([
                    node, range.count
                ]);
                return;
            }
            while (true) {
                [
                    parent, parentCount
                ] = stack[stack.length - 1];

// assert: `top !== undefined` (the ranges are sorted)

                if (range.startOffset < parent.end) {
                    break;
                }
                stack.pop();
            }
            node.delta -= parentCount;
            parent.children.push(node);
            stack.push([
                node, range.count
            ]);
        });
        return root;
    }

    function treeToRanges(tree) {

// Get the range coverages corresponding to the tree.
// The ranges are pre-order sorted.

        let count;
        let cur;
        let ii;
        let parentCount;
        let ranges = [];
        let stack = [           // Stack of parent trees and counts.
            [
                tree, 0
            ]
        ];
        function normalizeRange(tree) {

// @internal

            let children = [];
            let curEnd;
            let head;
            let tail = [];
            function endChain() {
                if (tail.length !== 0) {
                    head.end = tail[tail.length - 1].end;
                    tail.forEach(function (tailTree) {
                        tailTree.children.forEach(function (subChild) {
                            subChild.delta += tailTree.delta - head.delta;
                            head.children.push(subChild);
                        });
                    });
                    tail.length = 0;
                }

// Recurse normalizeRange().

                normalizeRange(head);
                children.push(head);
            }
            tree.children.forEach(function (child) {
                if (head === undefined) {
                    head = child;
                } else if (
                    child.delta === head.delta && child.start === curEnd
                ) {
                    tail.push(child);
                } else {
                    endChain();
                    head = child;
                }
                curEnd = child.end;
            });
            if (head !== undefined) {
                endChain();
            }
            if (children.length === 1) {
                if (
                    children[0].start === tree.start
                    && children[0].end === tree.end
                ) {
                    tree.delta += children[0].delta;
                    tree.children = children[0].children;

// `.lazyCount` is zero for both (both are after normalization)

                    return;
                }
            }
            tree.children = children;
        }
        normalizeRange(tree);
        while (stack.length > 0) {
            [
                cur, parentCount
            ] = stack.pop();
            count = parentCount + cur.delta;
            ranges.push({
                count,
                endOffset: cur.end,
                startOffset: cur.start
            });
            ii = cur.children.length - 1;
            while (ii >= 0) {
                stack.push([
                    cur.children[ii], count
                ]);
                ii -= 1;
            }
        }
        return ranges;
    }

    if (processCovs.length === 0) {
        return {
            result: []
        };
    }
    if (processCovs.length === 1) {

// Normalize-and-sort scriptCov.

        processCovs[0].result.forEach(function (scriptCov) {
            sortScript(scriptCov);
        });

// Sort processCovs[0].result.

        return sortProcess(processCovs[0]);
    }

// Init urlToScriptDict.

    processCovs.forEach(function ({
        result
    }) {
        result.forEach(function (scriptCov) {
            dictKeyValueAppend(urlToScriptDict, scriptCov.url, scriptCov);
        });
    });
    urlToScriptDict.forEach(function (scriptCovs) {

// assert: `scriptCovs.length > 0`

// function mergeScriptList(scriptCovs) {
// Merges a list of matching script coverages.
// Scripts are matching if they have the same `url`.
// The result is normalized.
// The input values may be mutated, it is not safe to use them after passing
// them to this function.
// The computation is synchronous.
// @param scriptCovs Process coverages to merge.
// @return Merged script coverage, or `undefined` if the input list was empty.

        let functions = [];

// Map funcCovRoot.startOffset:funcCovRoot.endOffset to funcCov.

        let rangeToFuncDict = new Map();

// Probably deadcode.
// if (scriptCovs.length === 0) {
//     return undefined;
// }

        if (scriptCovs.length === 1) {
            resultMerged.push(sortScript(scriptCovs[0]));
            return;
        }

// Init rangeToFuncDict.
// Map funcCovRoot.startOffset:funcCovRoot.endOffset to funcCov.

        scriptCovs.forEach(function ({
            functions
        }) {
            functions.forEach(function (funcCov) {
                dictKeyValueAppend(
                    rangeToFuncDict,

// This string can be used to match function with same root range.
// The string is derived from the start and end offsets of the root range of
// the function.
// This assumes that `ranges` is non-empty (true for valid function coverages).

                    (
                        funcCov.ranges[0].startOffset
                        + ";" + funcCov.ranges[0].endOffset
                    ),
                    funcCov
                );
            });
        });
        rangeToFuncDict.forEach(function (funcCovs) {

// assert: `funcCovs.length > 0`

// function mergeFuncList(funcCovs) {
// Merges a list of matching function coverages.
// Functions are matching if their root ranges have the same span.
// The result is normalized.
// The input values may be mutated, it is not safe to use them after passing
// them to this function.
// The computation is synchronous.
// @param funcCovs Function coverages to merge.
// @return Merged function coverage, or `undefined` if the input list was empty.

            let count = 0;
            let isBlockCoverage;
            let merged;
            let ranges;
            let trees = [];

// Probably deadcode.
// if (funcCovs.length === 0) {
//     return undefined;
// }

            if (funcCovs.length === 1) {
                functions.push(sortFunc(funcCovs[0]));
                return;
            }

// assert: `funcCovs[0].ranges.length > 0`

            funcCovs.forEach(function (funcCov) {

// assert: `funcCov.ranges.length > 0`
// assert: `funcCov.ranges` is sorted

                count += (
                    funcCov.count !== undefined
                    ? funcCov.count
                    : funcCov.ranges[0].count
                );
                if (funcCov.isBlockCoverage) {
                    trees.push(treeFromSortedRanges(funcCov.ranges));
                }
            });
            if (trees.length > 0) {
                isBlockCoverage = true;
                ranges = treeToRanges(mergeTreeList(trees));
            } else {
                isBlockCoverage = false;
                ranges = [
                    {
                        count,
                        endOffset: funcCovs[0].ranges[0].endOffset,
                        startOffset: funcCovs[0].ranges[0].startOffset
                    }
                ];
            }
            merged = {
                functionName: funcCovs[0].functionName,
                isBlockCoverage,
                ranges
            };
            if (count !== ranges[0].count) {
                merged.count = count;
            }

// assert: `merged` is normalized

            functions.push(merged);
        });
        resultMerged.push(sortScript({
            functions,
            scriptId: scriptCovs[0].scriptId,
            url: scriptCovs[0].url
        }));
    });
    return sortProcess({
        result: resultMerged
    });
}

export default Object.freeze({
    v8CoverageListMerge
});
