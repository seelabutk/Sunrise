import styles from './selection.module.css';
import {
    Select,
    MenuItem,
    Button,
} from '@suid/material';
import { createSignal, onMount } from 'solid-js';
import { gotoPark, renderFrame, setObservation, setRendererTime } from '../vaas';
import {
    MapSelect
} from './map.jsx';
import { 
    setup_species, 
    find_species_by_id,
} from './species.jsx';
import { 
    setPathIsPlaying, 
    pathAnimationCallback,
} from './path.jsx';
import {
    Reccomendations,
} from './reccomendation.jsx';

// List of all species
let species_list = setup_species();

// State for selectors to be able to read and set
// the species that we are looking at
export const [species, setSpecies] = createSignal(species_list[0]);

/**
    * @description Component for selecting the species, path, and map information
*/
export function Selection() {
    // Signals for keeping track of relevant information
    const [currHour, setCurrHour] = createSignal(new Date().getHours());
    const [sunriseIsPlaying, setSunriseIsPlaying] = createSignal(false);

    /// HANDLERS ///
    
    // Event handler function to switch the values of the selection
    const speciesHandler = (event) => {
        const s = find_species_by_id(event.target.value.toString());
        setSpecies(s);
        setObservation(s.irma_id);
        renderFrame();
    }

    /** @description Pause the path animation */
    function pausePath() {
        setPathIsPlaying(false);
        renderFrame("high");
    }

    onMount(() => {
        /** Uncomment for the sine plot for the day/night cycle **/
        // vegaEmbed("#sunPlot", sunVegaSpec);
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
