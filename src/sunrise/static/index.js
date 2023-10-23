import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { FlyControls } from 'three/addons/controls/FlyControls.js';
import { EnvironmentMesh } from './EnvironmentMesh.js';
import * as d3 from 'd3';

const textureLoader = new THREE.TextureLoader();

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.autoClear = false;  // phone AR clears the screen implicitly
renderer.xr.enabled = true;

const arButton = ARButton.createButton(renderer);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x505050);

const fov = (
    // XXX(th): I think I got this for my specific Pixel 4 phone, but I may have
    // gotten the value experimentally.
    77
);
const { x: width, y: height } = renderer.getSize(new THREE.Vector2());
const aspect = width / height;
const near = 0.1;
const far = 100.0;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.set(0.0, 0.0, 0.0);
camera.up.set(0.0, 1.0, 0.0);
camera.lookAt(1.0, 0.0, 0.0);

const background = new Background();
scene.add(background.mesh);

const axesHelper = new THREE.AxesHelper( 5 );
scene.add( axesHelper );

const controls = new FlyControls(camera, renderer.domElement);
controls.rollSpeed = Math.PI / 12;

const clock = new THREE.Clock();
document.body.appendChild(arButton);
document.body.appendChild(renderer.domElement);
renderer.setAnimationLoop(function() {
    const delta = clock.getDelta();
    controls.update(delta);
    renderer.render(scene, camera);
});

// const session = await new OnSession(renderer).promise;
// const controller = renderer.xr.getController(0);
const controller = null;

// await new OnPress(controller, renderer.domElement).promise;
// const first = new THREE.Vector3().copy(camera.position);
const first = new THREE.Vector3().copy(
    {x: 1.0, y: -1.0, z: 0.0}
)
console.log(first);

// await new OnPress(controller, renderer.domElement).promise;
// const second = new THREE.Vector3().copy(camera.position);
const second = new THREE.Vector3().copy(
    {x: -1.0, y: 1.0, z: 1.0}
)
console.log(second);

if (!(first.x > second.x)) console.error('x', first.x, second.x);
if (!(first.y < second.y)) console.error('y', first.y, second.y);
if (!(first.z > second.z)) console.error('z', first.z, second.z);

const Xmin = Math.min(first.x, second.x);
const Xmax = Math.max(first.x, second.x);
const Ymin = Math.min(first.y, second.y);
const Ymax = Math.max(first.y, second.y);
const Zmin = Math.min(first.z, second.z);
const Zmax = Math.max(first.z, second.z);

const foreground = new Foreground();
scene.add(foreground.mesh);

for (;;) {
    // await new OnPress(controller).promise;
    let { x, y, z } = camera.position;

    x = (x - Xmin) / (Xmax - Xmin);
    y = (y - Ymin) / (Ymax - Ymin);
    z = (z - Zmin) / (Zmax - Zmin);

    // x = -x;
    // z = -z;

    // x = x / 100;
    // y = y / 100;
    // z = z / 100;

    const position = [x, y, z];
    const up = [0.0, 1.0, 0.0];
    const direction = [1.0, 0.0, 0.0];

    const params = new URLSearchParams();
    params.set('position', `${position}`);
    params.set('up', `${up}`);
    params.set('direction', `${direction}`);
    const url = `api/v1/view/?${params}`;
    const map = await new Promise((resolve) => {
        textureLoader.load(url, resolve);
    });
    foreground.mesh.material.map = map;
    foreground.mesh.material.needsUpdate = true;

    foreground.mesh.position.copy(camera.position);
}


function OnSession(renderer) {
    renderer.xr.addEventListener('sessionstart', onsessionstart, true);

    let resolve;
    const promise = new Promise((res) => {
        resolve = res;
    });

    return Object.assign(this || {}, {
        promise,
    });

    function onsessionstart() {
        resolve(renderer.xr.getSession());
    }
} // function OnSession

function OnPress(controller, domElement) {
    let timeout;
    let resolve;
    const promise = new Promise((res) => {
        resolve = res;
    });

    domElement.addEventListener('pointerdown', onpointerdown, true);
    domElement.addEventListener('pointerup', onpointerup, true);
    if (controller) {
        controller.addEventListener('selectstart', onselectstart, true);
        controller.addEventListener('selectend', onselectend, true);
    }

    return Object.assign(this || {}, {
        promise,
    });

    function onpointerdown() { return onstart(); }
    function onselectstart() { return onstart(); }

    function onstart() {
        timeout = setTimeout(ontimeout, 500);
    }

    function onpointerup() { return onend(); }
    function onselectend() { return onend(); }

    function onend() {
        timeout = clearTimeout(timeout), null;
    }

    function ontimeout() {
        resolve();
    }
} // function OnPress


function Background() {
    const url = 'static/HDR_111_Parking_Lot_2_Bg.jpg';
    const map = textureLoader.load(url);
    const radius = 100.0;
    const mesh = EnvironmentMesh(map, radius);
    return Object.assign(this || {}, {
        mesh,
    });
} // function Background

function Foreground() {
    const position = [0.5, 0.5, 2.0];
    const up = [0.0, 1.0, 0.0];
    const direction = [1.0, 0.0, 0.0];
    const params = new URLSearchParams();
    params.set('position', `${position}`);
    params.set('up', `${up}`);
    params.set('direction', `${direction}`);
    const url = `api/v1/view/?${params}`;
    const map = textureLoader.load(url);
    const radius = 3.0;
    const mesh = EnvironmentMesh(map, radius);

    return Object.assign(this || {}, {
        mesh,
    });

    function update() {
    }
} // function Foreground