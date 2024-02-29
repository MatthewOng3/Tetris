// Utility functions and definitions.
// Nothing here is specific to asteroids.

import { Observable, map, scan } from "rxjs";
import { Cube, GRID_RANGE, Viewport } from "./types";
import { Tick } from "./state";

// Everything is designed to be as reusable as possible in many different contexts.
export { flatMap, not,attr, isNotNullOrUndefined, stringify, RNG, generate2DArray, 
        calculateXcoord, calculateYcoord, setBlockInArray, max, getRecentlyPlacedRows, isColumnFilled,
        removeRowsAndShiftDown, createRngStreamFromSource, checkBlockCollision,
        getDeletingRows, getRemovedCubes, checkCubeRowExceedsBoundaries, cantMoveDown , checkCurrentCell,
        checkCubeColExceedsBoundaries, cantMoveLeft, cantMoveRight}

/**
 * A random number generator which provides two pure functions
 * `hash` and `scaleToRange`.  Call `hash` repeatedly to generate the
 * sequence of hashes.
 * 
 * Taken from week 4
 */
abstract class RNG {
    // LCG using GCC's constants
    private static m = 0x80000000; // 2**31
    private static a = 1103515245;
    private static c = 12345;

    /**
     * Call `hash` repeatedly to generate the sequence of hashes.
     * @param seed 
     * @returns a hash of the seed
     */
    public static hash = (seed: number) => (RNG.a * seed + RNG.c) % RNG.m;

    /**
     * Takes hash value and scales it to the range [-1, 1]
     */
    public static scale = (hash: number) =>  (2 * hash) / (RNG.m - 1) - 1;
}   

/**
 * @description Converts values in a stream to random numbers in the range [-1, 1]
 * @param source$ The source Observable, elements of this are replaced with random numbers
 * @param seed The seed for the random number generator
 * Taken from my tutorial answer
 */
function createRngStreamFromSource<T>(source$: Observable<T>) {
    return function createRngStream(
      seed: number
    ): Observable<number> {
      //Transform the observable rng to number stream
      const randomNumberStream = source$.pipe(
        scan((acc, curr)=>RNG.hash(acc), seed), //Each turn hashing
        map((val) => RNG.scale(val)) // and then transforming scaling output
      );
      return randomNumberStream; //return stream of numbers
    };
}

/**
 * apply function to every element of a and return the result in a flat array
 * @param a an array
 * @param appliedFunction a function that produces an array
 */
function flatMap<T, U>(
    arr: ReadonlyArray<T>,
    appliedFunction: (arr: T) => ReadonlyArray<U>
): ReadonlyArray<U> {
    return Array.prototype.concat(...arr.map(appliedFunction));
}

const
    /**
     * Composable not: invert boolean result of given function
     * @param f a function returning boolean
     * @param x the value that will be tested with f
     * Taken from asteroids
     */
    not = <T>(f: (x: T) => boolean) => (x: T) => !f(x),

    /**
     * set a number of attributes on an Element at once
     * @param e the Element
     * @param o a property bag
     * Taken from asteroids
     */
    attr = (e: Element, o: { [p: string]: unknown }) => { for (const k in o) e.setAttribute(k, String(o[k])) }

/**
 * Type guard for use in filters
 * @param input something that might be null or undefined
 * Taken from asteroids
 */
function isNotNullOrUndefined<T extends object>(input: null | undefined | T): input is T {
    return input != null;
}
/**
 * @description Remove all duplicate elements in a list 
 * @param list List of elements, generic typed
 * @returns List with duplicates removed
 */
function removeDuplicates<T>(list: ReadonlyArray<T>):ReadonlyArray<T>{
    return list.filter((item, index) => list.indexOf(item) === index);
}

/**
 * @description Find the greater value between 2 inputs
 * @returns The greater input
 */
function max<T>(first: T, second: T): T {
    return first > second ? first : second;
}

/*---------------------Utility functions------------------*/

/**
 * @description Function to convert cube object to proper object when setting SVG attribute
 * @param cube 
 * @returns 
 */
function stringify(cube: Cube){
    return {
        id: cube.id,
        x: `${cube.x}`, 
        y: `${cube.y}`,
        width: cube.width,
        height: cube.height,
        style: cube.style
    }
}

/**
 * @description Extract all vlues in the array of objects with property argument
 * @param array Array that needs extracting
 * @param property Poperty to extract
 * @returns 
 */
const extractProperty =  <T, K extends keyof T>(array: T[], property: K): T[K][] => array.map(item => item[property]);

