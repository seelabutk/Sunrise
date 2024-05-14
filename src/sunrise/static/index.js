import { Arcball } from "arcball"
import * as THREE from 'three'
import { ArcballControls } from 'three/addons/controls/ArcballControls.js';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { ArcBall } from "tapestry-arcball"
import { Path, Position } from "path"
// import { FlippedYTrackballControls } from "trackball";

/* Holds information for a tile within the Sunrise application */
class Tile {
    constructor(row, col, zoom) {
        this.row = row;
        this.col = col;
        this.zoom = zoom;
    }
}

/* Mission for the application */
// NOTE: x, y, z are camera coords
class Mission {
    constructor(name, x, y, z) {
        this.name = name;

        let points = []
        points.push(new Position(x, y, z));
        points.push(new Position(893043.8990594397, 4038936.4694766635, -5389919.75178295));
        

        this.path = new Path(points);
    }
}

/* Sunrise Application */
class Sunrise {
    constructor($el, {
        what,
        canvasSize = 512,
        tileSize = (canvasSize / 2) |0,
        highRes = tileSize,
        lowRes = (highRes / 4) |0,
    }={}) {
        this.canvasSize = canvasSize;
        this.tileSize = tileSize;
        this.highRes = highRes;
        this.lowRes = lowRes;

        this.hyperimage = $el;
        this.cameraScalingFactor = 5;
        
        this.threecam = null;
        this.threecontrols = null;
        // this.x = 146.5 * 1.1 / 1;
        // this.y = 3705.1 * 1.1 / 1;
        // this.z = -5180.8 * 1.1 / 1;
        Object.assign(this, {
            ...this.#latlngToCartesian(
                35.562744,
                -83.5 - 13,
                100,
            ),
        });

        this.point_vectors = [];

        this.primary = document.createElement('canvas');
        this.primary.width = this.canvasSize;
        this.primary.height = this.canvasSize;
        this.hyperimage.appendChild(this.primary);

        this.secondary = document.createElement('canvas');
        this.secondary.width = this.canvasSize;
        this.secondary.height = this.canvasSize;

        this.highres = 512;
        this.lowres = 64;
        // this.hyperimage = document.getElementById('hyperimage');
        // this.root = document.getElementById("hyperimage");
        this.camera = null;
        this.zoom = 3000;
        this.scroll_counter = 0;
        this.scroll_cma = 0;

        let original_position =
            [this.x, this.y, this.z, 1.0]
            // what === 'city'
            // ? [0, 0, 7000000/500, 1]
            // : [0, 0, 7000000/500, 1]
        ;
        
        // let original_position = $V([0, 0, this.zoom, 1]);
        this.#setup_camera(original_position);
        
        // this.camera = new Arcball(this.hyperimage, 7000000, 7000000, 7000000);
        this.num_tiles = [2, 2]; // 4 x 3 grid of tiles
        this.samples = 1;
        this.is_dragging = false;

        this.loading = false;

        // Camera movement bookeeping
        this.dimension = this.highRes; // the x, y dimension of each tile
        this.timeout = null;
        this.throttlepause = false;
        
        // Create the tiles
        this.definitions = [];
        for (let i = 0; i < this.num_tiles[0]; i++) {
            for (let j = 0; j < this.num_tiles[1]; j++) {
                this.definitions.push(new Tile(i, j, 40));
            }
        }

        this.paths = [];
        this.missions = []

        this.rendererUpdate(this.dimension);
    }

    #latlngToCartesian(latitude, longitude, altitude) {
        const rho = 6371 + altitude;
        const phi = (latitude) * Math.PI / 180;
        const theta = (longitude) * Math.PI / 180;
    
        const x = rho * Math.cos(phi) * Math.cos(theta);
        const y = rho * Math.sin(phi);
        const z = rho * Math.cos(phi) * Math.sin(theta);
   
        // return new Position(x,y,z);
        return { x, y, z };
    }

    /// @briefSetup the camera to desired initial values
    /// @returns Nothing
    #setup_camera(position, up) {
        let renderer = new THREE.WebGLRenderer();
        let scene = new THREE.Scene();
        this.threecam = new THREE.PerspectiveCamera(45, this.hyperimage.offsetWidth, this.hyperimage.offsetHeight, 1, 10000);
        this.threecam.position.set(
            this.x / this.cameraScalingFactor,
            this.y / this.cameraScalingFactor,
            this.z / this.cameraScalingFactor,
        );
        this.threecam.up.set(0, 1, 0);
     
        // const target = new THREE.Vector3(0, 0, 0);
        // const upVector = new THREE.Vector3(0, 1, 0);
        /// TRACKBALL CONTROLS
        this.threecontrols = new TrackballControls(this.threecam, this.hyperimage, scene);
        this.threecontrols.addEventListener( 'change', () => {});
        this.threecontrols.rotateSpeed = 30.0;
        this.threecontrols.zoomSpeed = 1.2;
        this.threecontrols.noZoom = false;
        this.threecontrols.noPan = true; // we do not want pannning
        this.threecontrols.staticMoving = true;
        this.threecontrols.maxDistance = (6371 + 5000) / this.cameraScalingFactor;
        this.threecontrols.minDistance = (6371 + 10) / this.cameraScalingFactor;
        this.threecontrols.dynamicDampingFactor = 0.3;
        // this.threecam.position.z = this.z * this.cameraScalingFactor;

