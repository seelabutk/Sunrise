import * as THREE from 'three'
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';

export class FlippedYTrackballControls extends THREE.TrackballControls {
    constructor(camera, domElement) {
        super(camera, domElement);
    }

    handleMouseMoveRotate(event) {
        // Flipping Y direction here
        if (this.rotateEnabled === false) return;
        
        this.rotateEnd.set(event.clientX, event.clientY);

        this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart);

        // Different from original TrackballControls: Flip the y component of delta
        this.rotateDelta.y *= -1;

        this.rotateLeft(2 * Math.PI * this.rotateDelta.x / this.domElement.clientHeight * this.rotateSpeed);
        this.rotateUp(2 * Math.PI * this.rotateDelta.y / this.domElement.clientHeight * this.rotateSpeed);

        this.rotateStart.copy(this.rotateEnd);

        this.update();
    }
}

