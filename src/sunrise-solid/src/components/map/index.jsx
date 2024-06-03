import styles from './map.module.css';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';

import {
    createSignal,
    onMount
} from 'solid-js'

export const Map = (props) => {
    const urlCallback = (props) => props.urlCallback;
    const pathData = (props) => props.pathData;
    onMount(() => {
        let url = urlCallback(props);
        console.log(url());
        // const map = L.map('selection-map')
        const map = L.map(styles.selection_map)
            .fitBounds([
                [35.747116, -83.949626],  // Maryville, TN
                [35.483526, -82.987458], // Waynesville, NC
            ], {
                maxZoom: 13,
                minZoom: 9,
            });
           
        L.tileLayer(
            url(),
            {}
        ).addTo(map);
        console.log(pathData(props));
        L.geoJSON(pathData(props), {
            style: {
                "color": "blue",
                "weight": 10,
                "opacity": 1,
            }
        }).addTo(map);
    });

    return (
        <div 
            id={styles.selection_map}
        ></div>
    );
}
