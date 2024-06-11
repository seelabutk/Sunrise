import { createSignal, onMount } from 'solid-js';
import Renderer from './renderer';
import { Point } from '../../utils';

/** @description Place the renderer at a specific point
    * @param {Point} point The point that we want to go to
*/
export function gotoPoint(point) {
    renderer().goto_point(point);
}

/**
    * @description Place the camera at the point where we are looking at the park from above
*/
export function gotoPark() {
    renderer().set_camera_pos(
        new Point(
            35.602848,
            -83.5 - 13,
            //37,
            8
        )
    );
}

/**
    * @description Play the sunrise animation from the renderer
*/
export const playSunrise = () => {
    renderer().play_sunrise();
}

// The renderer API to the server that gets images
const [renderer, setRenderer] = createSignal();

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

        //renderer = new Renderer(
        setRenderer(new Renderer(
            $hyperimage,
            $width,
            $height,
            $num_rows,
            $num_cols,
        ));

        renderer().render();
    });
  
    return (
        <canvas ref={setRef} style={{ width: getWidth(props) + "px" }}/>
    );
}

