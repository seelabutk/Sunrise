import styles from './header.module.css';
import kclogo from './KC-Logo-horizontal-white.png';
import ornllogo from './Oak_Ridge_National_Laboratory.png';

export function City() {
    return <>
        <header class={styles.header}>
            <div class={styles.cityheaderbody}>
                <img src={kclogo} alt='kc logo' class={styles.kclogo}/>
                <img src={ornllogo} alt='kc logo' class={styles.ornllogo}/>
                
            </div>
        </header>
    </>
}
