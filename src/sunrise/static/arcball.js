import * as THREE from 'three'
import { ArcballControls } from 'three/addons/controls/ArcballControls.js';

export class Arcball {
    constructor(field) {
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        let elem = document.body.appendChild( this.renderer.domElement );
        elem.style.zIndex = 100000;
        elem.style.opacity = 0.001;
        elem.width = field.width;
        elem.height = field.height;
        elem.style.position = "absolute";
        elem.style.top = 0;
        elem.style.left = 0;

        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );

        this.controls = new ArcballControls( this.camera, this.renderer.domElement, this.scene );

        this.controls.addEventListener( 'change', this.render.bind(this));

        this.camera.position.set( 10, 20, 100 );
    }

    render() {
        this.renderer.render( this.scene, this.camera );
        // this.controls.update();
    }

    animate() {
        this.renderer.render(this.scene, this.camera);
        this.controls.update();
        requestAnimationFrame(this.animate.bind(this));
    }

    update(x, y) {
        this.camera.position.set( x, y, 100 );
        this.position.x = x;
        this.position.y = y;
        // this.position.z = 100;
        this.controls.update();
    }
};
