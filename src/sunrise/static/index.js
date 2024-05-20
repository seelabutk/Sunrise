import * as L from 'leaflet';
import * as THREE from 'three'
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { Mission } from 'missions';
import { ArcBall } from "tapestry-arcball"
import { linear_interp, latlng_to_cartesian, latlng_to_cartesian_vec3 } from "utils";

/* Holds information for a tile within the Sunrise application */
class Tile {
    constructor(row, col, zoom) {
        this.row = row;
        this.col = col;
        this.zoom = zoom;
    }
}

// Class for the Leaflet map
class Map {
    config = null;
    // map = null;
    url = null;
    tile_layer = null;
    markers = [];

    constructor() {
        this.config =  {
            angle: 6,
            position: [0.0, 0.0, 0.0],

            get url() {
                return `http://160.36.58.111:3000/api/v1/view/?width=256&height=256&tile={z},{y},{x}&angle=6&pos=0.0,0.0,0.0`;
            }
        };
        
        const $map = document.querySelector('.js--map');
        this.map = L.map($map, {});
        this.map.fitBounds([
            [35.747116, -83.949626],  // Maryville, TN
            [35.483526, -82.987458], // Waynesville, NC
            // [-35.747116, -83.949626],  // Maryville, TN
            // [-35.483526, -82.987458], // Waynesville, NC
            // [-34.0549, -118.2426],  // Los Angeles, CA
            // [-40.7128, -74.00060], // New York, New York
        ], {
            maxZoom: 10,
        });
        window.map = this.map;

        this.url = this.config.url;
        this.tile_layer = L.tileLayer(this.url, {
            tms: (
                // true, // y+ is north
                false  // y+ is south
            ),
            noWrap: true,
        });
        this.tile_layer.addTo(this.map);

    }

    add_marker(lat, lng) {
        let m = new L.marker([lat, lng]);

        this.markers.push(m);
        m.addTo(this.map);
    }
}

class Clock {
    start_time = 0;
    elapsed_time = 0;
    
    constructor() {
        this.start_time = new Date().getMilliseconds();
        this.elapsed_time = 0;
    }

    update() {
        if (this.start_time != 0) {
            this.elapsed_time += new Date().getMilliseconds() - this.start_time;
        }
    }

    stop() {
        this.start_time = 0;
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
        // this.map = new Map();
        this.canvasSize = canvasSize;
        this.tileSize = tileSize;
        this.highRes = highRes;
        this.lowRes = lowRes;

        this.hyperimage = $el;
        this.cameraScalingFactor = 5;
        
        this.threecam = null;
        this.threecontrols = null;
        Object.assign(this, {
            ...latlng_to_cartesian(
                35.562744,
                -83.5 - 13,
                // 100,
                10000,
            ),
        });

        this.point_vectors = [];

        this.park = null;

        this.primary = document.createElement('canvas');
        this.primary.width = this.canvasSize;
        this.primary.height = this.canvasSize;
        this.hyperimage.appendChild(this.primary);

        this.secondary = document.createElement('canvas');
        this.secondary.width = this.canvasSize;
        this.secondary.height = this.canvasSize;

        this.highres = 512;
        this.lowres = 128;
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
        this.missions = [];
        this.current_mission = null;

        this.rendererUpdate(this.dimension);

        this.config = this.get_config();
    }

    /// @briefSetup the camera to desired initial values
    /// @returns Nothing
    #setup_camera(position) {
        let scene = new THREE.Scene();
        this.threecam = new THREE.PerspectiveCamera(45, this.hyperimage.offsetWidth, this.hyperimage.offsetHeight, 1, 10000);
        this.threecam.position.set(
            this.x / this.cameraScalingFactor,
            this.y / this.cameraScalingFactor,
            this.z / this.cameraScalingFactor,
        );
        this.threecam.up.set(0, 1, 0);
     
        /// TRACKBALL CONTROLS
        this.threecontrols = new TrackballControls(this.threecam, this.hyperimage, scene);
        this.threecontrols.addEventListener( 'change', () => {}, { passive: true });
        this.threecontrols.rotateSpeed = 30.0;
        this.threecontrols.zoomSpeed = 1.2;
        this.threecontrols.noZoom = false;
        this.threecontrols.noPan = true; // we do not want pannning
        this.threecontrols.staticMoving = true;
        this.threecontrols.maxDistance = (6371 + 5000) / this.cameraScalingFactor;
        this.threecontrols.minDistance = (6371 + 10) / this.cameraScalingFactor;
        this.threecontrols.dynamicDampingFactor = 0.3;
        this.threecontrols.update();

        this.updateRotateSpeed();
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

