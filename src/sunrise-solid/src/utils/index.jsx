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
