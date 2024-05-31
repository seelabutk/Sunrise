import styles from './service.module.css'
import { Vaas } from '../vaas';
import { Map } from '../map';

export function Service(props) {
    const width = (props) => props.vaas_portion || 70;
    const vaas_width = (width(props) / 100) * window.innerWidth;

    return (
        <div class={styles.service}>
            <Vaas width={vaas_width} rows={2} cols={3}/>
            <Map width={window.innerWidth-vaas_width}/>
        </div>
    );
}
