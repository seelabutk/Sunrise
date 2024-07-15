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
import { gotoPoint, gotoPark, renderFrame, setObservation, setRendererTime } from '../vaas';
import park from '../../assets/park.json';

import {
    MapSelect
} from './map.jsx';
import { 
    setup_species, 
    find_species_by_id,
} from './species.jsx';
import { 
    coordsToPath, 
    setPathIsPlaying, 
    pathAnimationCallback,
} from './path.jsx';
import {
    Reccomendations,
} from './reccomendation.jsx';

let species_list = setup_species();
export const [species, setSpecies] = createSignal(species_list[0]);

export function Selection() {

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

    // // Callback function that sets the current choice of the url we want to use
    // const mapUrlHandler = (event) => {
    //     setMapUrl(event.target.value.toString());
    // }
    //
    // // Open the leaflet map component
    // const openMap = () => {
    //     setMapIsOpen(!mapIsOpen());
    // }
    //
    // // Callback function that gets the url we want for the styling of the leaflet tiles
    // const urlCallback = () => {
    //     return backgroundUrls[mapUrl()];
    // }

    /** @description Pause the path animation */
    function pausePath() {
        setPathIsPlaying(false);
        renderFrame("high");
    }

    onMount(() => {
        /** Uncomment for the sine plot for the day/night cycle **/
        // vegaEmbed("#sunPlot", sunVegaSpec);
        // setPathJson(
        //     coordsToPath(park)
        // );
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

                <Reccomendations />
            </div>

            <div class={styles.verticalMarker}></div>

            <MapSelect />
            
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
