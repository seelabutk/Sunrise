import styles from './map.module.css';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';

import {
    onMount
} from 'solid-js'

export const Map = (props) => {
    const urlCallback = (props) => props.urlCallback;
    const pathData = (props) => props.pathData;
    onMount(() => {
        let url = urlCallback(props);
        const map = L.map(styles.selection_map)
            .fitBounds([
                [35.58730848427449, -83.57321222420362],
                [35.40251013833028, -84.0265365333673], 
            ], {
                maxZoom: 13,
                minZoom: 9,
            });
          
        // Create the layer of tiles using the URL specified from the parent component
        L.tileLayer(
            url(),
            {}
        ).addTo(map);

        // Create the layer of the line across the path that we want to follow
        L.geoJSON(pathData(props), {
            style: (feature) => {
                return {
                    color: "green",
                    weight: 10,
                    opacity: 1.0,
                }
            },
            pointToLayer: (feature, latlng) => {
                if (feature.properties.type === "Point") {
                    return new L.circleMarker(latlng, {
                        radius: 2,
                        color: 'blue',
                    });
                } 
            },
            onEachFeature: () => {
            },
        }).addTo(map);
    });

    return (
        <div 
            id={styles.selection_map}
        ></div>
    );
}
