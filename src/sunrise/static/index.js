import * as L from 'leaflet';

const app = {
    angle: 0,
    get url() {
        return `api/v1/view/?width=256&height=256&tile={z},{y},{x}&angle=${this.angle}`;
    },
};

const $map = document.querySelector('.js--map');
const map = L.map($map, {
});
map.fitBounds([
    [-35.747116, -83.949626],  // Maryville, TN
    [-35.483526, -82.987458], // Waynesville, NC
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
});
tileLayer.addTo(map);

const $input = document.querySelector('.js--angle');
$input.value = app.angle;

$input.addEventListener('change', () => {
    const value = +$input.value;
    app.angle = value;
    tileLayer.setUrl(app.url);
});
