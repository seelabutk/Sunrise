import { TrackballControls } from 'three/addons/controls/TrackballControls.js';

export function ReverseTrackball(camera, domElement) {
        camera = camera.clone();
        camera.position.set(1.0, 0.0, 0.0);
        camera.up.set(0.0, -1.0, 0.0);
    const trackball = new TrackballControls(camera, domElement);
    trackball.target.set(0.0, 0.0, 0.0);

    return Object.assign(this, {
        update,
    });

    //--- Instance Methods

    function update(camera) {
        trackball.update();

        const src = trackball.object.position;
        camera.lookAt(src.x, -src.y, src.z);
    }
};
