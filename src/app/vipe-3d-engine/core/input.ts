import * as THREE from "three";

export class EngineInput {

    static mouse = new THREE.Vector2(0, 0);
    static mouseWheel = 0;
    static mouseLeftDown = false;
    static mouseRightDown = false;
    static mouseMiddleDown = false;
    static keys = new Map<string, boolean>();
    static keysDown = new Map<string, boolean>();
    static keysUp= new Map<string, boolean>();
    static controlLeft = false;
    static shiftLeft = false;
    static controlRight = false;
    static shiftRight = false;

    static init() {
        window.addEventListener("keydown", this.keydown);
        window.addEventListener("keyup", this.keyup);
        window.addEventListener("mousemove", this.mousemove);
        window.addEventListener("wheel", this.wheel);
        window.addEventListener("mousedown", this.mousedown);
        window.addEventListener("mouseup", this.mouseup);
        window.addEventListener("contextmenu", (event) => event.preventDefault());
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
        this.controlLeft = event.ctrlKey;
        this.shiftLeft = event.shiftKey;
        this.controlRight = event.ctrlKey;
        this.shiftRight = event.shiftKey;

        // save letters only in lowercase
        if (event.key.length === 1 && event.key.match(/[a-z]/i)) {
            this.keys.set(event.key.toLowerCase(), true);
            this.keysDown.set(event.key.toLowerCase(), true);
            this.keysUp.set(event.key.toLowerCase(), false);
        } else {
            this.keys.set(event.key, true);
            this.keysDown.set(event.key, true);
            this.keysUp.set(event.key, false);
        }
    }

    private static readonly keyup = (event) => {
        // save letters only in lowercase
        if (event.key.length === 1 && event.key.match(/[a-z]/i)) {
            this.keys.set(event.key.toLowerCase(), false);
            this.keysDown.set(event.key.toLowerCase(), false);
            this.keysUp.set(event.key.toLowerCase(), true);
        } else {
            this.keys.set(event.key, false);
            this.keysDown.set(event.key, false);
            this.keysUp.set(event.key, true);
        }
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