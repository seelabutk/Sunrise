import * as THREE from 'three'
export const EARTH_AVG_ALTITUDE = 6_371_000;

/// Convert latitude and longitude coordinates to spherical coordinates
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

/// Convert `num` degrees to radians
export const to_radians = (num) => {
    return (num * Math.PI) / 180.0;
}

/// Linear interpolate between two values with 
/// `num_steps` number of intervals
export const linear_interp = (start, end, step) => {
    return start * (1-step) + end * step;
}

/// Convert lat, lng, alt coordinates to cartesian
export const latlng_to_cartesian = (latitude, longitude, altitude) => {
    const rho = 6371 + altitude;
    const phi = (latitude) * Math.PI / 180;
    const theta = (longitude) * Math.PI / 180;

    const x = rho * Math.cos(phi) * Math.cos(theta);
    const y = rho * Math.sin(phi);
    const z = rho * Math.cos(phi) * Math.sin(theta);

    return { x, y, z };
}

/// Same conversion as above, but returns the values in a THREE.js
/// Vector3 class
export const latlng_to_cartesian_vec3 = (latitude, longitude, altitude) => {
    const rho = 6371 + altitude;
    const phi = (latitude) * Math.PI / 180;
    const theta = (longitude) * Math.PI / 180;

    const x = rho * Math.cos(phi) * Math.cos(theta);
    const y = rho * Math.sin(phi);
    const z = rho * Math.cos(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);
}


/**
    * @description A collection of information relevant to rendering
    */
export class RenderData {
    direction = null;
    
    hour = null;

    num_cols = 0;
    num_rows = 0;

    width = 0;
    height = 0;
    blur = false;

    /**
    *   @param {number} hour The hour query parameter for the request
    *   @param {THREE.Vector3} direction The direction vector to look at 
    *   @param {number} col_count The number of columns we are requesting from the server
    *   @param {number} row_count The number of rows we are requesting from the server
    *   @param {number} width The width of the image
    *   @param {number} height The height of the image
    *   @param {boolean} blur Whether to blur the image or not
    */
    constructor(
        direction, 
        hour, 
        row_count,
        col_count, 
        width,
        height,
        blur,
    ) {
        this.direction = direction;
        this.hour = hour;
        this.num_cols = col_count;
        this.num_rows = row_count;
        this.width = width;
        this.height = height;
        this.blur = blur;
    }
}