//        let render = () => {
//            renderer.render(scene, this.threecam);
//        }
//        let animate = () => {
//            requestAnimationFrame(anime);
//            this.threecontrols.update();
//            render();
//        }

        // this.threecontrols = new ArcballControls(this.threecam, this.hyperimage, scene);
        // this.threecam.position.set(this.x * this.cameraScalingFactor, this.y * this.cameraScalingFactor, this.z * this.cameraScalingFactor);
        // console.log(`THREECAM Position: ${this.threecam.position.x} ${this.threecam.position.y} ${this.threecam.position.y}`);
        this.threecontrols.update();

        this.updateRotateSpeed();

        this.camera = new ArcBall();
        this.camera.up = $V([0, 1, 0, 1.0]);
        this.camera.position = $V(position);

        // this.camera.setBounds(this.hyperimage.width, this.hyperimage.height);
        this.camera.setBounds(window.innerWidth, window.innerHeight);
        //this.camera.setBounds(this.settings.width, this.settings.height);
        this.camera.zoomScale = this.camera.position.elements[2];
    }

    /// @brief Update the renderer
    rendererUpdate(msg) {
        // document.getElementById("movement").innerHTML = this.dimension;
        // console.log(msg);
        this.renderTiles();
        // console.log(`${this.camera.camera.position.x}, ${this.camera.camera.position.y}, ${this.camera.camera.position.y}`);
    }

//    #delayUpdate() {
//        if (this.timeout !== null) {
//            clearTimeout(this.timeout);
//        }
//
//        // this.dimension = 128;
//        this.timeout = setTimeout(this.#onTimeout.bind(this), 500);
//    }

    /// @brief Throttle a callback function to 
    /// an interval we specify
    #throttle(callback, time_ms) {
        if (this.throttlepause) {
            return;
        }

        this.throttlepause = true;
        setTimeout(() => {
            callback();
            this.throttlepause = false;
        }, time_ms);
    }

