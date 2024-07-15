import allspecies from '../../assets/species.json';

/**
* @description Find a species with the name in the list
* @param {String} name The common name of the species
*/
export function find_species_by_id(id) {
    for(let i = 0; i < allspecies.length; i++) {
        if (allspecies[i].irma_id === id) {
            return allspecies[i];
        }
    }

    return null;
}

export function setup_species() {
    let species_list = [];
    const species_ids = [
        '0029846',
        '0009671',
        '0010370',
        '0036247',
        '0005151',
        '0011381',
        '0005293',
        '0008078',
        '0037441',
        '0014728',
        '0023302',
        '0011580',
        '0016834',
        '0029173',
        '0004198',
        '0034939',
        '0034387',
        '0017020',
        '0023806',
        '0002037',
        '0018283',
        '0011518',
        '0000337',
        '0037533',
        '0017786',
        '0034373',
        '0020696',
        '0037281',
        '0023619',
        '0016818',
        '0014521',
        '0002550',
        '0008003',
        '0037379',
        '0009346',
        '0023802',
        '0036690',
        '0021704',
        '0011386',
        '0031497'
    ];


    for (let i = 0; i < species_ids.length; i++) {
        let s = find_species_by_id(species_ids[i]);
        // console.log(s);
        species_list.push(
            {
                name: s.common_name,
                irma_id: s.irma_id
            }
        );
    }

    return species_list;
}
