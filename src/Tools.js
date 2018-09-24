import * as THREE from "three"


/**
* Some handy static functions to do stuff that are not strictly related to the business of the project
*/
class Tools {

  /**
   * Handy function to deal with option object we pass in argument of function.
   * Allows the return of a default value if the `optionName` is not available in
   * the `optionObj`
   * @param {Object} optionObj - the object that contain the options
   * @param {String} optionName - the name of the option desired, attribute of `optionObj`
   * @param {any} optionDefaultValue - default values to be returned in case `optionName` is not an attribute of `optionObj`
   */
  static getOption (optionObj, optionName, optionDefaultValue) {
    return (optionObj && optionName in optionObj) ? optionObj[optionName] : optionDefaultValue
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
  static makeCylinder(vStart, vEnd, rStart, rEnd, openEnd, material){
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

export { Tools }
