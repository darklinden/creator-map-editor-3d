import { PathNode } from "./PathNode";
import { PathGrid } from "./PathGrid";
import { IMapPoint } from "./IMapPoint";
import { AStarSettings } from "./Settings";

/**
 * Backtrace according to the parent records and return the path.
 * (including both start and end nodes)
 */
export function backtrace(node: PathNode, inOut?: Array<IMapPoint>): Array<IMapPoint> {
    let path: Array<IMapPoint>;
    if (inOut) path = inOut;
    if (!path) path = [];
    path.length = 0;
    path.unshift(node.mapPoint);

    while (node.parent) {
        node = node.parent;
        path.unshift(node.mapPoint);
    }
    return path;
}

/**
 * Backtrace from start and end node, and return the path.
 * (including both start and end nodes)
 */
export function biBacktrace(nodeA: PathNode, nodeB: PathNode) {
    var pathA = backtrace(nodeA),
        pathB = backtrace(nodeB);
    return pathA.concat(pathB.reverse());
}

/**
 * Compute the length of the path.
 */
export function pathLength(path: Array<[number, number]>): number {
    var i, sum = 0, a, b, dx, dy;
    for (i = 1; i < path.length; ++i) {
        a = path[i - 1];
        b = path[i];
        dx = a[0] - b[0];
        dy = a[1] - b[1];
        sum += Math.sqrt(dx * dx + dy * dy);
    }
    return sum;
}

/**
 * Given the start and end coordinates, return all the coordinates lying
 * on the line formed by these coordinates, based on Bresenham's algorithm.
 * http://en.wikipedia.org/wiki/Bresenham's_line_algorithm#Simplification
 * @param {number} x0 Start x coordinate
 * @param {number} y0 Start y coordinate
 * @param {number} x1 End x coordinate
 * @param {number} y1 End y coordinate
 * @return {Array.<Array.<number>>} The coordinates on the line
 */
export function interpolate(x0: number, y0: number, x1: number, y1: number): Array<[number, number]> {
    const line: Array<[number, number]> = [];

    let sx, sy, dx, dy, err, e2: number;

    dx = Math.abs(x1 - x0);
    dy = Math.abs(y1 - y0);

    sx = (x0 < x1) ? 1 : -1;
    sy = (y0 < y1) ? 1 : -1;

    err = dx - dy;

    while (true) {
        line.push([x0, y0]);

        if (x0 === x1 && y0 === y1) {
            break;
        }

        e2 = 2 * err;
        if (e2 > -dy) {
            err = err - dy;
            x0 = x0 + sx;
        }
        if (e2 < dx) {
            err = err + dx;
            y0 = y0 + sy;
        }
    }

    return line;
}

/**
 * Given a compressed path, return a new path that has all the segments
 * in it interpolated.
 * @param {Array.<Array.<number>>} path The path
 * @return {Array.<Array.<number>>} expanded path
 */
export function expandPath(path: Array<[number, number]>): Array<[number, number]> {
    const expanded: Array<[number, number]> = [];
    let
        len = path.length,
        coord0, coord1,
        interpolated,
        interpolatedLen,
        i, j;

    if (len < 2) {
        return expanded;
    }

    for (i = 0; i < len - 1; ++i) {
        coord0 = path[i];
        coord1 = path[i + 1];

        interpolated = interpolate(coord0[0], coord0[1], coord1[0], coord1[1]);
        interpolatedLen = interpolated.length;
        for (j = 0; j < interpolatedLen - 1; ++j) {
            expanded.push(interpolated[j]);
        }
    }
    expanded.push(path[len - 1]);

    return expanded;
}

/**
 * Smoothen the give path.
 * The original path will not be modified; a new path will be returned.
 * @param {PF.Grid} grid
 * @param {Array.<Array.<number>>} path The path
 */
