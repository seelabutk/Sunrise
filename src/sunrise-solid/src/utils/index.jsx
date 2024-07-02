import { createSignal, onCleanup } from 'solid-js';
import Species from '../assets/species.json'

/**
    * @description Represents a point in lat, lng and alt
*/
export class Point {
    lat = -1;
    lng = -1;
    alt = -1;

    constructor(
        lat,
        lng,
        alt,
    ) {
        this.lat = lat;
        this.lng = lng;
        this.alt = alt;
    }
}

/**
    * @description Find a species object based on the irma id
    * @param {Number} id The irma id of the species that we want to find
    * @param {Boolean} isnum Whether the input is a number or string. If it is a number we have to manipulate it
*/
export function species_lookup_by_irma_id(id, isnum=false) {
    // Ensure the id is in correct format
    if (isnum) {
        id = id.toString();
        while (id.length < 7) {
            id = '0' + id;
        }
    }

    for (let i = 0; i < Species.length; i++) {
        if (Species[i].irma_id == id) {
            console.log("FOUND SPECIES");
            return Species[i];
        }
    }
}

/**
    * @description Search wikipedia using their API for the query
    * @param {String} query What we are searching for
*/
export const wikipedia_query = async (searchQuery) => {
    const endpoint = `https://en.wikipedia.org/w/api.php?action=query&list=search&prop=info&inprop=url&utf8=&format=json&origin=*&srlimit=20&srsearch=${searchQuery}`;
    const response = await fetch(endpoint);
    if (!response.ok) {
        throw Error(response.statusText);
    }
    const json = await response.json();
    return json;
}

export function debounce(signalSetter, delay) {
    let timerHandle;
    function debounceSignalSetter(value) {
        clearTimeout(timerHandle);
        timerHandle = setTimeout(() => signalSetter(value), delay);
    }
    onCleanup(() => clearInterval(timerHandle));
    return debounceSignalSetter;
}

export const EARTH_AVG_ALTITUDE = 6_371_000;

/**
    * @description Convert lat, long, alt into spherical coordinates
    * @param {Number} latitude 
    * @param {Number} longitude
    * @param {Number} altitude
*/
export const convert_location_to_spatial = (
    latitude,
    longitude,
    altitude
) => {
    // Thanks https://stackoverflow.com/a/72476578
    
    const phi = to_radians(latitude);
    const theta = to_radians(longitude);

    const rho = EARTH_AVG_ALTITUDE + altitude;

    const x = Math.cos(phi) * Math.cos(theta) * rho;
    const y = Math.cos(phi) * Math.sin(theta) * rho;

    const z = Math.sin(phi) * rho;

    // (Note there's some slightly arbitrary choices here in what each axis means...
    // you might want 'y' to point at the north pole instead of 'z', for example.)
    
    // I do :)
    // y, z = z, y

    return { 
        x: x, 
        y: y, 
        z: z 
    };
}

/**
    * @description Convert degrees to radians
    * @param {Number} num The angle in degrees to convert
*/
export const to_radians = (num) => {
    return (num * Math.PI) / 180.0;
}

/// Linear interpolate between two values with 
/// `num_steps` number of intervals
/**
    * @description Use a linear interpolater to interpolate between two values
    * @param {Number} start The value of the first point
    * @param {Number} end The ending value
    * @param {Number} step The amount that we want to interpolate into
*/
export const linear_interp = (start, end, step) => {
    return start * (1-step) + end * step;
}

/**
    * @description Convert lat, lng, alt coordinates to cartesian
*/
export const latlng_to_cartesian = (latitude, longitude, altitude) => {
    const rho = 6371 + altitude;
    const phi = (latitude) * Math.PI / 180;
    const theta = (longitude) * Math.PI / 180;

    const x = rho * Math.cos(phi) * Math.cos(theta);
    const y = rho * Math.sin(phi);
    const z = rho * Math.cos(phi) * Math.sin(theta);

    return { x, y, z };
}

/** 
    * @description Same conversion as above, but returns the values in a THREE.js Vector3 class
*/
export const latlng_to_cartesian_vec3 = (latitude, longitude, altitude) => {
    const rho = 6371 + altitude;
    const phi = (latitude) * Math.PI / 180;
    const theta = (longitude) * Math.PI / 180;

    const x = rho * Math.cos(phi) * Math.cos(theta);
    const y = rho * Math.sin(phi);
    const z = rho * Math.cos(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);
}

export const mean_position = (arr, index, range) => {
    let mean_x = 0;
    let mean_y = 0;
    let mean_z = 0;

    let begin = Math.max(index - range, 0);
    let end = Math.min(index + range, arr.length);
   
    // Loop <range> indices ahead and average the components of the positions
    for (
        let i = begin;
        i < end;
        i++
    ) {
        mean_x += arr[i].x;
        mean_y += arr[i].y;
        mean_z += arr[i].z;
    }

    return new THREE.Vector3(
        mean_x / (end - begin),
        mean_y / (end - begin),
        mean_z / (end - begin)
    );
}
