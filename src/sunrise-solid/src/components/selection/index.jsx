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
import { gotoPoint, renderer } from '../vaas';
import park from '../../assets/park.json';
import { Point } from '../../utils';

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

    // Signals for keeping track of relevant information
    const [species, setSpecies] = createSignal('');
    const [mapUrl, setMapUrl] = createSignal('Satellite');
    const [mapIsOpen, setMapIsOpen] = createSignal(false);
    const [pathJson, setPathJson] = createSignal({});

    // Event handler function to switch the values of the selection
    const speciesHandler = (event) => {
        setSpecies(event.target.value.toString());
    }

    // Callback function that sets the current choice of the url we want to use
    const mapUrlHandler = (event) => {
        setMapUrl(event.target.value.toString());
    }

    // Open the leaflet map component
    const openMap = () => {
        setMapIsOpen(!mapIsOpen());
    }

    // Callback function that gets the url we want for the styling of the leaflet tiles
    const urlCallback = () => {
        return backgroundUrls[mapUrl()];
    }

    // Create the GeoJSON from a list of coordinates
    const coordsToPath = (data) => {
        let coordinates = [];
        let skeleton = {
		    "type": "FeatureCollection",
		    "features": [

		    ]
        }
        for (let i = 0; i < data.length; i++) {
            coordinates.push([data[i]["lng"], data[i]["lat"]]);

            // Add the points that we want to diplay
            skeleton["features"].push(
                {
                    "type": "Feature",
                    "properties": {
                        "type": "Point",
                        callback: () => {renderer().goto_point(new Point(data[i]["lat"], data[i]["lng"]-13, data[i]["alt"]));}
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
                    "type": "LineString",
                    "coordinates": coordinates
                }
            }
        );
	    
        return skeleton;
    }

    onMount(() => {
        setPathJson(
            coordsToPath(park)
        );
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
            
            <div class={styles.verticalMarker}></div>

            {/**/}
            <div class={styles.rendererSelections}>
                <Button 
                    variant="contained" 
                    sx={{ 
                            backgroundColor: 'green', 
                            '&:hover': {
                                backgroundColor: 'lightgreen',
                                color: 'green',
                            }
                    }}
                    onClick={() => {
                        renderer().goto_point(new Point(35.4082, -84.01449-13, 999));
                    }}
                    >Go to Park</Button>
                <Button 
                    variant="contained" 
                    sx={{ 
                            backgroundColor: '#CC5500', 
                            '&:hover': {
                                backgroundColor: '#FFD254',
                                color: '#CC5500',
                            }
                    }}
                    
                    >Play Sunrise</Button>
            </div>
        </div>
    );
}
