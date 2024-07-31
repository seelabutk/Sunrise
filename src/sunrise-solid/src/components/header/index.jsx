import { Park } from './park';
import { City } from './city';
import { createSignal, Show } from 'solid-js';

export const [serviceType, setServiceType] = createSignal('park');

export function Header() {
    return <>
        <Show when={serviceType() === 'park'}>
            <Park />
        </Show>
        <Show when={serviceType() === 'city'}>
            <City />
        </Show>
    </>
}
