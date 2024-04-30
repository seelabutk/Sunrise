export const EARTH_AVG_ALTITUDE = 6_371_000;

export const convert_location_to_spatial = (
    latitude,
    longitude,
    altitude
) => {
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

    return (x, y, z);
}

const to_radians = (num) => {
    return (num * Math.PI) / 180.0;
}
