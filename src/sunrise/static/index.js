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
        // points.push(new Position(6358103.527489264, 6348875.3480008375, 6262571.804699995));
        points.push(new Position(893043.8990594397, 4038936.4694766635, -5389919.75178295));
        

        this.path = new Path(points);
    }
}

/* Sunrise Application */
class Sunrise {
    constructor() {
        this.highres = 512;
        this.lowres = 64;
        this.hyperimage = document.getElementById('hyperimage');
        this.root = document.getElementById("sunrise-tile-base");
        this.camera = null;
        this.zoom = 3000;

        let original_position = $V([7000000, 7000000, 7000000, 1]);
        // let original_position = $V([0, 0, this.zoom, 1]);
        this.#setup_camera(original_position);
        
        // this.camera = new Arcball(this.hyperimage, 7000000, 7000000, 7000000);
        this.num_tiles = [2, 2]; // 4 x 3 grid of tiles
        this.samples = 30;
        this.is_dragging = false;

        this.loading = false;

        // Camera movement bookeeping
        this.dimension = this.highres; // the x, y dimension of each tile
        this.timeout = null;
        this.throttlepause = false;
        
        // Create the tiles
        this.tiles = [];
        this.tileIDs = []
        for (let i = 0; i < this.num_tiles[0]; i++) {
            for (let j = 0; j < this.num_tiles[1]; j++) {
                this.tiles.push(new Tile(i, j, 40));
            }
        }

//        let plist = [
//            new Position(this.camera.camera.position.x, this.camera.camera.position.y, this.camera.camera.position.z),
//            new Position(7817434.156790381, 9195626.52974075, -1152465.1533886464),
//            // new Position(4102717.909090294,5310907.385761213,-5483181.110617719),
//            // new Position(933326.3859863493,3912455.5863275626,-5369631.879718453),
//            // new Position(146.5 * 1010, 3705.1 * 1010, -5180.8 * 1010),
//        ];
//        this.path = new Path(plist);

        this.missions = []

        // Remove click events for images
        let imgs = document.getElementsByTagName('img');
        this.renderTiles();
        for (let i = 0; i < imgs.length; i++) {
            imgs[i].onclick = null;
        }

        this.rendererUpdate(this.dimension);
    }

    #setup_camera(position, up) {
        this.camera = new ArcBall();
        this.camera.up = ([0, 1, 0, 1.0]);
        this.camera.position = (position);