export function smoothenPath(grid: PathGrid, path: Array<[number, number]>): Array<[number, number]> {
    let len: number = path.length,
        x0: number = path[0][0],        // path start x
        y0: number = path[0][1],        // path start y
        x1: number = path[len - 1][0],  // path end x
        y1: number = path[len - 1][1],  // path end y
        sx: number, sy: number,                 // current start coordinate
        ex: number, ey: number,                 // current end coordinate
        i: number, j: number,
        coord: [number, number],
        line: Array<[number, number]>,
        testCoord: [number, number],
        blocked: boolean,
        lastValidCoord: [number, number];

    sx = x0;
    sy = y0;
    const newPath: Array<[number, number]> = [[sx, sy]];

    for (i = 2; i < len; ++i) {
        coord = path[i];
        ex = coord[0];
        ey = coord[1];
        line = interpolate(sx, sy, ex, ey);

        blocked = false;
        for (j = 1; j < line.length; ++j) {
            testCoord = line[j];

            if (!grid.isWalkableAt(testCoord[0], testCoord[1])) {
                blocked = true;
                break;
            }
        }
        if (blocked) {
            lastValidCoord = path[i - 1];
            newPath.push(lastValidCoord);
            sx = lastValidCoord[0];
            sy = lastValidCoord[1];
        }
    }
    newPath.push([x1, y1]);

    return newPath;
}

/**
 * Compress a path, remove redundant nodes without altering the shape
 * The original path is not modified
 * @param {Array.<Array.<number>>} path The path
 * @return {Array.<Array.<number>>} The compressed path
 */
export function compressPath(path: Array<[number, number]>): Array<[number, number]> {

    // nothing to compress
    if (path.length < 3) {
        return path;
    }

    var compressed: Array<[number, number]> = [],
        sx: number = path[0][0], // start x
        sy: number = path[0][1], // start y
        px: number = path[1][0], // second point x
        py: number = path[1][1], // second point y
        dx: number = px - sx, // direction between the two points
        dy: number = py - sy, // direction between the two points
        lx: number, ly: number,
        ldx: number, ldy: number,
        sq: number, i: number;

    // normalize the direction
    sq = Math.sqrt(dx * dx + dy * dy);
    dx /= sq;
    dy /= sq;

    // start the new path
    compressed.push([sx, sy]);

    for (i = 2; i < path.length; i++) {

        // store the last point
        lx = px;
        ly = py;

        // store the last direction
        ldx = dx;
        ldy = dy;

        // next point
        px = path[i][0];
        py = path[i][1];

        // next direction
        dx = px - lx;
        dy = py - ly;

        // normalize
        sq = Math.sqrt(dx * dx + dy * dy);
        dx /= sq;
        dy /= sq;

        // if the direction has changed, store the point
        if (dx !== ldx || dy !== ldy) {
            compressed.push([lx, ly]);
        }
    }

    // store the last point
    compressed.push([px, py]);

    return compressed;
}

export function bisection(nmin: number, nmax: number, count: number, x: number): number {
    const step = (nmax - nmin) / count;
    let low = 0; let high = count - 1;
    let mid: number;
    while (low < high) {
        mid = Math.floor((low + high) / 2);
        const pos = [nmin + mid * step, nmin + (mid + 1) * step];
        if (pos[0] < x && pos[1] >= x) {
            break;
        }
        else if (x <= pos[0]) {
            high = mid;
        }
        else {
            low = mid + 1;
        }
    }
    return low < mid ? mid : low;
}

export function positionToMapPoint(inOut: IMapPoint, width: number, height: number, scale: number): IMapPoint {

    const w_2 = scale * AStarSettings.size / 2;
    const h_2 = scale * AStarSettings.size / 2;

    const cx = bisection(-w_2, w_2, width, inOut.x);
    const cy = bisection(-h_2, h_2, height, inOut.z);

    inOut.cx = cx;
    inOut.cy = cy;
    return inOut;
}

export function mapPointToPosition(inOut: IMapPoint, width: number, height: number, scale: number): IMapPoint {

    const w = scale * AStarSettings.size;
    const h = scale * AStarSettings.size;

    const stepX = w / width;
    const stepY = h / height;

    inOut.x = -(w / 2) + inOut.cx * stepX + stepX / 2;
    inOut.z = -(h / 2) + inOut.cy * stepY + stepY / 2;
    inOut.y = 0;

    return inOut;
}
