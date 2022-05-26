import { IVec3Like } from 'cc';

export enum MapPointType {
    PointOnly,
    VecOnly,
    Full
}

export interface IMapPoint extends IVec3Like {

    type: MapPointType;

    // vec3
    x: number;
    y: number;
    z: number;

    // map cell
    cx: number;
    cy: number;
}
