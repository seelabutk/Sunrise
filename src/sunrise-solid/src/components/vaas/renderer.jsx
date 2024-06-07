import * as THREE from 'three'
import { 
    latlng_to_cartesian,
    Point,
} from '../../utils';
import { CameraControls, TrackballCameraControls, PanningCameraControls } from './controls';

export default class Renderer {
    /** @type {HTMLElement} */
    primary = null;

    /** @type {Number} */
    width = Infinity;
    /** @type {Number} */
    height = Infinity;
    /** @type {Number} */
    aspect_ratio = Infinity;
    
    /** @type {Number} */
    camera_scaling_factor = Infinity;

    /** @type {HTMLElement} */
    secondary = null;

    /** @type {Dimension} */
    highRes = null;
    /** @type {Dimension} */
    lowRes = null;
    /** @type {Dimension} */
    current_resolution = null;

    /** @type {Boolean} */
    is_rendering = false;

    timeout = null;

    /** @type {Number} */
    rowCount = -1;
    /** @type {Number} */
    colCount = -1;
    
    /** @type {Number} */
    rowCountCurrent = -1;
    /** @type {Number} */
    colCountCurrent = -1;

    /** @type {Tile[]} **/
    tile_definitions = [];
    
    /** @type {Boolean} **/
    is_dragging = false;

    /** @type {TrackballCameraControls} **/
    trackball = null;

    /** @type {PanningCamControls} **/
    panning = null;

    /** @type {THREE.PerspectiveCamera} **/
    camera = null;

    /** @type {TrackballCameraControls | PanningCamControls} */
    controls = null;
    
    /** @type {Position} **/
    original_position = null;

    /** @type {Object} */
    config = null;

    /** @type {String} */
    server_url = "http://160.36.58.111:5000";

    /** @type {Date} */
    current_time = null;

    /** @type {THREE.Vector3} */
    current_direction = null;

    /** @type {String} */
    current_light = "distant";

    /** @type {Event} */
    render_event;

    /** @type {Boolean} */
    throttle_pause = false;

    /** @type {Point} */
    central_point = null;

    /** @type {[]Object} */
    render_dependencies = [];

    render_trigger = null;

    /**
        * @param {HTML.Element} primary The primary canvas to render the final image to
        * @param {Number} width The total width of the canvas
        * @param {Number} height The total height of the canvas
        * @param {Number} num_rows The number of tiles in a row
        * @param {Number} num_cols The number of tiles in a col
    */
    constructor(
        primary,
        width,
        height,
        num_rows,
        num_cols,
    ) {
        console.log(`Creating renderer with dimensions: ${width} by ${height} and ${num_rows} by ${num_cols}`);
        // Primary is the main canvas we render to
        // Make sure to set the width and height of this
        this.primary = primary;
        this.primary.width = width;
        this.primary.height = height;
       
        // The dimensions of our canvas and the 
        // aspect ratio we want the camera to render with
        this.width = width;
        this.height = height;
        this.aspect_ratio = this.width / this.height;
       
        // The number of rows and columns we are tiling with
        this.rowCount = num_rows;
        this.colCount = num_cols;
        this.rowCountCurrent = this.rowCount;
        this.colCountCurrent = this.colCount;

        // Find the resolutions we want to render our tiles at for 
        // low and high quality images
        this.highRes = new Dimension(
            (this.width / this.colCount) |0,
            ((this.width / this.colCountCurrent) / this.aspect_ratio) |0
        );
        this.lowRes = new Dimension(
            (this.highRes.width / 4) |0,
            ((this.highRes.width / 4) / this.aspect_ratio) |0,
        );

        // Create the secondary canvas for double buffering
        this.secondary = document.createElement("canvas");
        this.secondary.width = this.width;
        this.secondary.height = this.height;

        // Find the original position where we want to place the camera
        // and later return to
        const pos = latlng_to_cartesian(
            35.562744,
            -83.5 - 13,
            // 100,
            10000,
        );
        this.central_point = new Point(
            35.562744,
            -83.5 - 13,
            477,
        );
        this.original_position = new Position(
            pos.x,
            pos.y,
            pos.z
        );

        // General Setup
        this.#get_current_date();
        this.#set_resolution(this.highRes);

        // Create our array of tiles
        this.#create_tiles(this.rowCount, this.colCount);

        // Setup the camera and trackball controls
        this.#setup_camera(this.original_position);
        this.#setup_controls();
        this.#set_current_direction(this.#trackball_dir());

        // Setup the event listeners for the camera and controls
        this.#setup_event_listeners();
    }