/**
 * @description Check if cube exceeds top and bottom boundaries
 * @returns True if cube exceeds
 */
const checkCubeRowExceedsBoundaries = (cube: Cube): boolean => cube.grid_row >= GRID_RANGE.NUM_OF_ROWS - 1 || cube.grid_row < 0

/**
 * @description Check if cube exceeds left and right boundaries
 * @returns True if cube exceeds
 */
const checkCubeColExceedsBoundaries = (cube: Cube): boolean => cube.grid_col < 0 ||  cube.grid_col > GRID_RANGE.NUM_OF_COLUMNS - 1 

/**
 * @description Check if cube is on the left boundary or next to another cube
 * @returns True if cube can't move left
 */
const cantMoveLeft = (grid: ReadonlyArray<ReadonlyArray<null | Cube>>) => (cube: Cube):boolean => cube.grid_col <= 0 || grid[cube.grid_row][cube.grid_col - 1] !== null

/**
 * @description Check if cube is on the right boundary or next to another cube
 * @returns True if cube can't move right
 */
const cantMoveRight = (grid: ReadonlyArray<ReadonlyArray<null | Cube>>) => (cube: Cube):boolean => cube.grid_col >= GRID_RANGE.NUM_OF_COLUMNS - 1 || 
grid[cube.grid_row][cube.grid_col + 1] !== null

/**
 * @description Check if cube is about to collide with another cube below it
 * @returns True if cube is about to collide
 * @see Tick Handle Collisions
 */
const cantMoveDown = (grid: ReadonlyArray<ReadonlyArray<null | Cube>>) => (cube: Cube): boolean => grid[cube.grid_row + 1][cube.grid_col] !== null 

/**
 * @description Check if cube current position already has a cube placed 
 * @returns True if cube spawns in an already occupied space
 */
const checkCurrentCell = (grid: ReadonlyArray<ReadonlyArray<null | Cube>>) => (cube: Cube): boolean => grid[cube.grid_row][cube.grid_col] !== null;

/**
 * @description Take an input grid and array of conditions where each condition checks a cube against certain conditions
 * @param grid 
 * @returns True if collided else false
 */
const checkCollisions = (conditions: Array<(cube: Cube) => boolean>) => (cube: Cube): boolean  => conditions.some(condition => condition(cube));

/**
 * @description Check block against collision conditions in the input
 * @param grid 2D grid of game
 * @param conditions An array of possible conditions being passed in checking against a cube
 * @returns True if any of the conditions are true, meaning block has collision
 */
const checkBlockCollision = (conditions: Array<(cube: Cube) => boolean>) => (block: ReadonlyArray<Cube>) => 
block.filter(checkCollisions(conditions)).length > 0

/**
 * @description Set block in grid array if collision happens
 * @param gridArray 
 * @param activeBlock Block that is currently being controlled
 * @returns New Grid Array with updated cells
 */
const setBlockInArray = (gridArray: ReadonlyArray<ReadonlyArray<null | Cube>>) => (activeBlock: ReadonlyArray<Cube>) =>  {

    //Helper function that returns true if cube indexes match the input indexes
    const isCubeHere =  (rowIndex: number, colIndex: number) => (cube: Cube): boolean => cube.grid_row === rowIndex && cube.grid_col === colIndex
    
    //Looping through the grid
    const newGrid: ReadonlyArray<ReadonlyArray<null | Cube>> = gridArray.map((row, rowIndex) => {
        return row.map((cell, colIndex) => {
        // Check if the current cell corresponds to a cube index in the active block, if true replace cube in grid with the cell
        const cubeInActiveBlock = activeBlock.find(isCubeHere(rowIndex,colIndex))
        return  cubeInActiveBlock ? cubeInActiveBlock : cell});
    });
    
    return newGrid
}

/**
 * @description Get the rows that the set active blocks are placed into so you can check if it needs to be deleted, removes duplicates
 * @param activeBlock 
 * @returns Unique row indexes of cubes in the block
 */
const getRecentlyPlacedRows = (activeBlock: ReadonlyArray<Cube>): ReadonlyArray<number> => 
removeDuplicates(extractProperty(activeBlock.map(({ grid_row, grid_col }) => ({ grid_row, grid_col })),"grid_row"))

/**
 * @description Check if the recently placed rows are filled with cubes meaning row can be cleared
 * @param gridArray 2D grid representation of game
 */
const getDeletingRows = (gridArray: ReadonlyArray<ReadonlyArray<null | Cube>>) => (rowIndexes: ReadonlyArray<number>) => {
    //For each element in row indexes we generate a new array where all column values are non null
    const deletingRows = rowIndexes.filter((rowIndex) => {
        //Return true if some value in the cell is non null
        return gridArray[rowIndex].every(column => column !== null);
    });
    return deletingRows;
}

