import * as L from 'leaflet';

// Class for the Leaflet map
export class Map {
    config = null;
    // map = null;
    url = null;
    tile_layer = null;
    markers = [];

    constructor(url) {
        console.log(`Map: ${url}`);

        this.config =  {
            angle: 6,
            position: [0.0, 0.0, 0.0],

            get url() {
                return url;
                // return `http://160.36.58.111:3000/api/v1/view/?width=256&height=256&tile={z},{y},{x}&angle=6&pos=0.0,0.0,0.0`;
            }
        };
        
        const $map = document.querySelector('.js--map');
        this.map = L.map($map, {});
        this.map.fitBounds([
            [35.747116, -83.949626],  // Maryville, TN
            [35.483526, -82.987458], // Waynesville, NC
            // [-35.747116, -83.949626],  // Maryville, TN
            // [-35.483526, -82.987458], // Waynesville, NC
            // [-34.0549, -118.2426],  // Los Angeles, CA
            // [-40.7128, -74.00060], // New York, New York
        ], {
            maxNativeZoom: 13,
            minNativeZoom: 9,
            maxZoom: 13,
            minZoom: 9,
        });
        window.map = this.map;

        this.url = this.config.url;
        this.tile_layer = L.tileLayer(this.url, {
            tms: (
                // true // y+ is north
                false  // y+ is south
            ),
            maxNativeZoom: 13,
            minNativeZoom: 9,
            maxZoom: 13,
            minZoom: 9,
            noWrap: true,
        });
        this.tile_layer.addTo(this.map);
    }

    /// @brief Change the url for the request to the new 
    ///        specified one
    set_url(url) {
        this.url = url;
        this.tile_layer = L.tileLayer(this.url, {
            tms: (
                // true, // y+ is north
                false  // y+ is south
            ),
            maxNativeZoom: 13,
            minNativeZoom: 9,
            maxZoom: 13,
            minZoom: 9,
            noWrap: true,
        });
        this.map.removeLayer(this.tile_layer);
        this.tile_layer = L.tileLayer(this.url, {
            tms: (
                // true, // y+ is north
                false  // y+ is south
            ),
            noWrap: true,
        });
        this.tile_layer.addTo(this.map);
    }

    add_marker(lat, lng, callback) {
        let m = new L.marker([lat, lng]);
        m.on('click', callback);

        this.markers.push(m);
        m.addTo(this.map);
    }
}