        this.camera.setBounds(window.innerWidth, window.innerHeight);
        // this.camera.setBounds(this.settings.width, this.settings.height);
        this.camera.zoomScale = this.camera.position.elements[2];
    }

    async makeRequest(tile) {
        const res = await fetch(`api/v1/view/?width=${this.dimension}&height=${this.dimension}&tile=40,${tile.row},${tile.col}&camera=${this.camera.camera.position.x},${this.camera.camera.position.y},${this.camera.camera.position.z}&angle=6&samples=${this.samples}`);
        // const res = await fetch(`api/v1/view/?width=${this.dimension}&height=${this.dimension}&tile=40,${tile.row},${tile.col}&camera=${this.camera.camera.position.x},${this.camera.camera.position.y},${this.camera.camera.position.z}&angle=6&samples=${this.samples}`);
        return res.blob();
    }

    /// @brief This is for when the mouse is mouse is pressed to drag the camera
    onMouseDown() {
        this.hyperimage.addEventListener("mousemove", this.onMouseMove.bind(this), false);//.(this);
        this.hyperimage.addEventListener("mouseup", this.onMouseUp.bind(this), false);//.(this);

        this.dimension = this.lowres;
        // this.dimension = 128;
        this.rendererUpdate("");
        this.#delayUpdate();
    }

    /// @brief This is for when the mouse is released when dragging the camera
    onMouseUp() {
        this.hyperimage.removeEventListener('mousemove', this.onMouseMove.bind(this), false);//.(this);
        this.hyperimage.removeEventListener('mouseup', this.onMouseUp.bind(this), false);//.(this);

        this.dimension = this.highres;
        this.rendererUpdate('up');
        this.#delayUpdate();
    }

    /// @brief This is for when the mouse is moving while dragging the camera
    onMouseMove() {
        this.rendererUpdate('move');
        this.#delayUpdate();
    }

    /// @brief Update the renderer
    rendererUpdate(msg) {
        // document.getElementById("movement").innerHTML = this.dimension;
        // console.log(msg);
        this.renderTiles();
        // console.log(`${this.camera.camera.position.x}, ${this.camera.camera.position.y}, ${this.camera.camera.position.y}`);
    }

    #delayUpdate() {
        if (this.timeout !== null) {
            clearTimeout(this.timeout);
        }

        // this.dimension = 128;
        this.timeout = setTimeout(this.#onTimeout.bind(this), 500);
    }

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

    #onTimeout() {
        clearTimeout(this.timeout);
        this.timeout = null;
        this.rendererUpdate(256);
        this.dimension = 256;
    }

    // @brief Create a new mission and push it to the application's list
    addMission(name, x, y, z) {
        this.missions.push(new Mission(name, x, y, z));
        return this;
    }

    /// @brief Render HTML for selecting the missions
    renderMissions() {
        // TODO: render a button for each mission added to the application 
    }

    // @brief Render HTML for each image tile we want 
    renderTiles() {
        var m = $M(this.camera.Transform);
        m = m.inverse();

        var new_camera_position = m.multiply(this.camera.position);
        var new_camera_up = m.multiply(this.camera.up);

        var precision = 3;
        var x = new_camera_position.elements[0].toFixed(precision);
        var y = new_camera_position.elements[1].toFixed(precision);
        var z = new_camera_position.elements[2].toFixed(precision);

        console.log(`X: ${x}, Y: ${y}, Z: ${z}`);


        this.root.innerHTML = ""
        this.tiles.forEach((tile, index) => {
            this.root.innerHTML += 
                // change to relative path when using env file
            `<img 
                class="sunrise-tile-img" 
                id="sunrise-tile-${index}" 
                src="api/v1/view/?width=${this.dimension}&height=${this.dimension}&tile=40,${tile.row},${tile.col}&camera=${x},${y},${z}&angle=6&samples=${this.samples}"
                style="float:left; width:380px; height:380px; pointer-events: none;"
            >`;
        });
        // src="api/v1/view/?width=${this.dimension}&height=${this.dimension}&tile=40,${tile.row},${tile.col}&camera=${this.camera.camera.position.x},${this.camera.camera.position.y},${this.camera.camera.position.z}&angle=6&samples=${this.samples}"
    }

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

    smoothUpdate() 
    {
        var p = this.getCameraInfo().position;
        var orig_p = p;
        var up = this.getCameraInfo().up;
        var step = 0.05;
        while (step < 1.0)
        {
            p[0] = (end_p[0] - orig_p[0]) * step;
            p[1] = (end_p[1] - orig_p[1]) * step;
            p[2] = (end_p[2] - orig_p[2]) * step;
            var self = this;
            setTimeout(function(){
                self.do_action("position(" + p.slice(0, 3).toString() + ")");
                console.log(p, step);
            }, 20);
            step += 0.05;
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

    async updateTiles() {
        // let tiles = document.getElementsByTagName('img');
        let tilebase = this.root.cloneNode(true);
        let tiles = tilebase.getElementsByTagName('img');
        console.log(tiles);
        let ready = 0;
        
        var m = $M(this.camera.Transform);
        m = m.inverse();
        var new_camera_position = m.multiply(this.camera.position);
        var new_camera_up = m.multiply(this.camera.up);

        var precision = 3;
        var x = new_camera_position.elements[0].toFixed(precision);
        var y = new_camera_position.elements[1].toFixed(precision);
        var z = new_camera_position.elements[2].toFixed(precision);

        console.log(`X: ${x}, Y: ${y}, Z: ${z}`);
        
        for (let i = 0; i < tiles.length; i++) {
            let new_tile = tiles[i].cloneNode(false);
            new_tile.addEventListener('load', () => {
                ready += 1;
                tiles[i].replaceWith(new_tile);
                if (ready === 3) {
                    this.root.replaceWith(tilebase);
                    this.root = tilebase;
                }
            });
            new_tile.src = `api/v1/view/?width=${this.dimension}&height=${this.dimension}&tile=40,${this.tiles[i].row},${this.tiles[i].col}&camera=${x},${y},${z}&angle=6&samples=${this.samples}`;
            // new_tile.src = `api/v1/view/?width=${this.dimension}&height=${this.dimension}&tile=40,${this.tiles[i].row},${this.tiles[i].col}&camera=${this.camera.camera.position.x},${this.camera.camera.position.y},${this.camera.camera.position.z}&angle=6&samples=${this.samples}`;
        }
    }

    /// @brief The run behavior of the application
    async run() {
        // this.camera.animate();
        
        document.body.addEventListener('mousedown', (event) => {
            this.dimension = this.lowres;
            // this.dimension = 128;
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

            // this.updateTiles();
            // console.log(`${this.camera.camera.position.x}, ${this.camera.camera.position.y}, ${this.camera.camera.position.z}`);
         });

//        const sleepNow = (delay) => new Promise((resolve) => setTimeout(resolve, delay))
//        for (let campos = this.path.forward(); campos = this.path.forward(); campos !== null) {
//            console.log(`P: ${campos.x}, ${campos.y}, ${campos.z}`);
//            this.dimension = this.lowres;
//            this.camera.setPosition(campos.x, campos.y, campos.z);
//            this.updateTiles();
//            await sleepNow(100);
//        }
        this.dimension = this.highres;
        this.updateTiles();
        console.log("path done");
    }
}

let app = new Sunrise();
// app.addMission("Great Smoky Mountains", 200, 200, 200);
app.run();
