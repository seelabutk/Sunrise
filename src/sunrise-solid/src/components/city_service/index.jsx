import styles from './service.module.css'
import { CityVaas } from '../city_vaas';
import { CitySelection } from '../city_selection';

export function CityService(props) {
    const width = (props) => props.vaas_portion || 70;
    const vaas_width = (width(props) / 100) * window.innerWidth;

    return (
        <>
        {/*Selection section with options for the user*/}
        <CitySelection />
        
        <div class={styles.service}>
            <CityVaas width={vaas_width} rows={2} cols={3}/>
        </div>
        </>
    );
}
