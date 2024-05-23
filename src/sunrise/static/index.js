import * as THREE from 'three'
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Mission } from 'missions';
import { Map } from 'map';
import { RenderData, latlng_to_cartesian, latlng_to_cartesian_vec3 } from "utils";

/* Holds information for a tile within the Sunrise application */
class Tile {
    constructor(row, col, zoom) {
        this.row = row;
        this.col = col;
        this.zoom = zoom;
    }
}

/* Sunrise Application */
class Sunrise {
    config = null;
    selection_map = null;

    constructor($el, {
        what,
        canvasSize = 512,
        tileSize = (canvasSize / 2) |0,
        highRes = tileSize,
        lowRes = (highRes / 4) |0,
    }={}) {
        // this.map = new Map();
        this.position = null;
        this.canvasSize = canvasSize;
        this.tileSize = tileSize;
        this.highRes = highRes;
        this.lowRes = lowRes;

        this.hyperimage = $el;
        this.cameraScalingFactor = 5;
        
        this.threecam = null;
        this.current_camera_controls = null;
        this.trackball_controls = null;
        Object.assign(this, {
            ...latlng_to_cartesian(
                35.562744,
                -83.5 - 13,
                100,
                // 10000,
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
        this.lowres = 64;
        this.zoom = 3000;
        this.scroll_counter = 0;
        this.scroll_cma = 0;

        this.prev_mouse_pos = {
            x: 0,
            y: 0,
        };
        this.mouse_sensitivity = 0.002;
        this.use_trackball = true;



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
        this.#create_tiles(this.num_tiles[0], this.num_tiles[1]);

        this.paths = [];
        this.missions = [];
        this.current_mission = null;

        this.rendererUpdate(this.dimension);
    }

    /**
        * @description (Re)create the tiles that we are using to render
        * @param {number} num_rows The number of rows in the grid of tiles
        * @param {number} num_cols The number of columns in the grid of tiles
        */
    #create_tiles(num_rows, num_cols) {
        this.definitions = [];
        for (let i = 0; i < num_rows; i++) {
            for (let j = 0; j < num_cols; j++) {
                this.definitions.push(new Tile(i, j, 40));
            }
        }
    }

    /**
        * @description Create the leaflet map for selecting points along the path
        */
    async create_map() {
        if (!this.selection_map || !this.config) {
            await this.get_config();
            this.selection_map = new Map(this.config["map-data"]["routes"]["streets"]);

            console.log(this.config["map-data"]["routes"]);
            for (const key in this.config["map-data"]["routes"]) {
            let btn = document.createElement("button");
                btn.id = `map_type_${key.toLowerCase()}`;
                btn.innerText = `${key}`;
                btn.className = "missionButton";
                btn.onclick = () => {
                    this.selection_map.set_url(this.config["map-data"]["routes"][key]);
                }
                console.log(key);

                document.getElementById("mission_list").appendChild(btn);
            }

            console.log('map created');
        }
    }

    /**
        * @description Place the camera at a point along a path and look outwards rather than towards the center of the earth
        * @param {number} index The index of the point we are trying to go to
        * @param {Mission} mission The mission of the path we are going to
        */
    goto_point(index, mission) {
        let render_data = mission.goto_point(index);

        this.use_trackball = false;
        this.trackball_controls.enabled = false;
        this.position = render_data.current;
        this.threecam.position.copy(render_data.current);
        this.threecam.up.copy(render_data.up);
        this.threecam.lookAt(render_data.target);
        // this.trackball_controls.update();

        this.updateTiles(
            new RenderData(this.#world_direction(), new Date().getHours(), 2, 2, this.dimension, this.dimension,)
        );

        // this.play_sunrise();
    }

    /**
        * @description Setup the camera to the desired initial values
        * @param {THREE.Vector3} position The initial position of the camera
        */
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
        this.trackball_controls = new TrackballControls(this.threecam, this.hyperimage, scene);
        this.trackball_controls.addEventListener( 'change', () => {}, { passive: true });
        this.trackball_controls.rotateSpeed = 30.0;
        this.trackball_controls.zoomSpeed = 1.2;
        this.trackball_controls.noZoom = false;
        this.trackball_controls.noPan = true; // we do not want pannning
        this.trackball_controls.staticMoving = true;
        this.trackball_controls.maxDistance = (6371 + 5000) / this.cameraScalingFactor;
        this.trackball_controls.minDistance = (6371 + 10) / this.cameraScalingFactor;
        this.trackball_controls.dynamicDampingFactor = 0.3;
        this.trackball_controls.update();
        // this.trackball_controls.enabled = true;

        this.updateRotateSpeed();
    }

    /** 
        * @description Update the renderer
        * @param {string} msg Information to send to the renderer
        */
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

    /**
        * @brief Throttle a callback function to an interval we specify
        * @param {Function} callback The callback function to call while throttling
        * @param {number} time_ms the number of milliseconds to throttle for
        */
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

    /**
        * @description Create a new mission and push it to the application's list
        * @param {string} name The desired name of the mission
        * @param {number} x The x position of the mission
        * @param {number} y The y position of the mission
        * @param {number} z The z position of the mission
        */
    addMission(name, x, y, z) {
        this.missions.push(new Mission(name, x, y, z));
        return this;
    }

    /**
        * @description Render HTML for each image tile we want 
        */
    renderTiles() {
        this.updateTiles(
            new RenderData(this.#trackball_direction(), new Date().getHours(), 2, 2, this.dimension, this.dimension,)
        );
    }

    /**
        * @description Send request to the server to get the configuration details for the client
        */
    async get_config() {
        let url = new URL('api/config/', window.location.origin);
        let res = await fetch(url);
        this.config = await res.json();
        console.log(this.config);
    }

    /** 
        * @description Update the tiles on the page to the new ones that we rendered on the server
        * @param {RenderData} render_data The direction the camera should look
        */
    async updateTiles(render_data) {
        Tile = Tile.bind(this);

        let ctx = this.secondary.getContext('2d');
        let promises = [];
        for (let i = 0, n = this.definitions.length; i < n; i++) {
            promises.push(((i) => {
                let defn = this.definitions[i];
                let { row, col } = defn;

                const tileWidth = this.canvasSize / render_data.num_rows;
                const tileHeight = this.canvasSize / render_data.num_cols;

                let y = (row / render_data.num_rows) * this.canvasSize;
                // * this.tileSize;
                let x = (col / render_data.num_cols) * this.canvasSize; // * this.tileSize

                return Tile(i).then((image) => {
                    ctx.drawImage(image, x, y, tileWidth, tileHeight);
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

//            let dx = -tx;
//            let dy = -ty;
//            let dz = -tz;
            
            let ux = this.threecam.up.x;
            let uy = this.threecam.up.y;
            let uz = this.threecam.up.z;

            let url = new URL('api/v1/view/', window.location.origin);
            url.searchParams.append('width', render_data.width);
            url.searchParams.append('height', render_data.height);
            url.searchParams.append('tile', `${`${this.definitions[i].row}of${render_data.num_rows}`},${`${this.definitions[i].col}of${render_data.num_cols}`}`);
            url.searchParams.append('position', [
                - tx,
                - ty,
                - tz,
//                px.toFixed(0),
//                py.toFixed(0),
//                pz.toFixed(0),
            ].join(','));
            url.searchParams.append('direction', [
                render_data.direction.x,
                render_data.direction.y,
                render_data.direction.z,
//                - dx,
//                - dy,
//                - dz,
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
            url.searchParams.append('hour', render_data.hour);

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

    /**
        * @description Update how much we want to rotate based on how zoomed in we are
        */
    updateRotateSpeed() {
        const maxSpeed = 3.0; // Maximum rotation speed when zoomed out
        const minSpeed = 0.01; // Minimum rotation speed when zoomed in
        const maxZoomDistance = this.trackball_controls.maxDistance; // Maximum distance for full rotation speed
        const minZoomDistance = this.trackball_controls.minDistance; // Minimum distance for minimum rotation speed
        
        const distance = this.threecam.position.distanceTo(this.trackball_controls.target);

        const rotateSpeed = THREE.MathUtils.mapLinear(
            distance,
            minZoomDistance,
            maxZoomDistance,
            minSpeed,
            maxSpeed
        );

        this.trackball_controls.rotateSpeed = rotateSpeed;
    }

    /**
        * @description Get the direction vector when using the TrackBall controls
        * @returns {THREE.Vector3}
        */
    #trackball_direction() {
        return new THREE.Vector3(
            this.threecam.position.x,
            this.threecam.position.y,
            this.threecam.position.z,
        );
    }

    /**
        * @description Get the vector for the world direction of the THREE.js camera
        */
    #world_direction() {
        let dirvec = new THREE.Vector3();
        this.threecam.getWorldDirection(dirvec);
        return dirvec;
    }

    /** 
        * @description Add a path for the camera to follow
        * @param {string} name The name of the path
        * @param {number[]} path 
        */
    async add_path(name, path) {
        if (!this.selection_map) {
            await this.create_map();
        }
        let mission = new Mission(name);

        let data = [];
        const num_steps = 30;
        let point_index = 1;
        for (let i = 1; i < path.length; i++) {
            let prev = latlng_to_cartesian(path[i-1].lat, path[i-1].lng - 13, 7);
            this.selection_map.add_marker(path[i-1].lat, path[i-1].lng, () => {
                this.goto_point(i, mission);
            });
            let prevpoint = new THREE.Vector3(
                prev.x / this.cameraScalingFactor,
                prev.y / this.cameraScalingFactor,
                prev.z / this.cameraScalingFactor,
            );
            
//            let curr = latlng_to_cartesian(path[i].lat, path[i].lng - 13, 7);
//            let currpoint = new THREE.Vector3(
//                curr.x / this.cameraScalingFactor,
//                curr.y / this.cameraScalingFactor,
//                curr.z / this.cameraScalingFactor,
//            );

            mission.add_point(prevpoint);

//            // Use the linear interpolator to fill in and
//            // smooth the distance between points
//            for (let j = 0; j < num_steps; j++) {
//                data.push(
//                    new THREE.Vector3(
//                        linear_interp(prevpoint.x, currpoint.x, j / num_steps),
//                        linear_interp(prevpoint.y, currpoint.y, j / num_steps),
//                        linear_interp(prevpoint.z, currpoint.z, j / num_steps),
//                    )
//                );
//                point_index++;
//            }

            point_index++;
        }

        // TODO: Probably use a list of these Missions to hold
        // rather than hard code it
        // let mission = new Mission(name, data);
        let button = mission.get_button(() => {
            this.play_mission(mission);
        });
        this.missions.push(mission);
        
        document.getElementById("mission_list").appendChild(button);
    }

    /**
        * @description Play the sunrise animation of the sun rising and setting based on changing the hour
        */
    async play_sunrise() {
        let step = 1;
        let start = new Date().getHours();
        let end = start + 24;

        for (let i = start; i < end; i += step) {
            this.updateTiles(new RenderData(this.#world_direction(), i, 2, 2, this.dimension, this.dimension,));
        }
    }

    /**
        * @description Play the path for the specified mission
        */
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
        
        // console.log(`ips: ${ips}. total_remaining_seconds: ${total_remaining_seconds}. Start: ${start_time}. Elapsed: ${elapsed_seconds}`);
       
        this.dimension = this.lowres;
        let render_data = mission.forward(1);
        while (render_data !== null) {
            ips = selector.value;
            display.innerText = ips;
            let current_time = +new Date() / 1000;
            elapsed_seconds = current_time - start_time;
            let target_index = Math.floor((elapsed_seconds / total_remaining_seconds) * mission.length());

            let offset = target_index - mission.current_index();

            // console.log(`ips: ${ips}. total_remaining_seconds: ${total_remaining_seconds}. Start: ${start_time}. Elapsed: ${elapsed_seconds}. Target: ${target_index}. Current: ${mission.current_index()}`);
            this.trackball_controls.update();
            this.threecam.position.copy(render_data.current);
            this.threecam.up.copy(render_data.up);
            this.threecam.lookAt(render_data.target);

            await this.updateTiles(
                new RenderData(this.#world_direction(), new Date().getHours(), 2, 2, this.dimension, this.dimension,)
            );
            render_data = mission.forward(offset);
        }
        this.dimension = this.highres;
    }

    /**
        * @description The run behavior of the application
        */
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
            if (this.use_trackball) {
                this.trackball_controls.update();
            }

            this.is_dragging = true;
            this.prev_mouse_pos = {
                x: event.offsetX,
                y: event.offsetY,
            };
            console.log({ROTX: this.threecam.rotation.x, ROTY: this.threecam.rotation.y});
         }, { passive: true });
         
        this.hyperimage.addEventListener('mousemove', (event) => {
            this.#throttle(() => {
                if (this.is_dragging) {
                    this.#create_tiles(1, 1);
                    // Check if we are using TrackBall controls
                    if (this.use_trackball) {
                        this.trackball_controls.update();
                        this.updateTiles(
                            new RenderData(this.#trackball_direction(), new Date().getHours(), 1, 1, this.dimension, this.dimension,)
                        );
                    } else {
                        const deltaMouse = {
                            x: event.offsetX - this.prev_mouse_pos.x,
                            y: event.offsetY - this.prev_mouse_pos.y,
                        };
                        console.log(deltaMouse);

                        this.threecam.rotateX(-deltaMouse.y * this.mouse_sensitivity);
                        this.threecam.rotateY(deltaMouse.x * this.mouse_sensitivity);
                        // this.threecam.rotation.y += deltaMouse.y * this.mouse_sensitivity;
                        // this.threecam.rotation.x += deltaMouse.x * this.mouse_sensitivity;
                        // this.trackball_controls.update();

                        this.prev_mouse_pos = {
                            x: event.offsetX,
                            y: event.offsetY,
                        };
                        this.updateTiles(
                            new RenderData(this.#world_direction(), new Date().getHours(), 1, 1, this.dimension, this.dimension,)
                        );
                    }
                } 
            }, 100);
        }, { passive: true });
         
        this.hyperimage.addEventListener('mouseup', (event) => {
            this.dimension = this.highres;
            this.is_dragging = false;
            this.#create_tiles(this.num_tiles[0], this.num_tiles[1]);

            if (this.use_trackball) {
                this.trackball_controls.update();
                this.updateTiles(
                    new RenderData(this.#trackball_direction(), new Date().getHours(), 2, 2, this.dimension, this.dimension,)
                );
            } else {
                this.updateTiles(
                    new RenderData(this.#world_direction(), new Date().getHours(), 2, 2, this.dimension, this.dimension,)
                );
            }
        }, { passive: true });

        this.hyperimage.addEventListener('wheel', (event) => {
            this.#throttle(() => {
                this.trackball_controls.update();
                this.updateRotateSpeed();
                this.updateTiles(
                    new RenderData(this.#trackball_direction(), new Date().getHours(), 2, 2, this.dimension, this.dimension,)
                );
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