    /**
        * @description Set the current resolution that we want to render at
        * @param {Dimension} res The resolution to render at
    */
    #set_resolution(res) {
        console.log(`Setting resolution to ${res.width}, ${res.height}`);
        this.current_resolution = res;
    }

    /** 
        * @description Get the current time using calculations we need to offset timeZone.
        * Since the Park is always in Est we only need to account for that.
        * NOTE: Eventually we can change this to be the whole date, but for now it 
        * should remain just returning the hour 
    */
    #get_current_date() {
        this.current_time = new Date().getHours() - 5;
    }

    /**
        * @description Set the direction that we want to render to
        * @param {THREE.Vector3} dir The direction to look towards
    */
    #set_current_direction(dir) {
        this.current_direction = dir;
    }

    /**
        * @description Make a rendering request for a tile
        * @param {Tile} tile The tile we are trying to render
    */
    #tile_request(tile) {
        this.current_direction = this.controls.dir();
        const px = this.camera.position.x * this.camera_scaling_factor;
        const py = this.camera.position.y * this.camera_scaling_factor;
        const pz = this.camera.position.z * this.camera_scaling_factor;

        // Get the up vector of the camera
        const ux = this.camera.up.x;
        const uy = this.camera.up.y;
        const uz = this.camera.up.z;

        let url = new URL('api/v1/view/', this.server_url);
        url.searchParams.append('width', this.current_resolution.width);
        url.searchParams.append('height', this.current_resolution.height);
        url.searchParams.append('tile', `${tile.row}of${this.rowCountCurrent},${tile.col}of${this.colCountCurrent}`);
        url.searchParams.append('position', [
            -px,
            -py,
            -pz,
        ].join(','));
        url.searchParams.append('direction', [
            this.current_direction.x,
            this.current_direction.y,
            this.current_direction.z,
        ].join(','));
        url.searchParams.append('up', [
            ux.toFixed(3),
            uy.toFixed(3),
            uz.toFixed(3),
        ].join(','));
        url.searchParams.append('samples', 4);
        url.searchParams.append('hour', this.current_time);
        url.searchParams.append('light', this.current_light);

        // Make the request
        return new Promise((res, rej) => {
            let image = new Image(this.current_resolution.width, this.current_resolution.height);
            image.onload = () => {
                res(image);
            }
            image.onerror = () => {
                rej();
            }
            image.src = url;
        });
    }

    /**
        * @description Play the sunrise animation by iterating through all hours of the day
    */
    async play_sunrise() {
        console.log("SUNRISE");
        const step = 0.1;
        const start = this.current_time;
        const end = this.current_time + 24;

        while (this.current_time <= end) {
            await new Promise((res) => {
                this.current_time += step;
                console.log(`Setting current time to ${this.current_time}`);
                this.#render_dispatch();
                setTimeout(res, 50)
            });
        }
        this.current_time = start;
    }

    /**
        * @description Place the camera at a position according to lat, long, alt points
        * @param {Point} point The point to render at
    */
    goto_point(point) {
        this.controls = this.panning;
        this.current_light = 'sunSky';
        console.log(`Going to: ${point.lat}, ${point.lng}, ${point.alt}`);
        const spatial = latlng_to_cartesian(point.lat, point.lng, (point.alt / 1000) + 0.7);
        const target = latlng_to_cartesian(this.central_point.lat, this.central_point.lng, (this.central_point.alt / 1000) + 0.7)
        this.camera.position.copy(new THREE.Vector3(
            spatial.x / this.camera_scaling_factor, 
            spatial.y / this.camera_scaling_factor, 
            spatial.z / this.camera_scaling_factor)
        );
        this.camera.up.copy(new THREE.Vector3(
            spatial.x / this.camera_scaling_factor, 
            spatial.y / this.camera_scaling_factor, 
            spatial.z / this.camera_scaling_factor)
        );
        this.camera.lookAt(new THREE.Vector3(
            target.x / this.camera_scaling_factor, 
            target.y / this.camera_scaling_factor, 
            target.z / this.camera_scaling_factor)
        );
        this.#set_current_direction(this.#world_dir());
        this.#render_dispatch();
    }

    /**
        * @description Create the array of tiles we are going to render to
        * @param {Number} numr Number of rows for our tileset
        * @param {Number} numc Number of cols for our tileset
    */
    #create_tiles(numr, numc) {
        this.tile_definitions = [];
        this.rowCountCurrent = numr;
        this.colCountCurrent = numc;

        // Calculate the tile width and height based on the number of rows and columns
        const tile_width = this.width / numc;
        const tile_height = this.height / numr;

        for (let i = 0; i < numr; i++) {
            for (let j = 0; j < numc; j++) {
                this.tile_definitions.push(new Tile(i, j, tile_width, tile_height));
            }
        }
    }

    /**
        * @description Setup the necessary parts for our THREE.js camera
        * @param {Position} position Starting position for the camera
    */
    #setup_camera(position) {
        this.camera_scaling_factor = 5;
        this.camera = new THREE.PerspectiveCamera(
            45,
            this.width,
            this.height,
            1,
            10000,
        );
        this.camera.position.set(
            position.x / this.camera_scaling_factor,
            position.y / this.camera_scaling_factor,
            position.z / this.camera_scaling_factor,
        );
        this.camera.up.set(0, 1, 0);
    }

    /**
        * @description Setup the configuration for the THREE.js trackball controls for the camera
    */
    #setup_controls() {
        this.trackball = new TrackballCameraControls(this.camera, this.primary)
            .set_bounds(
                (6371 + 10_000) / this.camera_scaling_factor, 
                (6371 + 10) / this.camera_scaling_factor
            )
            .enable();
        
        this.panning = new PanningCameraControls(this.camera, this.primary, 0.002);

        this.controls = this.trackball;
    }

    /**
        * @description Get the world direction from the camera
    */
    #world_dir() {
        let dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        return dir;
    }

    /**
        * @description Get the direction the controls are pointing
    */
    #trackball_dir() {
        //return this.controls.dir();
