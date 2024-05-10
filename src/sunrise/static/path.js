// This is the implementation for the class that follows the path
export class Path {
    constructor(positions) {
        // console.log(`Positions: ${positions}`);
        this.points = positions
        this.current_point_index = 0;
        this.current_point = positions[0];
        this.current_position = this.current_point;
        this.previos_position = null;
        this.next_point = this.points[this.current_point_index+1];

        console.log(this.current_position);
        console.log(this.next_point);
        this.total_steps = 40;
        this.current_step = 1;
    }

    /// @brief Add a position to the path to follow
    add_position(pos) {
        this.points.push(pos);
    }

    rewind() {
    }

    forward() {
        if (this.current_step !== this.total_steps) {
            // Move to next point
            let x = this.#linterp(this.current_position.x, this.next_point.x, (this.current_step / this.total_steps));
            let y = this.#linterp(this.current_position.y, this.next_point.y, (this.current_step / this.total_steps));
            let z = this.#linterp(this.current_position.z, this.next_point.z, (this.current_step / this.total_steps));
            let pos = new Position(x,y,z);
            this.current_step++;

            return pos;
        }

        if (this.current_point_index != this.points.length-2) {
            this.current_step = 1;
            this.current_point_index++;
            this.current_point = this.points[this.current_point_index];
            this.current_position = this.current_point;
            this.next_point = this.points[this.current_point_index+1];
            return this.current_point;
        }

        return null;
    }

    #linterp(x1, x2, a) {
        return x1 * (1 - a) + x2 * a;
    }
}

/* Stores a position in 3d space */
export class Position {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    static compare(point1, point2, threshold) {
        if (Math.abs(point1.x - point2.x) > threshold
            || Math.abs(point1.y - point2.y) > threshold
            || Math.abs(point1.z - point2.z) > threshold) {
            return false;
        }

        return true;
    }

    
}
