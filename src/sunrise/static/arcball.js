import * as THREE from 'three'
import { ArcballControls } from 'three/addons/controls/ArcballControls.js';

export class Arcball {
    constructor(field, x, y, z) {
        this.renderer = new THREE.WebGLRenderer();
        // this.renderer.setSize( window.innerWidth, window.outerWidth );
        this.renderer.setSize( field.offsetWidth, field.offsetHeight );
        // console.log(`W: ${field.offsetWidth}, H: ${field.offsetHeight}`);
        // field.appendChild( this.renderer.domElement );
        let elem = field.appendChild( this.renderer.domElement );
        // let elem = document.body.appendChild( this.renderer.domElement );
        elem.style.zIndex = 100000;
        elem.style.opacity = 0.2;
        elem.width = field.offsetWidth;
        elem.height = field.offsetHeight;
        elem.style.position = "absolute";
        elem.style.top = 0;
        elem.style.left = 0;
        // elem.style.background = "green";

        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera( 45, field.offsetWidth / field.offsetHeight, 1, 10000 );
        // this.camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );

        this.controls = new ArcballControls( this.camera, this.renderer.domElement, this.scene );

        this.controls.addEventListener( 'change', this.render.bind(this));

        this.controls.target.x = this.camera.position.x;
        this.controls.target.y = this.camera.position.y;
        this.controls.target.z = this.camera.position.z;

        // this.camera.up = new THREE.Vector3(0.0, 1.0, 0.0);
        // this.camera.up.set(0.0, 1.0, 0.0);

        this.camera.position.set(x, y, z);

        this.controls.update();
    }

    render() {
        this.renderer.render( this.scene, this.camera );
    }

    /* Set the position of the camera
       eventually this will be a smooth transition */
    setPosition(x, y, z) {
        this.camera.position.set(x, y, z);
        this.controls.update();
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
