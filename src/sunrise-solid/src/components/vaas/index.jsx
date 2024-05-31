import { createSignal, onMount } from 'solid-js';
import styles from './vaas.module.css';
import { useRef } from 'gridjs';

export const Vaas = (props) => {
    const getWidth = (props) => props.width;
    const [ref, setRef] = createSignal();
    let height;

    onMount(() => {
        const width = getWidth(props);
        height = ref().offsetHeight;
        const aspect_ratio = width / height;
        console.log(`VaaS: Width: ${width}. Height: ${height}. Ratio: ${aspect_ratio}`);
    });
  
    return (
        <div ref={setRef} class={styles.hyperimage} style={{ width: getWidth(props) + "px" }}>
            <h1>VAAS</h1>
        </div>
    );
}
