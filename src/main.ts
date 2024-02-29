 //Matthew Ong 31536492
 
/**
 * Inside this file you will use the classes and functions from rx.js
 * to add visuals to the svg element in index.html, animate them, and make them interactive.
 *
 * Study and complete the tasks in observable exercises first to get ideas.
 *
 * Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
 *
 * You will be marked on your functional programming style
 * as well as the functionality that you implement.
 *
 * Document your code!
 */

import "./style.css";

import { fromEvent, interval, merge, Observable, Subscription  } from "rxjs";
import { map, filter, scan } from "rxjs/operators";
import { Action, Constants, Key, State, Event, Tetrimino } from "./types";
import { Move, Tick, reduceState, GenerateBlock, initialState, Restart, Rotate, Drop } from "./state";
import { createRngStreamFromSource } from "./util";
import { updateView } from "./view";
 
/**
 * @description This is the function called on page load. All observable streams are here
 * 
 */
export function main() {
  
  /** User input */
  const key$ = (e: Event, k: Key) => fromEvent<KeyboardEvent>(document, e).pipe(
    filter(({ code }) => code === k),
    filter(({ repeat }) => !repeat))
  
  const restart$ = key$("keydown", 'KeyR').pipe(map(_ => new Restart()))
  const rightMove$ =  key$("keydown", 'KeyD').pipe(map(_ => new Move(1)))
  const leftMove$ =  key$("keydown", 'KeyA').pipe(map(_ => new Move(-1)))
  const rightRotate$ =  key$("keydown", 'KeyE').pipe(map(_ => new Rotate('clockwise')))
  const leftRotate$ = key$("keydown", 'KeyQ').pipe(map(_ => new Rotate('anticlockwise')))
  const drop$ = key$("keydown", 'KeyS').pipe(map(_ => new Drop()))

  //Stream of random numbers
  const rngStream = createRngStreamFromSource(interval(200));
  
  //Randomly index a tetrimino type 
  const randomTetrominoType$ = rngStream(6).pipe(
    map((randNum: number) => {
      const index = Math.abs(Math.floor(randNum * Tetrimino.TETRIMINO_TYPES.length - 1));
      return new GenerateBlock(index);
    })
  );

   //Tick class is applied every interval 
   const gameSpeed$ = interval(Constants.TICK_RATE_MS).pipe(
    map(elapsed => new Tick(elapsed))
  ) 
0
  //Merge all inputs into one observable at an interval of 0.1 mili seconds
  const action$: Observable<Action> = merge(gameSpeed$, leftMove$, rightMove$, randomTetrominoType$, restart$, rightRotate$, leftRotate$, drop$); 
  
  //Each time the action observable takes an action, we use that to reduce it to original state
  const state$: Observable<State> = action$.pipe(
    scan(reduceState, initialState),
  ); 
 
  const subscriptionState: Subscription = state$.subscribe(updateView); 
    
}

// The following simply runs your main function on window load.  Make sure to leave it in place.
if (typeof window !== "undefined") {
  window.onload = () => {
    main();
  };
}

 
