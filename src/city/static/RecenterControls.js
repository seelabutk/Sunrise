//=== Let the user re-center the scene at the camera

export function RecenterControls(renderer) {
    let timeout = null;
    let needsUpdate = false;
    let controller = null;
    renderer.domElement.addEventListener('pointerdown', onstart, true);
    renderer.domElement.addEventListener('pointerup', onend, true);
    renderer.xr.addEventListener('sessionstart', onsessionstart, true);
    renderer.xr.addEventListener('sessionend', onsessionend, true);
    
    return Object.assign(this, {
        update,
        dispose,
    });
    
    
    //--- Instance Methods
    
    function update(scene, camera) {
        if (needsUpdate) {
            onupdate(scene, camera);
            needsUpdate = false;
        }
    }
    
    function dispose() {
        renderer.domElement.removeEventListener('pointerdown', onstart, true);
        renderer.domElement.removeEventListener('pointerup', onend, true);
    }
    
    function onlongtouch() {
        needsUpdate = true;
    }
    
    function onshorttouch() {
        //
    }
    
    
    //--- Event Listeners
    
    function onsessionstart() {
        controller = renderer.xr.getController(0);
        controller.addEventListener('selectstart', onstart, true);
        controller.addEventListener('selectend', onend, true);
        controller.addEventListener('select', onlongtouch, true);
    }
    
    function onsessionend() {
        controller.removeEventListener('selectstart', onstart, true);
        controller.removeEventListener('selectend', onend, true);
        controller.removeEventListener('select', onlongtouch, true);
        controller = null;
    }
    
    function onupdate(scene, camera) {
        console.group('RecenterCameraControls.onupdate');
        console.log('scene.position', JSON.parse(JSON.stringify(scene.position)));
        console.log('camera.position', JSON.parse(JSON.stringify(camera.position)));
        scene.position.copy(camera.position);
        console.groupEnd();
    }
    
    function onstart() {
        timeout = setTimeout(ontimeout, 1000);
    }
    
    function onend() {
        clearTimeout(timeout);
        timeout = null;
    }
    
    function ontimeout() {
        onlongtouch();
    }
}
