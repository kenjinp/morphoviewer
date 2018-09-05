import * as THREE from "three"
import { TrackballControls } from './TrackballControls.js'
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

    // init camera
    this._camera = new THREE.PerspectiveCamera( 27, window.innerWidth / window.innerHeight, 1, 3500 )
    this._camera.position.z = 1000

    // init scene
    this._scene = new THREE.Scene()
    this._scene.add(new THREE.AmbientLight( 0x444444 ) )

    // adding some light
    var light1 = new THREE.DirectionalLight( 0xffffff, 0.5 )
    light1.position.set( 1, 1, 1 )
    this._scene.add( light1 )
    var light2 = new THREE.DirectionalLight( 0xffffff, 1.5 )
    light2.position.set( 0, -1, 0 )
    this._scene.add( light2 )

    this._renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } )
    this._renderer.setClearColor( 0xffffff, 0 )
    this._renderer.setPixelRatio( window.devicePixelRatio )
    this._renderer.setSize( window.innerWidth, window.innerHeight )
    this._renderer.gammaInput = true
    this._renderer.gammaOutput = true
    divObj.appendChild( this._renderer.domElement )

    let that = this

    this._controls = new TrackballControls( this._camera )

    window.addEventListener( 'resize', function() {
      console.log( "resize" )
      that._camera.aspect = window.innerWidth / window.innerHeight
      that._camera.updateProjectionMatrix()
      that._renderer.setSize( window.innerWidth, window.innerHeight )

      that._controls.handleResize()
    }, false )


    this.addStuff()
    this._animate()
  }


  addStuff () {
    let geometry = new THREE.SphereGeometry( 10, 32, 32 )
    let material = new THREE.MeshBasicMaterial( {color: 0xffff00} )
    let sphere = new THREE.Mesh( geometry, material )
    //sphere.position.x = - span/2 + Math.random()*span
    //sphere.position.y = - span/2 + Math.random()*span
    //sphere.position.z = - span/2 + Math.random()*span
    this._scene.add( sphere )
  }

  _animate () {
    requestAnimationFrame( this._animate.bind(this) )
    this._controls.update()

    this._renderer.render( this._scene, this._camera )
  }
}

export { ThreeContext }
