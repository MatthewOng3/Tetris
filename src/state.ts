// Functions and definitions of game state objects and state management.
// The only exports are the `initialState` object and the function `reduceState`.
export { reduceState, Tick,  createBlock, GenerateBlock, initialState, Restart, Drop, Rotate, Move }

 
// Game state is modelled in one main object of type State, which contains collections of the game elements, each
// of which has type Body, each being a "body" participating in our simple physics system.

import { Constants, State, Action, Cube, Cube_Dimensions, GRID_RANGE, Tetrimino } from "./types"
import { calculateXcoord, calculateYcoord, isColumnFilled, not,  removeRowsAndShiftDown, setBlockInArray, checkBlockCollision, 
    getDeletingRows, generate2DArray, getRecentlyPlacedRows, isNotNullOrUndefined, getRemovedCubes, RNG, 
    checkCubeRowExceedsBoundaries, checkCurrentCell, checkCubeColExceedsBoundaries, cantMoveDown, cantMoveLeft, cantMoveRight, max } from "./util"

/**
 * @description Generate a tetrimino block from a random number index
 */
class GenerateBlock implements Action{

    constructor(public readonly tetriminoTypeIndex: number) {};

    /**
     * @description Updates random tet type based on tetriminoTypeIndex, if out of bounds uses default
     * @returns 
     */
    apply(s: State): State{
        return {
            ...s,
            randomTetriminoType: this.checkIndex() ? Tetrimino.TETRIMINO_TYPES[this.tetriminoTypeIndex] : Tetrimino.TETRIMINO_TYPES[Tetrimino.DEFAULT_CHOICE]
        }
    }

    /**
     * @description Checks index is within bounds just in case a number is generated outside of it
     * @returns Boolean true if within bounds
     */
    checkIndex(): boolean{
        return this.tetriminoTypeIndex >= 0 && this.tetriminoTypeIndex < Tetrimino.TETRIMINO_TYPES.length
    }
    
    /**
     * @description Dictionary storing the layout in 2D grid form where 1 means cube present, also store center of tetrimino for rotation purposes
     */
    static tetriminoLayouts: Record<string, {layout: number[][], center: {row: number, col: number} }> = {
        I: {layout: [
          [1, 1, 1, 1]
        ], center: {row: 0, col: 1}},
        J: {layout: [
            [1, 0, 0],
            [1, 1, 1]
          ], center: {row: 1, col: 1}},
        L: {layout: [
            [0, 0, 1],
            [1, 1, 1]
          ], center: {row: 1, col: 1}},
        O: {layout: [
            [1, 1],
            [1, 1]
          ], center: {row: Infinity, col: Infinity}}, //Because square dont rotate
        S: {layout: [
            [0, 1, 1],
            [1, 1, 0]
          ], center: {row: 1, col: 1}},
        T: {layout: [
            [0, 1, 0],
            [1, 1, 1]
          ], center: {row: 1, col: 1}},
        Z:{layout: [
            [1, 1, 0],
            [0, 1, 1]
          ], center: {row: 1, col: 1}},
    };

}

/**
 * @description Function to create each tetrimino block
 * @param tetriminoType String key of the tetrimino type
 * @returns Array of cube objects
 */
const createBlock = (tetriminoType: string) => (cubeCount: number):ReadonlyArray<Cube> => {
    
    //Get layout and center details of tetrmino
    const { layout, center }: {layout: ReadonlyArray<ReadonlyArray<number>>, center: {row: number, col: number}} = GenerateBlock.tetriminoLayouts[tetriminoType];
    
    //Generate cubes and return them
    const cubes: ReadonlyArray<Cube> = layout.flatMap((row, rowIndex) =>
        row.map((col, colIndex) =>  {
            const generate = createCube(rowIndex,colIndex + GRID_RANGE.COL_MIDPOINT - 1, cubeCount)
            //Boolean expression checking if cube is the center
            const isCenter = rowIndex === center.row && colIndex === center.col
            return col === 1 ? isCenter ? generate(true) : generate(false): null
        } )
    ).filter(isNotNullOrUndefined)
    
    
    return cubes
}

/**
 * @description Function to create cube 
 * @param rowIndex Row index in 2D grid
 * @param colIndex Col index in 2D grid
 * @param id unique d generated for cube
 * @param isCenter Boolean indicating if it's center or not
 * @returns Cube object 
 */
const createCube = (rowIndex: number, colIndex: number, cubeCount: number) => (isCenter: boolean): Cube => {
    
    return {
        id: `${cubeCount}-${rowIndex}-${colIndex}-${RNG.scale(RNG.hash(rowIndex + colIndex))}`, //Long id to ensure uniqueness for rendering
        x: calculateXcoord(colIndex),
        y: calculateYcoord(rowIndex),
        grid_row: rowIndex, 
        grid_col: colIndex,
        width: `${Cube_Dimensions.WIDTH}`, 
        height: `${Cube_Dimensions.HEIGHT}`,
        style: "fill: green",
        center: isCenter
}}


