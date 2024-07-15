import { createSignal } from "solid-js";
import { species_lookup_by_irma_id, sanitizeId } from '../../utils';

export const [speciesRecs, setSpeciesRecs] = createSignal([]);
export const [speciesInfo, setSpeciesInfo] = createSignal({});


export async function getSpeciesInfo(species) {
    const base = "http://sahara.eecs.utk.edu:5000";
    let url = new URL('api/wikipedia', base);
    // url.searchParams.append('irma_id', species().irma_id);
    url.searchParams.append('irma_id', sanitizeId(species.irma_id));
    // url.searchParams.append('irma_id', '0029846');

    try {
        const response = await fetch(
            url,
            {
                method: "GET",
                mode: 'cors',
                headers: {
                    'Access-Control-Allow-Origin': '*'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const json = await response.json();
        setSpeciesInfo(json);
    } catch (error) {
        console.error(error.message);
    }
 }

/** @description Get the related species from the species that we are looking at currently */
export async function getSpeciesRecs(species) {
    const base = "http://sahara.eecs.utk.edu:5000";
    let url = new URL('api/reccomendation', base);
    url.searchParams.append('irma_id', species.irma_id);
    // url.searchParams.append('irma_id', species().irma_id);
    // url.searchParams.append('irma_id', sanitizeId(species().irma_id));
    // url.searchParams.append('irma_id', '29846');

    try {
        const response = await fetch(
            url,
            {
                method: "GET",
                mode: 'cors',
                headers: {
                    'Access-Control-Allow-Origin': '*'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const json = await response.json();
        let related = json.related_species;
        console.log(related);
        
        let recs = []
        for (let i = 0; i < related.length; i++) {
            recs.push(species_lookup_by_irma_id(json.related_species[i]));
        }
        setSpeciesRecs(recs);
    } catch (error) {
        console.error(error.message);
    }
}


// import styles from './selection.module.css';
// import { AiFillInfoCircle } from 'solid-icons/ai';
// import {
//     Box,
//     Select,
//     MenuItem,
//     Button,
//     Dialog,
//     DialogTitle,
//     DialogContent,
// } from '@suid/material';
//
// export function Reccomendations() {
//     return <>
//         <Button variant="outlined" onClick={openSpeciesInfo} 
//             sx={{
//                 color: '#1e92f4', 
//                 border: '0',
//                 fontSize: '20px',
//
//                 '&:hover': {
//                     border: '0',
//                     backgroundColor: 'darkgray',
//                     color: '#1A71BA',
//                 }
//             }}>
//             <AiFillInfoCircle size={25}/>
//         </Button>
//         <Dialog
//             maxWidth='md'
//             open={infoIsOpen()}
//             onClose={openSpeciesInfo}
//         >
//             <DialogTitle sx={{backgroundColor: '#141414', color: 'white'}}>{species().name}Name</DialogTitle>
//             <DialogContent sx={{backgroundColor: '#141414'}}>
//             <Box
//                 sx={{
//                     display: 'flex',
//                     justifyContent: 'center',
//                     backgroundColor: '#1e1e1e',
//                 }}
//             >
//                 <div class={styles.species_info_container}>
//                     <div class={styles.species_info}>
//                         <img src={speciesInfo().image} height="80px"/>
//                         <div class={styles.species_summary}>
//                             {speciesInfo().summary}
//                         </div>
//                     </div>
//                     <div class={styles.related}>
//                         You may also be interested in:
//                         <For each={speciesRecs()}>{
//                             related => <Button 
//                                 variant='outlined' 
//                                 sx={{
//                                     width: '70%',
//                                     color: 'white',
//                                     border: '0',
//                                     borderBottom: '1px solid white',
//                                     borderRadius: '0',
//
//                                     '&:hover': {
//                                         border: '0',
//                                         backgroundColor: 'gray',
//                                     }
//                                 }}
//                                 onMouseDown={() => changeSpecies(related.irma_id)}
//                             >{related.common_name}</Button>
//                         }</For>
//                     </div>
//                 </div>
//             </Box>
//             </DialogContent>
//         </Dialog>
//     </>
// }
