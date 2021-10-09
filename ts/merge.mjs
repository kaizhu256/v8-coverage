/*jslint beta*/

function compareRangeCovs(aa, bb) {

// Compares two range coverages.
//
// The ranges are first ordered by ascending `startOffset` and then by
// descending `endOffset`.
// This corresponds to a pre-order tree traversal.

    if (aa.startOffset !== bb.startOffset) {
        return aa.startOffset - bb.startOffset;
    }
    return bb.endOffset - aa.endOffset;
}

function coverageFunctionNormalize(funcCov) {

// Normalizes a function coverage.
//
// Sorts the ranges (pre-order sort).
// TODO: Tree-based normalization of the ranges. //jslint-quiet
//
// @param funcCov Function coverage to normalize.

    funcCov.ranges = rangeTreeToRanges(
        rangeTreeFromSortedRanges(
            funcCov.ranges.sort(compareRangeCovs)
        )
    );
    return funcCov;
}

function coverageScriptNormalize(scriptCov) {

// Normalizes a script coverage.
//
// Sorts the function by root range (pre-order sort).
// This does not normalize the function coverages.
//
// @param scriptCov Script coverage to normalize.

    scriptCov.functions.sort(function (aa, bb) {

// Compares two function coverages.
//
// The result corresponds to the comparison of the root ranges.

        return compareRangeCovs(aa.ranges[0], bb.ranges[0]);
    });
    return scriptCov;
}

function coverageScriptNormalizeDeep(scriptCov) {

// Normalizes a script coverage deeply.
//
// Normalizes the function coverages deeply, then normalizes the script coverage
// itself.
//
// @param scriptCov Script coverage to normalize.

    scriptCov.functions.forEach(function (funcCov) {
        coverageFunctionNormalize(funcCov);
    });
    return coverageScriptNormalize(scriptCov);
}

