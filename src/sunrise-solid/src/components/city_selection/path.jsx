import { 
    Point, 
    linear_interp, 
    species_lookup_by_irma_id, 
    wikipedia_query 
} from '../../utils';
import {
    gotoPoint,
    renderFrame
} from '../city_vaas';
import  { createSignal } from 'solid-js';
import { knox } from '../../assets/knox.js';


export const [pathIndex, setPathIndex] = createSignal(0);
export const [pathIsPlaying, setPathIsPlaying] = createSignal(false);

let path = knox;

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
                gotoPoint(new Point(path[i][1], path[i][0], 1), mean_path_position(i+1, 5));
                // gotoPoint(path[i], mean_path_position(i+1, 5));
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
    let alt = 1;

    let begin = Math.max(index - range, 0);
    let end = Math.min(index + range, path.length);
  
    // Loop <range> indices ahead and average the components of the positions
    for (
        let i = begin;
        i < end;
        i++
    ) {
        mean_lng += path[i][0];
        mean_lat += path[i][1];
        mean_alt = alt;
        // mean_lat += path[i].lat;
        // mean_lng += path[i].lng;
        // mean_alt += path[i].alt;
    }

    return new Point(Math.floor(mean_lat / (end-begin)), Math.floor(mean_lng / (end-begin)), Math.floor(mean_alt / (begin-end)));
}

// /** 
//     * @description Create the GeoJSON from a list of coordinates
//     * @param {[]} data The coordinate data for the path we want to create
// */
// export const coordsToPath = (data) => {
//     let coordinates = [];
//     let skeleton = {
//         "type": "FeatureCollection",
//         "features": [

//         ]
//     }
//     for (let i = 1; i < data.length; i++) {
//         // coordinates.push([data[i]["lng"], data[i]["lat"]]);
//         coordinates.push(data[i-1][1], data[i-1[0]]);

//         const INTERP_STEPS = 20;
//         const prev = new Point(data[i - 1][1], data[i - 1][0]-13, 1);
//         const curr = new Point(data[i][1], data[i][0]-13, 1);
//         // const curr = new Point(data[i]['lat'], data[i]['lng']-13, data[i]['alt']);
//         path.push(prev);
//         let j = 0;
//         for (j = 0; j < INTERP_STEPS; j++) {
//             path.push(new Point(
//                 linear_interp(prev.lat, curr.lat, j / INTERP_STEPS),
//                 linear_interp(prev.lng, curr.lng, j / INTERP_STEPS),
//                 linear_interp(prev.alt, curr.alt, j / INTERP_STEPS),
//             ));
//         }
//         // Add the points that we want to diplay
//         let type = "";
//         if (data[i]["lat"] === 35.5621322 && data[i]["lng"] === -83.5035302) {
//             type = "Dome";
//         } else {
//             type = "Point";
//         }
//         skeleton["features"].push(
//             {
//                 "type": "Feature",
//                 "properties": {
//                     "type": type,
//                     callback: () => {
//                         setPathIndex(i);
//                         gotoPoint(prev, curr);
//                         renderFrame("high");
//                     },
//                     openPopup: () => {
//                     },
//                 },
//                 "geometry": {
//                     "type": "Point",
//                     "coordinates": [data[i]["lng"], data[i]["lat"]]
//                 }
//             }
//         );
//     }

//     // Add the path of points for the line
//     skeleton["features"].push(
//         {
//             "type": "Feature",
//                 "properties": {
//                     "type": "LineString",
//                 },
//             "geometry": {
//                 "style": {
//                     "color": "#ffffff",
//                 },
//                 "type": "LineString",
//                 "coordinates": coordinates
//             },
//         }
//     );
    
//     return skeleton;
// }
