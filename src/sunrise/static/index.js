import * as L from 'leaflet';

const $app = document.getElementById('app');
const $map = document.createElement('div');
$map.id = 'map';
$app.appendChild($map);

const map = L.map($map, {
});
map.fitBounds([
    [-35.747116, -83.949626],  // Maryville, TN
    [-35.483526, -82.987458], // Waynesville, NC
], {
    maxZoom: 10,
});
window.map = map;

const url = 'api/v1/view/?width=256&height=256&tile={z},{y},{x}';
const tileLayer = L.tileLayer(url, {
    tms: (
        // true  // y+ is north
        false  // y+ is south
    ),
});
tileLayer.addTo(map);
