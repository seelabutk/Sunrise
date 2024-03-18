import { Arcball } from "arcball"
class Tile {
    constructor() {
    }

    create(x, y, zoom) {
        this.x = x;
        this.y = y;
        this.zoom = zoom;
    
        return this;
    }
}

class Sunrise {
    constructor() {

        this.num_tiles = [2, 2]; // 4 x 3 grid of tiles

        this.tiles = [];

        let idx = 0;
        let root = document.getElementById("sunrise-tile-base");
        this.camera = new Arcball(root);
        this.root = root;
        for (let i = 0; i < this.num_tiles[0]; i++) {
            for (let j = 0; j < this.num_tiles[1]; j++) {
                root.innerHTML += 
                `<img 
                    class="sunrise-tile-img" 
                    id="sunrise-tile-${idx}" 
                    src="http://160.36.58.111:5000/api/v1/view/?width=256&height=256&tile=40,${i},${j}&camera=${this.camera.camera.position.x},${this.camera.camera.position.y},${this.camera.camera.position.z}&angle=6" 
                    style="float:left; width:380px; height:380px;"
                >`;
                idx += 1;
            }   
        }

        this.is_dragging = false;

        this.hyperimage = document.getElementById('hyperimage');
        // this.create_tiles();
    }

    create_tiles() {
        let root = document.getElementById("sunrise-tile-base");
        let idx = 0;
        for (let tile in this.tiles) {
            root.innerHTML += 
            `<img 
                class="sunrise-tile-img" 
                id="sunrise-tile-${idx}" 
                src="http://160.36.58.111:5000/api/v1/view/?width=256&height=256&tile=40,${tile.x},${tile.y}&angle=6" 
                style="float:left; width:380px; height:380px;"
            >`;
            idx += 1;
        }
    }

    run() {
        this.camera.animate();
        document.body.addEventListener('mousemove', (event) => {
            console.log(`${this.camera.camera.position.x}, ${this.camera.camera.position.y}, ${this.camera.camera.position.y}`);
            if (this.is_dragging) {
                // We are already holding down and dragging
                
                let y = event.clientY;
                let x = event.clientX;
                // console.log(`${x}, ${y}`);
                this.rotate(x, y);
            }
        });
        
    }
}

let app = new Sunrise();
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
