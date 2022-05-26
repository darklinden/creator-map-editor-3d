import { DiagonalMovement } from "./DiagonalMovement";
import { PathNode } from "./PathNode";

/**
 * The Grid class, which serves as the encapsulation of the layout of the nodes.
 */

export class PathGrid {

    public width: number;
    public height: number;
    public nodes: PathNode[][];

    /**
     * The Grid class, which serves as the encapsulation of the layout of the nodes.
     * @constructor
     * @param {number|Array.<Array.<(number|boolean)>>} width_or_matrix Number of columns of the grid, or matrix
     * @param {number} height Number of rows of the grid.
     * @param {Array.<Array.<(number|boolean)>>} [matrix] - A 0-1 matrix
     *     representing the walkable status of the nodes(0 or false for walkable).
     *     If the matrix is not supplied, all the nodes will be walkable.
     */
    constructor(width_or_matrix: number | Array<Array<(number | boolean)>>, height: number, matrix: Array<Array<(number | boolean)>> | null) {
        let width: number;

        if (typeof width_or_matrix !== 'object') {
            width = width_or_matrix;
        } else {
            height = width_or_matrix.length;
            width = width_or_matrix[0].length;
            matrix = width_or_matrix;
        }

        this.width = width;
        this.height = height;
        this.nodes = this._buildNodes(width, height, matrix);
    }

    clearCalc() {
        for (let i = 0; i < this.height; ++i) {
            this.nodes[i] = this.nodes[i] || new Array(this.width);
            for (let j = 0; j < this.width; ++j) {
                this.nodes[i][j] && this.nodes[i][j].clear();
            }
        }
    }

    /**
     * Build and return the nodes.
     * @private
     * @param {number} width
     * @param {number} height
     * @param {Array.<Array.<number|boolean>>} [matrix] - A 0-1 matrix representing the walkable status of the nodes.
     * @see PathGrid
     */
    _buildNodes(width: number, height: number, matrix: Array<Array<number | boolean>> | null): PathNode[][] {
        let i, j, nodes = new Array(height);

        for (i = 0; i < height; ++i) {
            nodes[i] = new Array(width);
            for (j = 0; j < width; ++j) {
                nodes[i][j] = new PathNode(j, i);
            }
        }

        if (!matrix) {
            return nodes;
        }

        if (matrix.length !== height || matrix[0].length !== width) {
            throw new Error('Matrix size does not fit');
        }

        for (i = 0; i < height; ++i) {
            for (j = 0; j < width; ++j) {
                if (matrix[i][j]) {
                    // 0, false, null will be walkable
                    // while others will be un-walkable
                    nodes[i][j].walkable = false;
                }
            }
        }

        return nodes;
    }

    public getNodeAt(x: number, y: number) {
        return this.nodes[y][x];
    }

    /**
     * Determine whether the node at the given position is walkable.
     * (Also returns false if the position is outside the grid.)
     */
    public isWalkableAt(x: number, y: number): boolean {
        return this.isInside(x, y) && this.nodes[y][x].walkable;
    }

    /**
     * Determine whether the position is inside the grid.
     * XXX: `grid.isInside(x, y)` is wierd to read.
     * It should be `(x, y) is inside grid`, but I failed to find a better name for this method.
     */
    public isInside(x: number, y: number): boolean {
        return (x >= 0 && x < this.width) && (y >= 0 && y < this.height);
    }

    /**
     * Set whether the node on the given position is walkable.
     * NOTE: throws exception if the coordinate is not inside the grid.
     */
    public setWalkableAt(x: number, y: number, walkable: boolean): void {
        this.nodes[y][x].walkable = walkable;
    }

