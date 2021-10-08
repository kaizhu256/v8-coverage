import { RangeCov } from "./types.js";
interface ReadonlyRangeTree {
    readonly start: number;
    readonly end: number;
    readonly count: number;
    readonly children: ReadonlyRangeTree[];
}
export declare function emitForest(trees: ReadonlyArray<ReadonlyRangeTree>): string;
export declare function emitForestLines(trees: ReadonlyArray<ReadonlyRangeTree>): string[];
export declare function parseFunctionRanges(text: string, offsetMap: Map<number, number>): RangeCov[];
/**
 * Parses a line of offsets to a map from ascii offsets to coverage offsets:
 *
 * ```
 * const text = "10  42  1337";
 * const parsed = parseOffsets(text);
 * const expected = new Map([
 *   [0, 10],
 *   [4, 42],
 *   [8, 1337],
 * ]);
 * // `parsed` has the same content as `expected`
 * ```
 *
 * @param text Line to parse
 */
export declare function parseOffsets(text: string): Map<number, number>;
export {};
