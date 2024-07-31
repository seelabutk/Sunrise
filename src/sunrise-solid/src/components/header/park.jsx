import styles from './header.module.css';
import { Button } from '@suid/material';
// import { setServiceType } from '.';

export function Park() {
    return <>
        <header class={styles.header}>
            <div class={styles.headerbody}>
                <h1 class={styles.title}>Great Smoky Mountains National Park</h1> 
                <div class={styles.aotsContainer}>
                    <h2 class={styles.subtitle}>Atlas of the Smokies: </h2>
                    <Button
                        onClick={() => setServiceType('city')}
                        variant='contained'
                        sx={{
                            // backgroundColor: 'blue',
                            // color: 'green',
                        }}
                    >CITY</Button>
                </div>
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
    </>
}import { setServiceType } from '.';

