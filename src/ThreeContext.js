import * as THREE from "three"
import { TrackballControls } from './TrackballControls.js'
import { STLLoader } from './STLLoader.js'
//import { TrackballControls } from  'three-trackballcontrols'




/**
 * ThreeContext creates a WebGL context using THREEjs. It also handle mouse control.
 * A MorphologyPolyline instance is added to it.
 */
class ThreeContext {


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

    //var axesHelper = new THREE.AxesHelper( 1000 )
    //this._scene.add( axesHelper )

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


    //this.addStuff()
    this._animate()
  }


  addStuff () {
    let that = this
    /*
    let geometry = new THREE.SphereGeometry( 10, 32, 32 )
    let material = new THREE.MeshPhongMaterial( {color: 0xffff00} )
    let sphere = new THREE.Mesh( geometry, material )
    //sphere.position.x = - span/2 + Math.random()*span
    //sphere.position.y = - span/2 + Math.random()*span
    //sphere.position.z = - span/2 + Math.random()*span
    this._scene.add( sphere )
    */
  }


  /**
   * Adds a mesh from its URL. The mesh has to encoded into the STL format
   * @param {String} url - the url of the STL file
   * @param {String} name - optional name of this mesh (useful for further operations such as centering the view)
   */
  addStlToMeshCollection (url, name=null, focusOn=true) {
    let that = this
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

      // generate a random name in case none was provided
      if (!name)
        name = "mesh_" + Math.round(Math.random() * 1000000).toString()

      that._scene.add( mesh )
      that._meshCollection[name] = mesh

      if (focusOn)
        that.focusOnMesh(name)
    })
  }

  _animate () {
    requestAnimationFrame( this._animate.bind(this) )
    this._controls.update()

    this._renderer.render( this._scene, this._camera )
  }


  /**
   * Add a MorphoPolyline object (which are ThreeJS Object3D) into the scene of this
   * ThreeContext.
   * @param {MorphoPolyline} morphoPolyline - a MorphoPolyline instance
   * @param {String} name - the identifier to give to the MorphoPolyline instance within a local collection
   */
  addMorphologyPolyline (morphoPolyline, name=null, focusOn=true) {
    // generate a random name in case none was provided
    if (!name)
      name = "mesh_" + Math.round(Math.random() * 1000000).toString()

    this._morphologyPolylineCollection[ name ] = morphoPolyline
    this._scene.add( morphoPolyline )

    if (focusOn)
      this.focusOnMorphology( name )
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


  focusOnMesh (name) {
    console.log('center');
    let mesh = this._meshCollection[name]
    let boundingSphere = mesh.geometry.boundingSphere

    this._camera.position.set(boundingSphere.center.x - boundingSphere.radius*3, boundingSphere.center.y, boundingSphere.center.z)
    this._camera.lookAt( boundingSphere.center )
    this._controls.target.copy( boundingSphere.center )
  }

}

export { ThreeContext }
