import { 
    Point, 
    linear_interp, 
    species_lookup_by_irma_id, 
    wikipedia_query 
} from '../../utils';
import {
    gotoPoint,
    renderFrame
} from '../vaas';
import  { createSignal } from 'solid-js';


export const [pathIndex, setPathIndex] = createSignal(0);
export const [pathIsPlaying, setPathIsPlaying] = createSignal(false);

let path = [];

/** @description Play the animation of moving through the appalachian trail */
export async function pathAnimationCallback() {
    if (pathIsPlaying()) {
        setPathIsPlaying(false);
        return;
    } else {
        setPathIsPlaying(true);
    }

    while (pathIsPlaying()) {
        setPathIsPlaying(true);
        for (let i = pathIndex(); i < path.length-1; i++) {
            await new Promise((res) => {
                if (!pathIsPlaying()) {
                    return;
                }
                gotoPoint(path[i], mean_path_position(i+1, 5));
                renderFrame("low");
                setTimeout(res, 50);
                setPathIndex(i+1);
            });
        }
    }
}

/** 
    * @description Get a point that is from the averages of 'range' on either direction along the path 
    * @param {Number} index The index in the array we want to find the mean at
    * @param {Number} range The range on either side of the index we want to include when calculating the mean
*/
export function mean_path_position(index, range) {
    let mean_lat = 0;
    let mean_lng = 0;
    let mean_alt = 0;

    let begin = Math.max(index - range, 0);
    let end = Math.min(index + range, path.length);
  
    // Loop <range> indices ahead and average the components of the positions
    for (
        let i = begin;
        i < end;
        i++
    ) {
        mean_lat += path[i].lat;
        mean_lng += path[i].lng;
        mean_alt += path[i].alt;
    }

    return new Point(Math.floor(mean_lat / (end-begin)), Math.floor(mean_lng / (end-begin)), Math.floor(mean_alt / (begin-end)));
}

/** 
    * @description Create the GeoJSON from a list of coordinates
    * @param {[]} data The coordinate data for the path we want to create
*/
export const coordsToPath = (data) => {
    let coordinates = [];
    let skeleton = {
        "type": "FeatureCollection",
        "features": [

        ]
    }
    for (let i = 1; i < data.length; i++) {
        coordinates.push([data[i]["lng"], data[i]["lat"]]);

        const INTERP_STEPS = 20;
        const prev = new Point(data[i - 1]['lat'], data[i - 1]['lng']-13, data[i - 1]['alt']);
        const curr = new Point(data[i]['lat'], data[i]['lng']-13, data[i]['alt']);
        path.push(prev);
        let j = 0;
        for (j = 0; j < INTERP_STEPS; j++) {
            path.push(new Point(
                linear_interp(prev.lat, curr.lat, j / INTERP_STEPS),
                linear_interp(prev.lng, curr.lng, j / INTERP_STEPS),
                linear_interp(prev.alt, curr.alt, j / INTERP_STEPS),
            ));
        }
        // Add the points that we want to diplay
        let type = "";
        if (data[i]["lat"] === 35.5621322 && data[i]["lng"] === -83.5035302) {
            type = "Dome";
        } else {
            type = "Point";
        }
        skeleton["features"].push(
            {
                "type": "Feature",
                "properties": {
                    "type": type,
                    // "type": "Point",
                    callback: () => {
                        setPathIndex(i);
                        gotoPoint(prev, curr);
                        renderFrame("high");
                        // gotoPoint(new Point(data[i]["lat"], data[i]["lng"]-13, data[i]["alt"]), i);
                    },
                    openPopup: () => {
                    },
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [data[i]["lng"], data[i]["lat"]]
                }
            }
        );
    }

    // Add the path of points for the line
    skeleton["features"].push(
        {
            "type": "Feature",
                "properties": {
                    "type": "LineString",
                },
            "geometry": {
                "style": {
                    "color": "#ffffff",
                },
                "type": "LineString",
                "coordinates": coordinates
            },
        }
    );
    
    return skeleton;
}
