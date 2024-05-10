import { CubeTextureLoader, Texture } from "three";

export async function loadDefaultSkybox(): Promise<Texture> {
    return loadSkybox([
        "assets/skybox/cubemap/universe/0.webp",
        "assets/skybox/cubemap/universe/1.webp",
        "assets/skybox/cubemap/universe/2.webp",
        "assets/skybox/cubemap/universe/3.webp",
        "assets/skybox/cubemap/universe/4.webp",
        "assets/skybox/cubemap/universe/5.webp",
    ]);
}

export async function loadSkybox(imgPath: string[]) {
    const loader = new CubeTextureLoader();
    const texture = loader.loadAsync([imgPath[0], imgPath[1], imgPath[2], imgPath[3], imgPath[4], imgPath[5]]);
    return texture;
}
