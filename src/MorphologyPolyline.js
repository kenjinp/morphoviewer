import * as THREE from "three"
import { Tools } from './Tools.js'


/**
 * The MorphologyPolyline is the simplest 3D representation of a morphology, using
 * simple polylines.
 * Compared to its cylinder-based alternative (MorphologyPolycylinder), this one
 * is more suitable for displaying several morphologies (up to maybe a hundred,
 * depending on length and machine performance)
 * MorphologyPolyline extends from THREE.Object so that it's easy to integrate.
 * It's constructor
 */
class MorphologyPolyline extends THREE.Object3D {

  /**
   * @constructor
   * Builds a moprho as a polyline
   * @param {Morphology} morpho - raw object that describes a morphology (usually straight from a JSON file)
   * @param {object} options - the option object
   * @param {Number} options.color - the color of the polyline. If provided, the whole neurone will be of the given color, if not provided, the axon will be green, the basal dendrite will be red and the apical dendrite will be green
   */
  constructor (morpho, options) {
    super()

    // fetch the optional color
    let color = Tools.getOption(options, 'color', null)

    // simple color lookup, so that every section type is shown in a different color
    this._sectionColors = {
      axon: color || 0x0000ff,
      basal_dendrite: color || 0x990000,
      apical_dendrite: color || 0xf442ad, // shoud be pink
    }

    let sections = morpho.getArrayOfSections()

    // creating a polyline for each section
    for (let i=0; i<sections.length; i++) {
      let sectionPolyline = this._buildSection( sections[i] )
      this.add( sectionPolyline )
    }

    // adding the soma as a sphere
    let soma = morpho.getSoma()
    let somaSphere = new THREE.Mesh(
      new THREE.SphereGeometry( soma.getRadius(), 32, 32 ),
      new THREE.MeshPhongMaterial( {color: 0xff0000} )
    )

    let somaCenter = soma.getCenter()
    somaSphere.position.set(somaCenter[0], somaCenter[1], somaCenter[2])
    this.add( somaSphere )

    // this is because the Allen ref is not oriented the same way as WebGL
    this.rotateX( Math.PI )
    this.rotateY( Math.PI )

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
  _buildSection (section) {
    let material = new THREE.LineBasicMaterial({
      color: this._sectionColors[section.getTypename()]
    })

    let sectionPoints = section.getPoints()
    let geometry = new THREE.Geometry()

    for (let i=0; i<sectionPoints.length; i++)
    {
      geometry.vertices.push(new THREE.Vector3(
        sectionPoints[i][0], // x
        sectionPoints[i][1], // y
        sectionPoints[i][2]  // z
      ))
    }

    let line = new THREE.Line( geometry, material )

    // adding some metadata as it can be useful for raycasting
    line.name = section.getId()
    line.userData[ "typevalue" ] = section.getTypevalue()
    line.userData[ "typename" ] = section.getTypename()

    return line
  }


}


export { MorphologyPolyline }
