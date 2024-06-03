import styles from './App.module.css';
import { Service } from './components/service';
import { Selection } from './components/selection';
import { createSignal, onMount } from 'solid-js';

function App() {
    return (
        <div class={styles.App}>
            <header class={styles.header}>
                <div class={styles.headerbody}>
                    <h1 class={styles.title}>Great Smoky Mountains National Park</h1> 
                    <h2 class={styles.subtitle}>Atlas of the Smokies: </h2>
                </div>
                <div class={styles.watermark}>
                    <div class={styles.usa}>
                        <h4>National Park Service</h4>
                        <h4>U.S. Department of the Interior</h4>
                    </div>
                    <img 
                        src="https://www.nps.gov/maps/assets/img/arrowhead@2x.png"
                        class={styles.arrowhead}
                    />
                </div>
            </header>

            {/*Selection section with options for the user*/}
            <Selection />

            {/*The VAAS Service with the Globe and Map selection tool*/}
            <Service vaas_portion="100"/>
        </div>
    );
}

export default App;
