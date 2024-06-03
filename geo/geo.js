import * as fs from 'fs';
import { park } from './park.js'

let coordinates = [];
for (let i = 0; i < park.length; i++) {
    coordinates.push([park[i]["lng"], park[i]["lat"]]);
}
console.log(coordinates);

let geoData = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": coordinates
            }
        }
    ]
};

fs.writeFileSync('./parkGeo.json', JSON.stringify(geoData));
