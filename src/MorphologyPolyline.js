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
    // adding the soma as a sphere
    let somaData = morpho.getSoma()
    let somaShape = this._buildSoma(somaData)
    this.add( somaShape )
    
    // this is because the Allen ref is not oriented the same way as WebGL
    this.rotateX( Math.PI )
    this.rotateY( Math.PI )

    // compute the bounding box, useful for further camera targeting
    this.box = new THREE.Box3().setFromObject(this)
  }



  _buildSoma (soma) {
    let somaPoints = soma.getPoints()

    // case when soma is a single point
    if (somaPoints.length === 1) {
      let somaSphere = new THREE.Mesh(
        new THREE.SphereGeometry( soma.getRadius()*5, 32, 32 ),
        new THREE.MeshPhongMaterial( {color: 0xff0000, transparent: true, opacity:0.5} )
      )

      somaSphere.position.set(somaPoints[0][0], somaPoints[0][1], somaPoints[0][2])
      return somaSphere


    // when soma is multiple points
    } else {
      // compute the average of the points
      let center = [0, 0, 0]
      for (let i=0; i<somaPoints.length; i++) {
        center[0] += somaPoints[i][0]
        center[1] += somaPoints[i][1]
        center[2] += somaPoints[i][2]
      }

      let centerV = new THREE.Vector3( center[0] / somaPoints.length,
                                       center[1] / somaPoints.length,
                                       center[2] / somaPoints.length)

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
    }
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
