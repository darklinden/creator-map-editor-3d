import { DiagonalMovement } from "./DiagonalMovement";
import { Heuristic } from "./Heuristic";

/**
 * IAStarOpt
 * @param {DiagonalMovement} opt.diagonalMovement Allowed diagonal movement.
 * @param {function} opt.heuristic Heuristic function to estimate the distance (defaults to manhattan).
 * @param {integer} opt.weight Weight to apply to the heuristic to allow for suboptimal paths,
 */

export interface IAStarOpt {
    diagonalMovement: DiagonalMovement;
    heuristic: (dx: number, dy: number) => number;
    weight: number;
    size: number;
    loopPerFrame: number;
    weightCorrection: boolean;
}

export const AStarSettings: IAStarOpt = {
    diagonalMovement: DiagonalMovement.Always,
    heuristic: Heuristic.manhattan,
    weight: 1,
    size: 10,
    loopPerFrame: 100,
    weightCorrection: true
}

// When diagonal movement is allowed the manhattan heuristic is not admissible
// It should be octile instead
// if (this.diagonalMovement === DiagonalMovement.Never) {
//     this.heuristic = opt.heuristic || Heuristic.manhattan;
// } else {
//     this.heuristic = opt.heuristic || Heuristic.octile;
// }