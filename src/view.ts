// Update the view according to the given State.
// All dependencies on SVG and HTML are isolated to this file.
export { updateView }

import { createBlock } from './state';
import { State, Viewport, Cube } from './types'
import { attr, isNotNullOrUndefined, stringify } from './util'

/**
 * Update the SVG game view.  
 * 
 * @param onFinish a callback function to be applied when the game ends.  For example, to clean up subscriptions.
 * @param s the current game model State
 * @returns void
 */
function updateView(s: State) {
     
        //console.log(s)
        // Canvas elements
        const svg = document.querySelector("#svgCanvas") as SVGGraphicsElement &
        HTMLElement;
        const preview = document.querySelector("#svgPreview") as SVGGraphicsElement &
        HTMLElement;
        const gameover = document.querySelector("#gameOver") as SVGGraphicsElement &
        HTMLElement;
        const container = document.querySelector("#main") as HTMLElement;

        svg.setAttribute("height", `${Viewport.CANVAS_HEIGHT}`);
        svg.setAttribute("width", `${Viewport.CANVAS_WIDTH}`);
        preview.setAttribute("height", `${Viewport.PREVIEW_HEIGHT}`);
        preview.setAttribute("width", `${Viewport.PREVIEW_WIDTH}`);

        // Text fields
        const levelText = document.querySelector("#levelText") as HTMLElement;
        const scoreText = document.querySelector("#scoreText") as HTMLElement;
        const highScoreText = document.querySelector("#highScoreText") as HTMLElement;

  
        /**
         * @description Function to update the view of the SVG element of each cube
         * @param rootSVG SVG Root element
         * @returns 
         */
        const updateCubeView = (rootSVG: HTMLElement) => (cube: Cube) => {
            
            /**
             * @description If no existing cube view based on id property, create one and add it to the dom
             */
            function createCubeView() {
            
            //Create svg element and append to root
            const svgcube = createSvgElement(svg.namespaceURI, "rect", stringify(cube))
            rootSVG.appendChild(svgcube)
            return svgcube;
            }
            
            //Try getting element by cube id if none exist then create a new svg element
            const svgcube = document.getElementById(cube.id) || createCubeView();
            
            //Update attributes
            attr(svgcube, { x: cube.x, y: cube.y });
        };
        
        scoreText.innerHTML = String(s.score);
        highScoreText.innerHTML = String(s.highScore)
        levelText.innerHTML = String(s.level)
    
        //Constantly update 
        if(s.activeBlock){
            //Call updateCubeView for each of the active block's cubes
            s.activeBlock.forEach(updateCubeView(svg))
        }
    
        //Clear Blocks 
        if (s.clearBlocks.length > 0) {
            s.clearBlocks.map(cube => document.getElementById(cube.id))
                .filter(isNotNullOrUndefined)
                .forEach(cube => {
                    try {
                        svg.removeChild(cube)
                    } catch (e) {
                        console.log("Already removed: " + e)
                    }
                })
            //Re render new cube positions due to rows shifting down
            s.grid.forEach((row) => {
                row.forEach((cell) => {
                if (cell !== null) {
                    updateCubeView(svg)(cell);
                }
                });
            });
        }
        
        //Create elements related tothe shape preview block, seperated so it does not conflict with active block
        if(s.shapePreview){
            //Function to recurisvely remove all nodes from preview element
            const removeAllChildren = (node: Node) => {
                if (node.firstChild) {
                    node.removeChild(node.firstChild);
                    removeAllChildren(node);
                }
            }
            //Remove all previous elements
            removeAllChildren(preview);
            //Add new shape preview element
            createBlock(s.shapePreview)(Math.random()).forEach(cube => preview.appendChild(createSvgElement(svg.namespaceURI, "rect", stringify(cube))))
        }
     
        
        if (s.gameEnd) {
            show(gameover)
            
          } else {
            hide(gameover);
          }
        
    
    }


/**
 * Displays a SVG element on the canvas. Brings to foreground.
 * @param elem SVG element to display
 */
const show = (elem: SVGGraphicsElement) => {
    elem.setAttribute("visibility", "visible");
    elem.parentNode!.appendChild(elem);
  };
  
  /**
   * Hides a SVG element on the canvas.
   * @param elem SVG element to hide
   */
  const hide = (elem: SVGGraphicsElement) =>
    elem.setAttribute("visibility", "hidden");
  
  /**
   * Creates an SVG element with the given properties.
   *
   * See https://developer.mozilla.org/en-US/docs/Web/SVG/Element for valid
   * element names and properties.
   *
   * @param namespace Namespace of the SVG element
   * @param name SVGElement name
   * @param props Properties to set on the SVG element
   * @returns SVG element
   */
  const createSvgElement = (
    namespace: string | null,
    name: string,
    props: Record<string, string> = {}
  ) => {
    const elem = document.createElementNS(namespace, name) as SVGElement;
    Object.entries(props).forEach(([k, v]) => elem.setAttribute(k, v));
    return elem;
  };
  