import styles from './service.module.css'
import { Vaas } from '../vaas';
import { Selection } from '../selection';

export function Service(props) {
    const width = (props) => props.vaas_portion || 70;
    const vaas_width = (width(props) / 100) * window.innerWidth;

    return (
        <>
        {/*Selection section with options for the user*/}
        <Selection />
        
        <div class={styles.service}>
            <Vaas width={vaas_width} rows={2} cols={3}/>
        </div>
        </>
    );
}