    /**
     * Get the neighbors of the given node.
     *
     *     offsets      diagonalOffsets:
     *  +---+---+---+    +---+---+---+
     *  |   | 0 |   |    | 0 |   | 1 |
     *  +---+---+---+    +---+---+---+
     *  | 3 |   | 1 |    |   |   |   |
     *  +---+---+---+    +---+---+---+
     *  |   | 2 |   |    | 3 |   | 2 |
     *  +---+---+---+    +---+---+---+
     *
     *  When allowDiagonal is true, if offsets[i] is valid, then
     *  diagonalOffsets[i] and
     *  diagonalOffsets[(i + 1) % 4] is valid.
     */
    public getNeighbors(node: PathNode, diagonalMovement: DiagonalMovement): PathNode[] {
        let x = node.x, y = node.y, neighbors = [], s0 = false, d0 = false, s1 = false, d1 = false, s2 = false, d2 = false, s3 = false, d3 = false, nodes = this.nodes;

        // ↑
        if (this.isWalkableAt(x, y - 1)) {
            neighbors.push(nodes[y - 1][x]);
            s0 = true;
        }
        // →
        if (this.isWalkableAt(x + 1, y)) {
            neighbors.push(nodes[y][x + 1]);
            s1 = true;
        }
        // ↓
        if (this.isWalkableAt(x, y + 1)) {
            neighbors.push(nodes[y + 1][x]);
            s2 = true;
        }
        // ←
        if (this.isWalkableAt(x - 1, y)) {
            neighbors.push(nodes[y][x - 1]);
            s3 = true;
        }

        if (diagonalMovement === DiagonalMovement.Never) {
            return neighbors;
        }

        if (diagonalMovement === DiagonalMovement.OnlyWhenNoObstacles) {
            d0 = s3 && s0;
            d1 = s0 && s1;
            d2 = s1 && s2;
            d3 = s2 && s3;
        } else if (diagonalMovement === DiagonalMovement.IfAtMostOneObstacle) {
            d0 = s3 || s0;
            d1 = s0 || s1;
            d2 = s1 || s2;
            d3 = s2 || s3;
        } else if (diagonalMovement === DiagonalMovement.Always) {
            d0 = true;
            d1 = true;
            d2 = true;
            d3 = true;
        } else {
            throw new Error('Incorrect value of diagonalMovement');
        }

        // ↖
        if (d0 && this.isWalkableAt(x - 1, y - 1)) {
            neighbors.push(nodes[y - 1][x - 1]);
        }
        // ↗
        if (d1 && this.isWalkableAt(x + 1, y - 1)) {
            neighbors.push(nodes[y - 1][x + 1]);
        }
        // ↘
        if (d2 && this.isWalkableAt(x + 1, y + 1)) {
            neighbors.push(nodes[y + 1][x + 1]);
        }
        // ↙
        if (d3 && this.isWalkableAt(x - 1, y + 1)) {
            neighbors.push(nodes[y + 1][x - 1]);
        }

        return neighbors;
    }

    /**
     * Get a clone of this grid.
     */
    public clone(): PathGrid {
        const newGrid = new PathGrid(this.width, this.height, null);

        for (let i = 0; i < this.height; ++i) {
            for (let j = 0; j < this.width; ++j) {
                newGrid.nodes[i][j].walkable = this.nodes[i][j].walkable;
            }
        }

        return newGrid;
    }

    /**
     * Get a string map
     */
    public toString(start: [number, number] | null = null, end: [number, number] | null = null, road: Array<[number, number]> | null = null): string {
        let map = road && road.length ? 'map:\n' : 'map no road:\n';
        for (let i = 0; i < this.height; ++i) {
            for (let j = 0; j < this.width; ++j) {
                if (start && j == start[0] && i == start[1]) {
                    map += 'S, ';
                }
                else if (end && j == end[0] && i == end[1]) {
                    map += 'E, ';
                }
                else if (road && this.nodes[i][j].walkable && road.findIndex(e => e[0] == j && e[1] == i) != -1) {
                    map += 'R, ';
                }
                else {
                    map += this.nodes[i][j].walkable ? '1, ' : '0, ';
                }
            }
            map += '\n';
        }
        return map;
    }

    /**
     * Get a string map
     */
    public toColorString(start: [number, number] | null = null, end: [number, number] | null = null, road: Array<[number, number]> | null = null): string {

        const Reset = "\x1b[0m";
        const Red = "\x1b[31m";
        const Green = "\x1b[32m";
        const Yellow = "\x1b[33m";
        const Blue = "\x1b[34m";

        let map = 'map:\n';
        for (let i = 0; i < this.height; ++i) {
            for (let j = 0; j < this.width; ++j) {
                if (start && j == start[0] && i == start[1]) {
                    map += Red + 'S, ' + Reset;
                }
                else if (end && j == end[0] && i == end[1]) {
                    map += Blue + 'E, ' + Reset;
                }
                else if (road && this.nodes[i][j].walkable && road.findIndex(e => e[0] == j && e[1] == i) != -1) {
                    map += Green + 'R, ' + Reset;
                }
                else {
                    map += this.nodes[i][j].walkable ? '1, ' : '0, ';
                }
            }
            map += '\n';
        }
        return map;
    }
}
