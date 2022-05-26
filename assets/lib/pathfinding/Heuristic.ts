
export const F: number = Math.SQRT2 - 1;

export class Heuristic {

    /**
       * Manhattan distance.
       */
    public static manhattan(dx: number, dy: number): number {
        return dx + dy;
    }

    /**
     * Euclidean distance.
     */
    public static euclidean(dx: number, dy: number): number {
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Octile distance.
     */
    public static octile(dx: number, dy: number): number {
        return (dx < dy) ? F * dx + dy : F * dy + dx;
    }

    /**
     * Chebyshev distance.
     */
    public static chebyshev(dx: number, dy: number): number {
        return Math.max(dx, dy);
    }
}
