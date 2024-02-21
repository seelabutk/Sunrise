import * as L from 'leaflet';

const app = {
    angle: 6,
    position: [0.0, 0.0, 0.0], // x, y, z

    get url() {
        return `api/v1/view/?width=256&height=256&tile={z},{y},{x}&angle=${this.angle}&pos=${this.position[0]},${this.position[1]},${this.position[2]}`;
    },
};

const $map = document.querySelector('.js--map');
const map = L.map($map, {
});
map.fitBounds([
    [35.747116, -83.949626],  // Maryville, TN
    [35.483526, -82.987458], // Waynesville, NC
    // [-35.747116, -83.949626],  // Maryville, TN
    // [-35.483526, -82.987458], // Waynesville, NC
    // [-34.0549, -118.2426],  // Los Angeles, CA
    // [-40.7128, -74.00060], // New York, New York
], {
    maxZoom: 10,
});
window.map = map;

const url = app.url;
const tileLayer = L.tileLayer(url, {
    tms: (
        // true  // y+ is north
        false  // y+ is south
    ),
    noWrap: true,
});
tileLayer.addTo(map);

const $input = document.querySelector('.js--angle');
$input.value = app.angle;

$input.addEventListener('change', () => {
    const value = +$input.value;
    app.angle = value;
    tileLayer.setUrl(app.url);
});


// Get camera position offset
const $camera_position_x = document.getElementById('camPosX');
// $camera_position_x.value = app.xpos;
$camera_position_x.addEventListener('change', () => {
    const value = +$camera_position_x.value;
    app.xpos = value;
    app.position[0] = value;
    tileLayer.setUrl(app.url);
});

const $camera_position_y = document.getElementById('camPosY');
// $camera_position_y.value = app.xpos;
$camera_position_y.addEventListener('change', () => {
    const value = +$camera_position_y.value;
    app.position[1] = value;
    tileLayer.setUrl(app.url);
});

const $camera_position_z = document.getElementById('camPosZ');
// $camera_position_z.value = app.xpos;
$camera_position_z.addEventListener('change', () => {
    const value = +$camera_position_z.value;
    app.position[2] = value;
    tileLayer.setUrl(app.url);
});

// 
// const sleep = (ms) => {
//     return new Promise(resolve => setTimeout(resolve, ms));
// }

// let cam_y = +$camera_position_y.value;
// for (let i = 0; i < 100; i++) {
//     cam_y += 0.1;
//     await sleep(1000);
//     console.log(cam_y);
//     app.position[1] = cam_y;
//     // tileLayer.setUrl(app.url);
// }