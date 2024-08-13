
export const SUNRISE_PARK_SERVER_HOST = import.meta.env.VITE_SUNRISE_PARK_SERVER_HOST;
if (!SUNRISE_PARK_SERVER_HOST) {
    throw new Error('VITE_SUNRISE_PARK_SERVER_HOST is not set');
}

export const SUNRISE_CITY_SERVER_HOST = import.meta.env.VITE_SUNRISE_CITY_SERVER_HOST;
if (!SUNRISE_CITY_SERVER_HOST) {
    throw new Error('VITE_SUNRISE_CITY_SERVER_HOST is not set');
}
