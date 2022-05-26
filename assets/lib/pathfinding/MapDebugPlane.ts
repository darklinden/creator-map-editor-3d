import { _decorator, Component, Texture2D, ImageAsset, __private, RenderTexture, MeshRenderer, Material, IVec3Like, Primitive, EffectAsset } from 'cc';
import { IMapData } from './IMapData';
const { ccclass, property } = _decorator;

type IMemoryImageSource = __private._cocos_core_assets_image_asset__IMemoryImageSource
const RGBA8888 = RenderTexture.PixelFormat.RGBA8888;

@ccclass
export class MapDebugPlane extends Component {

    private _debugMesh: MeshRenderer = null;
    public refreshDebugPlane(mapData: IMapData) {

        if (!this._debugMesh) {
            let mr = this.getComponent(MeshRenderer) || this.addComponent(MeshRenderer);
            mr.mesh = new Primitive(Primitive.PrimitiveType.PLANE);
            this._debugMesh = mr;
        }

        this._debugMesh.node.setScale(mapData.scale, mapData.scale, mapData.scale);

        this.scheduleOnce(() => {
            const newTexture = new Texture2D();
            let data: IMemoryImageSource = {
                _data: null,
                _compressed: false,
                width: mapData.width,
                height: mapData.height,
                format: RGBA8888
            }

            let buff = new Uint8Array(data.width * data.height * 4);

            for (let i = 0; i < data.width; i++) {
                for (let n = 0; n < data.height; n++) {
                    let x: number;
                    if (mapData.matrix[i][n]) {
                        x = 0;
                    }
                    else {
                        // walkable
                        x = i % 2 == n % 2 ? 160 : 200;
                    }

                    // R
                    buff[i * data.width * 4 + n * 4 + 0] = x;
                    // G
                    buff[i * data.width * 4 + n * 4 + 1] = x;
                    // B
                    buff[i * data.width * 4 + n * 4 + 2] = x;
                    // A
                    buff[i * data.width * 4 + n * 4 + 3] = 160;
                }
            }

            data._data = buff;

            const image = new ImageAsset(data);
            newTexture.mipmaps = [image];
            newTexture.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);

            const mat: Material = new Material();
            mat.initialize({ effectName: 'builtin-unlit', technique: 1, defines: { USE_TEXTURE: true } });
            mat.setProperty('mainTexture', newTexture);

            this._debugMesh.setMaterial(mat, 0);
        });
    }
}
