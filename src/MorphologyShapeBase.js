import * as THREE from "three"
import { Tools } from './Tools.js'
import { ConvexGeometry } from './thirdparty/ConvexGeometry.js'


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
   * @param {Number} options.color - the color of the polyline. If provided, the whole neurone will be of the given color, if not provided, the axon will be green, the basal dendrite will be red and the apical dendrite will be green
   */
  constructor (morpho, options) {
    super()

    this._pointToTarget = null
    this._morpho = morpho

    // fetch the optional color
    let color = Tools.getOption(options, 'color', null)

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
    let soma = this._morpho.getSoma()
    let somaPoints = soma.getPoints()

    // case when soma is a single point
    if (somaPoints.length === 1) {
      let somaSphere = new THREE.Mesh(
        new THREE.SphereGeometry( soma.getRadius(), 32, 32 ),
        new THREE.MeshPhongMaterial( {color: 0x000000, transparent: true, opacity:0.3} )
      )

      somaSphere.position.set(somaPoints[0][0], somaPoints[0][1], somaPoints[0][2])
      return somaSphere

    // when soma is multiple points
    } else if (somaPoints.length > 1) {
      // compute the average of the points
      let center = soma.getCenter()
      let centerV = new THREE.Vector3( center[0] ,center[1], center[2])
      var geometry = new THREE.Geometry();

      for (let i=0; i<somaPoints.length; i++) {
        geometry.vertices.push(
          new THREE.Vector3(somaPoints[i][0], somaPoints[i][1], somaPoints[i][2]),
          new THREE.Vector3(somaPoints[(i+1)%somaPoints.length][0], somaPoints[(i+1)%somaPoints.length][1], somaPoints[(i+1)%somaPoints.length][2]),
          centerV
        );
        geometry.faces.push(new THREE.Face3(3 * i, 3 * i + 1, 3 * i + 2))

      }

      var somaMesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial( {
        color: 0x000000,
        transparent: true,
        opacity:0.3,
        side: THREE.DoubleSide
      } ))
      return somaMesh

    } else {
      console.warn("No soma defined")
    }
  }


  /**
   * @private
   * Here we build a soma convex polygon based on the 1st points of the orphan
   * sections + the points available in the soma description
   * @return {THREE.Mesh} the soma mesh
   */
  _buildSomaFromOrphanSections () {
    let somaPoints = this._morpho.getSoma().getPoints()
    let somaMesh = null

    // getting all the 1st points of orphan sections
    let somaPolygonPoints = this._morpho.getOrphanSections().map(function(s){
      let allPoints = s.getPoints()
      let firstOne = allPoints[1]
      return new THREE.Vector3(...firstOne)
    })

    // adding the points of the soma (adds values mostly if we a soma polygon)
    for (let i=0; i<somaPoints.length; i++) {
      somaPolygonPoints.push(new THREE.Vector3(...somaPoints[i]))
    }

    try {
      let geometry = new ConvexGeometry( somaPolygonPoints )
      let material = new THREE.MeshPhongMaterial( {
        color: 0x555555,
        transparent: true,
        opacity:0.7,
        side: THREE.DoubleSide
      })
      somaMesh = new THREE.Mesh( geometry, material )
      return somaMesh
    } catch (e) {
      console.warn("Attempted to build a soma from orphan section points but failed. Back to the regular version.")
      return this._buildSomaDefault()
    }
  }




  /**
   * @private
   * Builds the soma. The type of soma depends on the option
   * @param {Object} options - The option object
   * @param {String|null} options.somaMode - "default" to display only the soma data or "fromOrphanSections" to build a soma using the orphan sections
   */
  _buildSoma (options) {
    this._pointToTarget = this._morpho.getSoma().getCenter()
    // can be 'default' or 'fromOrphanSections'
    let buildMode = Tools.getOption(options, 'somaMode', null)
    let somaMesh = null

    if (buildMode === "fromOrphanSections") {
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
  getTargetPoint () {
    if (this._pointToTarget) {
      // rotate this because Allen needs it (just like the sections)
      let lookat = new THREE.Vector3(this._pointToTarget[0], this._pointToTarget[1], this._pointToTarget[2])
      lookat.applyAxisAngle ( new THREE.Vector3(1, 0, 0), Math.PI )
      lookat.applyAxisAngle ( new THREE.Vector3(0, 1, 0), Math.PI )
      return lookat
    } else {
      return this.box.getCenter().clone()
    }
  }


}


export { MorphologyShapeBase }
