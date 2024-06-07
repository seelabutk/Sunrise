import * as THREE from 'three'
import {
    TrackballControls
} from 'three/addons/controls/TrackballControls.js';

export class CameraControls {
    /** @type {Boolean} */
    enabled = false;

    /** @type {Element} */
    element = null;

    /** @type {THREE.Camera} */
    camera = null;

    constructor() {
        if (new.target === CameraControls) {
            throw new TypeError("Cannot build 'CameraControls' class directly as it is just an interface!");
        }
    }

    dir() {}
    update() {}
    set_zoom_speed(speed) {}
}

export class TrackballCameraControls extends CameraControls {
    /** @type {TrackballControls} */
    #controls = null;

    /** @type {TrackballControls} */
    #is_dragging = false;

    constructor(
        camera,
        element,
    ) {
        super();
        this.element = element;
        this.camera = camera;
        this.enabled = false;

        let scene = new THREE.Scene();
        this.#controls = new TrackballControls(this.camera, this.element, scene);
        this.#controls.rotateSpeed = 30.0;
        this.#controls.zoomSpeed = 1.5;
        this.#controls.noZoom = false;
        this.#controls.noPan = true; // we do not want pannning
        this.#controls.staticMoving = true;
        this.#controls.maxDistance = (6371 + 10000);
        this.#controls.minDistance = (6371 + 10);
        this.#controls.dynamicDampingFactor = 0.3;
        // this.#controls.enabled = false;
        
        this.#setup_listeners();
    }

    #setup_listeners() {
//        this.element.addEventListener('mousedown', () => {
//            this.#is_dragging = true;
//            this.update();
//        });
//        this.element.addEventListener('mousemove', () => {
//            this.update();
//        });
//        this.element.addEventListener('mouseup', () => {
//            this.#is_dragging = false;
//            this.update();
//        });
//        this.element.addEventListener('wheel', () => {
//            this.update();
//        });
    }
    
    /**
        * @description Set the maxDistance and minDistance properties of the THREE.js trackball controls
        * @param {Number} max The maxDistance
        * @param {Number} min The minDistance
    */
    set_bounds(max, min) {
        this.#controls.maxDistance = max;
        this.#controls.minDistance = min;
        return this;
    }

    /**
        * @description Set the speed at which these controls can zoom
        * @param {Number} speed The speed at which we will allow the controls to zoom
    */
    set_zoom_speed(speed) {
        this.#controls.zoomSpeed = speed;
        return this;
    }

    /**
        * @description Enable the controls
    */
    enable() {
        this.#controls.enabled = true;
        return this;
    }

    /**
        * @description Disable the controls
    */
    disable() {
        this.#controls.enabled = false;
        return this;
    }

    /**
        * @description Update the THREE.js TrackballControls
    */
    update() {
        if (this.#controls.enabled) {
            this.#controls.update();
            this.#update_rotation_speed();
        }
        return this;
    }

    /**
        * @description Get the direction that these controls are facing
    */
    dir() {
        return new THREE.Vector3(
            this.camera.position.x,
            this.camera.position.y,
            this.camera.position.z,
        );
    }

    #update_rotation_speed() {
        const maxSpeed = 30.0;
        const minSpeed = 0.01;
        const maxZoomSpeed = 1.5;
        const minZoomSpeed = 0.4;
        const maxZoomDist = this.#controls.maxDistance;
        const minZoomDist = this.#controls.minDistance;

        const dist = this.camera.position.distanceTo(this.#controls.target);
        const rotateSpeed = THREE.MathUtils.mapLinear(
            dist,
            minZoomDist,
            maxZoomDist,
            minSpeed,
            maxSpeed,
        );
        const zoomSpeed = THREE.MathUtils.mapLinear(
            dist,
            minZoomDist,
            maxZoomDist,
            minZoomSpeed,
            maxZoomSpeed,
        );
        this.#controls.rotateSpeed = rotateSpeed;
        this.#controls.zoomSpeed = zoomSpeed;
    }
}

export class PanningCameraControls extends CameraControls {
    /** @type {Number} */
    #sensitivity = 0.002;

    /** @type {Boolean} */
    #is_dragging = false;

    /** @type {Object} */
    #prev_mouse_position = null;

    /** @type {Boolean} */
    #should_update = false;

    constructor (
        camera,
        element,
        sensitivity,
    ) {
        super();
        this.camera = camera;
        this.element = element;
        this.#sensitivity = sensitivity;

        this.#setup_listeners();
    }

    update() {
        this.#should_update = true;
    }

    dir() {
        let dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        return dir;
    }

    #setup_listeners() {
        this.element.addEventListener('mousedown', (e) => {
            this.#is_dragging = true;
            this.#prev_mouse_position = {
                x: e.offsetX,
                y: e.offsetY,
            };
        });
        
        this.element.addEventListener('mouseup', (e) => {
            this.#is_dragging = false;
        });

        this.element.addEventListener('mousemove', (e) => {
            if (this.#should_update && this.#is_dragging) {
                const delta = {
                    x: e.offsetX - this.#prev_mouse_position.x,
                    y: e.offsetY - this.#prev_mouse_position.y,
                };

                this.camera.rotateX(-delta.y * this.#sensitivity);
                this.camera.rotateY(delta.x * this.#sensitivity);

                this.#prev_mouse_position = {
                    x: e.offsetX,
                    y: e.offsetY,
                };
                
                this.#should_update = false;
            }
        });
    }
}
