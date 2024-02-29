export { Constants, Viewport, Cube_Dimensions, GRID_RANGE, Tetrimino }
export type { State, Key, Event, Action, Cube }
/** Constants */
//Matthew Ong 31536492

const Viewport = {
    CANVAS_WIDTH: 200,
    CANVAS_HEIGHT: 400,
    PREVIEW_WIDTH: 160,
    PREVIEW_HEIGHT: 80,
} 
  
const Constants = {
  TICK_RATE_MS: 1,
  INITIAL_SPEED: 100, 
  GRID_WIDTH: 10,
  GRID_HEIGHT: 20,
  MAX_SPEED: 10, //Max 
} 

const Cube_Dimensions = {
  WIDTH: Viewport.CANVAS_WIDTH / Constants.GRID_WIDTH, //20
  HEIGHT: Viewport.CANVAS_HEIGHT / Constants.GRID_HEIGHT, // 20
} 

//Boundaries of 2D matrix
const GRID_RANGE = {
  NUM_OF_ROWS: Viewport.CANVAS_HEIGHT / Cube_Dimensions.HEIGHT,
  COL_MIDPOINT: (Viewport.CANVAS_WIDTH / Cube_Dimensions.WIDTH )/ 2,
  NUM_OF_COLUMNS: Viewport.CANVAS_WIDTH / Cube_Dimensions.WIDTH
} 

const Tetrimino = {
  TETRIMINO_TYPES: ["I", "J", "L", "O", "S", "T", "Z"], //The various types of tetrominos
  DEFAULT_CHOICE: 3, //Just in case indexing goes out of bounds this is the default choce
  TETRIMINO_SIZE: 4 //Number of cubes each tetrimino has
}

/*---------------------Types------------------*/

type Key = "KeyS" | "KeyA" | "KeyD" | "KeyR" | "KeyE" | "KeyQ" | "KeyS";

type Event = "keydown" | "keyup" | "keypress";


type State = Readonly<{
  gameEnd: boolean; 
  activeBlock: ReadonlyArray<Cube>;
  grid: ReadonlyArray<ReadonlyArray<null | Cube>>
  shapePreview: string;
  clearBlocks: ReadonlyArray<Cube>;
  randomTetriminoType: string;
  score: number;
  highScore: number;
  level: number;
  objCount: number;
}>;

type Cube = Readonly<{
  id: string; //Unique ID
  x: number; //Corresponding x coord of col
  y: number; //Corresponding y coord of row
  grid_row: number; //Row index of cube position in 2D matrix
  grid_col: number; //Col index of cube position in 2D matrix
  width: string;
  height: string;
  style: string;
  center: boolean; //True if the cube is the center of the tetrmino
}>;
  
/**
 * Actions modify state, this function was from asteroids
 */
interface Action {
  apply(s: State): State;
}