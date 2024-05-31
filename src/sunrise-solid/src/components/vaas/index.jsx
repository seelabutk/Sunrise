import { createSignal, onMount } from 'solid-js';
import Renderer from './renderer';

export function Vaas(props) {
    const getWidth = (props) => props.width;
    const getRows = (props) => props.rows || 2;
    const getCols = (props) => props.cols || 2;

    const [ref, setRef] = createSignal();

    onMount(() => {
        const $hyperimage = ref();
        const $width = getWidth(props);
        const $height = $hyperimage.offsetHeight;

        const $num_rows = getRows(props);
        const $num_cols = getCols(props);

        const renderer = new Renderer(
            $hyperimage,
            $width,
            $height,
            $num_rows,
            $num_cols,
        );

        renderer.render();
    });
  
    return (
        <canvas ref={setRef} style={{ width: getWidth(props) + "px" }}/>
    );
}

