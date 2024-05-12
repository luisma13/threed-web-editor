import JSZip from "jszip";
import { saveAs } from "file-saver";
import THREE from "three";
import { EditableObjectComponent } from "../components/editor/editable-object.component";
import { engine } from "../core/engine/engine";
import { GameObject } from "../core/gameobject";
import { loadGLB, loadFBX, loadObj, loadVRM } from "../loaders/modelsLoader";

export class SceneImporterExporter {

    exportScene(objects) {
        const zip = new JSZip();

        Promise.all(objects.map((obj, index) => {
            const { modelUrl, gameObject } = obj;

            const extension = modelUrl.split('.').pop();
            const modelName = `model${index}.${extension}`;

            return fetch(modelUrl).then(response => {
                return response.blob();
            }).then(blob => {
                zip.file(modelName, blob);

                const properties = {
                    name: gameObject.name,
                    modelName: modelName,
                    position: gameObject.position.toArray(),
                    rotation: gameObject.rotation.toArray(),
                    scale: gameObject.scale.toArray(),
                    components: gameObject.getComponents().map(comp => {
                        return { type: comp.constructor.name, name: comp.name, properties: comp};
                    })
                };

                zip.file(`model${index}.json`, JSON.stringify(properties, null, 2));

            }).catch(error => {
                console.error("Error loading model:", error);
            });
        })).then(() => {
            zip.generateAsync({ type: "blob" }).then(function (content) {
                saveAs(content, "scene.zip");
            });
        });
    }

    async importScene(file) {
        const zip = new JSZip();
        const content = await zip.loadAsync(file);
        Object.keys(content.files).forEach(async (fileName) => {
            if (fileName.endsWith('.json')) {
                const jsonContent = await content.files[fileName].async('string');
                const properties = JSON.parse(jsonContent);
                const modelFileName = properties.modelName;
                if (content.files[modelFileName]) {
                    const modelBlob = await content.files[modelFileName].async('blob');
                    const modelUrl = URL.createObjectURL(modelBlob);
                    const object = await this.loadModel(modelUrl, modelFileName);
                    this.applyProperties(object, properties);
                }
            }
        });
    }

    async loadModel(url, fileName) {
        const extension = "." + fileName.split('.').pop();
        const loaders = {
            ".gltf": loadGLB,
            ".fbx": loadFBX,
            ".obj": loadObj,
            ".vrm": async (url: string) => new GameObject((await loadVRM(url)).scene)
        }

        let gameObject = await loaders[extension](url);
        gameObject.name = 'Object_' + THREE.MathUtils.randInt(0, 1000);
        const editableObjectComponent = new EditableObjectComponent();
        gameObject.addComponent(editableObjectComponent);
        engine.addGameObjects(gameObject);
        return gameObject;
    }

    applyProperties(gameObject, properties) {
        gameObject.position.fromArray(properties.position);
        gameObject.rotation.fromArray(properties.rotation);
        gameObject.scale.fromArray(properties.scale);
        properties.components.forEach(comp => {
            
        });
    }

}