const startingBlock = createBlock("O")(4)

const initialState: State = {
    gameEnd: false, 
    grid: generate2DArray(() => null), 
    score: 0,
    highScore: 0,
    level: 0,
    activeBlock: startingBlock,
    shapePreview: "T",
    randomTetriminoType: "J",
    clearBlocks: [],
    objCount: startingBlock.length
}


/*-----------------------------State Updates------------------------------*/

/**
 * @description Tick class applies processes that take place at each tick such as cubes move down, collisions, row deletions, check for end game
 */

class Tick implements Action {
    constructor(public readonly elapsed: number) {}

    /** 
     * @description Check for game end cond, if collision happens or regular block falls
     * @param state old State 
     * @returns new State
     */
    apply(state: State): State {
        console.log("Elapsed", this.elapsed)
        //Check for collisions
        const conditions = [checkCubeRowExceedsBoundaries, cantMoveDown(state.grid)];
        const isCollision = checkBlockCollision(conditions)(state.activeBlock);

        return state.gameEnd ? 
        //If game has ended then just keep returning regular state until user press restart
        {...state}
        //Handle collisions if there are collisions
        : isCollision ? Tick.handleCollisions({
            ...state,
        }) 
        : 
        //Else game goes on as usual
        {
            ...state,
            activeBlock: state.activeBlock.map(Tick.moveCube(1)),
            gameEnd: isColumnFilled(state.grid),
            
        }
    }

    /**
     * @description Getter to retrieve the elapsed time
     * @returns Elapsed time in observable interval, int
     */
    getElapsed(){
        return this.elapsed
    }

    /** 
     * @description Make the active block cubes fall
     * @param cube 
     * @returns the moved cube
     */
    static moveCube = (amount: number) => (cube: Cube):Cube => {
        return {
        ...cube,
        grid_row: cube.grid_row + amount,
        y: calculateYcoord(cube.grid_row + amount),
    }}

    /**
     * @description Handle collisions and check for row deletions
     * @param state 
     * @returns 
     */
    static handleCollisions = (state: State): State => {
        
        //Set the active block in the 2D grid   
        const updatedGrid: ReadonlyArray<ReadonlyArray<null | Cube>> = setBlockInArray(state.grid)(state.activeBlock) 
        
        //Spawn a new block based on shape preview if collision happens
        const newActiveBlock: ReadonlyArray<Cube> = createBlock(state.shapePreview)(Tetrimino.TETRIMINO_SIZE + state.objCount) 

        //Check if cube that is going to be spawned overlaps with other cubes
        const spawnOverlap: boolean = checkBlockCollision([checkCurrentCell(updatedGrid)])(newActiveBlock);

        //Get the rows that are placed by most recent active block
        const recentlyPlacedRows: ReadonlyArray<number> = getRecentlyPlacedRows(state.activeBlock)

        //If any rows can be deleted then return them
        const deletingRows: ReadonlyArray<number> = getDeletingRows(updatedGrid)(recentlyPlacedRows)

        return deletingRows.length > 0 ? Tick.handleBlockClear({
            ...state,   
            activeBlock: !spawnOverlap ? newActiveBlock : state.activeBlock,
            grid: updatedGrid,
            objCount: state.objCount + newActiveBlock.length,
            gameEnd:  isColumnFilled(updatedGrid) || spawnOverlap,
            clearBlocks: [...state.clearBlocks]
        }, deletingRows) :
        {
            ...state,
            activeBlock: !spawnOverlap ? newActiveBlock : state.activeBlock,
            shapePreview: state.randomTetriminoType,
            grid: updatedGrid,
            objCount: state.objCount + newActiveBlock.length,
            gameEnd: isColumnFilled(updatedGrid) || spawnOverlap
        }
    }

    /**
     * @description Clear rows and shift blocks down 
     * @param state 
     * @param deletingRows 
     * @returns 
     */
    static handleBlockClear = (state: State, deletingRows: ReadonlyArray<number>):State => {
        
        //Get removing cubes so you can remove them from svg
        const removedCubes: ReadonlyArray<Cube>  = getRemovedCubes(state.grid, deletingRows)
        const newScore: number =  state.score + GRID_RANGE.NUM_OF_COLUMNS * deletingRows.length
       
        return{
            ...state,
            shapePreview: state.randomTetriminoType, 
            grid: removeRowsAndShiftDown(state.grid, deletingRows) ,
            score: newScore,
            level: Math.floor(newScore/GRID_RANGE.NUM_OF_COLUMNS),
            clearBlocks: [...state.clearBlocks, ...removedCubes]
        }
    }
 

}

/**
 * @description Handles moving active block left and right
 */
class Move implements Action{ 
    constructor(public readonly direction:number) {} 

