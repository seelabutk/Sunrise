// import { Arcball } from "arcball"
import { ArcBall } from "tapestry-arcball"
import { Path, Position } from "path"

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

        this.primary = document.createElement('canvas');
        this.primary.width = this.canvasSize;
        this.primary.height = this.canvasSize;
        this.hyperimage.appendChild(this.primary);

        this.secondary = document.createElement('canvas');
        this.secondary.width = this.canvasSize;
        this.secondary.height = this.canvasSize;

        this.highres = 512;
        this.lowres = 64;
        this.hyperimage = document.getElementById('hyperimage');
        this.root = document.getElementById("hyperimage");
        this.camera = null;
        this.zoom = 3000;
        this.scroll_counter = 0;
        this.scroll_cma = 0;

        let original_position = $V([7000000, 7000000, 7000000, 1]);
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

        /* KEEP This is the points list for testing */
//        let plist = [
//            new Position(this.camera.camera.position.x, this.camera.camera.position.y, this.camera.camera.position.z),
//            new Position(7817434.156790381, 9195626.52974075, -1152465.1533886464),
//            // new Position(4102717.909090294,5310907.385761213,-5483181.110617719),
//            // new Position(933326.3859863493,3912455.5863275626,-5369631.879718453),
//            // new Position(146.5 * 1010, 3705.1 * 1010, -5180.8 * 1010),
//        ];
//        this.path = new Path(plist);

        this.missions = []

        this.rendererUpdate(this.dimension);
    }

    /// @briefSetup the camera to desired initial values
    /// @returns Nothing
    #setup_camera(position, up) {
        this.camera = new ArcBall();
        this.camera.up = ([0, 1, 0, 1.0]);
        this.camera.position = (position);

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
            const new_camera_up = m.multiply(this.camera.up);

            const precision = 3;
            const x = new_camera_position.elements[0].toFixed(precision);
            const y = new_camera_position.elements[1].toFixed(precision);
            const z = new_camera_position.elements[2].toFixed(precision);

            let url = new URL('api/v1/view/', window.location.origin);
            url.searchParams.append('width', this.dimension);
            url.searchParams.append('height', this.dimension);
            url.searchParams.append('tile', `40,${this.definitions[i].row},${this.definitions[i].col}`);
            url.searchParams.append('camera', `${x},${y},${z}`);
            //url.searchParams.append('camera', `${this.camera.camera.position.x},${this.camera.camera.position.y},${this.camera.camera.position.z}`);
            url.searchParams.append('angle', '6');
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

    /// @brief Update the camera to the current information after moving
    /// @return The new camera positions and the up vector
    updateCameraInfo() {
        var m = $M(this.camera.Transform);
        m = m.inverse();

        var new_camera_position = m.multiply(this.camera.position);
        var new_camera_up = m.multiply(this.camera.up);

        var x = new_camera_position.elements[0];
        var y = new_camera_position.elements[1];
        var z = new_camera_position.elements[2];

        var upx = new_camera_up.elements[0];
        var upy = new_camera_up.elements[1];
        var upz = new_camera_up.elements[2];

        return { position: new_camera_position.elements, up: new_camera_up.elements };
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
    /// @brief The run behavior of the application
    async run() {
        document.body.addEventListener('mousedown', (event) => {
            this.dimension = this.lowres;
            this.is_dragging = true;
            this.camera.LastRot = this.camera.ThisRot;
            this.camera.click(event.clientX - this.root.getBoundingClientRect().left, event.clientY - this.root.getBoundingClientRect().top);
         });
         document.body.addEventListener('mousemove', (event) => {
            this.#throttle(() => {
                if (this.is_dragging) {
                    console.log("move");
                    var mouse_x = event.clientX - this.root.getBoundingClientRect().left;
                    var mouse_y = event.clientY - this.root.getBoundingClientRect().top;
                    //self.rotate(mouse_x, mouse_y, self.get_low_resolution()); // Render low quality version
                    this.rotate(mouse_x, mouse_y);
                    this.updateTiles();

                }
            }, 100);
         });
         
        document.body.addEventListener('mouseup', (event) => {
            this.dimension = this.highres;

            var mouse_x = event.clientX - this.root.getBoundingClientRect().left;
            var mouse_y = event.clientY - this.root.getBoundingClientRect().top;

            this.rotate(mouse_x, mouse_y); // Render high quality version
            this.is_dragging = false;
            this.updateTiles();
        });

        document.body.addEventListener('wheel', (event) => {
            this.#throttle(() => {
                // console.log("ZOOM");
                // Normalize the scroll speed using a cumulative moving average
                var delta_sign = event.deltaY < 0 ? -1 : 1;
                // var delta_sign = event.originalEvent.deltaY < 0 ? -1 : 1;
                var delta = Math.abs(event.deltaY);
                this.scroll_cma = (this.scroll_cma * this.scroll_counter + delta) * 
                    1.0 / (this.scroll_counter + 1);
                delta = delta_sign * delta / this.scroll_cma;
                delta *= 600000;
                this.scroll_counter++; // this will grow indefinitely, must fix later

                this.camera.zoomScale -= delta;
                this.camera.position.elements[2] = this.camera.zoomScale;
                this.dimension = this.lowRes;
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

let app = new Sunrise(document.getElementById('hyperimage'), {
});
// app.addMission("Great Smoky Mountains", 200, 200, 200);
app.run();