    async get_config() {
        let url = new URL('api/config/', window.location.origin);

        const res = await fetch(url);
        const config = await res.json();
        console.log(config);
        return config;
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
            const tx = this.threecam.position.x * this.cameraScalingFactor;
            const ty = this.threecam.position.y * this.cameraScalingFactor;
            const tz = this.threecam.position.z * this.cameraScalingFactor;

            let dx = -tx;
            let dy = -ty;
            let dz = -tz;
            
            let ux = this.threecam.up.x;
            let uy = this.threecam.up.y;
            let uz = this.threecam.up.z;

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
    async render_path_point() {
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
            const tx = this.threecam.position.x * this.cameraScalingFactor;
            const ty = this.threecam.position.y * this.cameraScalingFactor;
            const tz = this.threecam.position.z * this.cameraScalingFactor;

            let dirvec = new THREE.Vector3();
            this.threecam.getWorldDirection(dirvec);
            let dx = dirvec.x;
            let dy = dirvec.y;
            let dz = dirvec.z;
            
            let ux = this.threecam.up.x;
            let uy = this.threecam.up.y;
            let uz = this.threecam.up.z;

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
    add_path(name, path) {
        let data = [];
        const num_steps = 30;
        for (let i = 1; i < path.length; i++) {
            let prev = latlng_to_cartesian(path[i-1].lat, path[i-1].lng - 13, 7);
            // this.map.add_marker(path[i-1].lat, path[i-1].lng);
            let prevpoint = new THREE.Vector3(
                prev.x / this.cameraScalingFactor,
                prev.y / this.cameraScalingFactor,
                prev.z / this.cameraScalingFactor,
            );
            
            let curr = latlng_to_cartesian(path[i].lat, path[i].lng - 13, 7);
            let currpoint = new THREE.Vector3(
                curr.x / this.cameraScalingFactor,
                curr.y / this.cameraScalingFactor,
                curr.z / this.cameraScalingFactor,
            );

            // Use the linear interpolator to fill in and
            // smooth the distance between points
            for (let j = 0; j < num_steps; j++) {
                data.push(
                    new THREE.Vector3(
                        linear_interp(prevpoint.x, currpoint.x, j / num_steps),
                        linear_interp(prevpoint.y, currpoint.y, j / num_steps),
                        linear_interp(prevpoint.z, currpoint.z, j / num_steps),
                    )
                );
            }
        }

        // TODO: Probably use a list of these Missions to hold
        // rather than hard code it
        let mission = new Mission(name, data);
        let button = mission.get_button(() => {
            this.play_mission(mission);
        });
        this.missions.push(mission);
        
        document.getElementById("mission_list").appendChild(button);
    }

    /// Play the path for the specified mission
    async play_mission(mission) {
        if (!mission.is_paused()) {
            console.log("Mission already being played!");
            return;
        }
        mission.unpause();
        
        let selector = document.getElementById("path_speed_selector");
        let display = document.getElementById("ips_display");
        this.current_mission = mission;
        let ips = 40;
        // let total_remaining_seconds = mission.length() / ips;
        let total_remaining_seconds = mission.remaining_length() / ips;
        let start_time = +new Date() / 1000;
        let elapsed_seconds = 0;
        selector.value = ips;
        
        console.log(`ips: ${ips}. total_remaining_seconds: ${total_remaining_seconds}. Start: ${start_time}. Elapsed: ${elapsed_seconds}`);
       
        this.dimension = this.lowres;
        let render_data = mission.forward(1);
        while (render_data !== null) {
            ips = selector.value;
            display.innerText = ips;
            let current_time = +new Date() / 1000;
            elapsed_seconds = current_time - start_time;
            let target_index = Math.floor((elapsed_seconds / total_remaining_seconds) * mission.length());

            let offset = target_index - mission.current_index();

            console.log(`ips: ${ips}. total_remaining_seconds: ${total_remaining_seconds}. Start: ${start_time}. Elapsed: ${elapsed_seconds}. Target: ${target_index}. Current: ${mission.current_index()}`);
            this.threecontrols.update();
            this.threecam.position.copy(render_data.current);
            this.threecam.up.copy(render_data.up);
            this.threecam.lookAt(render_data.target);

            await this.render_path_point();
            render_data = mission.forward(offset);
        }
        this.dimension = this.highres;
    }

    /// @brief The run behavior of the application
    async run() {
        document.getElementById("path-pause").addEventListener('click', () => {
            if (this.current_mission.is_paused()) {
                this.play_mission(this.current_mission);
                // console.log(`PATH INDEX: ${this.current_mission.
            } else {
                this.current_mission.pause();
            }
            
            path_is_paused = !path_is_paused;
        }, { passive: true });

        this.hyperimage.addEventListener('mousedown', (event) => {
            this.dimension = this.lowres;
            this.threecontrols.update();
            this.is_dragging = true;
         }, { passive: true });
         
        this.hyperimage.addEventListener('mousemove', (event) => {
            this.#throttle(() => {
                if (this.is_dragging) {
                    this.threecontrols.update();
                    this.updateTiles();
                }
            }, 100);
        }, { passive: true });
         
        this.hyperimage.addEventListener('mouseup', (event) => {
            this.dimension = this.highres;
            this.threecontrols.update();
            this.is_dragging = false;
            this.updateTiles();
        }, { passive: true });

        this.hyperimage.addEventListener('wheel', (event) => {
            this.#throttle(() => {
                this.threecontrols.update();
                this.updateRotateSpeed();
                this.updateTiles();
            }, 100);
        }, { passive: true });
    
        return;
    }
}

const resp = await fetch('static/park.json');
const park = await resp.json();

let app = new Sunrise(document.getElementById('hyperimage'), {
    what: 'park',
});
app.add_path("Park", park);
// app.addMission("Great Smoky Mountains", 200, 200, 200);
app.run();
