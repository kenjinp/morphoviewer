import * as THREE from "three"
import { TrackballControls } from './thirdparty/TrackballControls.js'
import { STLLoader } from './thirdparty/STLLoader.js'
import { Tools } from './Tools.js'
import { EventManager } from './EventManager.js'


const DEFAULT_FOCUS_DISTANCE = 1000

/**
 * ThreeContext creates a WebGL context using THREEjs. It also handle mouse control.
 * A MorphologyPolyline instance is added to it.
 * An event can be associated to a ThreeContext instance: `onRaycast` with the method
 * `.on("onRaycast", function(s){...})` where `s` is the section object being raycasted.
 */
class ThreeContext extends EventManager {

  /**
   * @param {DONObject} divObj - the div object as a DOM element. Will be used to host the WebGL context
   * created by THREE
   */
  constructor ( divObj=null ) {
    super()

    let that = this

    if (!divObj) {
      console.error("The ThreeContext needs a div object")
      return
    }

    this._requestFrameId = null

    this._morphologyMeshCollection = {}
    this._meshCollection = {}

    // init camera
    this._camera = new THREE.PerspectiveCamera( 27, divObj.clientWidth / divObj.clientHeight, 1, 1000000 )
    this._camera.position.z = DEFAULT_FOCUS_DISTANCE


    // init scene
    this._scene = new THREE.Scene()
    this._scene.add(new THREE.AmbientLight( 0x444444 ) )

    //var axesHelper = new THREE.AxesHelper( 1000 )
    //this._scene.add( axesHelper )

    // adding some light
    let light1 = new THREE.DirectionalLight( 0xffffff, 0.5 )
    light1.position.set( 0, 1000, 0 )
    // adding the light to the camera ensure a constant lightin of the model
    this._scene.add( this._camera )
    this._camera.add(light1)




    this._renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true, preserveDrawingBuffer: true} )
    this._renderer.setClearColor( 0xffffff, 0 )
    this._renderer.setPixelRatio( window.devicePixelRatio )
    this._renderer.setSize( divObj.clientWidth, divObj.clientHeight )
    this._renderer.gammaInput = true
    this._renderer.gammaOutput = true
    divObj.appendChild( this._renderer.domElement )

    // all the necessary for raycasting
    this._raycaster = new THREE.Raycaster()
    this._raycastMouse = new THREE.Vector2()

    function onMouseMove( event ) {
      let elem = that._renderer.domElement
      let relX = event.pageX - elem.offsetLeft
      let relY = event.pageY - elem.offsetTop

      that._raycastMouse.x = ( relX / that._renderer.domElement.clientWidth ) * 2 - 1;
      that._raycastMouse.y = - ( relY / that._renderer.domElement.clientHeight ) * 2 + 1;
    }

    this._renderer.domElement.addEventListener( 'mousemove', onMouseMove, false )
    this._renderer.domElement.addEventListener( 'dblclick', function(evt){
      that._performRaycast()
    }, false )

    // mouse controls
    this._controls = new TrackballControls( this._camera, this._renderer.domElement )
    this._controls.rotateSpeed = 3
    this._controls.addEventListener( 'change', this._render.bind(this) )

    window.addEventListener( 'resize', function() {
      that._camera.aspect = divObj.clientWidth / divObj.clientHeight
      that._camera.updateProjectionMatrix()
      that._renderer.setSize( divObj.clientWidth, divObj.clientHeight )
      that._controls.handleResize()
      that._render()
    }, false )

    this._render()
    this._animate()
  }


  /**
   * Get the field of view angle of the camera, in degrees
   * @return {Number}
   */
  getCameraFieldOfView () {
    return this._camera.fov
  }


  /**
   * Define the camera field of view, in degrees
   * @param {Number} fov - the fov
   */
  setCameraFieldOfView (fov) {
    this._camera.fov = fov
    this._camera.updateProjectionMatrix()
    this._render()
  }


  /**
   * Adds a mesh from its URL. The mesh has to encoded into the STL format
   * @param {String} url - the url of the STL file
   * @param {Object} options - the options object
   * @param {String} options.name - optional name of this mesh (useful for further operations such as centering the view)
   * @param {Boolean} options.focusOn - if true, the camera will focus on this added mesh. If false, the camera will not change
   * @param {Number} options.opacity - the opacity of the mesh
   * @param {Number} options.color - the color of the mesh
   * @param {Number} options.wireframe - only the wireframe will display if true. If false, the regular mesh will show
   * * @param {Number} options.wireframe - only the wireframe will display if true. If false, the regular mesh will show
   * @param {Function} options.onDone - callback to be called when the mesh is added. Called with the name of the mesh in argument
   */
  addStlToMeshCollection (url, options) {
    let that = this

    // generate a random name in case none was provided
    let name = Tools.getOption( options, "name", "mesh_" + Math.round(Math.random() * 1000000).toString() )
    let focusOn = Tools.getOption( options, "focusOn", true )
    let color = Tools.getOption( options, "color", 0xDDDDDD )
    let opacity = Tools.getOption( options, "opacity", 0.15 )
    let wireframe = Tools.getOption( options, "wireframe", false )
    let shininess = Tools.getOption( options, "shininess", 300 )
    let doubleSide = Tools.getOption( options, "doubleSide", false )

    var loader = new STLLoader()
    //loader.load( '../data/meshes/mask_smooth_simple.stl', function ( geometry ) {
    loader.load( url, function ( geometry ) {
      var material = new THREE.MeshPhongMaterial( {
          specular: 0xffffff,
          shininess: shininess,
          side: doubleSide ? THREE.DoubleSide : THREE.FrontSide,
          color: color,
          transparent: true,
          opacity: opacity,
          wireframe: wireframe
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
      that._render()
      }
    })
  }


  /**
   * @private
   * deals with rendering and updating the controls
   */
  _animate () {
    this._requestFrameId = requestAnimationFrame( this._animate.bind(this) )
    this._controls.update()
  }

  _render () {
    this._renderer.render( this._scene, this._camera )
  }



  /**
   * @private
   * Throw a ray from the camera to the pointer, potentially intersect some sections.
   * If so, emit the event `onRaycast` with the section instance as argument
   */
  _performRaycast () {
    // update the picking ray with the camera and mouse position
    this._raycaster.setFromCamera( this._raycastMouse, this._camera )

    // calculate objects intersecting the picking ray
    var intersects = this._raycaster.intersectObjects( this._scene.children, true );

    if (intersects.length) {
      //console.log(this._morphologyMeshCollection)
      let sectionMesh = intersects[ 0 ].object

      if ("sectionId" in sectionMesh.userData) {
        let sectionId = sectionMesh.userData.sectionId
        let morphologyObj = sectionMesh.parent.getMorphology()
        this.emit("onRaycast", [morphologyObj._sections[sectionId]])
      } else {
        this.emit("onRaycast", [null])
      }

    }
  }


  /**
   * Add a MorphoPolyline object (which are ThreeJS Object3D) into the scene of this
   * ThreeContext.
   * @param {MorphoPolyline} morphoMesh - a MorphoPolyline instance
   * @param {Object} options - the option object
   * @param {String} options.name - the identifier to give to the MorphoPolyline instance within a local collection
   * @param {Boolean} options.focusOn - if true, the camera will focus on this added morphology. If false, the camera will not change
   * @param {Function} options.onDone - callback to be called when the morphology polyline is added. Called with the name of the morpho in argument
   */
  addMorphology (morphoMesh, options) {
    // generate a random name in case none was provided
    let name = options.name // set before
    let focusOn = Tools.getOption( options, "focusOn", true )
    let focusDistance = Tools.getOption( options, "distance", DEFAULT_FOCUS_DISTANCE )

    morphoMesh.userData["morphologyName"] = name

    this._morphologyMeshCollection[ name ] = morphoMesh
    this._scene.add( morphoMesh )

    if (focusOn)
      this.focusOnMorphology( name , focusDistance)

    // call a callback if declared, with the name of the morphology in arg
    let onDone = Tools.getOption( options, "onDone" )
    if (onDone) {
      onDone( name )
    }

    this._render()
  }


  /**
   * Make the camera focus on a specific morphology
   * @param {String|null} name - name of the morphology in the collection. If `null`, takes the first one
   */
  focusOnMorphology (name=null, distance=DEFAULT_FOCUS_DISTANCE) {
    // if no name of morphology is provided, we take the first one
    if (!name) {
      let allNames = Object.keys( this._morphologyMeshCollection )
      if (allNames.length) {
        name = allNames[0]
      } else {
        return
      }
    }

    let morpho = this._morphologyMeshCollection[ name ]
    let targetPoint = morpho.getTargetPoint()
    // we try to get pretty close to the soma, hence the averageSide/5
    this._camera.position.set(targetPoint.x, targetPoint.y, targetPoint.z - distance)
    this._camera.lookAt( targetPoint )
    this._controls.target.copy( targetPoint )
    this._render()
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
    this._render()
  }

  /**
   * Get the png image data as base64, in order to later, export as a file
   */
  getSnapshotData () {
    let strMime = "image/png"
    //let strDownloadMime = "image/octet-stream"
    let imgData = this._renderer.domElement.toDataURL(strMime)
    //imgData.replace(strMime, strDownloadMime)
    return imgData
  }

  /**
   * Kills the scene, interaction, animation and reset all objects to null
   */
  destroy () {
    this._controls.dispose()
    cancelAnimationFrame(this._requestFrameId)
    this._camera = null
    this._controls = null
    this._scene = null
    this._morphologyMeshCollection = null
    this._meshCollection = null
    this._renderer.domElement.remove()
    this._renderer = null
  }
}

export { ThreeContext }
