import * as THREE from 'three-canvas-renderer';
import ObjParser from 'parse-wavefront-obj';
import { Canvas } from 'canvas';
import raf from 'raf';
import STLLoader from './thirdparty/STLLoader';
import Tools from './Tools';
import EventManager from './EventManager';

// eslint thing
/* global window requestAnimationFrame cancelAnimationFrame */

const DEFAULT_FOCUS_DISTANCE = 1000

/**
 * ThreeContext creates a WebGL context using THREEjs. It also handle mouse control.
 * A MorphologyPolyline instance is added to it.
 * An event can be associated to a ThreeContext instance: `onRaycast` with the method
 * `.on("onRaycast", function(s){...})` where `s` is the section object being raycasted.
 */
class ThreeContext extends EventManager {
  /**
   * @param {DONObject} divObj - the div object as a DOM element.
   * Will be used to host the WebGL context
   * created by THREE
   */
  constructor() {
    super()
    const that = this
    const w = 600
    const h = 600

    this._requestFrameId = null

    this._morphologyMeshCollection = {}
    this._meshCollection = {}

    // init camera
    this._camera = new THREE.PerspectiveCamera(27, 1, 1, 1000000)
    this._camera.position.z = DEFAULT_FOCUS_DISTANCE

    // init scene
    this._scene = new THREE.Scene()
    this._scene.add(new THREE.AmbientLight(0x444444))

    // let axesHelper = new THREE.AxesHelper( 1000 )
    // this._scene.add( axesHelper )

    // adding some light
    const light1 = new THREE.DirectionalLight(0xffffff, 0.8)
    //light1.position.set(0, 1000, 0)
    // adding the light to the camera ensure a constant lightin of the model
    this._scene.add(this._camera)
    this._camera.add(light1)

    this._canvas = new Canvas(w, h)
    // @ts-ignore
    this._canvas.style = {} // dummy shim to prevent errors during render.setSize

    this._renderer = new THREE.CanvasRenderer({
      canvas: this._canvas,
      alpha: true,
      preserveDrawingBuffer: true,
    })

    this._renderer.setClearColor(0xffffff, 0)
    this._renderer.setSize(600, 600)
    this._renderer.render(this._scene, this._camera)

    // all the necessary for raycasting
    this._raycaster = new THREE.Raycaster()
    this._raycastMouse = new THREE.Vector2()

    function onMouseMove(event) {
      const elem = that._renderer.domElement
      const rect = elem.getBoundingClientRect()
      const relX = event.clientX - rect.left
      const relY = event.clientY - rect.top
      that._raycastMouse.x =        (relX / that._renderer.domElement.clientWidth) * 2 - 1
      that._raycastMouse.y =        -(relY / that._renderer.domElement.clientHeight) * 2 + 1
    }

    // this._renderer.domElement.addEventListener('mousemove', onMouseMove, false)
    // this._renderer.domElement.addEventListener(
    //   'dblclick',
    //   () => {
    //     this._performRaycast()
    //   },
    //   false,
    // )

    // mouse controls
    // this._controls = new TrackballControls(
    //   this._camera,
    //   this._renderer.domElement,
    // )
    // this._controls.rotateSpeed = 3
    // this._controls.addEventListener('change', this._render.bind(this))

    // window.addEventListener(
    //   'resize',
    //   () => {
    //     that._camera.aspect = divObj.clientWidth / divObj.clientHeight
    //     that._camera.updateProjectionMatrix()
    //     that._renderer.setSize(divObj.clientWidth, divObj.clientHeight)
    //     that._controls.handleResize()
    //     that._render()
    //   },
    //   false,
    // )

    this._testObjMesh()

    this._render()
    // this._animate()
  }

  _testObjMesh() {
    OBJLoader2
  }

  /**
   * Get the field of view angle of the camera, in degrees
   * @return {Number}
   */
  getCameraFieldOfView() {
    return this._camera.fov
  }