function rangeTreeFromSortedRanges(ranges) {

// @precodition `ranges` are well-formed and pre-order sorted

    let root;
    let stack = [];             // Stack of parent trees and parent counts.
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

function rangeTreeSplit(tree, value) {

// @precondition `tree.start < value && value < tree.end`
// @return RangeTree Right part

    let child;
    let ii = 0;
    let leftChildLen = tree.children.length;
    let mid;
    let result;
    let rightChildren;

// TODO(perf): Binary search (check overhead) //jslint-quiet

    while (ii < tree.children.length) {
        child = tree.children[ii];
        if (child.start < value && value < child.end) {

// Recurse rangeTreeSplit().

            mid = rangeTreeSplit(child, value);
            leftChildLen = ii + 1;
            break;
        }
        if (child.start >= value) {
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

    result = {
        children: rightChildren,
        delta: tree.delta,
        end: tree.end,
        start: value
    };
    tree.end = value;
    return result;
}

function rangeTreeToRanges(tree) {

// Get the range coverages corresponding to the tree.
//
// The ranges are pre-order sorted.

    let count;
    let cur;
    let ii;
    let parentCount;
    let ranges = [];
    let stack = [               // Stack of parent trees and counts.
        [
            tree, 0
        ]
    ];
    function rangeTreeNormalize(tree) {

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

// Recurse rangeTreeNormalize().

            rangeTreeNormalize(head);
            children.push(head);
        }
        tree.children.forEach(function (child) {
            if (head === undefined) {
                head = child;
            } else if (child.delta === head.delta && child.start === curEnd) {
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
    rangeTreeNormalize(tree);
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
            stack.push([cur.children[
                ii], count]);
            ii -= 1;
        }
    }
    return ranges;
}

export function coverageProcessListMerge(processCovs) { //jslint-quiet

// Merges a list of process coverages.
//
// The result is normalized.
// The input values may be mutated, it is not safe to use them after passing
// them to this function.
// The computation is synchronous.
//
// @param processCovs Process coverages to merge.
// @return Merged process coverage.

    let result = [];
    let urlToScripts = new Map();
    function coverageProcessNormalize(processCov) {

// Normalizes a process coverage.
//
// Sorts the scripts alphabetically by `url`.
// Reassigns script ids: the script at index `0` receives `"0"`, the script at
// index `1` receives `"1"` etc.
// This does not normalize the script coverages.
//
// @param processCov Process coverage to normalize.

        Object.entries(processCov.result.sort(function (aa, bb) {

// Compares two script coverages.
//
// The result corresponds to the comparison of their `url` value
// (alphabetical sort).

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
    function coverageProcessNormalizeDeep(processCov) {

// Normalizes a process coverage deeply.
//
// Normalizes the script coverages deeply, then normalizes the process coverage
// itself.
//
// @param processCov Process coverage to normalize.

        processCov.result.forEach(function (scriptCov) {

// Recurse coverageScriptNormalizeDeep().

            coverageScriptNormalizeDeep(scriptCov);
        });
        return coverageProcessNormalize(processCov);
    }

    if (processCovs.length === 0) {
        return {
            result: []
        };
    }
    if (processCovs.length === 1) {
        return coverageProcessNormalizeDeep(processCovs[0]);
    }
    processCovs.forEach(function (processCov) {
        processCov.result.forEach(function (scriptCov) {
            let scriptCovs = urlToScripts.get(scriptCov.url);
            if (scriptCovs === undefined) {
                scriptCovs = [];
                urlToScripts.set(scriptCov.url, scriptCovs);
            }
            scriptCovs.push(scriptCov);
        });
    });
    urlToScripts.forEach(function (scripts) {
        // assert: `scripts.length > 0`
        result.push(coverageScriptListMerge(scripts));
    });
    return coverageProcessNormalize({
        result
    });
}

export function coverageScriptListMerge(scriptCovs) { //jslint-quiet

// Merges a list of matching script coverages.
//
// Scripts are matching if they have the same `url`.
// The result is normalized.
// The input values may be mutated, it is not safe to use them after passing
// them to this function.
// The computation is synchronous.
//
// @param scriptCovs Process coverages to merge.
// @return Merged script coverage, or `undefined` if the input list was empty.

    let functions = [];
    let rangeToFuncs = new Map();
    if (scriptCovs.length === 0) {
        return undefined;
    }
    if (scriptCovs.length === 1) {
        return coverageScriptNormalizeDeep(scriptCovs[0]);
    }
    scriptCovs.forEach(function (scriptCov) {
        scriptCov.functions.forEach(function (funcCov) {

// This string can be used to match function with same root range.
// The string is derived from the start and end offsets of the root range of
// the function.
// This assumes that `ranges` is non-empty (true for valid function coverages).

            let funcCovs;
            let rootRange = (
                funcCov.ranges[0].startOffset
                + ";" + funcCov.ranges[0].endOffset
            );
            funcCovs = rangeToFuncs.get(rootRange);
            if (funcCovs === undefined) {
                funcCovs = [];
                rangeToFuncs.set(rootRange, funcCovs);
            }
            funcCovs.push(funcCov);
        });
    });
    rangeToFuncs.forEach(function (funcCovs) {
        // assert: `funcCovs.length > 0`
        functions.push(coverageFunctionListMerge(funcCovs));
    });
    return coverageScriptNormalize({
        functions,
        scriptId: scriptCovs[0].scriptId,
        url: scriptCovs[0].url
    });
}

export function coverageFunctionListMerge(funcCovs) { //jslint-quiet

// Merges a list of matching function coverages.
//
// Functions are matching if their root ranges have the same span.
// The result is normalized.
// The input values may be mutated, it is not safe to use them after passing
// them to this function.
// The computation is synchronous.
//
// @param funcCovs Function coverages to merge.
// @return Merged function coverage, or `undefined` if the input list was empty.

    let count = 0;
    let isBlockCoverage;
    let merged;
    let ranges;
    let trees = [];
    if (funcCovs.length === 0) {
        return undefined;
    }
    if (funcCovs.length === 1) {
        return coverageFunctionNormalize(funcCovs[0]);
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
            trees.push(rangeTreeFromSortedRanges(funcCov.ranges));
        }
    });
    if (trees.length > 0) {
        isBlockCoverage = true;
        ranges = rangeTreeToRanges(rangeTreeListMerge(trees));
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

    return merged;
}

function rangeTreeChildrenMerge(parentTrees) {
    let openRange;
    let parentToNested = new Map();
    let result = [];
    let startEventQueue;
    let startToTrees = new Map();
    function next() {
        let nextEvent = startEventQueue.queue[startEventQueue.nextIndex];
        let pendingTrees = startEventQueue.pendingTrees;
        if (pendingTrees === undefined) {
            startEventQueue.nextIndex += 1;
            return nextEvent;
        } else if (nextEvent === undefined) {
            delete startEventQueue.pendingTrees;

// new StartEvent().

            return {
                offset: startEventQueue.pendingOffset,
                trees: pendingTrees
            };
        } else {
            if (startEventQueue.pendingOffset < nextEvent.offset) {
                delete startEventQueue.pendingTrees;

// new StartEvent().

                return {
                    offset: startEventQueue.pendingOffset,
                    trees: pendingTrees
                };
            } else {
                if (startEventQueue.pendingOffset === nextEvent.offset) {
                    delete startEventQueue.pendingTrees;
                    pendingTrees.forEach(function (tree) {
                        nextEvent.trees.push(tree);
                    });
                }
                startEventQueue.nextIndex += 1;
                return nextEvent;
            }
        }
    }
    parentTrees.forEach(function (parentTree, parentIndex) {
        parentTree.children.forEach(function (child) {
            let trees = startToTrees.get(child.start);
            if (trees === undefined) {
                trees = [];
                startToTrees.set(child.start, trees);
            }

// new RangeTreeWithParent().

            trees.push({
                parentIndex,
                tree: child
            });
        });
    });

// new StartEventQueue().

    startEventQueue = {
        nextIndex: 0,
        pendingIndex: 0,
        queue: Array.from(startToTrees).map(function ([
            startOffset, trees
        ]) {

// new StartEvent().

            return {
                offset: startOffset,
                trees
            };
        }).sort(function (aa, bb) {
            return aa.offset - bb.offset;
        })
    };
    while (true) {
        let event = next();
        if (event === undefined) {
            break;
        }
        if (openRange !== undefined && openRange.end <= event.offset) {
            result.push(nextChild(openRange, parentToNested));
            openRange = undefined;
        }
        if (openRange === undefined) {
            let openRangeEnd = event.offset + 1;
            event.trees.forEach(function ({ parentIndex, tree }) { //jslint-quiet
                openRangeEnd = Math.max(openRangeEnd, tree.end);
                insertChild(parentToNested, parentIndex, tree);
            });
            startEventQueue.pendingOffset = openRangeEnd;
            openRange = {
                end: openRangeEnd,
                start: event.offset
            };
        } else {
            event.trees.forEach(function ({ parentIndex, tree }) { //jslint-quiet
                if (tree.end > openRange.end) {
                    let right = rangeTreeSplit(tree, openRange.end);
                    if (startEventQueue.pendingTrees === undefined) {
                        startEventQueue.pendingTrees = [];
                    }

// new RangeTreeWithParent().

                    startEventQueue.pendingTrees.push({
                        parentIndex,
                        tree: right
                    });
                }
                insertChild(parentToNested, parentIndex, tree);
            });
        }
    }
    if (openRange !== undefined) {
        result.push(nextChild(openRange, parentToNested));
    }
    return result;
}

function rangeTreeListMerge(trees) {

// @precondition Same `start` and `end` for all the trees

    return (
        trees.length <= 1
        ? trees[0]

// new RangeTree().

        : {
            children: rangeTreeChildrenMerge(trees),
            delta: trees.reduce(function (aa, bb) {
                return aa + bb.delta;
            }, 0),
            end: trees[0].end,
            start: trees[0].start
        }
    );
}

function insertChild(parentToNested, parentIndex, tree) {
    let nested = parentToNested.get(parentIndex);
    if (nested === undefined) {
        nested = [];
        parentToNested.set(parentIndex, nested);
    }
    nested.push(tree);
}

function nextChild(openRange, parentToNested) {
    let matchingTrees = [];
    parentToNested.forEach(function (nested) {
        if (
            nested.length === 1
            && nested[0].start === openRange.start
            && nested[0].end === openRange.end
        ) {
            matchingTrees.push(nested[0]);
        } else {

// new rangeTreeCreate().

            matchingTrees.push({
                children: nested,
                delta: 0,
                end: openRange.end,
                start: openRange.start
            });
        }
    });
    parentToNested.clear();
    return rangeTreeListMerge(matchingTrees);
}
