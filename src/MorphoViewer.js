import { ThreeContext } from './ThreeContext.js'
import { MorphologyPolyline } from './MorphologyPolyline.js'


/**
* The MorphoViewer class is the entry point object of the MorphoViewer project
* and is the only object the user should be dealing with.
*/
class MorphoViewer {
  constructor ( divObj=null ) {

    if (!divObj) {
      console.error("MorphoViewer needs a div object to display WebGL context.")
      return
    }

    this._threeContext = new ThreeContext( divObj )

  }


  /**
   * Add a morphology to the collection so that it displays.
   * @param {Object} morphoObj - describes the morphology of a neuron. This data comes straight from the JSON file
   * @param {String} name - The name to give to this morphology. Will be used as an identifier for several operations
   * @param {Boolean} asPolyline - if true: shows a polyline view. false: shows a tubular view (default: true)
   */
  addMorphology (morphoObj, name, asPolyline=true) {
    if (asPolyline) {
      let morpho = new MorphologyPolyline( morphoObj )
      console.log(morpho)
      //morpho.rotateY( Math.PI )

      this._threeContext.addMorphologyPolyline(morpho, name)
    }
    // TODO: the tubular version
  }
}

export { MorphoViewer }
