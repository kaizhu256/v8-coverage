/*jslint this*/

function compareScriptCovs(aa, bb) {
/**
 * Compares two script coverages.
 *
 * The result corresponds to the comparison of their `url` value
 * (alphabetical sort).
 */
    return (
        aa.url < bb.url
        ? -1
        : aa.url > bb.url
        ? 1
        : 0
    );
}

function compareFunctionCovs(aa, bb) {
/**
 * Compares two function coverages.
 *
 * The result corresponds to the comparison of the root ranges.
 */
    return compareRangeCovs(aa.ranges[0], bb.ranges[0]);
}

function compareRangeCovs(aa, bb) {
/**
 * Compares two range coverages.
 *
 * The ranges are first ordered by ascending `startOffset` and then by
 * descending `endOffset`.
 * This corresponds to a pre-order tree traversal.
 */
    if (aa.startOffset !== bb.startOffset) {
        return aa.startOffset - bb.startOffset;
    }
    return bb.endOffset - aa.endOffset;
}

function normalizeProcessCov(processCov) {
/**
 * Normalizes a process coverage.
 *
 * Sorts the scripts alphabetically by `url`.
 * Reassigns script ids: the script at index `0` receives `"0"`, the script at
 * index `1` receives `"1"` etc.
 * This does not normalize the script coverages.
 *
 * @param processCov Process coverage to normalize.
 */
    Object.entries(
        processCov.result.sort(compareScriptCovs)
    ).forEach(function ([scriptId, scriptCov]) {
        scriptCov.scriptId = scriptId.toString(10);
    });
}

function deepNormalizeProcessCov(processCov) {
/**
 * Normalizes a process coverage deeply.
 *
 * Normalizes the script coverages deeply, then normalizes the process coverage
 * itself.
 *
 * @param processCov Process coverage to normalize.
 */
    processCov.result.forEach(function (scriptCov) {
        deepNormalizeScriptCov(scriptCov);
    });
    normalizeProcessCov(processCov);
}

function normalizeScriptCov(scriptCov) {
/**
 * Normalizes a script coverage.
 *
 * Sorts the function by root range (pre-order sort).
 * This does not normalize the function coverages.
 *
 * @param scriptCov Script coverage to normalize.
 */
    scriptCov.functions.sort(compareFunctionCovs);
}

function deepNormalizeScriptCov(scriptCov) {
/**
 * Normalizes a script coverage deeply.
 *
 * Normalizes the function coverages deeply, then normalizes the script coverage
 * itself.
 *
 * @param scriptCov Script coverage to normalize.
 */
    scriptCov.functions.forEach(function (funcCov) {
        normalizeFunctionCov(funcCov);
    });
    normalizeScriptCov(scriptCov);
}

function normalizeFunctionCov(funcCov) {
/**
 * Normalizes a function coverage.
 *
 * Sorts the ranges (pre-order sort).
 * TODO: Tree-based normalization of the ranges. //jslint-quiet
 *
 * @param funcCov Function coverage to normalize.
 */ //jslint-quiet
    funcCov.ranges.sort(compareRangeCovs);
    const tree = rangeTreeFromSortedRanges(funcCov.ranges);
    normalizeRangeTree(tree);
    funcCov.ranges = tree.toRanges();
}

function normalizeRangeTree(tree) {
/**
 * @internal
 */
    tree.normalize();
}

function RangeTree(start, end, delta, children) {
    this.start = start;
    this.end = end;
    this.delta = delta;
    this.children = children;
}

