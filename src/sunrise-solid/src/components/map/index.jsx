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
                [33.58730848427449, -82.57321222420362],
                [37.40251013833028, -85.0265365333673], 
            ], {
                maxZoom: 13,
                minZoom: 9,
                renderer: L.canvas({ tolerance: 30 }),
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
                    let circle = L.circleMarker(latlng, {
                        radius: 5,
                        tolerance: 10,
                        color: 'blue',
                    });
                    circle.on('click', () => {
                        feature.properties.callback()
                    });
                    return circle;
                } 
            },
            onEachFeature: () => {},
        }).addTo(map);
    });

    return (
        <div 
            id={styles.selection_map}
        ></div>
    );
}
