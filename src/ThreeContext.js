import * as THREE from "three"
import { TrackballControls } from './thirdparty/TrackballControls.js'
import { STLLoader } from './thirdparty/STLLoader.js'
import { Tools } from './Tools.js'


/**
 * ThreeContext creates a WebGL context using THREEjs. It also handle mouse control.
 * A MorphologyPolyline instance is added to it.
 */
class ThreeContext {

  /**
   * @param {DONObject} divObj - the div object as a DOM element. Will be used to host the WebGL context
   * created by THREE
   */
  constructor ( divObj=null ) {
    if (!divObj) {
      console.error("The ThreeContext needs a div object")
      return
    }

    this._morphologyPolylineCollection = {}
    this._meshCollection = {}

    // init camera
    this._camera = new THREE.PerspectiveCamera( 27, window.innerWidth / window.innerHeight, 1, 100000 )
    this._camera.position.z = 1000

    // init scene
    this._scene = new THREE.Scene()
    this._scene.add(new THREE.AmbientLight( 0x444444 ) )

    var axesHelper = new THREE.AxesHelper( 1000 )
    this._scene.add( axesHelper )

    // adding some light
    var light1 = new THREE.DirectionalLight( 0xffffff, 0.5 )
    light1.position.set( 10, 10, 10 )
    this._scene.add( light1 )
    //var light2 = new THREE.DirectionalLight( 0xffffff, 1.5 )
    //light2.position.set( 0, -10, 0 )
    //this._scene.add( light2 )

    this._renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } )
    this._renderer.setClearColor( 0xffffff, 0 )
    this._renderer.setPixelRatio( window.devicePixelRatio )
    this._renderer.setSize( window.innerWidth, window.innerHeight )
    this._renderer.gammaInput = true
    this._renderer.gammaOutput = true
    divObj.appendChild( this._renderer.domElement )

    this._controls = new TrackballControls( this._camera )
    this._controls.rotateSpeed = 10

    let that = this
    window.addEventListener( 'resize', function() {
      that._camera.aspect = window.innerWidth / window.innerHeight
      that._camera.updateProjectionMatrix()
      that._renderer.setSize( window.innerWidth, window.innerHeight )
      that._controls.handleResize()
    }, false )

    //this._addStuff()
    this._animate()
  }


  /**
   * @private
   * Add stuff to the scene, only for testing
   */
  _addStuff () {
    let that = this

    window.THREE = THREE

    /*
    var geometry = new THREE.CylinderGeometry( 5, 5, 20, 32 )
    //var geometry = new THREE.CylinderBufferGeometry( 5, 5, 20, 32 )

    var material = new THREE.MeshPhongMaterial( {color: 0xff00ff} )
    var cylinder = new THREE.Mesh( geometry, material )
    this._scene.add( cylinder )
    console.log(cylinder)
    */


    function drawCylinder(vStart, vEnd, rStart, rEnd, openEnd){
      var HALF_PI = Math.PI * .5;
      var distance = vStart.distanceTo(vEnd);
      var position  = vEnd.clone().add(vStart).divideScalar(2);

      var material = new THREE.MeshLambertMaterial({color:0x0000ff});
      var cylinder = new THREE.CylinderGeometry(rStart, rEnd , distance, 32, 1, openEnd);

      var orientation = new THREE.Matrix4();//a new orientation matrix to offset pivot
      var offsetRotation = new THREE.Matrix4();//a matrix to fix pivot rotation
      var offsetPosition = new THREE.Matrix4();//a matrix to fix pivot position
      orientation.lookAt(vStart,vEnd,new THREE.Vector3(0,1,0));//look at destination
      offsetRotation.makeRotationX(HALF_PI);//rotate 90 degs on X
      orientation.multiply(offsetRotation);//combine orientation with rotation transformations
      cylinder.applyMatrix(orientation)

      var mesh = new THREE.Mesh(cylinder,material);
      mesh.position.x = position.x
      mesh.position.y = position.y
      mesh.position.z = position.z
      return mesh
    }

    let c = drawCylinder( new THREE.Vector3(1000, 0, 0), new THREE.Vector3(0, 0, 1000), 10, 100, false)
    this._scene.add( c )
    console.log( c );


  }


  /**
   * Adds a mesh from its URL. The mesh has to encoded into the STL format
   * @param {String} url - the url of the STL file
   * @param {Object} options - the options object
   * @param {String} options.name - optional name of this mesh (useful for further operations such as centering the view)
   * @param {Boolean} options.focusOn - if true, the camera will focus on this added mesh. If false, the camera will not change
   * @param {Function} options.onDone - callback to be called when the mesh is added. Called with the name of the mesh in argument
   */
  addStlToMeshCollection (url, options) {
    let that = this

    // generate a random name in case none was provided
    let name = Tools.getOption( options, "name", "mesh_" + Math.round(Math.random() * 1000000).toString() )
    let focusOn = Tools.getOption( options, "focusOn", true )

    var loader = new STLLoader()
    //loader.load( '../data/meshes/mask_smooth_simple.stl', function ( geometry ) {
    loader.load( url, function ( geometry ) {
      var material = new THREE.MeshPhongMaterial( {
          specular: 0xffffff,
          shininess: 300,
          side: 0,//THREE.DoubleSide,
          color: 0xDDDDDD,
          transparent: true,
          opacity: 0.1,
          wireframe: false
        })

      geometry.computeBoundingSphere()

      let mesh = new THREE.Mesh(
        geometry,
        material
      )

      that._scene.add( mesh )
      that._meshCollection[name] = mesh

      if (focusOn)
        that.focusOnMesh(name)

      // call a callback if declared, with the name of the mesh in arg
      let onDone = Tools.getOption( options, "onDone", null )
      if (onDone) {
        onDone( name )
      }
    })
  }


  /**
   * @private
   * deals with rendering and updating the controls
   */
  _animate () {
    requestAnimationFrame( this._animate.bind(this) )
    this._controls.update()

    this._renderer.render( this._scene, this._camera )
  }


  /**
   * Add a MorphoPolyline object (which are ThreeJS Object3D) into the scene of this
   * ThreeContext.
   * @param {MorphoPolyline} morphoPolyline - a MorphoPolyline instance
   * @param {Object} options - the option object
   * @param {String} options.name - the identifier to give to the MorphoPolyline instance within a local collection
   * @param {Boolean} options.focusOn - if true, the camera will focus on this added morphology. If false, the camera will not change
   * @param {Function} options.onDone - callback to be called when the morphology polyline is added. Called with the name of the morpho in argument
   */
  addMorphologyPolyline (morphoPolyline, options) {
    // generate a random name in case none was provided
    let name = Tools.getOption( options, "name", "morpho_" + Math.round(Math.random() * 1000000).toString() )
    let focusOn = Tools.getOption( options, "focusOn", true )

    this._morphologyPolylineCollection[ name ] = morphoPolyline
    this._scene.add( morphoPolyline )

    if (focusOn)
      this.focusOnMorphology( name )

    // call a callback if declared, with the name of the morphology in arg
    let onDone = Tools.getOption( options, "onDone", null )
    if (onDone) {
      onDone( name )
    }
  }


  /**
   * Make the camera focus on a specific morphology
   * @param {String} name - name of the morphology in the collection
   */
  focusOnMorphology (name) {
    let morphoBox = this._morphologyPolylineCollection[ name ].box
    let boxSize = new THREE.Vector3()
    morphoBox.getSize(boxSize)
    let largestSide = Math.max(boxSize.x, boxSize.y, boxSize.z)
    let boxCenter = new THREE.Vector3()
    morphoBox.getCenter(boxCenter)
    this._camera.position.set(boxCenter.x - largestSide*3, boxCenter.y, boxCenter.z)
    this._camera.lookAt( boxCenter )

    this._controls.target.copy( boxCenter )
  }


  /**
   * Focus on a mesh, given its name
   * @param {string} name - name of the mesh to focus on
   */
  focusOnMesh (name) {
    let mesh = this._meshCollection[name]
    let boundingSphere = mesh.geometry.boundingSphere

    this._camera.position.set(boundingSphere.center.x - boundingSphere.radius*3, boundingSphere.center.y, boundingSphere.center.z)
    this._camera.lookAt( boundingSphere.center )
    this._controls.target.copy( boundingSphere.center )
  }

}

export { ThreeContext }