//    #onTimeout() {
//        clearTimeout(this.timeout);
//        this.timeout = null;
//        this.rendererUpdate(256);
//        this.dimension = 256;
//    }

    // @brief Create a new mission and push it to the application's list
    addMission(name, x, y, z) {
        this.missions.push(new Mission(name, x, y, z));
        return this;
    }

    // @brief Render HTML for each image tile we want 
    renderTiles() {
        this.updateTiles();
    }

    /// @brief Update the tiles on the page to the new ones that we rendered on the server
    async updateTiles() {
        Tile = Tile.bind(this);

        let ctx = this.secondary.getContext('2d');

        let promises = [];
        for (let i = 0, n = this.definitions.length; i < n; i++) {
            promises.push(((i) => {
                let defn = this.definitions[i];
                let { row, col } = defn;

                let y = row * this.tileSize;
                let x = col * this.tileSize;

                return Tile(i).then((image) => {
                    ctx.drawImage(image, x, y, this.tileSize, this.tileSize);
                });
            })(i));
        }

        await Promise.all([
            ...promises,
        ]);

        ctx = this.primary.getContext('2d');
        ctx.drawImage(this.secondary, 0, 0, this.canvasSize, this.canvasSize);
        

        function Tile(i) {
            // Camera update
            let m = $M(this.camera.Transform);
            m = m.inverse();

            const new_camera_position = m.multiply(this.camera.position);
            let new_camera_up = m.multiply(this.camera.up);

            // console.log(`Up: ${this.threecam.up.x} ${this.threecam.up.y} ${this.threecam.up.z}`);
            const tx = this.threecam.position.x * this.cameraScalingFactor;
            const ty = this.threecam.position.y * this.cameraScalingFactor;
            const tz = this.threecam.position.z * this.cameraScalingFactor;

            // console.log(`T Position: ${tx} ${ty} ${ty}`);
            const px = new_camera_position.elements[0];
            const py = new_camera_position.elements[1];
            const pz = new_camera_position.elements[2];

//            let dx = -px;
//            let dy = -py;
//            let dz = -pz;
            let dx = -tx;
            let dy = -ty;
            let dz = -tz;

            // let ux = 0.0;
            // let uy = 1.0;
            // let uz = 0.0;
            let ux = this.threecam.up.x;
            let uy = this.threecam.up.y;
            let uz = this.threecam.up.z;
            // let ux = new_camera_up.elements[0];
            // let uy = new_camera_up.elements[1];
            // let uz = new_camera_up.elements[2];

            let url = new URL('api/v1/view/', window.location.origin);
            url.searchParams.append('width', this.dimension);
            url.searchParams.append('height', this.dimension);
            url.searchParams.append('tile', `40,${this.definitions[i].row},${this.definitions[i].col}`);
            url.searchParams.append('position', [
                - tx,
                - ty,
                - tz,
//                px.toFixed(0),
//                py.toFixed(0),
//                pz.toFixed(0),
            ].join(','));
            url.searchParams.append('direction', [
                - dx,
                - dy,
                - dz,
//                dx.toFixed(0),
//                dy.toFixed(0),
//                dz.toFixed(0),
            ].join(','));
            url.searchParams.append('up', [
                // this.threecam.up.x,
                // this.threecam.up.y,
                // this.threecam.up.z,
               ux.toFixed(3),
               uy.toFixed(3),
               uz.toFixed(3),
            ].join(','));
            url.searchParams.append('samples', this.samples);

            return new Promise((resolve, reject) => {
                let image = new Image(this.dimension, this.dimension);
                image.onload = () => {
                    resolve(image);
                }
                image.onerror = () => {
                    reject();
                }
                image.src = url;
            });
        }
    }

    rotate(mouse_x, mouse_y) {
        if (this.is_dragging)
        {
            this.is_draggin = false;
            this.camera.move(mouse_x, mouse_y);
            this.updateTiles;
            this.is_drag = true;
        }
    }

    updateRotateSpeed() {
        const maxSpeed = 3.0; // Maximum rotation speed when zoomed out
        const minSpeed = 0.01; // Minimum rotation speed when zoomed in
        const maxZoomDistance = this.threecontrols.maxDistance; // Maximum distance for full rotation speed
        const minZoomDistance = this.threecontrols.minDistance; // Minimum distance for minimum rotation speed
        
        const distance = this.threecam.position.distanceTo(this.threecontrols.target);

        const rotateSpeed = THREE.MathUtils.mapLinear(
            distance,
            minZoomDistance,
            maxZoomDistance,
            minSpeed,
            maxSpeed
        );

        this.threecontrols.rotateSpeed = rotateSpeed;
    }

    /// Render a point along a path
    async render_path_point(target) {
        Tile = Tile.bind(this);

        let ctx = this.secondary.getContext('2d');

        let promises = [];
        for (let i = 0, n = this.definitions.length; i < n; i++) {
            promises.push(((i) => {
                let defn = this.definitions[i];
                let { row, col } = defn;

                let y = row * this.tileSize;
                let x = col * this.tileSize;

                return Tile(i).then((image) => {
                    ctx.drawImage(image, x, y, this.tileSize, this.tileSize);
                });
            })(i));
        }

        await Promise.all([
            ...promises,
        ]);

        ctx = this.primary.getContext('2d');
        ctx.drawImage(this.secondary, 0, 0, this.canvasSize, this.canvasSize);
        

        function Tile(i) {
            // Camera update
            let m = $M(this.camera.Transform);
            m = m.inverse();

            const new_camera_position = m.multiply(this.camera.position);
            let new_camera_up = m.multiply(this.camera.up);

            // console.log(`Up: ${this.threecam.up.x} ${this.threecam.up.y} ${this.threecam.up.z}`);
            const tx = this.threecam.position.x * this.cameraScalingFactor;
            const ty = this.threecam.position.y * this.cameraScalingFactor;
            const tz = this.threecam.position.z * this.cameraScalingFactor;

            // console.log(`T Position: ${tx} ${ty} ${ty}`);
            const px = new_camera_position.elements[0];
            const py = new_camera_position.elements[1];
            const pz = new_camera_position.elements[2];

//            let dx = -px;
//            let dy = -py;
//            let dz = -pz;
            let dx = -tx;
            let dy = -ty;
            let dz = -tz;

            // let ux = 0.0;
            // let uy = 1.0;
            // let uz = 0.0;
            let ux = this.threecam.up.x;
            let uy = this.threecam.up.y;
            let uz = this.threecam.up.z;
            // let ux = new_camera_up.elements[0];
            // let uy = new_camera_up.elements[1];
            // let uz = new_camera_up.elements[2];

            let url = new URL('api/v1/view/', window.location.origin);
            url.searchParams.append('width', this.dimension);
            url.searchParams.append('height', this.dimension);
            url.searchParams.append('tile', `40,${this.definitions[i].row},${this.definitions[i].col}`);
            url.searchParams.append('position', [
                - tx,
                - ty,
                - tz,
//                px.toFixed(0),
//                py.toFixed(0),
//                pz.toFixed(0),
            ].join(','));
            url.searchParams.append('direction', [
                - dx,
                - dy,
                - dz,
//                dx.toFixed(0),
//                dy.toFixed(0),
//                dz.toFixed(0),
            ].join(','));
            url.searchParams.append('up', [
                // this.threecam.up.x,
                // this.threecam.up.y,
                // this.threecam.up.z,
               ux.toFixed(3),
               uy.toFixed(3),
               uz.toFixed(3),
            ].join(','));
            url.searchParams.append('samples', this.samples);

            return new Promise((resolve, reject) => {
                let image = new Image(this.dimension, this.dimension);
                image.onload = () => {
                    resolve(image);
                }
                image.onerror = () => {
                    reject();
                }
                image.src = url;
            });
        }
    }
   
    /// Add a path for the camera to follow
    add_path(path) {
        let converted = [];
        path.forEach((coord) => {
            // converted.push(this.#latlngToCartesian(coord.lat, coord.lng, 400));
            let point = this.#latlngToCartesian(coord.lat, coord.lng - 13, 7);
            converted.push(
                new THREE.Vector3(
                    point.x / this.cameraScalingFactor,
                    point.y / this.cameraScalingFactor,
                    point.z / this.cameraScalingFactor,
                )
            );
        });
        // console.log(converted);
        this.paths.push(converted);
    }

    /// @brief The run behavior of the application
    async run() {
        // PATH
        for (let i = 0; i < this.paths[0].length; i++) {
            let target = i < this.paths[0].length-1 ? 
                this.paths[0][i+1]
                : this.paths[0][i];
            this.threecontrols.update();
            this.threecam.position.copy(this.paths[0][i]);
//            this.threecam.up.copy(
//                new THREE.Vector3 (
//                    -this.paths[0][i].x,
//                    -this.paths[0][i].y,
//                    -this.paths[0][i].z,
//                )
//            );
            this.threecam.lookAt(target);
            // this.threecontrols.update();
            // console.log(`THREECAM Position: ${this.threecam.position.x} ${this.threecam.position.y} ${this.threecam.position.y}`);
            await this.updateTiles();
            // await this.render_path_point(target);
        }


        document.body.addEventListener('mousedown', (event) => {
            this.dimension = this.lowres;
            this.threecontrols.update();
            this.is_dragging = true;
            this.camera.LastRot = this.camera.ThisRot;
            this.camera.click(event.clientX - this.hyperimage.getBoundingClientRect().left, event.clientY - this.hyperimage.getBoundingClientRect().top);
         });
         document.body.addEventListener('mousemove', (event) => {
            this.#throttle(() => {
                if (this.is_dragging) {
                    this.threecontrols.update();
                    console.log("move");
                    var mouse_x = event.clientX - this.hyperimage.getBoundingClientRect().left;
                    var mouse_y = event.clientY - this.hyperimage.getBoundingClientRect().top;
                    //self.rotate(mouse_x, mouse_y, self.get_low_resolution()); // Render low quality version
                   

                    // this.rotate(mouse_x, mouse_y);
                    this.updateTiles();
                }
            }, 100);
         });
         
        document.body.addEventListener('mouseup', (event) => {
            this.dimension = this.highres;
            this.threecontrols.update();

            const mouse_x = event.clientX - this.hyperimage.getBoundingClientRect().left;
            const mouse_y = event.clientY - this.hyperimage.getBoundingClientRect().top;

            // this.rotate(mouse_x, mouse_y); // Render high quality version
            this.is_dragging = false;
            this.updateTiles();
        });

        document.body.addEventListener('wheel', (event) => {
            this.#throttle(() => {
                // console.log(this.threecam.zoom);
                this.threecontrols.update();
                this.updateRotateSpeed();
                this.updateTiles();

//                clearTimeout($.data(self, 'timer'));
//                $.data(self, 'timer', setTimeout(function() {
//                    this.dimension = this.highRes;
//                    this.updateTiles();
//                    // self.render(self.get_high_resolution());
//                }, 500).bind(this));
            }, 100);
        });
    
        return;
    }
}

const resp = await fetch('static/park.json');
const kingston = await resp.json();
// console.log(kingston);

let app = new Sunrise(document.getElementById('hyperimage'), {
    what: 'park',
});
app.add_path(kingston);
// app.addMission("Great Smoky Mountains", 200, 200, 200);
app.run();
