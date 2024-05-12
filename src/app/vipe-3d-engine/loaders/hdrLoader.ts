import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { engine } from "../core/engine/engine";

export async function loadDefaultEquirectangularHDR() {
    const url = "assets/skybox/hdr/sky.hdr";
    return loadEquirectangularHDR(url);
}

export async function loadEquirectangularHDR(url) {
    const texture = await new RGBELoader().loadAsync(url);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    engine.scene.background = texture;
    engine.scene.environment = texture;
}
