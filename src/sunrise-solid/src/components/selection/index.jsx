import styles from './selection.module.css';
import {
    Box,
    Select,
    MenuItem,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
} from '@suid/material';
import { createSignal, onMount } from 'solid-js';
import { Map } from '../map';
import park from '../../assets/park.json';

export function Selection() {
    // TODO: Read the config from the server to get the available urls
    const backgroundUrls = {
        "Satellite": 
            "https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoicmF1c3RpbjkiLCJhIjoiY2x3Zmg1d2psMXRlMDJubW5uMDI1b2VkbSJ9.jB4iAzkxNFa8tRo5SrawGA",
        "Streets": 
            "https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoicmF1c3RpbjkiLCJhIjoiY2x3Zmg1d2psMXRlMDJubW5uMDI1b2VkbSJ9.jB4iAzkxNFa8tRo5SrawGA",
        "Outdoors": 
            "https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoicmF1c3RpbjkiLCJhIjoiY2x3Zmg1d2psMXRlMDJubW5uMDI1b2VkbSJ9.jB4iAzkxNFa8tRo5SrawGA"
    };
    const [species, setSpecies] = createSignal('');
    const [mapUrl, setMapUrl] = createSignal('Satellite');
    const [mapIsOpen, setMapIsOpen] = createSignal(false);
    const [pathJson, setPathJson] = createSignal({});

    // Event handler function to switch the values of the selection
    const speciesHandler = (event) => {
        setSpecies(event.target.value.toString());
    }

    const mapUrlHandler = (event) => {
        setMapUrl(event.target.value.toString());
        // TODO: Change the URL of the tile layer
    }

    // Open the leaflet map component
    const openMap = () => {
        setMapIsOpen(!mapIsOpen());
    }

    const urlCallback = () => {
        return backgroundUrls[mapUrl()];
    }

    onMount(() => {
        // Create the GeoJSON from the path data json file
        let coordinates = [];
        for (let i = 0; i < park.length; i++) {
            coordinates.push([park[i]["lng"], park[i]["lat"]]);
        }
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
        setPathJson(geoData);
    });

    return (
        <div class={styles.container}>
            <div class={styles.species}>
		        <Select 
		            id='species-selector'
                    displayEmpty
                    defaultValue=""
                    value={species()}
		            sx={{
		                width: '30%',
		                height: '3vh',
		                background: '#3e3e3e',
                        color: 'white',

                        '& > fieldset': { border: 'none'},
		            }}
                    onChange={speciesHandler}
		        >
                    <MenuItem value="" disabled>
                        <em>Choose a species</em>
                    </MenuItem>
		            <MenuItem value="Oak">Oak</MenuItem>
		            <MenuItem value="Sycamore">Sycamore</MenuItem>
		            <MenuItem value="Rowan">Rowan</MenuItem>
		        </Select>
            </div>

            <div class={styles.verticalMarker}></div>

            <div class={styles.mapcontrols}>
                <p class={styles.controlsHeader}>Map Controls</p>
                <div class={styles.mapSelections}>
                    <label class={styles.urlLabel}>Tile Style:</label>
	                <Select
	                    defaultValue="Satellite"
	                    value={mapUrl()}
	                    onChange={mapUrlHandler}
			            sx={{
			                width: '30%',
			                height: '3vh',
			                background: '#3e3e3e',
	                        color: 'white',
	
	                        '& > fieldset': { border: 'none'},
			            }}
	                >
			            <MenuItem value="Satellite">Satellite</MenuItem>
			            <MenuItem value="Outdoors">Outdoors</MenuItem>
			            <MenuItem value="Streets">Streets</MenuItem>
	                </Select>

                    <Button variant="outlined" onClick={openMap} sx={{color: 'white', border: '1px solid white'}}>Open Map</Button>
                    <Dialog
                        maxWidth='md'
                        open={mapIsOpen()}
                        onClose={openMap}
                    >
                        <DialogTitle sx={{backgroundColor: '#141414', color: 'white'}}>Choose Location to View</DialogTitle>
                        <DialogContent sx={{backgroundColor: '#141414'}}>
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                backgroundColor: '#1e1e1e',
                            }}
                        >
                            <div style="height: 80vh; width: 80vw;">
                                <Map urlCallback={urlCallback} pathData={pathJson()}/>
                            </div>
                        </Box>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>
    );
}
