import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { engine } from "../core/engine/engine";

const rgbLoader = new RGBELoader();

export async function loadDefaultEquirectangularHDR() {
    const url = "assets/hdrs/sky.hdr";
    return loadEquirectangularHDR(url);
}

export async function loadEquirectangularHDR(url) {
    rgbLoader.load(url, (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        engine.scene.background = texture;
        engine.scene.environment = texture;
        console.log("HDR loaded");
    });
}
