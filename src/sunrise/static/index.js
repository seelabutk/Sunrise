import { Arcball } from "arcball"

/* Holds information for a tile within the Sunrise application */
class Tile {
    constructor(row, col, zoom) {
        this.row = row;
        this.col = col;
        this.zoom = zoom;
    }
}

/* Stores a position in 3d space */
class Position {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

/* Mission for the application */
// NOTE: x, y, z are camera coords
class Mission {
    constructor(name, x, y, z) {
        this.name = name
        this.position = new Position(x, y, z);
    }
}

/* Sunrise Application */
class Sunrise {
    constructor() {
        this.hyperimage = document.getElementById('hyperimage');
        this.root = document.getElementById("sunrise-tile-base");
        // this.camera = new Arcball(this.hyperimage, 7000000, 7000000, 7000000);
        this.camera = new Arcball(this.root, 7000000, 7000000, 7000000);
        this.num_tiles = [2, 2]; // 4 x 3 grid of tiles
        this.samples = 30;
        this.is_dragging = false;

        // Camera movement bookeeping
        this.dimension = 256; // the x, y dimension of each tile
        this.timeout = null;
        
        // Create the tiles
        this.tiles = [];
        this.tileIDs = []
        for (let i = 0; i < this.num_tiles[0]; i++) {
            for (let j = 0; j < this.num_tiles[1]; j++) {
                this.tiles.push(new Tile(i, j, 40));
            }
        }

        this.missions = []

//        if (this.hyperimage) {
//            // this.hyperimage.addEventListener("mouseup", (event) => {console.log('mouseup'); }, false);
//            this.hyperimage.addEventListener("mousedown", this.onMouseDown.bind(this), true);//.(this);
//        } else {
//            console.log(this.hyperimage);
//        }

        // Remove click events for images
        let imgs = document.getElementsByTagName('img');
        this.renderTiles();
        for (let i = 0; i < imgs.length; i++) {
            imgs[i].onclick = null;
        }

        this.rendererUpdate(this.dimension);
    }

    /// @brief This is for when the mouse is mouse is pressed to drag the camera
    onMouseDown() {
        this.hyperimage.addEventListener("mousemove", this.onMouseMove.bind(this), false);//.(this);
        this.hyperimage.addEventListener("mouseup", this.onMouseUp.bind(this), false);//.(this);

        this.dimension = 128;
        this.rendererUpdate("");
        this.#delayUpdate();
    }

    /// @brief This is for when the mouse is released when dragging the camera
    onMouseUp() {
        this.hyperimage.removeEventListener('mousemove', this.onMouseMove.bind(this), false);//.(this);
        this.hyperimage.removeEventListener('mouseup', this.onMouseUp.bind(this), false);//.(this);

        this.dimension = 256;
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
        document.getElementById("movement").innerHTML = this.dimension;
        // console.log(msg);
        this.renderTiles();
        console.log(`${this.camera.camera.position.x}, ${this.camera.camera.position.y}, ${this.camera.camera.position.y}`);
    }

    #delayUpdate() {
        if (this.timeout !== null) {
            clearTimeout(this.timeout);
        }

        // this.dimension = 128;
        this.timeout = setTimeout(this.#onTimeout.bind(this), 500);
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
        this.root.innerHTML = ""
        this.tiles.forEach((tile, index) => {
            this.root.innerHTML += 
                // change to relative path when using env file
            `<img 
                class="sunrise-tile-img" 
                id="sunrise-tile-${index}" 
                src="api/v1/view/?width=${this.dimension}&height=${this.dimension}&tile=40,${tile.row},${tile.col}&camera=${this.camera.camera.position.x},${this.camera.camera.position.y},${this.camera.camera.position.z}&angle=6&samples=${this.samples}"
                style="float:left; width:380px; height:380px; pointer-events: none;"
            >`;
        });
    }

    updateTiles() {
        let tiles = document.getElementsByTagName('img');
        for (let i = 0; i < tiles.length; i++) {
            tiles[i].src = `api/v1/view/?width=${this.dimension}&height=${this.dimension}&tile=40,${this.tiles[i].row},${this.tiles[i].col}&camera=${this.camera.camera.position.x},${this.camera.camera.position.y},${this.camera.camera.position.z}&angle=6&samples=${this.samples}`;
        }
    }

    /// @brief The run behavior of the application
    run() {
        this.camera.animate();
        
         document.body.addEventListener('mousedown', (event) => {
             this.dimension = 128;
             this.is_dragging = true;
         });
         document.body.addEventListener('mousemove', (event) => {
             let intervalId = setInterval(() => {
                 if (this.is_dragging) {
                     this.updateTiles();
                 }
             }, 1000);
         });
         document.body.addEventListener('mouseup', (event) => {
             this.dimension = 256;
             this.updateTiles();
             this.is_dragging = false;
         });
        
    }
}

let app = new Sunrise();
app.addMission("Great Smoky Mountains", 200, 200, 200);
app.run();
