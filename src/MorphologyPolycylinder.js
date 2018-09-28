import * as THREE from 'three'
import Tools from './Tools'
import MorphologyShapeBase from './MorphologyShapeBase'
import BufferGeometryUtils from './thirdparty/BufferGeometryUtils'


/**
 * The MorphologyPolycylinder is a tubular representation of a morphology, using cylinders.
 * this alternative to MorphologyPolyline is heavier on CPU and GPU so is more made when
 * displaying a small number of morphologies.
 * MorphologyPolycylinder extends from THREE.Object so that it's easy to integrate.
 * It's constructor
 */
class MorphologyPolycylinder extends MorphologyShapeBase {
  /**
   * @constructor
   * Builds a moprho as a polyline
   * @param {Object} morpho - raw object that describes a morphology (usually straight from a JSON file)
   * @param {object} options - the option object
   * @param {Number} options.color - the color of the polyline.
   * If provided, the whole neurone will be of the given color, if not provided,
   * the axon will be green, the basal dendrite will be red and the apical dendrite will be green
   */
  constructor(morpho, options) {
    super(morpho, options)

    this._sectionTubeMaterials = {
      axon: new THREE.MeshPhongMaterial({ color: this._sectionColors.axon }),
      basal_dendrite: new THREE.MeshPhongMaterial({ color: this._sectionColors.basal_dendrite }),
      apical_dendrite: new THREE.MeshPhongMaterial({ color: this._sectionColors.apical_dendrite }),
    }

    const sections = this._morpho.getArrayOfSections()

    // creating a polyline for each section
    for (let i = 0; i < sections.length; i += 1) {
      const section = this._buildSection(sections[i])
      if (section) this.add(section)
    }

    // adding the soma, but sometimes, there is no soma data...
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
   * @param {Section} sectionDescription - sub part of the morpho raw object thar deals with a single section
   * @return {THREE.Line} the constructed polyline
   */
  _buildSection(section) {
    const material = this._sectionTubeMaterials[section.getTypename()]
    const sectionPoints = section.getPoints()
    const sectionRadius = section.getRadiuses()
    const startIndex = section.getParent() ? 0 : 1

    if ((sectionPoints.length - startIndex) < 2) return null

    const arrayOfGeom = []

    for (let i = startIndex; i < sectionPoints.length - 1; i += 1) {
      const cyl = Tools.makeCylinder(
        new THREE.Vector3( // vStart
          sectionPoints[i][0],
          sectionPoints[i][1],
          sectionPoints[i][2],
        ),
        new THREE.Vector3( // vEnd
          sectionPoints[i + 1][0],
          sectionPoints[i + 1][1],
          sectionPoints[i + 1][2],
        ),
        sectionRadius[i], // rStart
        sectionRadius[i + 1], // rEnd
        false, // openEnd
      )
      arrayOfGeom.push(cyl)
    }

    // merging the buffer geometries to make things faster
    const sectionGeom = BufferGeometryUtils.mergeBufferGeometries(arrayOfGeom)
    const sectionMesh = new THREE.Mesh(sectionGeom, material)

    // adding some metadata as it can be useful for raycasting
    sectionMesh.name = section.getId()
    sectionMesh.userData.sectionId = section.getId()
    sectionMesh.userData.typevalue = section.getTypevalue()
    sectionMesh.userData.typename = section.getTypename()

    return sectionMesh
  }
}

export default MorphologyPolycylinder
