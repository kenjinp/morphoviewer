import * as THREE from "three"
import { Tools } from './Tools.js'


/**
 * The MorphologyPolycylinder is a tubular representation of a morphology, using cylinders.
 * this alternative to MorphologyPolyline is heavier on CPU and GPU so is more made when
 * displaying a small number of morphologies.
 * MorphologyPolycylinder extends from THREE.Object so that it's easy to integrate.
 * It's constructor
 */
class MorphologyPolycylinder extends THREE.Object3D {

  /**
   * @constructor
   * Builds a moprho as a polyline
   * @param {Object} morpho - raw object that describes a morphology (usually straight from a JSON file)
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
      apical_dendrite: color || 0x009900,
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
    this.rotateY( Math.PI )

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
    let material = new THREE.MeshBasicMaterial({
      color: this._sectionColors[sectionDescription.typename]
    })

    // this will contain all the cylinders of the section
    let sectionMeshes = new THREE.Object3D()

    for (let i=0; i<sectionDescription.points.length - 1; i++)
    {
      let cyl = this._makeCylinder(
        new THREE.Vector3( // vStart
          sectionDescription.points[i].position[0],
          sectionDescription.points[i].position[1],
          sectionDescription.points[i].position[2]
        ),
        new THREE.Vector3( // vEnd
          sectionDescription.points[i+1].position[0],
          sectionDescription.points[i+1].position[1],
          sectionDescription.points[i+1].position[2]
        ),
        sectionDescription.points[i].radius, // rStart
        sectionDescription.points[i+1].radius, // rEnd
        false, // openEnd
        material
      )

      sectionMeshes.add( cyl )
    }

    // adding some metadata as it can be useful for raycasting
    sectionMeshes.name = sectionDescription.id
    sectionMeshes.userData[ "type" ] = sectionDescription.type

    return sectionMeshes
  }


  /**
   * @private
   * Generate a cylinder with a starting point and en endpoint because
   * THREEjs does not provide that
   * @param {THREE.Vector3} vStart - the start position
   * @param {THREE.Vector3} vEnd - the end position
   * @param {Number} rStart - radius at the `vStart` position
   * @param {Number} rEnd - radius at the `vEnd` position
   * @param {Boolean} openEnd - cylinder has open ends if true, or closed ends if false
   * @param {THREE.Material} material - material to use (instead of creating a new one every time)
   * @return {THREE.Mesh} the mesh containing a cylinder
   */
  _makeCylinder(vStart, vEnd, rStart, rEnd, openEnd, material){
    let HALF_PI = Math.PI * .5;
    let distance = vStart.distanceTo(vEnd);
    let position  = vEnd.clone().add(vStart).divideScalar(2);

    let cylinder = new THREE.CylinderBufferGeometry(rStart, rEnd , distance, 8, 1, openEnd);

    let orientation = new THREE.Matrix4();//a new orientation matrix to offset pivot
    let offsetRotation = new THREE.Matrix4();//a matrix to fix pivot rotation
    let offsetPosition = new THREE.Matrix4();//a matrix to fix pivot position
    orientation.lookAt(vStart,vEnd,new THREE.Vector3(0,1,0));//look at destination
    offsetRotation.makeRotationX(HALF_PI);//rotate 90 degs on X
    orientation.multiply(offsetRotation);//combine orientation with rotation transformations
    cylinder.applyMatrix(orientation)

    let mesh = new THREE.Mesh(cylinder,material);
    mesh.position.x = position.x
    mesh.position.y = position.y
    mesh.position.z = position.z
    return mesh
  }

}


export { MorphologyPolycylinder }
