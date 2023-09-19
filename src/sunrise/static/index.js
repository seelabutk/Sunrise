import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { ReverseTrackball } from './static/ReverseTrackball.js';
import { RecenterControls } from './static/RecenterControls.js';
import { EnvironmentMesh } from './static/EnvironmentMesh.js';
import history from './static/history.js';

const renderer = do {
    const alpha = true;
    const antialias = true;
    new THREE.WebGLRenderer({ alpha, antialias });
};
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.autoClear = false;
renderer.xr.enabled = true;
renderer.setAnimationLoop(render);
document.body.appendChild(renderer.domElement);

{
    const button = ARButton.createButton(renderer);
    document.body.appendChild(button);
};

const scene = do {
    new THREE.Scene();
};
scene.background = new THREE.Color(0x505050);

const camera = do {
    const fov = 77;
    const aspect = do {
        const { x: width, y: height } = renderer.getSize(new THREE.Vector2());
        width / height;
    };
    const near = 0.1;
    const far = 100.0;
    new THREE.PerspectiveCamera(fov, aspect, near, far);
};
camera.position.set(0.0, 0.0, 0.0);
camera.up.set(0.0, 1.0, 0.0);
camera.lookAt(1.0, 0.0, 0.0);

const textureLoader = do {
    new THREE.TextureLoader();
};

// const motion = do {
//     function makeNormalControl() {
//     }
// 
//     function makeExtendedControl() {
//     }
// 
//     new MotionControls(renderer);
// };
// 
// function MotionControls(renderer) {
//     renderer.xr.addEventListener('sessionstart', onsessionstart);
//     renderer.xr.addEventListener('sessionend', onsessionend);
// 
//     return Object.assign(this, {
//         dispose,
//         update,
//     });
// 
//     //--- Instance Methods
// 
//     function dispose() {
//         ondispose();
//     }
// 
//     function update() {
// 
//     }
// 
//     //--- Private Methods
// 
//     function makeNormalControl() {
//         const trackball = do {
//             const camera_ = do {
//                 camera.clone();
//             };
//             camera_.position.set(1.0, 0.0, 0.0);
//             camera_.up.set(0.0, -1.0, 0.0);
//             const domElement = renderer.domElement;
//             new TrackballControls(camera_, domElement);
//         };
//         trackball.target.set(0.0, 0.0, 0.0);
//         return trackball;
//     }
// 
//     function makeXRControl() {
//         const recenter = do {
//             new RecenterCameraControls(renderer);
//         };
//         return recenter;
//     }
// 
//     //--- Event Listeners
// 
//     function ondispose() {
//         renderer.xr.removeEventListener('sessionstart', onsessionstart);
//         renderer.xr.removeEventListener('sessionend', onsessionend);
//     }
// 
//     function onsessionstart() {
//         trackball.dispose();
//         trackball = null;
//     }
// 
//     function onsessionend() {
//         trackball = makeTrackball();
//     }
// }; // MotionControls

// const recorder = new RecorderControls();

const recenter = do {
    new RecenterControls(renderer);
};

const trackball = do {
    new ReverseTrackball(camera, renderer.domElement);
};

const mesh = do {
    const map = do {
        const position = [563.2271446178601, 3706.84551063691, -5153.367883611318]
        const up = [563.2271446178601, 3706.84551063691, -5153.367883611318]
        const direction = [3.3002321090438045, 0.29997060238702034, 1.1959763137756454]
        const params = new URLSearchParams();
        params.set('position', `${position}`);
        params.set('up', `${up}`);
        params.set('direction', `${direction}`);
        const url = `api/v1/view/?${params}`;
        textureLoader.load(url);
    };
    EnvironmentMesh(map);
};
scene.add(mesh);

// setTimeout(oninterval, 5000);
// async function oninterval() {
//     console.log({ x: scene.position.x, y: scene.position.y, z: scene.position.z });
//     console.log({ x: camera.position.x, y: camera.position.y, z: camera.position.z });
//     
//     const position = [
//         563.2271446178601 +  100 * (scene.position.x - camera.position.x),
//         3706.84551063691 +   100 * (scene.position.y - camera.position.y),
//         -5153.367883611318 + 100 * (scene.position.z - camera.position.z),
//     ]
//     const up = [
//         563.2271446178601,
//         3706.84551063691,
//         -5153.367883611318,
//     ]
//     const direction = [
//         3.3002321090438045,
//         0.29997060238702034,
//         1.1959763137756454,
//     ]
//     const params = new URLSearchParams();
//     params.set('position', `${position}`);
//     params.set('up', `${up}`);
//     params.set('direction', `${direction}`);
//     const url = `api/v1/view/?${params}`;
//     const texture = await new Promise((resolve, reject) => {
//         textureLoader.load(url, resolve, undefined, reject);
//     });
//     mesh.material.map = texture;
//     mesh.material.needsUpdate = true;
//     
//     setTimeout(oninterval, 5000);
// }

// const replayer = new ReplayerControls(history);

function render() {
    trackball.update(camera);
    
//     recorder.update(camera);
//     replayer.update(camera);
    recenter.update(scene, camera);
    renderer.render(scene, camera);
}

//=== Replay camera coordinates

function ReplayerControls(history) {
    const start = now();
    let index = 0;
    
    return Object.assign(this, {
        update,
    })
    
    function update(camera) {
        const elapsed = now() - start;
        while (elapsed > history[index].now) {
            ++index;
        }

        camera.position.set(history[index].position);
        camera.up.set(history[index].up);
        camera.lookAt(history[index].direction);
    }


    //--- Utilities
    
    function now() { //-> milliseconds
        return Date.now();
    }
}

//=== Record camera coordinates

function RecorderControls() {
    const history = [];
    const start = now();
    let interval = setTimeout(oninterval, 5000);
    
    return Object.assign(this, {
        update,
        dispose,
    });
    
    function update(camera) {
        history.push({
            now: now() - start,
            position: position(camera),
            up: up(camera),
            direction: direction(camera),
        });
    }
    
    function dispose() {
        clearTimeout(interval);
    }

    
    //--- Event Handlers
    
    async function oninterval() {
        const body = {
            history: [...history],
        };
        history.splice(0, history.length);
        
        const response = await fetch('api/v1/history/', {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify(body),
        });
        await response.text();
        
        interval = setTimeout(oninterval, 5000);
    }
    
    
    //--- Utilities
    
    function position(object) {
        return {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z,
        };
    }
    
    function up(object) {
        return {
            x: camera.up.x,
            y: camera.up.y,
            z: camera.up.z,
        };
    }
    
    function direction(object) {
        const direction = new THREE.Vector3();
        object.getWorldDirection(direction);
        return {
            x: direction.x,
            y: direction.y,
            z: direction.z,
        };
    }
    
    function now() { //-> milliseconds
        return Date.now();
    }
}
