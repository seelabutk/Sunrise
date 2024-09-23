import styles from './selection.module.css';
import {
    Select,
    MenuItem,
    Button,
} from '@suid/material';
import { createSignal, onMount } from 'solid-js';
import { gotoPark, renderFrame, setObservation, setRendererTime } from '../vaas';
import { 
    setPathIsPlaying, 
    pathAnimationCallback,
} from './path.jsx';

/**
    * @description Component for selecting the species, path, and map information
*/
export function CitySelection() {
    // Signals for keeping track of relevant information
    const [currHour, setCurrHour] = createSignal(new Date().getHours());
    const [sunriseIsPlaying, setSunriseIsPlaying] = createSignal(false);

    /// HANDLERS ///
    

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

const button = <Button 
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

    return (
        <div class={styles.container}>
        </div>
    );
}
