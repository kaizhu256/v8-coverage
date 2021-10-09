/*jslint*/

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

function normalizeScriptCov(scriptCov) {

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
}

function deepNormalizeScriptCov(scriptCov) {

// Normalizes a script coverage deeply.
//
// Normalizes the function coverages deeply, then normalizes the script coverage
// itself.
//
// @param scriptCov Script coverage to normalize.

    scriptCov.functions.forEach(function (funcCov) {
        normalizeFunctionCov(funcCov);
    });
    normalizeScriptCov(scriptCov);
}

function normalizeFunctionCov(funcCov) {

// Normalizes a function coverage.
//
// Sorts the ranges (pre-order sort).
// TODO: Tree-based normalization of the ranges. //jslint-quiet
//
// @param funcCov Function coverage to normalize.

    funcCov.ranges.sort(compareRangeCovs);
    const tree = rangeTreeFromSortedRanges(funcCov.ranges);
    normalizeRangeTree(tree);
    funcCov.ranges = rangeTreeToRanges(tree);
}

function normalizeRangeTree(tree) {

// @internal

    const children = [];
    let curEnd;
    let head;
    const tail = [];
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
        const child = children[0];
        if (child.start === tree.start && child.end === tree.end) {
            tree.delta += child.delta;
            tree.children = child.children;
            // `.lazyCount` is zero for both (both are after normalization)
            return;
        }
    }
    tree.children = children;
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
        normalizeRangeTree(head);
        children.push(head);
    }
}

function rangeTreeCreate(start, end, delta, children) {
    return {
        children,
        delta,
        end,
        start
    };
}

function rangeTreeFromSortedRanges(ranges) {

// @precodition `ranges` are well-formed and pre-order sorted

    let root;
    // Stack of parent trees and parent counts.
    const stack = [];
    ranges.forEach(function (range) {
        const node = rangeTreeCreate(
            range.startOffset,
            range.endOffset,
            range.count,
            []
        );
        if (root === undefined) {
            root = node;
            stack.push([node, range.count]);
            return;
        }
        let parent;
        let parentCount;
        while (true) {
            [parent, parentCount] = stack[stack.length - 1];
            // assert: `top !== undefined` (the ranges are sorted)
            if (range.startOffset < parent.end) {
                break;
            }
            stack.pop();
        }
        node.delta -= parentCount;
        parent.children.push(node);
        stack.push([node, range.count]);
    });
    return root;
}

function rangeTreeSplit(tree, value) {
/**
 * @precondition `tree.start < value && value < tree.end`
 * @return RangeTree Right part
 */
    let ii = 0;
    let leftChildLen = tree.children.length;
    let mid;
    // TODO(perf): Binary search (check overhead) //jslint-quiet
    while (ii < tree.children.length) {
        const child = tree.children[ii];
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
    const rightLen = tree.children.length - leftChildLen;
    const rightChildren = tree.children.splice(leftChildLen, rightLen);
    if (mid !== undefined) {
        rightChildren.unshift(mid);
    }
    const result = rangeTreeCreate(
        value,
        tree.end,
        tree.delta,
        rightChildren
    );
    tree.end = value;
    return result;
}

function rangeTreeToRanges(tree) {
/**
 * Get the range coverages corresponding to the tree.
 *
 * The ranges are pre-order sorted.
 */
    const ranges = [];
    // Stack of parent trees and counts.
    const stack = [[tree, 0]];
    while (stack.length > 0) {
        let ii;
        const [cur, parentCount] = stack.pop();
        const count = parentCount + cur.delta;
        ranges.push({
            count,
            endOffset: cur.end,
            startOffset: cur.start
        });
        ii = cur.children.length - 1;
        while (ii >= 0) {
            stack.push([cur.children[ii], count]);
            ii -= 1;
        }
    }
    return ranges;
}

export function mergeProcessCovs(processCovs) { //jslint-quiet

// Merges a list of process coverages.
//
// The result is normalized.
// The input values may be mutated, it is not safe to use them after passing
// them to this function.
// The computation is synchronous.
//
// @param processCovs Process coverages to merge.
// @return Merged process coverage.

    let merged;
    function normalizeProcessCov(processCov) {

// Normalizes a process coverage.
//
// Sorts the scripts alphabetically by `url`.
// Reassigns script ids: the script at index `0` receives `"0"`, the script at
// index `1` receives `"1"` etc.
// This does not normalize the script coverages.
//
// @param processCov Process coverage to normalize.


        processCov.result.forEach(function (scriptCov) {

// Recurse deepNormalizeScriptCov().

            deepNormalizeScriptCov(scriptCov);
        });

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
        })).forEach(function ([scriptId, scriptCov]) {
            scriptCov.scriptId = scriptId.toString(10);
        });
    }
    if (processCovs.length === 0) {
        return {
            result: []
        };
    }
    if (processCovs.length === 1) {
        merged = processCovs[0];
        normalizeProcessCov(merged);
        return merged;
    }
    const urlToScripts = new Map();
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
    const result = [];
    urlToScripts.forEach(function (scripts) {
        // assert: `scripts.length > 0`
        result.push(mergeScriptCovs(scripts));
    });
    merged = {
        result
    };
    normalizeProcessCov(merged);
    return merged;
}