function rangeTreeFromSortedRanges(ranges) {
/**
 * @precodition `ranges` are well-formed and pre-order sorted
 */
    let root;
    // Stack of parent trees and parent counts.
    const stack = [];
    ranges.forEach(function (range) {
        const node = new RangeTree(
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

Object.assign(RangeTree.prototype, {
    normalize: function () {
        const children = [];
        let curEnd;
        let head;
        const tail = [];
        this.children.forEach(function (child) {
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
            if (child.start === this.start && child.end === this.end) {
                this.delta += child.delta;
                this.children = child.children;
                // `.lazyCount` is zero for both (both are after normalization)
                return;
            }
        }
        this.children = children;
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
            head.normalize();
            children.push(head);
        }
    },

    split: function (value) {
    /**
     * @precondition `tree.start < value && value < tree.end`
     * @return RangeTree Right part
     */
        let ii = 0;
        let leftChildLen = this.children.length;
        let mid;
        // TODO(perf): Binary search (check overhead) //jslint-quiet
        while (ii < this.children.length) {
            const child = this.children[ii];
            if (child.start < value && value < child.end) {
                mid = child.split(value);
                leftChildLen = ii + 1;
                break;
            }
            if (child.start >= value) {
                leftChildLen = ii;
                break;
            }
            ii += 1;
        }
        const rightLen = this.children.length - leftChildLen;
        const rightChildren = this.children.splice(leftChildLen, rightLen);
        if (mid !== undefined) {
            rightChildren.unshift(mid);
        }
        const result = new RangeTree(
            value,
            this.end,
            this.delta,
            rightChildren
        );
        this.end = value;
        return result;
    },

    toRanges: function () {
    /**
     * Get the range coverages corresponding to the tree.
     *
     * The ranges are pre-order sorted.
     */
        const ranges = [];
        // Stack of parent trees and counts.
        const stack = [[this, 0]];
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
});

export function mergeProcessCovs(processCovs) { //jslint-quiet
/**
 * Merges a list of process coverages.
 *
 * The result is normalized.
 * The input values may be mutated, it is not safe to use them after passing
 * them to this function.
 * The computation is synchronous.
 *
 * @param processCovs Process coverages to merge.
 * @return Merged process coverage.
 */
    let merged;
    if (processCovs.length === 0) {
        return {
            result: []
        };
    }
    if (processCovs.length === 1) {
        merged = processCovs[0];
        deepNormalizeProcessCov(merged);
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
/**
 * Merges a list of matching script coverages.
 *
 * Scripts are matching if they have the same `url`.
 * The result is normalized.
 * The input values may be mutated, it is not safe to use them after passing
 * them to this function.
 * The computation is synchronous.
 *
 * @param scriptCovs Process coverages to merge.
 * @return Merged script coverage, or `undefined` if the input list was empty.
 */
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
/**
 * Returns a string representation of the root range of the function.
 *
 * This string can be used to match function with same root range.
 * The string is derived from the start and end offsets of the root range of
 * the function.
 * This assumes that `ranges` is non-empty (true for valid function coverages).
 *
 * @param funcCov Function coverage with the range to stringify
 * @internal
 */
    const rootRange = funcCov.ranges[0];
    return `${rootRange.startOffset.toString(10)};${rootRange.endOffset.toString(10)}`; //jslint-quiet
}

export function mergeFunctionCovs(funcCovs) { //jslint-quiet
/**
 * Merges a list of matching function coverages.
 *
 * Functions are matching if their root ranges have the same span.
 * The result is normalized.
 * The input values may be mutated, it is not safe to use them after passing
 * them to this function.
 * The computation is synchronous.
 *
 * @param funcCovs Function coverages to merge.
 * @return Merged function coverage, or `undefined` if the input list was empty.
 */
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
        ranges = mergedTree.toRanges();
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
/**
 * @precondition Same `start` and `end` for all the trees
 */
    if (trees.length <= 1) {
        return trees[0];
    }
    const first = trees[0];
    let delta = 0;
    trees.forEach(function (tree) {
        delta += tree.delta;
    });
    const children = mergeRangeTreeChildren(trees);
    return new RangeTree(first.start, first.end, delta, children);
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

// new RangeTreeWithParent

                parentIndex,
                tree: child
            });
        });
    });
    const queue = [];
    startToTrees.forEach(function (trees, startOffset) {
        queue.push({
            // new StartEvent
            offset: startOffset,
            trees
        });
    });
    queue.sort(function (aa, bb) {
        return aa.offset - bb.offset;
    });
    return new StartEventQueue(queue);
}

function StartEventQueue(queue) {
    this.queue = queue;
    this.nextIndex = 0;
    this.pendingOffset = 0;
    delete this.pendingTrees;
}

Object.assign(StartEventQueue.prototype, {
    next: function () {
        const pendingTrees = this.pendingTrees;
        const nextEvent = this.queue[this.nextIndex];
        if (pendingTrees === undefined) {
            this.nextIndex += 1;
            return nextEvent;
        } else if (nextEvent === undefined) {
            delete this.pendingTrees;
            return {
                // new StartEvent
                offset: this.pendingOffset,
                trees: pendingTrees
            };
        } else {
            if (this.pendingOffset < nextEvent.offset) {
                delete this.pendingTrees;
                return {
                    // new StartEvent
                    offset: this.pendingOffset,
                    trees: pendingTrees
                };
            } else {
                if (this.pendingOffset === nextEvent.offset) {
                    delete this.pendingTrees;
                    pendingTrees.forEach(function (tree) {
                        nextEvent.trees.push(tree);
                    });
                }
                this.nextIndex += 1;
                return nextEvent;
            }
        }
    },

    pushPendingTree: function (tree) {
        if (this.pendingTrees === undefined) {
            this.pendingTrees = [];
        }
        this.pendingTrees.push(tree);
    },

    setPendingOffset: function (offset) {
        this.pendingOffset = offset;
    }
});

function mergeRangeTreeChildren(parentTrees) {
    const result = [];
    const startEventQueue = startEventQueueFromParentTrees(parentTrees);
    const parentToNested = new Map();
    let openRange;
    while (true) {
        const event = startEventQueue.next();
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
            startEventQueue.setPendingOffset(openRangeEnd);
            openRange = {
                end: openRangeEnd,
                start: event.offset
            };
        } else {
            event.trees.forEach(function ({ parentIndex, tree }) { //jslint-quiet
                if (tree.end > openRange.end) {
                    const right = tree.split(openRange.end);
                    startEventQueue.pushPendingTree({

// new RangeTreeWithParent

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
                new RangeTree(openRange.start, openRange.end, 0, nested)
            );
        }
    });
    parentToNested.clear();
    return mergeRangeTrees(matchingTrees);
}
