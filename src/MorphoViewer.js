import morphologycorejs from 'morphologycorejs'
import ThreeContext from './ThreeContext'
import MorphologyPolyline from './MorphologyPolyline'
import MorphologyPolycylinder from './MorphologyPolycylinder'
import Tools from './Tools'


/**
* The MorphoViewer class is the entry point object of the MorphoViewer project
* and is the only object the user should be dealing with.
*/
class MorphoViewer {
  constructor(divObj = null) {
    if (!divObj) {
      console.error('MorphoViewer needs a div object to display WebGL context.')
      return
    }

    this._threeContext = new ThreeContext(divObj)
  }


  /**
   * Add a morphology to the collection so that it displays.
   * @param {Object|morphologycorejs.Morphology} morphoObj - describes the morphology of a neuron.
   * This data comes straight from the JSON file or it can also be a Morphology object from `morphologycorejs`
   * @param {object} options - the optional values
   * @param {String} options.name - The name to give to this morphology. Will be used as an identifier for several operations
   * @param {Boolean} options.asPolyline - if true: shows a polyline view. false: shows a tubular view (default: true)
   * @param {Boolean} options.focusOn - if true, the camera will focus on this added morphology. If false, the camera will not change
   * @param {Number} options.color - the color of the polyline.
   * If provided, the whole neurone will be of the given color, if not provided,
   * the axon will be green, the basal dendrite will be red and the apical dendrite will be green
   * @param {String} options.somaMode - "default" to display only the soma data or "fromOrphanSections" to build a soma using the orphan sections
   * @param {Function} options.onDone - callback when the morphology is displayed. Called with the name (given or generated) of the morphology
   * @param {Number} options.distance - the distance between the camera and the soma. Only relevant if `onFocus` is `true`
   */
  addMorphology(morphoObj, options) {
    // create a morphology object from the raw object
    let morphology = null

    // creates an auto name if none is giver
    options.name = Tools.getOption(options, 'name', `morpho_${Math.round(Math.random() * 1000000).toString()}`)

    if (morphoObj instanceof morphologycorejs.Morphology) {
      morphology = morphoObj
    } else {
      morphology = new morphologycorejs.Morphology()
      morphology.buildFromRawMorphology(morphoObj)
    }

    morphology.setId(options.name)

    const asPolyline = Tools.getOption(options, 'asPolyline', true)

    if (asPolyline) {
      const morphoPolyLine = new MorphologyPolyline(morphology, options)
      this._threeContext.addMorphology(morphoPolyLine, options)
    } else {
      const morpho = new MorphologyPolycylinder(morphology, options)
      this._threeContext.addMorphology(morpho, options)
    }
  }


  /**
   * Adds a mesh from its URL. The mesh has to encoded into the STL format
   * @param {String} url - the url of the STL file
   * @param {Object} options - the options object
   * @param {String} options.name - optional name of this mesh (useful for further operations such as centering the view)
   * @param {Boolean} options.focusOn - if true, the camera will focus on this added mesh. If false, the camera will not change
   */
  addStlToMeshCollection(url, options) {
    this._threeContext.addStlToMeshCollection(url, options)
  }


  /**
   * Kill all to save up memory, stop the annimation, removes events, delete the canvas
   */
  destroy() {
    this._threeContext.destroy()
  }


  /**
   * Get the field of view angle of the camera, in degrees
   * @return {Number}
   */
  getCameraFieldOfView() {
    return this._threeContext.getCameraFieldOfView()
  }


  /**
   * Define the camera field of view, in degrees
   * @param {Number} fov - the fov
   */
  setCameraFieldOfView(fov) {
    this._threeContext.setCameraFieldOfView(fov)
  }


  /**
   * Make the camera look at the soma of a morphology (or the center of it's bounding box
   * if the neuron does not have soma data)
   * @param {String} name - the name of the neuron to focus on
   * @param {Number} distance - distance from the soma center (in world space, most likely microns)
   */
  focusOnMorphology(name, distance) {
    this._threeContext.focusOnMorphology(name, distance)
  }


  /**
   * Make the camera focus on the given mesh
   * @param {String} name - name of the mesh
   */
  focusOnMesh(name) {
    this._threeContext.focusOnMesh(name)
  }


  /**
   * Define a callback associated with clicking on a section. The callback function
   * is called with the `morphologycorejs.Section` instance as arguments (or `undefined`)
   */
  onRaycast(cb) {
    this._threeContext.on('onRaycast', cb)
  }


  /**
   *
   */
  takeScreenshot(filename = 'capture.png') {
    const imageData = this._threeContext.getSnapshotData()
    Tools.triggerDownload(imageData, filename)
  }
}

export default MorphoViewer
