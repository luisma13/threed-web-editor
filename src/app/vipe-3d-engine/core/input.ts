import * as THREE from "three";

export class EngineInput {

    static mouse = new THREE.Vector2(0, 0);
    static mouseWheel = 0;
    static mouseLeftDown = false;
    static mouseRightDown = false;
    static mouseMiddleDown = false;
    static keys = new Map<string, boolean>();
    static keysPressed = new Map<string, boolean>();
    static keysReleased = new Map<string, boolean>();

    static init() {
        window.addEventListener("keydown", this.keydown);
        window.addEventListener("keyup", this.keyup);
        window.addEventListener("mousemove", this.mousemove);
        window.addEventListener("wheel", this.wheel);
        window.addEventListener("mousedown", this.mousedown);
        window.addEventListener("mouseup", this.mouseup);
    }

    static destroy() {
        window.removeEventListener("keydown", this.keydown);
        window.removeEventListener("keyup", this.keyup);
        window.removeEventListener("mousemove", this.mousemove);
        window.removeEventListener("wheel", this.wheel);
        window.removeEventListener("mousedown", this.mousedown);
        window.removeEventListener("mouseup", this.mouseup);
    }

    private static readonly keydown = (event) => {
        this.keys.set(event.key, true);
        this.keysPressed.set(event.key, true);
    }

    private static readonly keyup = (event) => {
        this.keys.set(event.key, false);
        this.keysReleased.set(event.key, true);
    }

    private static readonly mousemove = (event) => {
        this.mouse.x = event.clientX;
        this.mouse.y = event.clientY;
    }

    static wheelEventEndTimeout = null;
    private static readonly wheel = (event) => {
        this.mouseWheel = event.deltaY;
        clearTimeout(this.wheelEventEndTimeout);
        this.wheelEventEndTimeout = setTimeout(() => {
            this.mouseWheel = 0;
        }, 100);
    }

    private static readonly mousedown = (event) => {
        switch (event.button) {
            case 0:
                this.mouseLeftDown = true;
                break;
            case 1:
                this.mouseMiddleDown = true;
                break;
            case 2:
                this.mouseRightDown = true;
                break;
        }
    }

    private static readonly mouseup = (event) => {
        switch (event.button) {
            case 0:
                this.mouseLeftDown = false;
                break;
            case 1:
                this.mouseMiddleDown = false;
                break;
            case 2:
                this.mouseRightDown = false;
                break;
        }
    }

}