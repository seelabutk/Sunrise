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
import { gotoPoint, gotoPark, renderFrame, setObservation, setRendererTime } from '../vaas';
import park from '../../assets/park.json';
import { Point, linear_interp, species_lookup_by_irma_id, wikipedia_query } from '../../utils';

// TODO: Remove this array and use data from the configuration instead
const species_list = [
    { 
        name: "Malloch`S Non-Biting Midge", 
        irma_id: "0000223" 
    },
    { 
        name: "Sugar Maple", 
        irma_id: "0000341" 
    },
    { 
        name: "Greater Red Dart", 
        irma_id: "0000172" 
    },
];

/**
    * @description Find a species with the name in the list
    * @param {String} name The common name of the species
*/
function find_species_by_id(id) {
    for(let i = 0; i < species_list.length; i++) {
        if (species_list[i].irma_id === id) {
            return species_list[i];
        }
    }

    return null;
}
export const [species, setSpecies] = createSignal(species_list[0]);

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

    const sunVegaSpec = {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        description: 'A simple bar chart with embedded data.',
        data: {
            "sequence": {
              "start": 0,
              "stop": 24,
              "step": 0.25,
              "as": "x"
            }
        },
        transform: [
            {
                calculate: "sin(datum.x)",
                as: "sin(x)",
            },
            {
                calculate: "cos(datum.x)",
                as: "cos(x)",
            },
        ],
        width: 'container',
        height: 'container',
        mark: 'line',
        encoding: {
            x: {field: 'x', type: 'quantitative', axis: null},
            y: {field: 'sin(x)', type: 'quantitative', axis: null}
        }
    };

    // Signals for keeping track of relevant information
    const [mapUrl, setMapUrl] = createSignal('Satellite');
    const [pathIndex, setPathIndex] = createSignal(0);
    const [pathIsPlaying, setPathIsPlaying] = createSignal(false);
    const [mapIsOpen, setMapIsOpen] = createSignal(false);
    const [pathJson, setPathJson] = createSignal({});

    // Event handler function to switch the values of the selection
    const speciesHandler = (event) => {
        const s = find_species_by_id(event.target.value.toString());
        setSpecies(s);
        setObservation(s.irma_id);
        renderFrame();
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

    let path = [];

    /** @description Play the animation of moving through the appalachian trail */
    async function pathAnimationCallback() {
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

    /** @description Get a point that is from the averages of 'range' on either direction along the path */
    function mean_path_position(index, range) {
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

    function pausePath() {
        setPathIsPlaying(false);
        renderFrame("high");
    }

    // Create the GeoJSON from a list of coordinates
    const coordsToPath = (data) => {
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

    onMount(() => {
        vegaEmbed("#sunPlot", sunVegaSpec);
        setPathJson(
            coordsToPath(park)
        );
    });

    const [currHour, setCurrHour] = createSignal(new Date().getHours());
    const [sunriseIsPlaying, setSunriseIsPlaying] = createSignal(false);
    async function sunriseAnimation() {
        if (sunriseIsPlaying()) {
            setSunriseIsPlaying(false);
            return;
        } else {
            setSunriseIsPlaying(true);
        }
        const STEP = 0.1;
        const END = new Date().getHours() + 24;

        while (currHour() < END && sunriseIsPlaying()) {
            await new Promise((res) => {
                setRendererTime(currHour());
                renderFrame("low");
                
                setCurrHour(currHour()+STEP);
                setTimeout(res, 50)
            });
        }

        if (sunriseIsPlaying()) {
            setCurrHour(new Date().getHours() - 5);
        }
        setSunriseIsPlaying(false);
    }

    function endSunriseAnimation() {
        renderFrame("high");
        setSunriseIsPlaying(false);
    }

    /** @description Get the related species from the species that we are looking at currently */
    async function getSpeciesRecs() {
        const base = "http://sahara.eecs.utk.edu:5000";
        let url = new URL('api/reccomendation', base);
        url.searchParams.append('irma_id', '29846');

        try {
            const response = await fetch(
                url,
                {
                    method: "GET",
                    mode: 'cors',
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }

            const json = await response.json();
            let related = json.related_species;
            console.log(related);
            
            let recs = []
            for (let i = 0; i < related.length; i++) {
                recs.push(species_lookup_by_irma_id(json.related_species[i]));
            }
            setSpeciesRecs(recs);
        } catch (error) {
            console.error(error.message);
        }
    }

    async function getSpeciesInfo() {
        const base = "http://sahara.eecs.utk.edu:5000";
        let url = new URL('api/wikipedia', base);
        url.searchParams.append('irma_id', '0029846');

        try {
            const response = await fetch(
                url,
                {
                    method: "GET",
                    mode: 'cors',
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }

            const json = await response.json();
            setSpeciesInfo(json);
        } catch (error) {
            console.error(error.message);
        }
     }

    const [infoIsOpen, setInfoIsOpen] = createSignal(false);
    const [speciesRecs, setSpeciesRecs] = createSignal([]);
    const [speciesInfo, setSpeciesInfo] = createSignal({});
    const openSpeciesInfo = async () => {
        await getSpeciesInfo();
        await getSpeciesRecs();
        setInfoIsOpen(!infoIsOpen());
    }

    return (
        <div class={styles.container}>
            <div class={styles.species}>
                <div style="width: 70%; display: flex; flex-direction: row; gap: 1vw;">
                    <label style="color: white">Species: </label>
                    <Select 
                        id='species-selector'
                        displayEmpty
                        defaultValue=""
                        value={species().irma_id}
                        sx={{
                            width: '100%',
                            height: '3vh',
                            background: '#3e3e3e',
                            color: 'white',

                            '& > fieldset': { border: 'none'},
                        }}
                        onChange={speciesHandler}
                    >
                        <For each={species_list}>{
                            species => <MenuItem value={species.irma_id}>{species.name}</MenuItem>
                        }</For>
                    </Select>
                    <Button variant="outlined" onClick={openSpeciesInfo} sx={{color: 'white', border: '1px solid white'}}>View More</Button>
                    <Dialog
                        maxWidth='md'
                        open={infoIsOpen()}
                        onClose={openSpeciesInfo}
                    >
                        <DialogTitle sx={{backgroundColor: '#141414', color: 'white'}}>{species().name}</DialogTitle>
                        <DialogContent sx={{backgroundColor: '#141414'}}>
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                backgroundColor: '#1e1e1e',
                            }}
                        >
                            <div class={styles.species_info_container}>
                                <div class={styles.species_info}>
                                    <img src={speciesInfo().image} height="80px"/>
                                    {speciesInfo().summary}
                                </div>
                                <div class={styles.related}>
                                    You may also be interested in:
                                    <For each={speciesRecs()}>{
                                        related => <Button 
                                                        variant='outlined' 
                                                    sx={{
                                                        width: '70%',
                                                        color: 'white',
                                                        border: '0',
                                                        borderBottom: '1px solid white',
                                                        borderRadius: '0',

                                                        '&:hover': {
                                                            border: '0',
                                                            backgroundColor: 'gray',
                                                        }
                                                    }}
                                                    >{related.common_name}</Button>
                                    }</For>
                                </div>
                            </div>
                        </Box>
                        </DialogContent>
                    </Dialog>
                </div>
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
                        gotoPark();
                    }}
                    >Go to Park</Button>
                <Button 
                    variant="contained" 
                    sx={{ 
                            backgroundColor: '#eb9f34', 
                            '&:hover': {
                                backgroundColor: '#FFD254',
                                color: '#CC5500',
                            }
                    }}
                    onMouseDown={() => {
                        pathAnimationCallback();
                    }}
                    onMouseUp={() => {
                        pausePath();
                    }}
                    
                    >Play Path</Button>
                <Button 
                    variant="contained" 
                    sx={{ 
                            backgroundColor: '#CC5500', 
                            '&:hover': {
                                backgroundColor: '#FFD254',
                                color: '#CC5500',
                            }
                    }}
                    onMouseDown={() => {
                        sunriseAnimation();
                        // playSunrise();
                    }}
                    onMouseUp={() => {
                        endSunriseAnimation();
                    }}
                    
                    >Play Sunrise</Button>
                    
                {/*<label style="color: white">Time:</label>
                <div id="sunPlot" style="width: 30%; height: 90%;"></div>*/}
            </div>
        </div>
    );
}
