import styles from './map.module.css';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';

import {
    createSignal,
    onMount
} from 'solid-js'

export const Map = (props) => {
    const width = (props) => props.width;
    onMount(() => {
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
            "https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoicmF1c3RpbjkiLCJhIjoiY2x3Zmg1d2psMXRlMDJubW5uMDI1b2VkbSJ9.jB4iAzkxNFa8tRo5SrawGA", 
            {}
        ).addTo(map);
    });

    return (
        <div 
            id={styles.selection_map}
            style={
                { width: width(props)+"px" }
            }
        ></div>
    );
}
