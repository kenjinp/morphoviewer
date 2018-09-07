import * as THREE from "three"

/**
 * The MorphologyPolyline is the simplest 3D representation of a morphology, using
 * simple polylines. It extends from THREE.Object so that it's easy to integrate.
 * It's constructor
 */
class MorphologyPolyline extends THREE.Object3D {

  /**
   * @constructor
   * Builds a moprho as a polyline
   * @param {Object} morpho - raw object that describes a morphology (usually straight from a JSON file)
   */
  constructor (morpho) {
    super()

    // simple color lookup, so that every section type is shown in a different color
    this._sectionColors = {
      axon: 0x0000ff,
      basal_dendrite: 0x990000,
      apical_dendrite: 0x009900,
    }

    // creating a polyline for each section
    for (let i=0; i<morpho.sections.length; i++) {
      let section = this._buildSection( morpho.sections[i] )
      this.add( section )
    }

    // adding the soma as a sphere
    let rawSoma = morpho.soma
    let somaSphere = new THREE.Mesh(
      new THREE.SphereGeometry( rawSoma.radius, 32, 32 ),
      new THREE.MeshPhongMaterial( {color: 0xff0000} )
    )

    somaSphere.position.x = rawSoma.center[0]
    somaSphere.position.y = rawSoma.center[1]
    somaSphere.position.z = rawSoma.center[2]
    this.add( somaSphere )

    // this is because the Allen ref is not oriented the same way as WebGL
    this.rotateX( Math.PI )

    // compute the bounding box, useful for further camera targeting
    this.box = new THREE.Box3().setFromObject(this)
  }


  /**
   * @private
   * Builds a single section from a raw segment description and returns it.
   * A section is usually composed of multiple segments
   * @param {Object} sectionDescription - sub part of the morpho raw object thar deals with a single section
   * @return {THREE.Line} the constructed polyline
   */
  _buildSection (sectionDescription) {
    var material = new THREE.LineBasicMaterial({
      color: this._sectionColors[sectionDescription.type]
    })

    var geometry = new THREE.Geometry()

    for (let i=0; i<sectionDescription.points.length; i++)
    {
      geometry.vertices.push(new THREE.Vector3(
        sectionDescription.points[i].position[0],
        sectionDescription.points[i].position[1],
        sectionDescription.points[i].position[2]
      ))
    }

    var line = new THREE.Line( geometry, material )

    // adding some metadata as it can be useful for raycasting
    line.name = sectionDescription.id
    line.userData[ "type" ] = sectionDescription.type

    return line
  }


}


export { MorphologyPolyline }
