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
      axon: color || 0x1111ff,
      basal_dendrite: color || 0xff1111,
      apical_dendrite: color || 0xf442ad,
    }

    let sections = morpho.getArrayOfSections()

    // creating a polyline for each section
    for (let i=0; i<sections.length; i++) {
      let section = this._buildSection( sections[i] )
      this.add( section )
    }

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
   * @param {Section} sectionDescription - sub part of the morpho raw object thar deals with a single section
   * @return {THREE.Line} the constructed polyline
   */
  _buildSection (section) {
    let material = new THREE.MeshBasicMaterial({
      color: this._sectionColors[section.getTypename()]
    })

    let sectionPoints = section.getPoints()
    let sectionRadius = section.getRadiuses()

    // this will contain all the cylinders of the section
    let sectionMeshes = new THREE.Object3D()

    let startIndex = section.getParent() ? 0 : 1

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
        false, // openEnd
        material
      )

      sectionMeshes.add( cyl )
    }

    // adding some metadata as it can be useful for raycasting
    sectionMeshes.name = section.getId()
    sectionMeshes.userData[ "typevalue" ] = section.getTypevalue()
    sectionMeshes.userData[ "typename" ] = section.getTypename()

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
