import { ThreeContext } from './ThreeContext.js'
import { MorphologyPolyline } from './MorphologyPolyline.js'
import { MorphologyPolycylinder } from './MorphologyPolycylinder.js'
import { Tools } from './Tools.js'


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
   * @param {object} options - the optional values
   * @param {String} options.name - The name to give to this morphology. Will be used as an identifier for several operations
   * @param {Boolean} options.asPolyline - if true: shows a polyline view. false: shows a tubular view (default: true)
   * @param {Boolean} options.focusOn - if true, the camera will focus on this added morphology. If false, the camera will not change
   * @param {Number} options.color - the color of the polyline. If provided, the whole neurone will be of the given color, if not provided, the axon will be green, the basal dendrite will be red and the apical dendrite will be green
   */
  addMorphology (morphoObj, options) {
    let asPolyline = Tools.getOption(options, "asPolyline", true)

    if (asPolyline) {
      let morpho = new MorphologyPolyline( morphoObj, options )
      this._threeContext.addMorphologyPolyline(morpho, options)
    } else {
      let morpho = new MorphologyPolycylinder( morphoObj, options )
      this._threeContext.addMorphologyPolyline(morpho, options)
    }
    // TODO: the tubular version
  }


  /**
   * Adds a mesh from its URL. The mesh has to encoded into the STL format
   * @param {String} url - the url of the STL file
   * @param {Object} options - the options object
   * @param {String} options.name - optional name of this mesh (useful for further operations such as centering the view)
   * @param {Boolean} options.focusOn - if true, the camera will focus on this added mesh. If false, the camera will not change
   */
  addStlToMeshCollection (url, options) {
    this._threeContext.addStlToMeshCollection(url, options)
  }


}

export { MorphoViewer }