    /** 
     * @description Update the x coordinate of each cube object
     * @param s old State
     * @returns new State
     */
    apply(s: State): State {
        
        //If going right check right collisions if going left check relevant conditions
        const isOutOfBoundaries = (cube: Cube): boolean => (this.direction > 0 ? cantMoveRight(s.grid)(cube)
            : cantMoveLeft(s.grid)(cube))
        
        return  {
            ...s,
            activeBlock: checkBlockCollision([isOutOfBoundaries])(s.activeBlock) ? s.activeBlock : s.activeBlock.map(this.updateCubeX)
        }
    }

    /** 
     * @description Update the x coordinate of each cube object by adding the direction value
     * @param cube Cube object
     * @returns new cube object
     */
    updateCubeX = (cube: Cube): Cube => {
        return{
            ...cube,
            grid_col: cube.grid_col + this.direction,
            x: calculateXcoord(cube.grid_col + this.direction)
        }
    }
}

/**
 * @description Action class that restarts the game when user press r
 */
class Restart implements Action{

    /**
     * @description Reset game state back to initial 
     * @param state 
     * @returns 
     */
    apply(state: State): State {
        
        //Retrieve all the cubes in the grid as they all need to be removed
        const removingCubes: ReadonlyArray<Cube> = state.grid
        .flatMap((row, rowIndex) =>
            row.map((cell, colIndex) =>  cell !== null ? cell : null)
        ).filter(isNotNullOrUndefined)

        return state.gameEnd ?  {
            ...initialState,
            activeBlock: createBlock(state.randomTetriminoType)(state.objCount + Tetrimino.TETRIMINO_SIZE), 
            shapePreview: state.randomTetriminoType, //Assign new shape previedw
            highScore: max(state.highScore, state.score), //Assign the max of 2 elements
            grid: generate2DArray(() => null), //Generate new grid
            objCount: state.objCount + Tetrimino.TETRIMINO_SIZE * 3, //Update object count and add some gap in between incase unique id collides
            gameEnd: false, 
            clearBlocks: [...state.clearBlocks, ...removingCubes, ...state.activeBlock] //Clear all blocks from canvas
        } : 
        //If r is pressed but gameEnd is false then do nothing
        { 
            ...state
        }
    }
}

/**
 * @description Handle rotating block, takes in direction argument to indicate if rotating right or left
 */
class Rotate implements Action {
    constructor(public readonly direction: 'clockwise' | 'anticlockwise') {}

    apply(state: State): State {
         
        //Get center cube of block if it exists 
        const centerCube: Cube = state.activeBlock.find((cube) => cube.center === true)!

        //Partial function that checks for collisions
        const canRotate = not(checkBlockCollision([checkCurrentCell(state.grid), checkCubeRowExceedsBoundaries, 
            checkCubeColExceedsBoundaries]))
            
        //Update cube coordinates by creating a new object with it
        const newActiveBlock: ReadonlyArray<Cube> = centerCube && state.activeBlock.map(cube => {
            //Use different calculations based on rotation orientation
            const newRow = this.direction ==='clockwise' ? centerCube.grid_row - centerCube.grid_col + cube.grid_col :
            centerCube.grid_row + centerCube.grid_col - cube.grid_col;

            const newCol = this.direction ==='clockwise' ? centerCube.grid_col + centerCube.grid_row - cube.grid_row :
            centerCube.grid_col - centerCube.grid_row + cube.grid_row;

            return {
                ...cube,
                grid_row: newRow,
                grid_col: newCol,
                x: calculateXcoord(newCol),  
                y: calculateYcoord(newRow),  
            };
        });

        //If block can be rotated then update the state with the new block
        return {
            ...state,
            activeBlock: newActiveBlock !== undefined && canRotate(newActiveBlock) ? newActiveBlock  : state.activeBlock
        }
    }}

/**
 * @description Instantly Drop the cube
 */
class Drop implements Action {

    /**
     * @description Recusrively check if cube can be moved down
     * @param state 
     * @returns 
     */
    apply(state: State): State {
        //Add collision checks to partial function
        const canDrop = not(checkBlockCollision([checkCubeRowExceedsBoundaries, cantMoveDown(state.grid)]))

        //Create new sate with updated y coordainates
        const newState: State = {...state,activeBlock: state.activeBlock.map(Tick.moveCube(1))};
        
        //If block can still drop, keep calling function to consantly move down until you collide
        return canDrop(newState.activeBlock) ? this.apply(newState) : state;
    }
}


/**
 * @description Reduce observable game state
 * @param s Input State accumulator
 * @param action type of action to apply to the State, current value being taken in by the observables
 * @returns a new State 
 * Taken from asteroids
 */
const reduceState = (s: State, action: Action) => {
    
    //Basically everytime it hits the speed multiplier the tick 
    const speedMultiplier = max(Constants.INITIAL_SPEED - s.level * 10, Constants.MAX_SPEED); 
    const isTickAction = action instanceof Tick;
    console.log("Multiplier", speedMultiplier)
    return !isTickAction || action.getElapsed() % speedMultiplier === 0 
        ? action.apply(s) : s
}