  /**
   * Define the camera field of view, in degrees
   * @param {Number} fov - the fov
   */
  setCameraFieldOfView(fov) {
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
   * @param {Number} options.wireframe - only the wireframe will display if true. If false, the regular mesh will show
   * @param {Function} options.onDone - callback to be called when the mesh is added. Called with the name of the mesh in argument
   */
  addStlToMeshCollection(url, options) {
    const that = this

    // generate a random name in case none was provided
    const name = Tools.getOption(
      options,
      'name',
      `mesh_${Math.round(Math.random() * 1000000).toString()}`,
    )
    const focusOn = Tools.getOption(options, 'focusOn', true)

    const loader = new STLLoader()
    // loader.load( '../data/meshes/mask_smooth_simple.stl', function ( geometry ) {
    loader.load(url, (geometry) => {
      const material = this._buildMeshMaterialFromOptions(options)

      geometry.computeBoundingSphere()

      const mesh = new THREE.Mesh(geometry, material)

      mesh.userData.name = name

      that._scene.add(mesh)
      that._meshCollection[name] = mesh

      if (focusOn) that.focusOnMesh(name)

      // call a callback if declared, with the name of the mesh in arg
      const onDone = Tools.getOption(options, 'onDone', null)
      if (onDone) {
        onDone(name)
      }
      this._render()
    })
  }

  /**
   * @private
   * Generates a phong material based on the options provided
   */
  _buildMeshMaterialFromOptions(options) {
    const color = Tools.getOption(
      options,
      'color',
      Math.floor(Math.random() * 0xffffff),
    )
    const opacity = Tools.getOption(options, 'opacity', 0.15)
    const wireframe = Tools.getOption(options, 'wireframe', false)
    const shininess = Tools.getOption(options, 'shininess', 300)
    const doubleSide = Tools.getOption(options, 'doubleSide', false)

    const material = new THREE.MeshPhongMaterial({
      specular: 0xffffff,
      shininess,
      side: doubleSide ? THREE.DoubleSide : THREE.FrontSide,
      color,
      transparent: true,
      opacity,
      wireframe,
    })

    return material
  }

  /**
   * Add a OBJ mesh to the scene
   * @param {String} objStr - string that comes from the obj file
   * @param {Object} options - the options object
   * @param {String} options.name - optional name of this mesh (useful for further operations such as centering the view)
   * @param {Boolean} options.focusOn - if true, the camera will focus on this added mesh. If false, the camera will not change
   * @param {Number} options.opacity - the opacity of the mesh
   * @param {Number} options.color - the color of the mesh
   * @param {Number} options.wireframe - only the wireframe will display if true. If false, the regular mesh will show
   * @param {Number} options.wireframe - only the wireframe will display if true. If false, the regular mesh will show
   * @param {Function} options.onDone - callback to be called when the mesh is added. Called with the name of the mesh in argument
   */
  addObjToMeshCollection(objStr, options) {
    // generate a random name in case none was provided
    const name = Tools.getOption(
      options,
      'name',
      `mesh_${Math.round(Math.random() * 1000000).toString()}`,
    )
    const focusOn = Tools.getOption(options, 'focusOn', true)
    let meshData = ObjParser(objStr)

    // Usually 3 because polygons are triangle, but OBJ allows different
    const verticesPerPolygon = meshData.cells[0].length
    let indices = new Uint32Array(verticesPerPolygon * meshData.cells.length)
    let positions = new Float32Array(3 * meshData.positions.length)

    // flattening the indices
    for (let i = 0; i < meshData.cells.length; i += 1) {
      const newIndex = i * verticesPerPolygon
      for (let ii = 0; ii < verticesPerPolygon; ii += 1) {
        indices[newIndex + ii] = meshData.cells[i][ii]
      }
    }

    // flatening the positions
    for (let p = 0; p < meshData.positions.length; p += 1) {
      const newIndex = p * 3
      positions[newIndex] = meshData.positions[p][0]
      positions[newIndex + 1] = meshData.positions[p][1]
      positions[newIndex + 2] = meshData.positions[p][2]
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setIndex(new THREE.BufferAttribute(indices, 1))
    geometry.addAttribute(
      'position',
      new THREE.BufferAttribute(positions, verticesPerPolygon),
    )
    geometry.computeBoundingSphere()
    geometry.computeVertexNormals()

    // Allen atlas being inverted
    geometry.rotateX(Math.PI)
    geometry.rotateY(Math.PI)

    const material = this._buildMeshMaterialFromOptions(options)

    const mesh = new THREE.Mesh(geometry, material)

    mesh.userData.name = name
    this._scene.add(mesh)
    this._meshCollection[name] = mesh

    if (focusOn) this.focusOnMesh(name)

    // call a callback if declared, with the name of the mesh in arg
    const onDone = Tools.getOption(options, 'onDone', null)
    if (onDone) {
      onDone(name)
    }
    this._render()
  }

  // /**
  //  * @private
  //  * deals with rendering and updating the controls
  //  */
  // _animate() {
  //   this._requestFrameId = raf(this._animate.bind(this))
  //   // this._controls.update()
  // }

  _render() {
    this._renderer.render(this._scene, this._camera)
  }

  /**
   * @private
   * Throw a ray from the camera to the pointer, potentially intersect some sections.
   * If so, emit the event `onRaycast` with the section instance as argument
   */
  _performRaycast() {
    // update the picking ray with the camera and mouse position
    this._raycaster.setFromCamera(this._raycastMouse, this._camera)

    // calculate objects intersecting the picking ray
    const intersects = this._raycaster.intersectObjects(
      this._scene.children,
      true,
    )

    if (intersects.length) {
      // console.log(this._morphologyMeshCollection)
      const sectionMesh = intersects[0].object

      // if it's the section of a morphology
      if ('sectionId' in sectionMesh.userData) {
        const { sectionId } = sectionMesh.userData
        const morphologyObj = sectionMesh.parent.getMorphology()
        this.emit('onRaycast', [morphologyObj._sections[sectionId]])

        // If it's another mesh
      } else if ('name' in sectionMesh.userData) {
        this.emit('onRaycast', [sectionMesh.userData.name])

        // here we are raycasting something that is not identified
      } else {
        this.emit('onRaycast', [null])
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
  addMorphology(morphoMesh, options) {
    // generate a random name in case none was provided
    const name = options.name // set before
    const focusOn = Tools.getOption(options, 'focusOn', true)
    const focusDistance = Tools.getOption(
      options,
      'distance',
      DEFAULT_FOCUS_DISTANCE,
    )

    this._morphologyMeshCollection[name] = morphoMesh
    this._scene.add(morphoMesh)

    if (focusOn) this.focusOnMorphology(name, focusDistance)

    // call a callback if declared, with the name of the morphology in arg
    const onDone = Tools.getOption(options, 'onDone')
    if (onDone) {
      onDone(name)
    }

    this._render()
  }

  /**
   * Make the camera focus on a specific morphology
   * @param {String|null} name - name of the morphology in the collection. If `null`, takes the first one
   */
  focusOnMorphology(name = null, distance = DEFAULT_FOCUS_DISTANCE) {
    let morphoName = name
    // if no name of morphology is provided, we take the first one
    if (!morphoName) {
      const allNames = Object.keys(this._morphologyMeshCollection)
      if (allNames.length) {
        morphoName = allNames[0]
      } else {
        return
      }
    }

    const morpho = this._morphologyMeshCollection[morphoName]
    const targetPoint = morpho.getTargetPoint()
    // we try to get pretty close to the soma, hence the averageSide/5
    this._camera.position.set(
      targetPoint.x,
      targetPoint.y,
      targetPoint.z - distance,
    )
    this._camera.lookAt(targetPoint)
    // this._controls.target.copy(targetPoint)
    this._render()
  }

  /**
   * Focus on a mesh, given its name
   * @param {string} name - name of the mesh to focus on
   */
  focusOnMesh(name) {
    const mesh = this._meshCollection[name]
    const boundingSphere = mesh.geometry.boundingSphere

    this._camera.position.set(
      boundingSphere.center.x - boundingSphere.radius * 3,
      boundingSphere.center.y,
      boundingSphere.center.z,
    )
    this._camera.lookAt(boundingSphere.center)
    // this._controls.target.copy(boundingSphere.center)
    this._render()
  }

  /**
   * Get the png image data as base64, in order to later, export as a file
   */
  getSnapshotData() {
    const strMime = 'image/png';
    // let strDownloadMime = "image/octet-stream"
    // const imgData = this._renderer.domElement.toDataURL(strMime)
    // imgData.replace(strMime, strDownloadMime)
    return this._canvas.toBuffer(strMime)
  }

  /**
   * Show the given mesh from the colelction
   * @param {String} name - Name of the mesh
   */
  showMesh(name) {
    if (name in this._meshCollection) {
      this._meshCollection[name].material.visible = true
      this._render()
    }
  }

  /**
   * Hide the given mesh from the colelction
   * @param {String} name - Name of the mesh
   */
  hideMesh(name) {
    if (name in this._meshCollection) {
      this._meshCollection[name].material.visible = false
      this._render()
    }
  }

  /**
   * Kills the scene, interaction, animation and reset all objects to null
   */
  destroy() {
    // this._controls.dispose()
    raf.cancel(this._requestFrameId)
    this._camera = null
    // this._controls = null
    this._scene = null
    this._morphologyMeshCollection = null
    this._meshCollection = null
    this._renderer = null
    this._canvas = null
  }
}

export default ThreeContext
