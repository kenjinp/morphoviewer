import * as THREE from 'three'
import Tools from './Tools'
import ConvexGeometry from './thirdparty/ConvexGeometry'


/**
 * This is the base class for `MorphologyPolyline` and `MorphologyPolycylinder`.
 * It handles the common features, mainly related to soma creation
 */
class MorphologyShapeBase extends THREE.Object3D {
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
    super()

    this.userData.morphologyName = options.name
    this._pointToTarget = null
    this._morpho = morpho

    // fetch the optional color
    const color = Tools.getOption(options, 'color', null)

    // simple color lookup, so that every section type is shown in a different color
    this._sectionColors = {
      axon: color || 0x1111ff,
      basal_dendrite: color || 0xff1111,
      apical_dendrite: color || 0xf442ad,
    }
  }


  /**
   * @private
   * The method to build a soma mesh using the 'default' way, aka using simply the
   * data from the soma.
   * @return {THREE.Mesh} the soma mesh
   */
  _buildSomaDefault() {
    const soma = this._morpho.getSoma()
    const somaPoints = soma.getPoints()

    // case when soma is a single point
    if (somaPoints.length === 1) {
      const somaSphere = new THREE.Mesh(
        new THREE.SphereGeometry(soma.getRadius(), 32, 32),
        new THREE.MeshPhongMaterial({ color: 0x000000, transparent: true, opacity: 0.3 }),
      )

      somaSphere.position.set(somaPoints[0][0], somaPoints[0][1], somaPoints[0][2])
      return somaSphere

    // this is a 3-point soma, probably colinear
    } if (somaPoints.length === 3) {
      /*
      let radius = soma.getRadius()
      let mat = new THREE.MeshPhongMaterial( {color: 0x000000, transparent: true, opacity:0.3} )

      let c1 = Tools.makeCylinder(
        new THREE.Vector3(...somaPoints[0]),
        new THREE.Vector3(...somaPoints[1]),
        radius,
        radius,
        false,
        mat
      )

      let c2 = Tools.makeCylinder(
        new THREE.Vector3(...somaPoints[1]),
        new THREE.Vector3(...somaPoints[2]),
        radius,
        radius,
        false,
        mat
      )

      let somaCyl = new THREE.Object3D()
      somaCyl.add(c1)
      somaCyl.add(c2)
      return somaCyl
      */

      const somaSphere = new THREE.Mesh(
        new THREE.SphereGeometry(soma.getRadius(), 32, 32),
        new THREE.MeshPhongMaterial({ color: 0x000000, transparent: true, opacity: 0.3 }),
      )

      somaSphere.position.set(somaPoints[0][0], somaPoints[0][1], somaPoints[0][2])
      return somaSphere


    // when soma is multiple points
    } if (somaPoints.length > 1) {
      // compute the average of the points
      const center = soma.getCenter()
      const centerV = new THREE.Vector3(center[0], center[1], center[2])
      const geometry = new THREE.Geometry()

      for (let i = 0; i < somaPoints.length; i += 1) {
        geometry.vertices.push(
          new THREE.Vector3(somaPoints[i][0], somaPoints[i][1], somaPoints[i][2]),
          new THREE.Vector3(
            somaPoints[(i + 1) % somaPoints.length][0],
            somaPoints[(i + 1) % somaPoints.length][1],
            somaPoints[(i + 1) % somaPoints.length][2],
          ),
          centerV,
        )
        geometry.faces.push(new THREE.Face3(3 * i, 3 * i + 1, 3 * i + 2))
      }

      const somaMesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      }))
      return somaMesh
    }
    console.warn('No soma defined')
    return null
  }


  /**
   * @private
   * Here we build a soma convex polygon based on the 1st points of the orphan
   * sections + the points available in the soma description
   * @return {THREE.Mesh} the soma mesh
   */
  _buildSomaFromOrphanSections() {
    const somaPoints = this._morpho.getSoma().getPoints()
    let somaMesh = null

    try {
      // getting all the 1st points of orphan sections
      const somaPolygonPoints = this._morpho.getOrphanSections().map((s) => {
        const allPoints = s.getPoints()
        const firstOne = allPoints[1]
        return new THREE.Vector3(...firstOne)
      })

      // adding the points of the soma (adds values mostly if we a soma polygon)
      for (let i = 0; i < somaPoints.length; i += 1) {
        somaPolygonPoints.push(new THREE.Vector3(...somaPoints[i]))
      }

      const geometry = new ConvexGeometry(somaPolygonPoints)
      const material = new THREE.MeshPhongMaterial({
        color: 0x555555,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      })
      somaMesh = new THREE.Mesh(geometry, material)
      return somaMesh
    } catch (e) {
      console.warn('Attempted to build a soma from orphan section points but failed. Back to the regular version.')
      return this._buildSomaDefault()
    }
  }


  /**
   * @private
   * Builds the soma. The type of soma depends on the option
   * @param {Object} options - The option object
   * @param {String|null} options.somaMode - "default" to display only the soma data or "fromOrphanSections" to build a soma using the orphan sections
   */
  _buildSoma(options) {
    this._pointToTarget = this._morpho.getSoma().getCenter()
    // can be 'default' or 'fromOrphanSections'
    const buildMode = Tools.getOption(options, 'somaMode', null)
    let somaMesh = null

    if (buildMode === 'fromOrphanSections') {
      somaMesh = this._buildSomaFromOrphanSections()
    } else {
      somaMesh = this._buildSomaDefault()
    }

    return somaMesh
  }


  /**
   * Get the point to target when using the method lookAt. If the soma is valid,
   * this will be the center of the soma. If no soma is valid, it will be the
   * center of the box
   * @return {Array} center with the shape [x: Number, y: Number, z: Number]
   */
  getTargetPoint() {
    if (this._pointToTarget) {
      // rotate this because Allen needs it (just like the sections)
      const lookat = new THREE.Vector3(this._pointToTarget[0], this._pointToTarget[1], this._pointToTarget[2])
      lookat.applyAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI)
      lookat.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)
      return lookat
    }
    const center = new THREE.Vector3()
    this.box.getCenter(center)
    return center
  }


  /**
   * Get the morphology object tied to _this_ mesh
   * @return {morphologycorejs.Morphology}
   */
  getMorphology() {
    return this._morpho
  }
}


export default MorphologyShapeBase
