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
        this.root = document.getElementById("sunrise-tile-base");
        this.camera = new Arcball(this.root, 700_0000, 700_0000, 700_0000);
        this.num_tiles = [2, 2]; // 4 x 3 grid of tiles
        this.is_dragging = false;
        this.samples = 30;
        
        // Create the tiles
        this.tiles = [];
        this.tileIDs = []
        for (let i = 0; i < this.num_tiles[0]; i++) {
            for (let j = 0; j < this.num_tiles[1]; j++) {
                this.tiles.push(new Tile(i, j, 40));
            }
        }
        this.renderTiles();

        this.is_dragging = false;

        this.missions = []
        this.hyperimage = document.getElementById('hyperimage');
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
                src="api/v1/view/?width=256&height=256&tile=40,${tile.row},${tile.col}&camera=${this.camera.camera.position.x},${this.camera.camera.position.y},${this.camera.camera.position.z}&angle=6&samples=${this.samples}" 
                style="float:left; width:380px; height:380px;"
            >`;
        });
    }

    /// @brief The run behavior of the application
    run() {
        let idx = 0;
        this.camera.animate();
        document.body.addEventListener('mousemove', (event) => {
        });
        document.body.addEventListener('mouseup', (event) => {
            console.log(`${this.camera.camera.position.x}, ${this.camera.camera.position.y}, ${this.camera.camera.position.y}`);
            this.renderTiles();
            if (this.is_dragging) {
                
            }
        });
        
    }
}

let app = new Sunrise();
app.addMission("Great Smoky Mountains", 200, 200, 200);
app.run();



// OLD index.js for pre-arcball and globe */
// import * as L from 'leaflet';
// 
// const app = {
//     angle: 6,
//     position: [0.0, 0.0, 0.0], // x, y, z
//     view: [0.0, 0.0, 0.0], // x, y, z
// 
//     get url() {
//         return `api/v1/view/?width=256&height=256&tile={z},{y},{x}&angle=${this.angle}&pos=${this.position[0]},${this.position[1]},${this.position[2]}&view=${this.view[0]},${this.view[1]},${this.view[2]}`;
//     },
// };
// 
// const $map = document.querySelector('.js--map');
// const map = L.map($map, {
// });
// map.fitBounds([
//     [35.747116, -83.949626],  // Maryville, TN
//     [35.483526, -82.987458], // Waynesville, NC
//     // [-35.747116, -83.949626],  // Maryville, TN
//     // [-35.483526, -82.987458], // Waynesville, NC
//     // [-34.0549, -118.2426],  // Los Angeles, CA
//     // [-40.7128, -74.00060], // New York, New York
// ], {
//     maxZoom: 10,
// });
// window.map = map;
// 
// const url = app.url;
// const tileLayer = L.tileLayer(url, {
//     tms: (
//         // true  // y+ is north
//         false  // y+ is south
//     ),
//     noWrap: true,
// });
// tileLayer.addTo(map);
// 
// const $input = document.querySelector('.js--angle');
// $input.value = app.angle;
// 
// $input.addEventListener('change', () => {
//     const value = +$input.value;
//     app.angle = value;
//     tileLayer.setUrl(app.url);
// });
// 
// 
// // Get camera position offset
// const $camera_position_x = document.getElementById('camPosX');
// // $camera_position_x.value = app.xpos;
// $camera_position_x.addEventListener('change', () => {
//     const value = +$camera_position_x.value;
//     app.xpos = value;
//     app.position[0] = value;
//     tileLayer.setUrl(app.url);
// });
// 
// const $camera_position_y = document.getElementById('camPosY');
// // $camera_position_y.value = app.xpos;
// $camera_position_y.addEventListener('change', () => {
//     const value = +$camera_position_y.value;
//     app.position[1] = value;
//     tileLayer.setUrl(app.url);
// });
// 
// const $camera_position_z = document.getElementById('camPosZ');
// // $camera_position_z.value = app.xpos;
// $camera_position_z.addEventListener('change', () => {
//     const value = +$camera_position_z.value;
//     app.position[2] = value;
//     tileLayer.setUrl(app.url);
// });
// 
// // 
// // const sleep = (ms) => {
// //     return new Promise(resolve => setTimeout(resolve, ms));
// // }
// 
// // let cam_y = +$camera_position_y.value;
// // for (let i = 0; i < 100; i++) {
// //     cam_y += 0.1;
// //     await sleep(1000);
// //     console.log(cam_y);
// //     app.position[1] = cam_y;
// //     // tileLayer.setUrl(app.url);
// // }
// 
// // Get camera position offset
// const $view_x = document.getElementById('viewX');
// // $view_x.value = app.xpos;
// $view_x.addEventListener('change', () => {
//     const value = +$view_x.value;
//     app.xpos = value;
//     app.view[0] = value;
//     tileLayer.setUrl(app.url);
// });
// 
// const $view_y = document.getElementById('viewY');
// // $view_y.value = app.xpos;
// $view_y.addEventListener('change', () => {
//     const value = +$view_y.value;
//     app.view[1] = value;
//     tileLayer.setUrl(app.url);
// });
// 
// const $view_z = document.getElementById('viewZ');
// // $view_z.value = app.xpos;
// $view_z.addEventListener('change', () => {
//     const value = +$view_z.value;
//     app.view[2] = value;
//     tileLayer.setUrl(app.url);
// });
