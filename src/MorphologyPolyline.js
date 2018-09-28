import * as THREE from 'three'
import MorphologyShapeBase from './MorphologyShapeBase'

/**
 * The MorphologyPolyline is the simplest 3D representation of a morphology, using
 * simple polylines.
 * Compared to its cylinder-based alternative (MorphologyPolycylinder), this one
 * is more suitable for displaying several morphologies (up to maybe a hundred,
 * depending on length and machine performance)
 * MorphologyPolyline extends from THREE.Object so that it's easy to integrate.
 * It's constructor
 */
class MorphologyPolyline extends MorphologyShapeBase {
  /**
   * @constructor
   * Builds a moprho as a polyline
   * @param {Morphology} morpho - raw object that describes a morphology (usually straight from a JSON file)
   * @param {object} options - the option object
   * @param {Number} options.color - the color of the polyline.
   * If provided, the whole neurone will be of the given color, if not provided,
   * the axon will be green, the basal dendrite will be red and the apical dendrite will be green
   */
  constructor(morpho, options) {
    super(morpho, options)
    const sections = this._morpho.getArrayOfSections()

    // creating a polyline for each section
    for (let i = 0; i < sections.length; i += 1) {
      const sectionPolyline = this._buildSection(sections[i])
      this.add(sectionPolyline)
    }

    // adding the soma mesh, but sometimes, there is no soma
    const somaData = this._morpho.getSoma()
    if (somaData) {
      const somaShape = this._buildSoma(options)
      this.add(somaShape)
    }

    // this is because the Allen ref is not oriented the same way as WebGL
    this.rotateX(Math.PI)
    this.rotateY(Math.PI)

    // compute the bounding box, useful for further camera targeting
    this.box = new THREE.Box3().setFromObject(this)
  }


  /**
   * @private
   * Builds a single section from a raw segment description and returns it.
   * A section is usually composed of multiple segments
   * @param {Section} section - sub part of the morpho raw object thar deals with a single section
   * @return {THREE.Line} the constructed polyline
   */
  _buildSection(section) {
    const material = new THREE.LineBasicMaterial({
      color: this._sectionColors[section.getTypename()],
    })

    const sectionPoints = section.getPoints()
    const geometry = new THREE.Geometry()

    for (let i = 0; i < sectionPoints.length; i += 1) {
      geometry.vertices.push(new THREE.Vector3(
        sectionPoints[i][0], // x
        sectionPoints[i][1], // y
        sectionPoints[i][2], // z
      ))
    }

    const line = new THREE.Line(geometry, material)

    // adding some metadata as it can be useful for raycasting
    line.name = section.getId()
    line.userData.sectionId = section.getId()
    line.userData.typevalue = section.getTypevalue()
    line.userData.typename = section.getTypename()

    return line
  }
}


export default MorphologyPolyline
