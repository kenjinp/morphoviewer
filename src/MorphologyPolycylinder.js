import * as THREE from "three"
import { Tools } from './Tools.js'
import { MorphologyShapeBase } from './MorphologyShapeBase.js'
import { BufferGeometryUtils } from './thirdparty/BufferGeometryUtils.js'


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
   * @param {Number} options.color - the color of the polyline. If provided, the whole neurone will be of the given color, if not provided, the axon will be green, the basal dendrite will be red and the apical dendrite will be green
   */
  constructor (morpho, options) {
    super(morpho, options)

    this._sectionTubeMaterials = {
      axon: new THREE.MeshPhongMaterial({ color: this._sectionColors.axon }),
      basal_dendrite: new THREE.MeshPhongMaterial({ color: this._sectionColors.basal_dendrite }),
      apical_dendrite: new THREE.MeshPhongMaterial({ color: this._sectionColors.apical_dendrite }),
    }

    let sections = this._morpho.getArrayOfSections()

    // creating a polyline for each section
    for (let i=0; i<sections.length; i++) {
      let section = this._buildSection( sections[i] )
      this.add( section )
    }

    // adding the soma as a sphere
    let somaData = this._morpho.getSoma()
    let somaShape = this._buildSoma(options)
    this.add( somaShape )

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
   * @param {Section} sectionDescription - sub part of the morpho raw object thar deals with a single section
   * @return {THREE.Line} the constructed polyline
   */
  _buildSection (section) {
    let material = this._sectionTubeMaterials[section.getTypename()]
    let sectionPoints = section.getPoints()
    let sectionRadius = section.getRadiuses()
    let startIndex = section.getParent() ? 0 : 1

    let arrayOfGeom = []

    for (let i=startIndex; i<sectionPoints.length - 1; i++)
    {
      let cyl = this._makeCylinder(
        new THREE.Vector3( // vStart
          sectionPoints[i][0],
          sectionPoints[i][1],
          sectionPoints[i][2]
        ),
        new THREE.Vector3( // vEnd
          sectionPoints[i+1][0],
          sectionPoints[i+1][1],
          sectionPoints[i+1][2]
        ),
        sectionRadius[i], // rStart
        sectionRadius[i+1], // rEnd
        false // openEnd
      )
      arrayOfGeom.push(cyl)
    }

    // merging the buffer geometries to make things faster
    let sectionGeom = BufferGeometryUtils.mergeBufferGeometries(arrayOfGeom)
    let sectionMesh =  new THREE.Mesh(sectionGeom, material)

    // adding some metadata as it can be useful for raycasting
    sectionMesh.name = section.getId()
    sectionMesh.userData[ "typevalue" ] = section.getTypevalue()
    sectionMesh.userData[ "typename" ] = section.getTypename()

    return sectionMesh
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
   * @return {THREE.CylinderBufferGeometry} the mesh containing a cylinder
   */
  _makeCylinder(vStart, vEnd, rStart, rEnd, openEnd, material){
    let HALF_PI = Math.PI * .5;
    let distance = vStart.distanceTo(vEnd);
    let position  = vEnd.clone().add(vStart).divideScalar(2);

    let offsetPosition = new THREE.Matrix4()//a matrix to fix pivot position
    offsetPosition.setPosition(position);

    let cylinder = new THREE.CylinderBufferGeometry(rStart, rEnd , distance, 8, 1, openEnd);
    let orientation = new THREE.Matrix4();//a new orientation matrix to offset pivot
    orientation.multiply(offsetPosition); // test to add offset
    let offsetRotation = new THREE.Matrix4();//a matrix to fix pivot rotation
    orientation.lookAt(vStart,vEnd,new THREE.Vector3(0,1,0));//look at destination
    offsetRotation.makeRotationX(HALF_PI);//rotate 90 degs on X
    orientation.multiply(offsetRotation);//combine orientation with rotation transformations
    cylinder.applyMatrix(orientation)
    return cylinder

    let mesh = new THREE.Mesh(cylinder,material);
    return mesh
  }


}


export { MorphologyPolycylinder }