//        return new THREE.Vector3(
//            this.camera.position.x,
//            this.camera.position.y,
//            this.camera.position.z,
//        );
    }

    /**
        * @description Throttle the `callback` action
        * @param {CallableFunction} callback The callback function for the desired action
        * @param {Number} time_ms The amounf of milliseconds we want to happend between each action
    */
    #throttle(callback, time_ms) {
        if (this.throttle_pause) {
            return;
        }

        this.throttle_pause = true;
        setTimeout(() => {
            callback();
            this.throttle_pause = false;
        }, time_ms);
    }

    /**
        * @description Reset the tileset to the original one specified
    */
    #reset_tiles() {
        this.#create_tiles(this.rowCount, this.colCount);
    }

    /**
        * @description Set the tiles to the ones we want for low quality rendering
    */
    #lowq_tiles() {
        this.#create_tiles(1, 1);
    }

    /**
        * @description Fire a rendering event
    */
    #render_dispatch() {
//        clearTimeout(this.timeout);
//        this.timeout = setTimeout(async () => {
//            this.#create_image();
//        }, 0);
        window.dispatchEvent(this.render_event);
    }

    /**
        * @description Create the event listeners for controlling the camera
    */
    #setup_event_listeners() {
        this.render_event = new Event("render");

        this.primary.addEventListener('mousedown', () => {
            this.#set_resolution(this.lowRes);
            this.is_dragging = true;
            this.controls.update();
            this.#lowq_tiles();
            
            this.#render_dispatch();
        });

        this.primary.addEventListener('mousemove', () => {
            this.#throttle(() => {
                if (this.is_dragging) {
                    //console.log("moving");
                    this.controls.update();
                    this.#render_dispatch();
                }
            }, 200);
        });
        
        this.primary.addEventListener('mouseup', () => {
            this.#set_resolution(this.highRes);
            this.#reset_tiles();
            //this.controls.update();
            this.#render_dispatch();
            this.is_dragging = false;
        });

        this.primary.addEventListener('wheel', (e) => {
            this.#throttle(() => {
                //this.controls.update();
                this.#lowq_tiles();
                this.#render_dispatch();
            }, 20);
        });
    }

    /**
        * @description The render loop that decides when we need to request another image
    */
    render() {
        window.addEventListener('render', () => {
            if (this.is_rendering) {
                console.log('is rendering');
                clearTimeout(this.timeout);
                this.timeout = setTimeout(() => {
                    this.#create_image();
                }, 100);
            } else {
                this.#create_image();
            }
        });
        
        this.#render_dispatch();
    }

    /**
        * @async
        * @description Create the image to the screen from the server
    */
    async #create_image() {
        this.is_rendering = true;
        //this.controls.update();
        let ctx = this.secondary.getContext('2d');
        ctx.reset();
        const tile_width = this.width / this.colCountCurrent;
        const tile_height = this.height / this.rowCountCurrent;
        let promises = [];

        for (let i = 0; i < this.tile_definitions.length; i++) {
            promises.push((() => {
                let row = this.tile_definitions[i].row;
                let col = this.tile_definitions[i].col;

                let y = (row / this.rowCountCurrent) * this.height;
                let x = (col / this.colCountCurrent) * this.width;

                return this.#tile_request(this.tile_definitions[i]).then((image) => {
                    ctx.drawImage(image, x, y, tile_width, tile_height);
                });
            })());
        }

        await Promise.all([...promises,]);
       
        // Once the tiles are done drawing
        // we can render them to the main display
        ctx = this.primary.getContext('2d');
        //ctx.reset();
        ctx.drawImage(this.secondary, 0, 0, this.width, this.height);
        this.is_rendering = false;
    }


}

