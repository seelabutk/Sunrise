import * as THREE from 'three';

export function EnvironmentMesh(map, radius=1.0) {
    const widthSegments = 60;
    const heightSegments = 40;
    const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
    geometry.scale(-1.0, 1.0, 1.0); // make all faces point inwards
    geometry.rotateY(Math.PI);
//     geometry.rotateX(Math.PI);

    const transparent = true;
    const side = THREE.DoubleSide;
    const material = new THREE.MeshBasicMaterial({ transparent, side, map });

    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
};
