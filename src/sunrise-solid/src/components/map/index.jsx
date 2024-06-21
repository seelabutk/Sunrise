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
                    // color: "green",
                    weight: 10,
                    opacity: 1.0,
                }
            },
            pointToLayer: (feature, latlng) => {
                if (feature.properties.type === "Point") {
                    let circle = L.circleMarker(latlng, {
                        radius: 5,
                        tolerance: 10,
                        color: '#00006f',
                    });
                    circle.on('click', () => {
                        feature.properties.callback()
                    });
                    return circle;
                } else if (feature.properties.type === "Dome") {
                    let circle = L.circleMarker(latlng, {
                        radius: 5,
                        tolerance: 10,
                        color: 'yellow',
                    });
                    circle.on('click', () => {
                        feature.properties.callback()
                    });
                    circle.bindPopup(
                        <div>
                            <a target="_" href="" style="display: flex; flex-direction: column; align-items: center;">
                                <h3>Clingmans Dome</h3>
                            </a>
                            <p style="font-size: 16px;">
                                A mountain in the Great Smoky Mountains of Tennessee and North Carolina in the Southeastern United States. Its name in Cherokee is Kuwahi or Kuwohi[4] (ᎫᏩᎯ or ᎫᏬᎯ), meaning "mulberry place." 
                            </p>
                            <p style="font-size: 16px;">
                                At an elevation of 6,643 feet (2,025 m), it is the highest mountain in the Great Smoky Mountains National Park, the highest point in the state of Tennessee, and the highest point along the 2,192-mile (3,528 km) Appalachian Trail. It is also the third highest point in eastern mainland North America, after Mount Mitchell (6,684 feet or 2,037 metres) and Mount Craig (6,647 feet or 2,026 metres).
                            </p>
                        </div>
                    );
                    circle.on('mouseover', () => {
                        circle.openPopup();
                    });
                    // TODO: Close popup without clicking? 
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
