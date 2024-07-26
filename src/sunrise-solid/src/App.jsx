import styles from './App.module.css';
import { Service } from './components/service';
import { CityService } from './components/city_service';
import { Header, serviceType } from './components/header';
import { createSignal, Show } from 'solid-js';
import { Button } from '@suid/material';


function App() {
    return (
        <div class={styles.App}>
            {/*The header bar*/}
            <Header />

            {/*The VAAS Service with the Globe and Map selection tool -- 100 -> 100% width of the screen*/}
            <Show when={serviceType() === 'city'}>
                <CityService vaas_portion="100"/>
            </Show>
            <Show when={serviceType() === 'park'}>
                <Service vaas_portion="100"/>
            </Show>
        </div>
    );
}

export default App;
