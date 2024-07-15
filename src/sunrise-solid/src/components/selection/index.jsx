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
import { AiFillInfoCircle } from 'solid-icons/ai'
import { createSignal, onMount } from 'solid-js';
import { Map } from '../map';
import { gotoPoint, gotoPark, renderFrame, setObservation, setRendererTime } from '../vaas';
import park from '../../assets/park.json';

import { 
    setup_species, 
    find_species_by_id,
    find_in_list,
} from './species.jsx';
import { 
    coordsToPath, 
    setPathIsPlaying, 
    pathAnimationCallback 
} from './path.jsx';
import {
    getSpeciesRecs,
    getSpeciesInfo,
    speciesRecs,
    speciesInfo,
} from './reccomendation.jsx';

let species_list = setup_species();
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


    // Signals for keeping track of relevant information
    const [mapUrl, setMapUrl] = createSignal('Satellite');
    const [mapIsOpen, setMapIsOpen] = createSignal(false);
    const [pathJson, setPathJson] = createSignal({});
    const [currHour, setCurrHour] = createSignal(new Date().getHours());
    const [sunriseIsPlaying, setSunriseIsPlaying] = createSignal(false);
    const [infoIsOpen, setInfoIsOpen] = createSignal(false);

    /// HANDLERS ///
    
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

    /** @description Pause the path animation */
    function pausePath() {
        setPathIsPlaying(false);
        renderFrame("high");
    }

    onMount(() => {
        /** Uncomment for the sine plot for the day/night cycle **/
        // vegaEmbed("#sunPlot", sunVegaSpec);
        setPathJson(
            coordsToPath(park)
        );
    });

    // For the sunrise animation controls
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


    const openSpeciesInfo = async () => {
        await getSpeciesInfo(species());
        await getSpeciesRecs(species());
        setInfoIsOpen(!infoIsOpen());
    }

    const changeSpecies = (id) => {
        const s = find_in_list(id);
        setSpecies(s);
        setObservation(s.irma_id);
        getSpeciesInfo(s);
        renderFrame();
    }

    return (
        <div class={styles.container}>
            <div class={styles.species}>
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
                <Button variant="outlined" onClick={openSpeciesInfo} 
                    sx={{
                        color: '#1e92f4', 
                        border: '0',
                        fontSize: '20px',

                        '&:hover': {
                            border: '0',
                            backgroundColor: 'darkgray',
                            color: '#1A71BA',
                        }
                    }}>
                    <AiFillInfoCircle size={25}/>
                </Button>
                <Dialog
                    maxWidth='md'
                    open={infoIsOpen()}
                    onClose={openSpeciesInfo}
                >
                    <DialogTitle sx={{backgroundColor: '#141414', color: 'white'}}>{species().name}Name</DialogTitle>
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
                                <div class={styles.species_summary}>
                                    {speciesInfo().summary}
                                </div>
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
                                                    onMouseDown={() => changeSpecies(related.irma_id)}
                                                >{related.common_name}</Button>
                                }</For>
                            </div>
                        </div>
                    </Box>
                    </DialogContent>
                </Dialog>
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
