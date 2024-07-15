import { createSignal, onMount } from "solid-js";
import {
    Box,
    Select,
    MenuItem,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
} from '@suid/material';
import { Map } from '../map';
import styles from './selection.module.css';
import {
    coordsToPath,
} from './path.jsx';
import park from '../../assets/park.json';

/**
    * @description Component for the selection map the user can choose points on
*/
export function MapSelect() {
    const [mapUrl, setMapUrl] = createSignal('Satellite');
    const [mapIsOpen, setMapIsOpen] = createSignal(false);
    const [pathJson, setPathJson] = createSignal({});

    onMount(() => {
        setPathJson(
            coordsToPath(park)
        );
    });
    
    // TODO: Read the config from the server to get the available urls
    const backgroundUrls = {
        "Satellite": 
            "https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoicmF1c3RpbjkiLCJhIjoiY2x3Zmg1d2psMXRlMDJubW5uMDI1b2VkbSJ9.jB4iAzkxNFa8tRo5SrawGA",
        "Streets": 
            "https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoicmF1c3RpbjkiLCJhIjoiY2x3Zmg1d2psMXRlMDJubW5uMDI1b2VkbSJ9.jB4iAzkxNFa8tRo5SrawGA",
        "Outdoors": 
            "https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoicmF1c3RpbjkiLCJhIjoiY2x3Zmg1d2psMXRlMDJubW5uMDI1b2VkbSJ9.jB4iAzkxNFa8tRo5SrawGA"
    };
    
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

    return <>
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
    </>;
}
