import styles from './App.module.css';
import { Service } from './components/service';

function App() {
    return (
        <div class={styles.App}>
            <header class={styles.header}>
                <h1 class={styles.title}>Great Smoky Mountains National Park</h1> 
            </header>
            <Service vaas_portion="60" />
        </div>
    );
}

export default App;