export function mergeScriptCovs(scriptCovs) { //jslint-quiet

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

    let merged;
    if (scriptCovs.length === 0) {
        return undefined;
    }
    if (scriptCovs.length === 1) {
        merged = scriptCovs[0];
        deepNormalizeScriptCov(merged);
        return merged;
    }
    const first = scriptCovs[0];
    const scriptId = first.scriptId;
    const url = first.url;
    const rangeToFuncs = new Map();
    scriptCovs.forEach(function (scriptCov) {
        scriptCov.functions.forEach(function (funcCov) {
            const rootRange = stringifyFunctionRootRange(funcCov);
            let funcCovs = rangeToFuncs.get(rootRange);
            if (funcCovs === undefined) {
                funcCovs = [];
                rangeToFuncs.set(rootRange, funcCovs);
            }
            funcCovs.push(funcCov);
        });
    });
    const functions = [];
    rangeToFuncs.forEach(function (funcCovs) {
        // assert: `funcCovs.length > 0`
        functions.push(mergeFunctionCovs(funcCovs));
    });
    merged = {
        functions,
        scriptId,
        url
    };
    normalizeScriptCov(merged);
    return merged;
}

function stringifyFunctionRootRange(funcCov) {

// Returns a string representation of the root range of the function.
//
// This string can be used to match function with same root range.
// The string is derived from the start and end offsets of the root range of
// the function.
// This assumes that `ranges` is non-empty (true for valid function coverages).
//
// @param funcCov Function coverage with the range to stringify
// @internal

    const rootRange = funcCov.ranges[0];
    return `${rootRange.startOffset.toString(10)};${rootRange.endOffset.toString(10)}`; //jslint-quiet
}

export function mergeFunctionCovs(funcCovs) { //jslint-quiet

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

    let merged;
    if (funcCovs.length === 0) {
        return undefined;
    }
    if (funcCovs.length === 1) {
        merged = funcCovs[0];
        normalizeFunctionCov(merged);
        return merged;
    }
    const first = funcCovs[0];
    const functionName = first.functionName;
    // assert: `first.ranges.length > 0`
    const startOffset = first.ranges[0].startOffset;
    const endOffset = first.ranges[0].endOffset;
    let count = 0;
    const trees = [];
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
    let isBlockCoverage;
    let ranges;
    if (trees.length > 0) {
        isBlockCoverage = true;
        const mergedTree = mergeRangeTrees(trees);
        normalizeRangeTree(mergedTree);
        ranges = rangeTreeToRanges(mergedTree);
    } else {
        isBlockCoverage = false;
        ranges = [
            {
                count,
                endOffset,
                startOffset
            }
        ];
    }
    merged = {
        functionName,
        isBlockCoverage,
        ranges
    };
    if (count !== ranges[0].count) {
        merged.count = count;
    }
    // assert: `merged` is normalized
    return merged;
}

function mergeRangeTrees(trees) {

// @precondition Same `start` and `end` for all the trees

    if (trees.length <= 1) {
        return trees[0];
    }
    const first = trees[0];
    let delta = 0;
    trees.forEach(function (tree) {
        delta += tree.delta;
    });
    const children = mergeRangeTreeChildren(trees);
    return rangeTreeCreate(first.start, first.end, delta, children);
}

function startEventQueueFromParentTrees(parentTrees) {
    const startToTrees = new Map();
    parentTrees.forEach(function (parentTree, parentIndex) {
        parentTree.children.forEach(function (child) {
            let trees = startToTrees.get(child.start);
            if (trees === undefined) {
                trees = [];
                startToTrees.set(child.start, trees);
            }
            trees.push({

// new RangeTreeWithParent().

                parentIndex,
                tree: child
            });
        });
    });
    const queue = [];
    startToTrees.forEach(function (trees, startOffset) {
        queue.push({
            // new StartEvent().
            offset: startOffset,
            trees
        });
    });
    queue.sort(function (aa, bb) {
        return aa.offset - bb.offset;
    });
    return {

// new StartEventQueue().

        nextIndex: 0,
        pendingIndex: 0,
        queue
    };
}

function mergeRangeTreeChildren(parentTrees) {
    const result = [];
    const startEventQueue = startEventQueueFromParentTrees(parentTrees);
    const parentToNested = new Map();
    let openRange;
    function next() {
        const pendingTrees = startEventQueue.pendingTrees;
        const nextEvent = startEventQueue.queue[startEventQueue.nextIndex];
        if (pendingTrees === undefined) {
            startEventQueue.nextIndex += 1;
            return nextEvent;
        } else if (nextEvent === undefined) {
            delete startEventQueue.pendingTrees;
            return {
                // new StartEvent().
                offset: startEventQueue.pendingOffset,
                trees: pendingTrees
            };
        } else {
            if (startEventQueue.pendingOffset < nextEvent.offset) {
                delete startEventQueue.pendingTrees;
                return {
                    // new StartEvent().
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
    while (true) {
        const event = next();
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
                    const right = rangeTreeSplit(tree, openRange.end);
                    if (startEventQueue.pendingTrees === undefined) {
                        startEventQueue.pendingTrees = [];
                    }
                    startEventQueue.pendingTrees.push({

// new RangeTreeWithParent().

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

function insertChild(parentToNested, parentIndex, tree) {
    let nested = parentToNested.get(parentIndex);
    if (nested === undefined) {
        nested = [];
        parentToNested.set(parentIndex, nested);
    }
    nested.push(tree);
}

function nextChild(openRange, parentToNested) {
    const matchingTrees = [];
    parentToNested.forEach(function (nested) {
        if (
            nested.length === 1
            && nested[0].start === openRange.start
            && nested[0].end === openRange.end
        ) {
            matchingTrees.push(nested[0]);
        } else {
            matchingTrees.push(
                rangeTreeCreate(openRange.start, openRange.end, 0, nested)
            );
        }
    });
    parentToNested.clear();
    return mergeRangeTrees(matchingTrees);
}
