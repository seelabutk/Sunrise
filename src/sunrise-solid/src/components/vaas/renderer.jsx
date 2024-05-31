export default class Renderer {
    /** @type {HTMLElement} */
    primary = null;

    /** @type {Number} */
    width = Infinity;
    /** @type {Number} */
    height = Infinity;
    /** @type {Number} */
    aspect_ratio = Infinity;

    /** @type {HTMLElement} */
    secondary = null;


    /** @type {Number} */
    highRes = null;
    /** @type {Number} */
    lowRes = null;

    /** @type {Number} */
    rowCount = -1;
    /** @type {Number} */
    colCount = -1;

    /** @type {Tile[]} **/
    tile_definitions = [];

    /**
        * @param {HTML.Element} primary The primary canvas to render the final image to
        * @param {Number} width The total width of the canvas
        * @param {Number} height The total height of the canvas
        * @param {Number} num_rows The number of tiles in a row
        * @param {Number} num_cols The number of tiles in a col
    */
    constructor(
        primary,
        width,
        height,
        num_rows,
        num_cols,
    ) {
        this.primary = primary;
        this.primary.width = width;
        this.primary.height = height;
        this.width = width;
        this.height = height;
        this.aspect_ratio = this.width / this.height;
        
        this.rowCount = num_rows;
        this.colCount = num_cols;

        // Find the resolutions we want to render our tiles at for 
        // low and high quality images
        this.highRes = new Dimension(
            (this.width / this.colCount) |0,
            (this.height / this.rowCount) |0
        );
        this.lowRes = new Dimension(
            (this.highRes.width / 4) |0,
            (this.highRes.height / 4) |0,
        );

        // Create the secondary canvas for double buffering
        this.secondary = document.createElement("canvas");
        this.secondary.width = this.width;
        this.secondary.height = this.height;

        this.#create_tiles(this.rowCount, this.colCount);
    }

    /**
        * @param {Number} numr Number of rows for our tileset
        * @param {Number} numc Number of cols for our tileset
    */
    #create_tiles(numr, numc) {
        this.tile_definitions = [];
        for (let i = 0; i < numr; i++) {
            for (let j = 0; j < numc; j++) {
                this.tile_definitions.push(new Tile(i, j));
            }
        }
    }

    drawImage() {
        console.log(this.secondary);
        let ctx = this.secondary.getContext('2d');
        const tile_width = this.width / this.colCount;
        const tile_height = this.height / this.rowCount;
        console.log(tile_width);

        for (let i = 0; i < this.tile_definitions.length; i++) {
            let row = this.tile_definitions[i].row;
            let col = this.tile_definitions[i].col;
            //console.log(`row: ${row}, col: ${col}`);

            let y = (row / this.rowCount) * this.height;
            let x = (col / this.colCount) * this.width;

            console.log(`x: ${x}, y: ${y}`);

            ctx.fillStyle = `rgb(${(x*256/this.width) |0},${(y*256/this.height) |0}, 0)`;
		    ctx.fillRect(x, y, tile_width, tile_height);
            //ctx.fillStyle = `rgb(${(x*256/this.width)|0}, ${(y*256/this.height)|0}, 0)`;
            //ctx.fillRect(x, y, tile_width, tile_height);
        }

        console.log(`Hyperimage: w: ${this.width}, h: ${this.height}. `);

        ctx = this.primary.getContext('2d');
        ctx.drawImage(this.secondary, 0, 0, this.width, this.height);
    }

}

// A tile used in the VaaS in order to partially render an image
class Tile {
    row = -1;
    col = -1;
    
    constructor(row, col) {
        this.row = row;
        this.col = col;
    }
}

// Width x Height dimension
class Dimension {
    width = Infinity;
    height = Infinity;

    constructor(width, height) {
        this.width = width;
        this.height = height;
    }
}