// A tile used in the VaaS in order to partially render an image
class Tile {
    /** @type {Number} */
    row = -1;
    /** @type {Number} */
    col = -1;
    /** @type {Number} */
    width = -1;
    /** @type {Number} */
    height = -1;
   
    /**
        * @param {Number} row The row id of the tile
        * @param {Number} col The col id of the tile
        * @param {Number} width The width of the tile
        * @param {Number} height The height of the tile
    */
    constructor(row, col, width, height) {
        this.row = row;
        this.col = col;
        this.width = width;
        this.height = height;
    }
}

// Position in 3D space
class Position {
    /** @type {Number} */
    x = Infinity;
    /** @type {Number} */
    y = Infinity;
    /** @type {Number} */
    z = Infinity;

    /**
        * @param {Number} x x coord in space
        * @param {Number} y y coord in space
        * @param {Number} z z coord in space
    */
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

// Width x Height dimension
class Dimension {
    /** @type {Number} */
    width = Infinity;
    /** @type {Number} */
    height = Infinity;

    /**
        * @param {Number} width The width of the tile
        * @param {Number} height the height of the tile
    */
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }
}

class PanningCamControls {
    /** @type {Boolean} */
    #enabled = false;

    /** @type {Element} */
    #element = null;

    /** @type {THREE.Camera} */
    #camera = null;

    /** @type {Number} */
    #panSpeed = 0.002;
    
    constructor (
        camera,
        element,
    ) {
        this.#camera = camera;
        this.#element = element;
    }

    /**
        * @description Set the panning speed of these controls
    */
    setPanSpeed(speed) {
        this.#panSpeed = speed;
        return this;
    }

    /**
        * @description Setup the event handlers these controls will use to rotate the camera
    */
    setup() {

    }


}
