import * as THREE from 'three'

/// Missions are used to represent the different flypaths that a user
/// can follow. They are able to go forwards and backwards
export class Mission {
    name = "";            // The name of the mission. "Knoxville", "City", "Park", etc
    index = 0;            // Points to where in the list of points we are currently at while iterating
    point_list = [];      // The data of all position coordinates
    current_point = null; // The current point that the index is pointing to. TODO: we might not need this in the future
    paused = true;

    /**
        * @constructor
        * @param {string} name The name of the mission
        */
    constructor(name) {
    // constructor(name, position_data) {
        this.name = name;
        this.point_list = [];
        this.index = 0;
        this.current_point = this.point_list[0];
    }

    /**
        * @description Add a point to the list of points in this mission
        * @param {THREE.Vector3} point The point to append
        */
    add_point(point) {
        this.point_list.push(point);
    }

    /**
        * @description Pause playing the animation
        */
    pause() {
        this.paused = true;
    }

    /**
        * @description Unpause playing the animation
        */
    unpause() {
        this.paused = false;
    }

    /**
        * @description See if this animation is currently being played
        * @returns {bool} True if paused false otherwise
        */
    is_paused() {
        return this.paused;
    }


    /**
        * @description Get the length of the list of points in the mission
        * @returns {number} the amount of points in the mission
        */
    length() {
        return this.point_list.length;
    }

    /**
        * @description Get the current index of this mission
        * @returns {number} The index we are at in the mission
        */
    current_index() {
        return this.index;
    }

    /** 
        * @description Increment our index and return the "next" point in the list. This is used to go forwards from where we are in the path
        * @returns null when we are at end of list
        */
    next() {
        // Return early if we are at the end of the list
        if (this.index == this.point_list.length) {
            return null;
        }
        
        this.index++;
        this.current_point = this.point_list[this.index];

        return this.current_point;
    }

    /**
        * @description Get the amount of points remaining in the list
        * @returns {Number} The number of positions yet to be played
        */
    remaining_length() {
        return this.point_list.length - this.index;
    }

    /**
        * @description Decremement our index and return the "previous" point. This is used to go backwards from where we are in the path
        * @returns null when we are at beginning of list
        */
    back() {
        if (this.index == 0) {
            return null;
        }

        this.index--;
        this.current_point = this.point_list[this.index];

        return this.current_point;
    }

    /**
        * @description Move forwrads in the path Return null when we are at end of the path
        */
    forward(offset) {
        // Return early when at the end of the list
        if (this.index === this.point_list.length-1 || this.paused === true) {
            console.log("JFDSFJK");
            return null;
        }

        if (this.index + offset >= this.point_list.length-1) {
            this.index = this.point_list.length-1;
        }

        this.current_point = this.#mean_position(this.index, 15);
        let target = this.#mean_position(this.index+1, 15);
        let up = this.current_point;

        this.index += offset;
        // this.index++;

        return {
            current: this.current_point,
            target: target,
            up: up
        };
    }

    /** 
        * @description Move forwrads in the path
        * @returns {null | THREE.Vector3} null when we are at end of the path
        */
    backward(offset) {
        // Return early when at the end of the list
        if (this.index === 0 || this.paused === true) {
            return null;
        }

        if (this.index - offset <= 0) {
            this.index = 0;
        }

        this.current_point = this.#mean_position(this.index, 9);
        let target = this.#mean_position(this.index+1, 9);
        let up = this.current_point;

        this.index -= offset;
        // this.index++;

        return {
            current: this.current_point,
            target: target,
            up: up
        };
    }


    /**
        * @description Get render information for specific point 
        * @returns {Object} The information for the current position, target, and up vector
        */
    goto_point(index) {
        if (index > this.point_list.length - 1) {
            console.error(`Index ${index} out of bounds of this mission`);
        }

        return {
            current: this.point_list[index],
            target: this.point_list[index+1],
            up: this.point_list[index],
        }
    }

    /**
        * @description Create the button for this mission
        * @param {Function} callback The callback function for when this button is clicked
        * @returns {Element} the button
        */
    get_button(callback) {
        let btn = document.createElement("button");
        btn.id = `mission_${this.name.toLowerCase()}`;
        btn.innerText = `${this.name}`;
        btn.className = "missionButton";
        btn.onclick = callback;

        return btn;
    }

    /** 
        * @description Average the values of each component of the coordinates +- the specified range 
        * @param {Number} index The index of the point we want to average
        * @param {Number} range The range of points on either side of `index` that we want to average
        * @returns {THREE.Vector3} Vector3 with values of the averages
        */
    #mean_position(index, range) {
        let mean_x = 0;
        let mean_y = 0;
        let mean_z = 0;

        let begin = Math.max(index - range, 0);
        let end = Math.min(index + range, this.point_list.length);
       
        // Loop <range> indices ahead and average the components of the positions
        for (
            let i = begin;
            i < end;
            i++
        ) {
            mean_x += this.point_list[i].x;
            mean_y += this.point_list[i].y;
            mean_z += this.point_list[i].z;
        }

        return new THREE.Vector3(
            mean_x / (end - begin),
            mean_y / (end - begin),
            mean_z / (end - begin)
        );
    }
}