/**
 * @description Retrieve the cubes that being removed due to row deletion
 * @param grid 
 * @param deletingRowIndexes 
 * @returns 
 */
const getRemovedCubes = (grid: ReadonlyArray<ReadonlyArray<null | Cube>>, 
    deletingRowIndexes: ReadonlyArray<number>): ReadonlyArray<Cube> => {
    
    //Function to check if the cube in the deleting rows
    const checkIsRemovingCube = (cube: Cube|null):boolean => isNotNullOrUndefined(cube) && deletingRowIndexes.includes(cube.grid_row)
    
    //Filter out the cubes that are affected by the deleting rows and  null values, update the rows above the deleted rows to shift down inside the cube object 
    const removedCubes: ReadonlyArray<Cube> = flatMap(grid, row => row.filter(checkIsRemovingCube)).filter(isNotNullOrUndefined);
     
    return removedCubes
}   


/**
 * @description Remove deleted rows from grid and shift all cubes above down by the number of rows removed
 * @param grid 2D grid
 * @param deletingRowIndexes Indexes of the rows being cleared
 * @returns 
 */
const removeRowsAndShiftDown = (grid: ReadonlyArray<ReadonlyArray<null | Cube>>, 
    deletingRowIndexes: ReadonlyArray<number> ): ReadonlyArray<ReadonlyArray<null | Cube>> => {

    const minDeletingRowIndex: number = Math.min(...deletingRowIndexes);
    const moveCubeAndGridPos = (cube: Cube): Cube =>  Tick.moveCube(deletingRowIndexes.length)(cube)
    
    //Function to check if the cube in the deleting rows
    const checkCellAgainstRow = (cube: Cube|null):boolean => isNotNullOrUndefined(cube) && !deletingRowIndexes.includes(cube.grid_row)
    
    //If the cube is above the deleted row then move y coord down by number of rows deleted
    const checkIfCubeAboveRemovedRow = (cube: Cube): Cube  => cube.grid_row < minDeletingRowIndex ? moveCubeAndGridPos(cube): cube
    
    //Filter out the cubes that are affected by the deleting rows and  null values, update the rows above the deleted rows to shift down inside the cube object
    const leftOverCubes: ReadonlyArray<Cube> = flatMap(grid,(row: ReadonlyArray<Cube | null>) => row.filter(checkCellAgainstRow)
    ).filter(isNotNullOrUndefined).map(checkIfCubeAboveRemovedRow)

    //Function to check if left over cubes has the same indexes of input indexes
    const getCube = (rowIndex: number, colIndex: number) => {
        const cubeFound: Cube | undefined = leftOverCubes.find((cube: Cube) => cube.grid_row === rowIndex && colIndex === cube.grid_col) 
        return cubeFound ? cubeFound : null
    }

    //Generate new grid based on above function
    const updatedGrid = generate2DArray((rowIndex, colIndex) => getCube(rowIndex, colIndex))

    return updatedGrid
};


/**
 * @description Generate 2D matrix representation of the grid
 * @param generateCell Function that is used to apply when generating each cell based on certain conditions set by input function
 * @returns 2D matrix
 */
function generate2DArray( generateCell: (rowIndex: number, colIndex: number) => null | Cube): ReadonlyArray<ReadonlyArray<null | Cube>> {
    return Array.from({ length: GRID_RANGE.NUM_OF_ROWS }, (row, rowIndex) =>
      Array.from({ length: GRID_RANGE.NUM_OF_COLUMNS }, (cell, colIndex) => generateCell(rowIndex, colIndex))
    );
}

/**
 * @description Check for game end condition when any column in the first row is filled
 * @param grid 2D matrix of booleans
 * @returns Boolean value true if a column has true all the way
 */
const isColumnFilled = (grid: ReadonlyArray<ReadonlyArray<null | Cube>>): boolean  =>  grid[0].some((_, columnIndex) => grid[0][columnIndex] !== null);

/**
 * @description Get x coordinate based on column index
 * @param col 
 * @returns 
 */
const calculateXcoord = (col: number) => Math.floor(col / GRID_RANGE.NUM_OF_COLUMNS * Viewport.CANVAS_WIDTH)

/**
 * @description Get y coordinate based on row index
 * @param row 
 * @returns 
 */
const calculateYcoord = (row: number):number => Math.floor(row / GRID_RANGE.NUM_OF_ROWS * Viewport.CANVAS_HEIGHT)

