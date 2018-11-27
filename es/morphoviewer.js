import { PerspectiveCamera, Scene, AmbientLight, DirectionalLight, WebGLRenderer, Raycaster, Vector2, Mesh, MeshPhongMaterial, DoubleSide, FrontSide, BufferGeometry, BufferAttribute, Vector3, Quaternion, EventDispatcher, DefaultLoadingManager, FileLoader, Float32BufferAttribute, LoaderUtils, Matrix4, CylinderBufferGeometry, Box3, LineBasicMaterial, Geometry, Line, Object3D, SphereGeometry, Face3, MeshBasicMaterial, Line3, Plane, Triangle } from 'three';
import pako from 'pako';
import ObjParser from 'parse-wavefront-obj';
import morphologycorejs from 'morphologycorejs';

/*
 * @author Eberhard Graether / http://egraether.com/
 * @author Mark Lundin   / http://mark-lundin.com
 * @author Simone Manini / http://daron1337.github.io
 * @author Luca Antiga   / http://lantiga.github.io
 */

/*
* ES6 adapted source from the example folder of THREEJS (because there is no proper repo for it)
* Enables mouse control (pan, zoom, rotation)
*/
const TrackballControls = function (object, domElement) {
  const _this = this;
  const STATE = {
    NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_ZOOM_PAN: 4,
  };

  this.object = object;
  this.domElement = (domElement !== undefined) ? domElement : document;

  // API

  this.enabled = true;

  this.screen = {
    left: 0, top: 0, width: 0, height: 0,
  };

  this.rotateSpeed = 1.0;
  this.zoomSpeed = 1.2;
  this.panSpeed = 0.3;

  this.noRotate = false;
  this.noZoom = false;
  this.noPan = false;

  this.staticMoving = false;
  this.dynamicDampingFactor = 0.5;

  this.minDistance = 0;
  this.maxDistance = Infinity;

  this.keys = [65 /* A */, 83 /* S */, 68];

  // internals

  this.target = new Vector3();

  const EPS = 0.000001;

  const lastPosition = new Vector3();

  let _state = STATE.NONE;


  let _prevState = STATE.NONE;


  const _eye = new Vector3();


  const _movePrev = new Vector2();


  const _moveCurr = new Vector2();


  const _lastAxis = new Vector3();


  let _lastAngle = 0;


  const _zoomStart = new Vector2();


  const _zoomEnd = new Vector2();


  let _touchZoomDistanceStart = 0;


  let _touchZoomDistanceEnd = 0;


  const _panStart = new Vector2();


  const _panEnd = new Vector2();

  // for reset

  this.target0 = this.target.clone();
  this.position0 = this.object.position.clone();
  this.up0 = this.object.up.clone();

  // events

  const changeEvent = { type: 'change' };
  const startEvent = { type: 'start' };
  const endEvent = { type: 'end' };


  // methods

  this.handleResize = function () {
    if (this.domElement === document) {
      this.screen.left = 0;
      this.screen.top = 0;
      this.screen.width = window.innerWidth;
      this.screen.height = window.innerHeight;
    } else {
      const box = this.domElement.getBoundingClientRect();
      // adjustments come from similar code in the jquery offset() function
      const d = this.domElement.ownerDocument.documentElement;
      this.screen.left = box.left + window.pageXOffset - d.clientLeft;
      this.screen.top = box.top + window.pageYOffset - d.clientTop;
      this.screen.width = box.width;
      this.screen.height = box.height;
    }
  };

  const getMouseOnScreen = (function () {
    const vector = new Vector2();

    return function getMouseOnScreen(pageX, pageY) {
      vector.set(
        (pageX - _this.screen.left) / _this.screen.width,
        (pageY - _this.screen.top) / _this.screen.height,
      );

      return vector
    }
  }());

  const getMouseOnCircle = (function () {
    const vector = new Vector2();

    return function getMouseOnCircle(pageX, pageY) {
      vector.set(
        ((pageX - _this.screen.width * 0.5 - _this.screen.left) / (_this.screen.width * 0.5)),
        ((_this.screen.height + 2 * (_this.screen.top - pageY)) / _this.screen.width), // screen.width intentional
      );

      return vector
    }
  }());

  this.rotateCamera = (function () {
    const axis = new Vector3();


    const quaternion = new Quaternion();


    const eyeDirection = new Vector3();


    const objectUpDirection = new Vector3();


    const objectSidewaysDirection = new Vector3();


    const moveDirection = new Vector3();


    let angle;

    return function rotateCamera() {
      moveDirection.set(_moveCurr.x - _movePrev.x, _moveCurr.y - _movePrev.y, 0);
      angle = moveDirection.length();

      if (angle) {
        _eye.copy(_this.object.position).sub(_this.target);

        eyeDirection.copy(_eye).normalize();
        objectUpDirection.copy(_this.object.up).normalize();
        objectSidewaysDirection.crossVectors(objectUpDirection, eyeDirection).normalize();

        objectUpDirection.setLength(_moveCurr.y - _movePrev.y);
        objectSidewaysDirection.setLength(_moveCurr.x - _movePrev.x);

        moveDirection.copy(objectUpDirection.add(objectSidewaysDirection));

        axis.crossVectors(moveDirection, _eye).normalize();

        angle *= _this.rotateSpeed;
        quaternion.setFromAxisAngle(axis, angle);

        _eye.applyQuaternion(quaternion);
        _this.object.up.applyQuaternion(quaternion);

        _lastAxis.copy(axis);
        _lastAngle = angle;
      } else if (!_this.staticMoving && _lastAngle) {
        _lastAngle *= Math.sqrt(1.0 - _this.dynamicDampingFactor);
        _eye.copy(_this.object.position).sub(_this.target);
        quaternion.setFromAxisAngle(_lastAxis, _lastAngle);
        _eye.applyQuaternion(quaternion);
        _this.object.up.applyQuaternion(quaternion);
      }

      _movePrev.copy(_moveCurr);
    }
  }());


  this.zoomCamera = function () {
    let factor;

    if (_state === STATE.TOUCH_ZOOM_PAN) {
      factor = _touchZoomDistanceStart / _touchZoomDistanceEnd;
      _touchZoomDistanceStart = _touchZoomDistanceEnd;
      _eye.multiplyScalar(factor);
    } else {
      factor = 1.0 + (_zoomEnd.y - _zoomStart.y) * _this.zoomSpeed;

      if (factor !== 1.0 && factor > 0.0) {
        _eye.multiplyScalar(factor);
      }

      if (_this.staticMoving) {
        _zoomStart.copy(_zoomEnd);
      } else {
        _zoomStart.y += (_zoomEnd.y - _zoomStart.y) * this.dynamicDampingFactor;
      }
    }
  };

  this.panCamera = (function () {
    const mouseChange = new Vector2();


    const objectUp = new Vector3();


    const pan = new Vector3();

    return function panCamera() {
      mouseChange.copy(_panEnd).sub(_panStart);

      if (mouseChange.lengthSq()) {
        mouseChange.multiplyScalar(_eye.length() * _this.panSpeed);

        pan.copy(_eye).cross(_this.object.up).setLength(mouseChange.x);
        pan.add(objectUp.copy(_this.object.up).setLength(mouseChange.y));

        _this.object.position.add(pan);
        _this.target.add(pan);

        if (_this.staticMoving) {
          _panStart.copy(_panEnd);
        } else {
          _panStart.add(mouseChange.subVectors(_panEnd, _panStart).multiplyScalar(_this.dynamicDampingFactor));
        }
      }
    }
  }());

  this.checkDistances = function () {
    if (!_this.noZoom || !_this.noPan) {
      if (_eye.lengthSq() > _this.maxDistance * _this.maxDistance) {
        _this.object.position.addVectors(_this.target, _eye.setLength(_this.maxDistance));
        _zoomStart.copy(_zoomEnd);
      }

      if (_eye.lengthSq() < _this.minDistance * _this.minDistance) {
        _this.object.position.addVectors(_this.target, _eye.setLength(_this.minDistance));
        _zoomStart.copy(_zoomEnd);
      }
    }
  };

  this.update = function () {
    _eye.subVectors(_this.object.position, _this.target);

    if (!_this.noRotate) {
      _this.rotateCamera();
    }

    if (!_this.noZoom) {
      _this.zoomCamera();
    }

    if (!_this.noPan) {
      _this.panCamera();
    }

    _this.object.position.addVectors(_this.target, _eye);

    _this.checkDistances();

    _this.object.lookAt(_this.target);

    if (lastPosition.distanceToSquared(_this.object.position) > EPS) {
      _this.dispatchEvent(changeEvent);

      lastPosition.copy(_this.object.position);
    }
  };

  this.reset = function () {
    _state = STATE.NONE;
    _prevState = STATE.NONE;

    _this.target.copy(_this.target0);
    _this.object.position.copy(_this.position0);
    _this.object.up.copy(_this.up0);

    _eye.subVectors(_this.object.position, _this.target);

    _this.object.lookAt(_this.target);

    _this.dispatchEvent(changeEvent);

    lastPosition.copy(_this.object.position);
  };

  // listeners

  function keydown(event) {
    if (_this.enabled === false) return

    window.removeEventListener('keydown', keydown);

    _prevState = _state;

    if (_state !== STATE.NONE) {
      return
    } if (event.keyCode === _this.keys[STATE.ROTATE] && !_this.noRotate) {
      _state = STATE.ROTATE;
    } else if (event.keyCode === _this.keys[STATE.ZOOM] && !_this.noZoom) {
      _state = STATE.ZOOM;
    } else if (event.keyCode === _this.keys[STATE.PAN] && !_this.noPan) {
      _state = STATE.PAN;
    }
  }

  function keyup(event) {
    if (_this.enabled === false) return

    _state = _prevState;

    window.addEventListener('keydown', keydown, false);
  }

  function mousedown(event) {
    if (_this.enabled === false) return

    event.preventDefault();
    event.stopPropagation();

    if (_state === STATE.NONE) {
      _state = event.button;
    }

    if (_state === STATE.ROTATE && !_this.noRotate) {
      _moveCurr.copy(getMouseOnCircle(event.pageX, event.pageY));
      _movePrev.copy(_moveCurr);
    } else if (_state === STATE.ZOOM && !_this.noZoom) {
      _zoomStart.copy(getMouseOnScreen(event.pageX, event.pageY));
      _zoomEnd.copy(_zoomStart);
    } else if (_state === STATE.PAN && !_this.noPan) {
      _panStart.copy(getMouseOnScreen(event.pageX, event.pageY));
      _panEnd.copy(_panStart);
    }

    document.addEventListener('mousemove', mousemove, false);
    document.addEventListener('mouseup', mouseup, false);

    _this.dispatchEvent(startEvent);
  }

  function mousemove(event) {
    if (_this.enabled === false) return

    event.preventDefault();
    event.stopPropagation();

    if (_state === STATE.ROTATE && !_this.noRotate) {
      _movePrev.copy(_moveCurr);
      _moveCurr.copy(getMouseOnCircle(event.pageX, event.pageY));
    } else if (_state === STATE.ZOOM && !_this.noZoom) {
      _zoomEnd.copy(getMouseOnScreen(event.pageX, event.pageY));
    } else if (_state === STATE.PAN && !_this.noPan) {
      _panEnd.copy(getMouseOnScreen(event.pageX, event.pageY));
    }
  }

  function mouseup(event) {
    if (_this.enabled === false) return

    event.preventDefault();
    event.stopPropagation();

    _state = STATE.NONE;

    document.removeEventListener('mousemove', mousemove);
    document.removeEventListener('mouseup', mouseup);
    _this.dispatchEvent(endEvent);
  }

  function mousewheel(event) {
    if (_this.enabled === false) return

    if (_this.noZoom === true) return

    event.preventDefault();
    event.stopPropagation();

    switch (event.deltaMode) {
      case 2:
        // Zoom in pages
        _zoomStart.y -= event.deltaY * 0.025;
        break

      case 1:
        // Zoom in lines
        _zoomStart.y -= event.deltaY * 0.01;
        break

      default:
        // undefined, 0, assume pixels
        _zoomStart.y -= event.deltaY * 0.00025;
        break
    }

    _this.dispatchEvent(startEvent);
    _this.dispatchEvent(endEvent);
  }

  function touchstart(event) {
    if (_this.enabled === false) return

    event.preventDefault();

    switch (event.touches.length) {
      case 1:
        _state = STATE.TOUCH_ROTATE;
        _moveCurr.copy(getMouseOnCircle(event.touches[0].pageX, event.touches[0].pageY));
        _movePrev.copy(_moveCurr);
        break

      default: // 2 or more
        _state = STATE.TOUCH_ZOOM_PAN;
        var dx = event.touches[0].pageX - event.touches[1].pageX;
        var dy = event.touches[0].pageY - event.touches[1].pageY;
        _touchZoomDistanceEnd = _touchZoomDistanceStart = Math.sqrt(dx * dx + dy * dy);

        var x = (event.touches[0].pageX + event.touches[1].pageX) / 2;
        var y = (event.touches[0].pageY + event.touches[1].pageY) / 2;
        _panStart.copy(getMouseOnScreen(x, y));
        _panEnd.copy(_panStart);
        break
    }

    _this.dispatchEvent(startEvent);
  }

  function touchmove(event) {
    if (_this.enabled === false) return

    event.preventDefault();
    event.stopPropagation();

    switch (event.touches.length) {
      case 1:
        _movePrev.copy(_moveCurr);
        _moveCurr.copy(getMouseOnCircle(event.touches[0].pageX, event.touches[0].pageY));
        break

      default: // 2 or more
        var dx = event.touches[0].pageX - event.touches[1].pageX;
        var dy = event.touches[0].pageY - event.touches[1].pageY;
        _touchZoomDistanceEnd = Math.sqrt(dx * dx + dy * dy);

        var x = (event.touches[0].pageX + event.touches[1].pageX) / 2;
        var y = (event.touches[0].pageY + event.touches[1].pageY) / 2;
        _panEnd.copy(getMouseOnScreen(x, y));
        break
    }
  }

  function touchend(event) {
    if (_this.enabled === false) return

    switch (event.touches.length) {
      case 0:
        _state = STATE.NONE;
        break

      case 1:
        _state = STATE.TOUCH_ROTATE;
        _moveCurr.copy(getMouseOnCircle(event.touches[0].pageX, event.touches[0].pageY));
        _movePrev.copy(_moveCurr);
        break
    }

    _this.dispatchEvent(endEvent);
  }

  function contextmenu(event) {
    if (_this.enabled === false) return

    event.preventDefault();
  }

  this.dispose = function () {
    this.domElement.removeEventListener('contextmenu', contextmenu, false);
    this.domElement.removeEventListener('mousedown', mousedown, false);
    this.domElement.removeEventListener('wheel', mousewheel, false);

    this.domElement.removeEventListener('touchstart', touchstart, false);
    this.domElement.removeEventListener('touchend', touchend, false);
    this.domElement.removeEventListener('touchmove', touchmove, false);

    document.removeEventListener('mousemove', mousemove, false);
    document.removeEventListener('mouseup', mouseup, false);

    window.removeEventListener('keydown', keydown, false);
    window.removeEventListener('keyup', keyup, false);
  };

  this.domElement.addEventListener('contextmenu', contextmenu, false);
  this.domElement.addEventListener('mousedown', mousedown, false);
  this.domElement.addEventListener('wheel', mousewheel, false);

  this.domElement.addEventListener('touchstart', touchstart, false);
  this.domElement.addEventListener('touchend', touchend, false);
  this.domElement.addEventListener('touchmove', touchmove, false);

  window.addEventListener('keydown', keydown, false);
  window.addEventListener('keyup', keyup, false);

  this.handleResize();

  // force an update at start
  this.update();
};


TrackballControls.prototype = Object.create(EventDispatcher.prototype);

/*
 * @author aleeper / http://adamleeper.com/
 * @author mrdoob / http://mrdoob.com/
 * @author gero3 / https://github.com/gero3
 * @author Mugen87 / https://github.com/Mugen87
 *
 * Description: A THREE loader for STL ASCII files, as created by Solidworks and other CAD programs.
 *
 * Supports both binary and ASCII encoded files, with automatic detection of type.
 *
 * The loader returns a non-indexed buffer geometry.
 *
 * Limitations:
 *  Binary decoding supports "Magics" color format (http://en.wikipedia.org/wiki/STL_(file_format)#Color_in_binary_STL).
 *  There is perhaps some question as to how valid it is to always assume little-endian-ness.
 *  ASCII decoding assumes file is UTF-8.
 *
 * Usage:
 *  var loader = new THREE.STLLoader();
 *  loader.load( './models/stl/slotted_disk.stl', function ( geometry ) {
 *    scene.add( new THREE.Mesh( geometry ) );
 *  });
 *
 * For binary STLs geometry might contain colors for vertices. To use it:
 *  // use the same code to load STL as above
 *  if (geometry.hasColors) {
 *    material = new THREE.MeshPhongMaterial({ opacity: geometry.alpha, vertexColors: THREE.VertexColors });
 *  } else { .... }
 *  var mesh = new THREE.Mesh( geometry, material );
 */


const STLLoader = function (manager) {
  this.manager = (manager !== undefined) ? manager : DefaultLoadingManager;
};

STLLoader.prototype = {

  constructor: STLLoader,

  load(url, onLoad, onProgress, onError) {
    const scope = this;

    const loader = new FileLoader(scope.manager);
    loader.setResponseType('arraybuffer');
    loader.load(url, (buf) => {
      // trying to un-gzip it with Pako
      try {
        buf = pako.inflate(buf).buffer;
      } catch (err) {
      }

      try {
        onLoad(scope.parse(buf));
      } catch (exception) {
        if (onError) {
          onError(exception);
        }
      }
    }, onProgress, onError);
  },

  parse(data) {
    function isBinary(data) {
      let expect; let face_size; let n_faces; let
        reader;
      reader = new DataView(data);
      face_size = (32 / 8 * 3) + ((32 / 8 * 3) * 3) + (16 / 8);
      n_faces = reader.getUint32(80, true);
      expect = 80 + (32 / 8) + (n_faces * face_size);

      if (expect === reader.byteLength) {
        return true
      }

      // An ASCII STL data must begin with 'solid ' as the first six bytes.
      // However, ASCII STLs lacking the SPACE after the 'd' are known to be
      // plentiful.  So, check the first 5 bytes for 'solid'.

      // Several encodings, such as UTF-8, precede the text with up to 5 bytes:
      // https://en.wikipedia.org/wiki/Byte_order_mark#Byte_order_marks_by_encoding
      // Search for "solid" to start anywhere after those prefixes.

      // US-ASCII ordinal values for 's', 'o', 'l', 'i', 'd'

      const solid = [115, 111, 108, 105, 100];

      for (let off = 0; off < 5; off++) {
        // If "solid" text is matched to the current offset, declare it to be an ASCII STL.

        if (matchDataViewAt(solid, reader, off)) return false
      }

      // Couldn't find "solid" text at the beginning; it is binary STL.

      return true
    }

    function matchDataViewAt(query, reader, offset) {
      // Check if each byte in query matches the corresponding byte from the current offset

      for (let i = 0, il = query.length; i < il; i++) {
        if (query[i] !== reader.getUint8(offset + i, false)) return false
      }

      return true
    }

    function parseBinary(data) {
      const reader = new DataView(data);
      const faces = reader.getUint32(80, true);

      let r; let g; let b; let hasColors = false; let
        colors;
      let defaultR; let defaultG; let defaultB; let
        alpha;

      // process STL header
      // check for default color in header ("COLOR=rgba" sequence).

      for (let index = 0; index < 80 - 10; index++) {
        if ((reader.getUint32(index, false) == 0x434F4C4F /* COLO */)
          && (reader.getUint8(index + 4) == 0x52 /* 'R' */)
          && (reader.getUint8(index + 5) == 0x3D /* '=' */)) {
          hasColors = true;
          colors = [];

          defaultR = reader.getUint8(index + 6) / 255;
          defaultG = reader.getUint8(index + 7) / 255;
          defaultB = reader.getUint8(index + 8) / 255;
          alpha = reader.getUint8(index + 9) / 255;
        }
      }

      const dataOffset = 84;
      const faceLength = 12 * 4 + 2;

      const geometry = new BufferGeometry();

      const vertices = [];
      const normals = [];

      for (let face = 0; face < faces; face++) {
        const start = dataOffset + face * faceLength;
        const normalX = reader.getFloat32(start, true);
        const normalY = reader.getFloat32(start + 4, true);
        const normalZ = reader.getFloat32(start + 8, true);

        if (hasColors) {
          const packedColor = reader.getUint16(start + 48, true);

          if ((packedColor & 0x8000) === 0) {
            // facet has its own unique color

            r = (packedColor & 0x1F) / 31;
            g = ((packedColor >> 5) & 0x1F) / 31;
            b = ((packedColor >> 10) & 0x1F) / 31;
          } else {
            r = defaultR;
            g = defaultG;
            b = defaultB;
          }
        }

        for (let i = 1; i <= 3; i++) {
          const vertexstart = start + i * 12;

          vertices.push(reader.getFloat32(vertexstart, true));
          vertices.push(reader.getFloat32(vertexstart + 4, true));
          vertices.push(reader.getFloat32(vertexstart + 8, true));

          normals.push(normalX, normalY, normalZ);

          if (hasColors) {
            colors.push(r, g, b);
          }
        }
      }

      geometry.addAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));
      geometry.addAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));

      if (hasColors) {
        geometry.addAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
        geometry.hasColors = true;
        geometry.alpha = alpha;
      }

      return geometry
    }

    function parseASCII(data) {
      const geometry = new BufferGeometry();
      const patternFace = /facet([\s\S]*?)endfacet/g;
      let faceCounter = 0;

      const patternFloat = /[\s]+([+-]?(?:\d*)(?:\.\d*)?(?:[eE][+-]?\d+)?)/.source;
      const patternVertex = new RegExp(`vertex${patternFloat}${patternFloat}${patternFloat}`, 'g');
      const patternNormal = new RegExp(`normal${patternFloat}${patternFloat}${patternFloat}`, 'g');

      const vertices = [];
      const normals = [];

      const normal = new Vector3();

      let result;

      while ((result = patternFace.exec(data)) !== null) {
        let vertexCountPerFace = 0;
        let normalCountPerFace = 0;

        const text = result[0];

        while ((result = patternNormal.exec(text)) !== null) {
          normal.x = parseFloat(result[1]);
          normal.y = parseFloat(result[2]);
          normal.z = parseFloat(result[3]);
          normalCountPerFace++;
        }

        while ((result = patternVertex.exec(text)) !== null) {
          vertices.push(parseFloat(result[1]), parseFloat(result[2]), parseFloat(result[3]));
          normals.push(normal.x, normal.y, normal.z);
          vertexCountPerFace++;
        }

        // every face have to own ONE valid normal

        if (normalCountPerFace !== 1) {
          console.error(`THREE.STLLoader: Something isn't right with the normal of face number ${faceCounter}`);
        }

        // each face have to own THREE valid vertices

        if (vertexCountPerFace !== 3) {
          console.error(`THREE.STLLoader: Something isn't right with the vertices of face number ${faceCounter}`);
        }

        faceCounter++;
      }

      geometry.addAttribute('position', new Float32BufferAttribute(vertices, 3));
      geometry.addAttribute('normal', new Float32BufferAttribute(normals, 3));

      return geometry
    }

    function ensureString(buffer) {
      if (typeof buffer !== 'string') {
        return LoaderUtils.decodeText(new Uint8Array(buffer))
      }

      return buffer
    }

    function ensureBinary(buffer) {
      if (typeof buffer === 'string') {
        const array_buffer = new Uint8Array(buffer.length);
        for (let i = 0; i < buffer.length; i++) {
          array_buffer[i] = buffer.charCodeAt(i) & 0xff; // implicitly assumes little-endian
        }
        return array_buffer.buffer || array_buffer
      }

      return buffer
    }

    // start

    const binData = ensureBinary(data);

    return isBinary(binData) ? parseBinary(binData) : parseASCII(ensureString(data))
  },

};

/* global document */

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
  static getOption(optionObj, optionName, optionDefaultValue) {
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
  static makeCylinder(vStart, vEnd, rStart, rEnd, openEnd) {
    const HALF_PI = Math.PI * 0.5;
    const distance = vStart.distanceTo(vEnd);
    const position = vEnd.clone().add(vStart).divideScalar(2);

    const offsetPosition = new Matrix4();// a matrix to fix pivot position
    offsetPosition.setPosition(position);

    const cylinder = new CylinderBufferGeometry(rStart, rEnd, distance, 32, 1, openEnd);
    const orientation = new Matrix4();// a new orientation matrix to offset pivot
    orientation.multiply(offsetPosition); // test to add offset
    const offsetRotation = new Matrix4();// a matrix to fix pivot rotation
    orientation.lookAt(vStart, vEnd, new Vector3(0, 1, 0));// look at destination
    offsetRotation.makeRotationX(HALF_PI);// rotate 90 degs on X
    orientation.multiply(offsetRotation);// combine orientation with rotation transformations
    cylinder.applyMatrix(orientation);
    return cylinder
  }


  static triggerDownload(strData, filename) {
    const link = document.createElement('a');
    document.body.appendChild(link); // Firefox requires the link to be in the body
    link.download = filename;
    link.href = strData;
    link.click();
    document.body.removeChild(link); // remove the link when done
  }
}

/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link     https://github.com/Pixpipe/quickvoxelcore
* Lab      MCIN - Montreal Neurological Institute
*/


/**
 * The EventManager deals with events, create them, call them.
 * This class is mostly for being inherited from.
 */
class EventManager {
  /**
   * Constructor
   */
  constructor() {
    this._events = {};
  }


  /**
   * Define an event, with a name associated with a function
   * @param  {String} eventName - Name to give to the event
   * @param  {Function} callback - function associated to the even
   */
  on(eventName, callback) {
    if (typeof callback === 'function') {
      if (!(eventName in this._events)) {
        this._events[eventName] = [];
      }
      this._events[eventName].push(callback);
    } else {
      console.warn('The callback must be of type Function');
    }
  }


  emit(eventName, args = []) {
    // the event must exist and be non null
    if ((eventName in this._events) && (this._events[eventName].length > 0)) {
      const events = this._events[eventName];
      for (let i = 0; i < events.length; i += 1) {
        events[i](...args);
      }
    } else {
      console.warn(`No function associated to the event ${eventName}`);
    }
  }
}

// eslint thing
/* global window requestAnimationFrame cancelAnimationFrame */


const DEFAULT_FOCUS_DISTANCE = 1000;

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
  constructor(divObj = null) {
    super();
    const that = this;

    if (!divObj) {
      console.error('The ThreeContext needs a div object');
      return
    }

    this._requestFrameId = null;

    this._morphologyMeshCollection = {};
    this._meshCollection = {};

    // init camera
    this._camera = new PerspectiveCamera(27, divObj.clientWidth / divObj.clientHeight, 1, 1000000);
    this._camera.position.z = DEFAULT_FOCUS_DISTANCE;


    // init scene
    this._scene = new Scene();
    this._scene.add(new AmbientLight(0x444444));

    // var axesHelper = new THREE.AxesHelper( 1000 )
    // this._scene.add( axesHelper )

    // adding some light
    const light1 = new DirectionalLight(0xffffff, 0.8);
    //light1.position.set(0, 1000, 0)
    // adding the light to the camera ensure a constant lightin of the model
    this._scene.add(this._camera);
    this._camera.add(light1);

    this._renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this._renderer.setClearColor(0xffffff, 0);
    this._renderer.setPixelRatio(window.devicePixelRatio);
    this._renderer.setSize(divObj.clientWidth, divObj.clientHeight);
    this._renderer.gammaInput = true;
    this._renderer.gammaOutput = true;
    divObj.appendChild(this._renderer.domElement);

    // all the necessary for raycasting
    this._raycaster = new Raycaster();
    this._raycastMouse = new Vector2();

    function onMouseMove(event) {
      const elem = that._renderer.domElement;
      const relX = event.pageX - elem.offsetLeft;
      const relY = event.pageY - elem.offsetTop;

      that._raycastMouse.x = (relX / that._renderer.domElement.clientWidth) * 2 - 1;
      that._raycastMouse.y = -(relY / that._renderer.domElement.clientHeight) * 2 + 1;
    }

    this._renderer.domElement.addEventListener('mousemove', onMouseMove, false);
    this._renderer.domElement.addEventListener('dblclick', () => {
      this._performRaycast();
    }, false);

    // mouse controls
    this._controls = new TrackballControls(this._camera, this._renderer.domElement);
    this._controls.rotateSpeed = 3;
    this._controls.addEventListener('change', this._render.bind(this));

    window.addEventListener('resize', () => {
      that._camera.aspect = divObj.clientWidth / divObj.clientHeight;
      that._camera.updateProjectionMatrix();
      that._renderer.setSize(divObj.clientWidth, divObj.clientHeight);
      that._controls.handleResize();
      that._render();
    }, false);

    this._testObjMesh();

    this._render();
    this._animate();
  }


  _testObjMesh () {
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
    this._camera.fov = fov;
    this._camera.updateProjectionMatrix();
    this._render();
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
    const that = this;

    // generate a random name in case none was provided
    const name = Tools.getOption(options, 'name', `mesh_${Math.round(Math.random() * 1000000).toString()}`);
    const focusOn = Tools.getOption(options, 'focusOn', true);

    const loader = new STLLoader();
    // loader.load( '../data/meshes/mask_smooth_simple.stl', function ( geometry ) {
    loader.load(url, (geometry) => {
      const material = this._buildMeshMaterialFromOptions(options);

      geometry.computeBoundingSphere();

      const mesh = new Mesh(
        geometry,
        material,
      );

      mesh.userData.name = name;

      that._scene.add(mesh);
      that._meshCollection[name] = mesh;

      if (focusOn) that.focusOnMesh(name);

      // call a callback if declared, with the name of the mesh in arg
      const onDone = Tools.getOption(options, 'onDone', null);
      if (onDone) {
        onDone(name);
      }
      this._render();
    });
  }


  /**
   * @private
   * Generates a phong material based on the options provided
   */
  _buildMeshMaterialFromOptions (options) {
    const color = Tools.getOption(options, 'color', Math.floor(Math.random() * 0xFFFFFF));
    const opacity = Tools.getOption(options, 'opacity', 0.15);
    const wireframe = Tools.getOption(options, 'wireframe', false);
    const shininess = Tools.getOption(options, 'shininess', 300);
    const doubleSide = Tools.getOption(options, 'doubleSide', false);

    const material = new MeshPhongMaterial({
      specular: 0xffffff,
      shininess,
      side: doubleSide ? DoubleSide : FrontSide,
      color,
      transparent: true,
      opacity,
      wireframe,
    });

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
  addObjToMeshCollection (objStr, options) {
    // generate a random name in case none was provided
    const name = Tools.getOption(options, 'name', `mesh_${Math.round(Math.random() * 1000000).toString()}`);
    const focusOn = Tools.getOption(options, 'focusOn', true);
    let meshData = ObjParser( objStr );

    // Usually 3 because polygons are triangle, but OBJ allows different
    const verticesPerPolygon = meshData.cells[0].length;
    let indices = new Uint32Array( verticesPerPolygon * meshData.cells.length );
    let positions = new Float32Array( 3 * meshData.positions.length );

    // flattening the indices
    for (let i=0; i<meshData.cells.length; i += 1) {
      let newIndex = i * verticesPerPolygon;
      for (let ii=0; ii<verticesPerPolygon; ii += 1) {
        indices[newIndex + ii] = meshData.cells[i][ii];
      }
    }

    // flatening the positions
    for (let p=0; p<meshData.positions.length; p += 1) {
      let newIndex = p * 3;
      positions[newIndex] = meshData.positions[p][0];
      positions[newIndex+1] = meshData.positions[p][1];
      positions[newIndex+2] = meshData.positions[p][2];
    }

    var geometry = new BufferGeometry();
    geometry.setIndex( new BufferAttribute( indices, 1 ) );
    geometry.addAttribute( 'position', new BufferAttribute( positions, verticesPerPolygon ) );
    geometry.computeBoundingSphere();
    geometry.computeVertexNormals();

    let material = this._buildMeshMaterialFromOptions(options);

    const mesh = new Mesh(
      geometry,
      material,
    );

    mesh.userData.name = name;
    this._scene.add(mesh);
    this._meshCollection[name] = mesh;

    if (focusOn) this.focusOnMesh(name);

    // call a callback if declared, with the name of the mesh in arg
    const onDone = Tools.getOption(options, 'onDone', null);
    if (onDone) {
      onDone(name);
    }
    this._render();
  }


  /**
   * @private
   * deals with rendering and updating the controls
   */
  _animate() {
    this._requestFrameId = requestAnimationFrame(this._animate.bind(this));
    this._controls.update();
  }

  _render() {
    this._renderer.render(this._scene, this._camera);
  }


  /**
   * @private
   * Throw a ray from the camera to the pointer, potentially intersect some sections.
   * If so, emit the event `onRaycast` with the section instance as argument
   */
  _performRaycast() {
    // update the picking ray with the camera and mouse position
    this._raycaster.setFromCamera(this._raycastMouse, this._camera);

    // calculate objects intersecting the picking ray
    const intersects = this._raycaster.intersectObjects(this._scene.children, true);

    if (intersects.length) {
      // console.log(this._morphologyMeshCollection)
      const sectionMesh = intersects[0].object;

      // if it's the section of a morphology
      if ("sectionId" in sectionMesh.userData) {
        const { sectionId } = sectionMesh.userData;
        const morphologyObj = sectionMesh.parent.getMorphology();
        this.emit('onRaycast', [morphologyObj._sections[sectionId]]);

      // If it's another mesh
      } else if ("name" in sectionMesh.userData) {
        this.emit('onRaycast', [sectionMesh.userData.name]);

      // here we are raycasting something that is not identified
      } else {
        this.emit('onRaycast', [null]);
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
    const name = options.name; // set before
    const focusOn = Tools.getOption(options, 'focusOn', true);
    const focusDistance = Tools.getOption(options, 'distance', DEFAULT_FOCUS_DISTANCE);

    this._morphologyMeshCollection[name] = morphoMesh;
    this._scene.add(morphoMesh);

    if (focusOn) this.focusOnMorphology(name, focusDistance);

    // call a callback if declared, with the name of the morphology in arg
    const onDone = Tools.getOption(options, 'onDone');
    if (onDone) {
      onDone(name);
    }

    this._render();
  }


  /**
   * Make the camera focus on a specific morphology
   * @param {String|null} name - name of the morphology in the collection. If `null`, takes the first one
   */
  focusOnMorphology(name = null, distance = DEFAULT_FOCUS_DISTANCE) {
    let morphoName = name;
    // if no name of morphology is provided, we take the first one
    if (!morphoName) {
      const allNames = Object.keys(this._morphologyMeshCollection);
      if (allNames.length) {
        morphoName = allNames[0];
      } else {
        return
      }
    }

    const morpho = this._morphologyMeshCollection[morphoName];
    const targetPoint = morpho.getTargetPoint();
    // we try to get pretty close to the soma, hence the averageSide/5
    this._camera.position.set(targetPoint.x, targetPoint.y, targetPoint.z - distance);
    this._camera.lookAt(targetPoint);
    this._controls.target.copy(targetPoint);
    this._render();
  }


  /**
   * Focus on a mesh, given its name
   * @param {string} name - name of the mesh to focus on
   */
  focusOnMesh(name) {
    const mesh = this._meshCollection[name];
    const boundingSphere = mesh.geometry.boundingSphere;

    this._camera.position.set(boundingSphere.center.x - boundingSphere.radius * 3, boundingSphere.center.y, boundingSphere.center.z);
    this._camera.lookAt(boundingSphere.center);
    this._controls.target.copy(boundingSphere.center);
    this._render();
  }

  /**
   * Get the png image data as base64, in order to later, export as a file
   */
  getSnapshotData() {
    const strMime = 'image/png';
    // let strDownloadMime = "image/octet-stream"
    const imgData = this._renderer.domElement.toDataURL(strMime);
    // imgData.replace(strMime, strDownloadMime)
    return imgData
  }


  /**
   * Show the given mesh from the colelction
   * @param {String} name - Name of the mesh
   */
  showMesh (name) {
    if (name in this._meshCollection) {
      this._meshCollection[name].material.visible = true;
      this._render();
    }
  }


  /**
   * Hide the given mesh from the colelction
   * @param {String} name - Name of the mesh
   */
  hideMesh (name) {
    if (name in this._meshCollection) {
      this._meshCollection[name].material.visible = false;
      this._render();
    }
  }


  /**
   * Kills the scene, interaction, animation and reset all objects to null
   */
  destroy() {
    this._controls.dispose();
    cancelAnimationFrame(this._requestFrameId);
    this._camera = null;
    this._controls = null;
    this._scene = null;
    this._morphologyMeshCollection = null;
    this._meshCollection = null;
    this._renderer.domElement.remove();
    this._renderer = null;
  }
}

/*
* @author Mugen87 / https://github.com/Mugen87
*
* Ported from: https://github.com/maurizzzio/quickhull3d/ by Mauricio Poppe (https://github.com/maurizzzio)
*
*/


const Visible = 0;
const Deleted = 1;

function QuickHull() {
  this.tolerance = -1;

  this.faces = []; // the generated faces of the convex hull
  this.newFaces = []; // this array holds the faces that are generated within a single iteration

  // the vertex lists work as follows:
  //
  // let 'a' and 'b' be 'Face' instances
  // let 'v' be points wrapped as instance of 'Vertex'
  //
  //     [v, v, ..., v, v, v, ...]
  //      ^             ^
  //      |             |
  //  a.outside     b.outside
  //
  this.assigned = new VertexList();
  this.unassigned = new VertexList();

  this.vertices = []; // vertices of the hull (internal representation of given geometry data)
}

Object.assign(QuickHull.prototype, {

  setFromPoints(points) {
    if (Array.isArray(points) !== true) {
      console.error('THREE.QuickHull: Points parameter is not an array.');
    }

    if (points.length < 4) {
      console.error('THREE.QuickHull: The algorithm needs at least four points.');
    }

    this.makeEmpty();

    for (let i = 0, l = points.length; i < l; i++) {
      this.vertices.push(new VertexNode(points[i]));
    }

    this.compute();

    return this
  },

  setFromObject(object) {
    const points = [];

    object.updateMatrixWorld(true);

    object.traverse((node) => {
      let i; let l; let
        point;

      const geometry = node.geometry;

      if (geometry !== undefined) {
        if (geometry.isGeometry) {
          const vertices = geometry.vertices;

          for (i = 0, l = vertices.length; i < l; i++) {
            point = vertices[i].clone();
            point.applyMatrix4(node.matrixWorld);

            points.push(point);
          }
        } else if (geometry.isBufferGeometry) {
          const attribute = geometry.attributes.position;

          if (attribute !== undefined) {
            for (i = 0, l = attribute.count; i < l; i++) {
              point = new Vector3();

              point.fromBufferAttribute(attribute, i).applyMatrix4(node.matrixWorld);

              points.push(point);
            }
          }
        }
      }
    });

    return this.setFromPoints(points)
  },

  makeEmpty() {
    this.faces = [];
    this.vertices = [];

    return this
  },

  // Adds a vertex to the 'assigned' list of vertices and assigns it to the given face

  addVertexToFace(vertex, face) {
    vertex.face = face;

    if (face.outside === null) {
      this.assigned.append(vertex);
    } else {
      this.assigned.insertBefore(face.outside, vertex);
    }

    face.outside = vertex;

    return this
  },

  // Removes a vertex from the 'assigned' list of vertices and from the given face

  removeVertexFromFace(vertex, face) {
    if (vertex === face.outside) {
      // fix face.outside link

      if (vertex.next !== null && vertex.next.face === face) {
        // face has at least 2 outside vertices, move the 'outside' reference

        face.outside = vertex.next;
      } else {
        // vertex was the only outside vertex that face had

        face.outside = null;
      }
    }

    this.assigned.remove(vertex);

    return this
  },

  // Removes all the visible vertices that a given face is able to see which are stored in the 'assigned' vertext list

  removeAllVerticesFromFace(face) {
    if (face.outside !== null) {
      // reference to the first and last vertex of this face

      const start = face.outside;
      let end = face.outside;

      while (end.next !== null && end.next.face === face) {
        end = end.next;
      }

      this.assigned.removeSubList(start, end);

      // fix references

      start.prev = end.next = null;
      face.outside = null;

      return start
    }
  },

  // Removes all the visible vertices that 'face' is able to see

  deleteFaceVertices(face, absorbingFace) {
    const faceVertices = this.removeAllVerticesFromFace(face);

    if (faceVertices !== undefined) {
      if (absorbingFace === undefined) {
        // mark the vertices to be reassigned to some other face

        this.unassigned.appendChain(faceVertices);
      } else {
        // if there's an absorbing face try to assign as many vertices as possible to it

        let vertex = faceVertices;

        do {
          // we need to buffer the subsequent vertex at this point because the 'vertex.next' reference
          // will be changed by upcoming method calls

          const nextVertex = vertex.next;

          const distance = absorbingFace.distanceToPoint(vertex.point);

          // check if 'vertex' is able to see 'absorbingFace'

          if (distance > this.tolerance) {
            this.addVertexToFace(vertex, absorbingFace);
          } else {
            this.unassigned.append(vertex);
          }

          // now assign next vertex

          vertex = nextVertex;
        } while (vertex !== null)
      }
    }

    return this
  },

  // Reassigns as many vertices as possible from the unassigned list to the new faces

  resolveUnassignedPoints(newFaces) {
    if (this.unassigned.isEmpty() === false) {
      let vertex = this.unassigned.first();

      do {
        // buffer 'next' reference, see .deleteFaceVertices()

        const nextVertex = vertex.next;

        let maxDistance = this.tolerance;

        let maxFace = null;

        for (let i = 0; i < newFaces.length; i++) {
          const face = newFaces[i];

          if (face.mark === Visible) {
            const distance = face.distanceToPoint(vertex.point);

            if (distance > maxDistance) {
              maxDistance = distance;
              maxFace = face;
            }

            if (maxDistance > 1000 * this.tolerance) break
          }
        }

        // 'maxFace' can be null e.g. if there are identical vertices

        if (maxFace !== null) {
          this.addVertexToFace(vertex, maxFace);
        }

        vertex = nextVertex;
      } while (vertex !== null)
    }

    return this
  },

  // Computes the extremes of a simplex which will be the initial hull

  computeExtremes() {
    const min = new Vector3();
    const max = new Vector3();

    const minVertices = [];
    const maxVertices = [];

    let i; let l; let
      j;

    // initially assume that the first vertex is the min/max

    for (i = 0; i < 3; i++) {
      minVertices[i] = maxVertices[i] = this.vertices[0];
    }

    min.copy(this.vertices[0].point);
    max.copy(this.vertices[0].point);

    // compute the min/max vertex on all six directions

    for (i = 0, l = this.vertices.length; i < l; i++) {
      const vertex = this.vertices[i];
      const point = vertex.point;

      // update the min coordinates

      for (j = 0; j < 3; j++) {
        if (point.getComponent(j) < min.getComponent(j)) {
          min.setComponent(j, point.getComponent(j));
          minVertices[j] = vertex;
        }
      }

      // update the max coordinates

      for (j = 0; j < 3; j++) {
        if (point.getComponent(j) > max.getComponent(j)) {
          max.setComponent(j, point.getComponent(j));
          maxVertices[j] = vertex;
        }
      }
    }

    // use min/max vectors to compute an optimal epsilon

    this.tolerance = 3 * Number.EPSILON * (
      Math.max(Math.abs(min.x), Math.abs(max.x))
      + Math.max(Math.abs(min.y), Math.abs(max.y))
      + Math.max(Math.abs(min.z), Math.abs(max.z))
    );

    return { min: minVertices, max: maxVertices }
  },

  // Computes the initial simplex assigning to its faces all the points
  // that are candidates to form part of the hull

  computeInitialHull: (function () {
    let line3; let plane; let
      closestPoint;

    return function computeInitialHull() {
      if (line3 === undefined) {
        line3 = new Line3();
        plane = new Plane();
        closestPoint = new Vector3();
      }

      let vertex; const
        vertices = this.vertices;
      const extremes = this.computeExtremes();
      const min = extremes.min;
      const max = extremes.max;

      let v0; let v1; let v2; let
        v3;
      let i; let l; let
        j;

      // 1. Find the two vertices 'v0' and 'v1' with the greatest 1d separation
      // (max.x - min.x)
      // (max.y - min.y)
      // (max.z - min.z)

      let distance; let
        maxDistance = 0;
      let index = 0;

      for (i = 0; i < 3; i++) {
        distance = max[i].point.getComponent(i) - min[i].point.getComponent(i);

        if (distance > maxDistance) {
          maxDistance = distance;
          index = i;
        }
      }

      v0 = min[index];
      v1 = max[index];

      // 2. The next vertex 'v2' is the one farthest to the line formed by 'v0' and 'v1'

      maxDistance = 0;
      line3.set(v0.point, v1.point);

      for (i = 0, l = this.vertices.length; i < l; i++) {
        vertex = vertices[i];

        if (vertex !== v0 && vertex !== v1) {
          line3.closestPointToPoint(vertex.point, true, closestPoint);

          distance = closestPoint.distanceToSquared(vertex.point);

          if (distance > maxDistance) {
            maxDistance = distance;
            v2 = vertex;
          }
        }
      }

      // 3. The next vertex 'v3' is the one farthest to the plane 'v0', 'v1', 'v2'

      maxDistance = -1;
      plane.setFromCoplanarPoints(v0.point, v1.point, v2.point);

      for (i = 0, l = this.vertices.length; i < l; i++) {
        vertex = vertices[i];

        if (vertex !== v0 && vertex !== v1 && vertex !== v2) {
          distance = Math.abs(plane.distanceToPoint(vertex.point));

          if (distance > maxDistance) {
            maxDistance = distance;
            v3 = vertex;
          }
        }
      }

      const faces = [];

      if (plane.distanceToPoint(v3.point) < 0) {
        // the face is not able to see the point so 'plane.normal' is pointing outside the tetrahedron

        faces.push(
          Face.create(v0, v1, v2),
          Face.create(v3, v1, v0),
          Face.create(v3, v2, v1),
          Face.create(v3, v0, v2),
        );

        // set the twin edge

        for (i = 0; i < 3; i++) {
          j = (i + 1) % 3;

          // join face[ i ] i > 0, with the first face

          faces[i + 1].getEdge(2).setTwin(faces[0].getEdge(j));

          // join face[ i ] with face[ i + 1 ], 1 <= i <= 3

          faces[i + 1].getEdge(1).setTwin(faces[j + 1].getEdge(0));
        }
      } else {
        // the face is able to see the point so 'plane.normal' is pointing inside the tetrahedron

        faces.push(
          Face.create(v0, v2, v1),
          Face.create(v3, v0, v1),
          Face.create(v3, v1, v2),
          Face.create(v3, v2, v0),
        );

        // set the twin edge

        for (i = 0; i < 3; i++) {
          j = (i + 1) % 3;

          // join face[ i ] i > 0, with the first face

          faces[i + 1].getEdge(2).setTwin(faces[0].getEdge((3 - i) % 3));

          // join face[ i ] with face[ i + 1 ]

          faces[i + 1].getEdge(0).setTwin(faces[j + 1].getEdge(1));
        }
      }

      // the initial hull is the tetrahedron

      for (i = 0; i < 4; i++) {
        this.faces.push(faces[i]);
      }

      // initial assignment of vertices to the faces of the tetrahedron

      for (i = 0, l = vertices.length; i < l; i++) {
        vertex = vertices[i];

        if (vertex !== v0 && vertex !== v1 && vertex !== v2 && vertex !== v3) {
          maxDistance = this.tolerance;
          let maxFace = null;

          for (j = 0; j < 4; j++) {
            distance = this.faces[j].distanceToPoint(vertex.point);

            if (distance > maxDistance) {
              maxDistance = distance;
              maxFace = this.faces[j];
            }
          }

          if (maxFace !== null) {
            this.addVertexToFace(vertex, maxFace);
          }
        }
      }

      return this
    }
  }()),

  // Removes inactive faces

  reindexFaces() {
    const activeFaces = [];

    for (let i = 0; i < this.faces.length; i++) {
      const face = this.faces[i];

      if (face.mark === Visible) {
        activeFaces.push(face);
      }
    }

    this.faces = activeFaces;

    return this
  },

  // Finds the next vertex to create faces with the current hull

  nextVertexToAdd() {
    // if the 'assigned' list of vertices is empty, no vertices are left. return with 'undefined'

    if (this.assigned.isEmpty() === false) {
      let eyeVertex; let
        maxDistance = 0;

      // grap the first available face and start with the first visible vertex of that face

      const eyeFace = this.assigned.first().face;
      let vertex = eyeFace.outside;

      // now calculate the farthest vertex that face can see

      do {
        const distance = eyeFace.distanceToPoint(vertex.point);

        if (distance > maxDistance) {
          maxDistance = distance;
          eyeVertex = vertex;
        }

        vertex = vertex.next;
      } while (vertex !== null && vertex.face === eyeFace)

      return eyeVertex
    }
  },

  // Computes a chain of half edges in CCW order called the 'horizon'.
  // For an edge to be part of the horizon it must join a face that can see
  // 'eyePoint' and a face that cannot see 'eyePoint'.

  computeHorizon(eyePoint, crossEdge, face, horizon) {
    // moves face's vertices to the 'unassigned' vertex list

    this.deleteFaceVertices(face);

    face.mark = Deleted;

    let edge;

    if (crossEdge === null) {
      edge = crossEdge = face.getEdge(0);
    } else {
      // start from the next edge since 'crossEdge' was already analyzed
      // (actually 'crossEdge.twin' was the edge who called this method recursively)

      edge = crossEdge.next;
    }

    do {
      const twinEdge = edge.twin;
      const oppositeFace = twinEdge.face;

      if (oppositeFace.mark === Visible) {
        if (oppositeFace.distanceToPoint(eyePoint) > this.tolerance) {
          // the opposite face can see the vertex, so proceed with next edge

          this.computeHorizon(eyePoint, twinEdge, oppositeFace, horizon);
        } else {
          // the opposite face can't see the vertex, so this edge is part of the horizon

          horizon.push(edge);
        }
      }

      edge = edge.next;
    } while (edge !== crossEdge)

    return this
  },

  // Creates a face with the vertices 'eyeVertex.point', 'horizonEdge.tail' and 'horizonEdge.head' in CCW order

  addAdjoiningFace(eyeVertex, horizonEdge) {
    // all the half edges are created in ccw order thus the face is always pointing outside the hull

    const face = Face.create(eyeVertex, horizonEdge.tail(), horizonEdge.head());

    this.faces.push(face);

    // join face.getEdge( - 1 ) with the horizon's opposite edge face.getEdge( - 1 ) = face.getEdge( 2 )

    face.getEdge(-1).setTwin(horizonEdge.twin);

    return face.getEdge(0) // the half edge whose vertex is the eyeVertex
  },

  //  Adds 'horizon.length' faces to the hull, each face will be linked with the
  //  horizon opposite face and the face on the left/right

  addNewFaces(eyeVertex, horizon) {
    this.newFaces = [];

    let firstSideEdge = null;
    let previousSideEdge = null;

    for (let i = 0; i < horizon.length; i++) {
      const horizonEdge = horizon[i];

      // returns the right side edge

      const sideEdge = this.addAdjoiningFace(eyeVertex, horizonEdge);

      if (firstSideEdge === null) {
        firstSideEdge = sideEdge;
      } else {
        // joins face.getEdge( 1 ) with previousFace.getEdge( 0 )

        sideEdge.next.setTwin(previousSideEdge);
      }

      this.newFaces.push(sideEdge.face);
      previousSideEdge = sideEdge;
    }

    // perform final join of new faces

    firstSideEdge.next.setTwin(previousSideEdge);

    return this
  },

  // Adds a vertex to the hull

  addVertexToHull(eyeVertex) {
    const horizon = [];

    this.unassigned.clear();

    // remove 'eyeVertex' from 'eyeVertex.face' so that it can't be added to the 'unassigned' vertex list

    this.removeVertexFromFace(eyeVertex, eyeVertex.face);

    this.computeHorizon(eyeVertex.point, null, eyeVertex.face, horizon);

    this.addNewFaces(eyeVertex, horizon);

    // reassign 'unassigned' vertices to the new faces

    this.resolveUnassignedPoints(this.newFaces);

    return this
  },

  cleanup() {
    this.assigned.clear();
    this.unassigned.clear();
    this.newFaces = [];

    return this
  },

  compute() {
    let vertex;

    this.computeInitialHull();

    // add all available vertices gradually to the hull

    while ((vertex = this.nextVertexToAdd()) !== undefined) {
      this.addVertexToHull(vertex);
    }

    this.reindexFaces();

    this.cleanup();

    return this
  },

});

//

function Face() {
  this.normal = new Vector3();
  this.midpoint = new Vector3();
  this.area = 0;

  this.constant = 0; // signed distance from face to the origin
  this.outside = null; // reference to a vertex in a vertex list this face can see
  this.mark = Visible;
  this.edge = null;
}

Object.assign(Face, {

  create(a, b, c) {
    const face = new Face();

    const e0 = new HalfEdge(a, face);
    const e1 = new HalfEdge(b, face);
    const e2 = new HalfEdge(c, face);

    // join edges

    e0.next = e2.prev = e1;
    e1.next = e0.prev = e2;
    e2.next = e1.prev = e0;

    // main half edge reference

    face.edge = e0;

    return face.compute()
  },

});

Object.assign(Face.prototype, {

  getEdge(i) {
    let edge = this.edge;

    while (i > 0) {
      edge = edge.next;
      i--;
    }

    while (i < 0) {
      edge = edge.prev;
      i++;
    }

    return edge
  },

  compute: (function () {
    let triangle;

    return function compute() {
      if (triangle === undefined) triangle = new Triangle();

      const a = this.edge.tail();
      const b = this.edge.head();
      const c = this.edge.next.head();

      triangle.set(a.point, b.point, c.point);

      triangle.getNormal(this.normal);
      triangle.getMidpoint(this.midpoint);
      this.area = triangle.getArea();

      this.constant = this.normal.dot(this.midpoint);

      return this
    }
  }()),

  distanceToPoint(point) {
    return this.normal.dot(point) - this.constant
  },

});

// Entity for a Doubly-Connected Edge List (DCEL).

function HalfEdge(vertex, face) {
  this.vertex = vertex;
  this.prev = null;
  this.next = null;
  this.twin = null;
  this.face = face;
}

Object.assign(HalfEdge.prototype, {

  head() {
    return this.vertex
  },

  tail() {
    return this.prev ? this.prev.vertex : null
  },

  length() {
    const head = this.head();
    const tail = this.tail();

    if (tail !== null) {
      return tail.point.distanceTo(head.point)
    }

    return -1
  },

  lengthSquared() {
    const head = this.head();
    const tail = this.tail();

    if (tail !== null) {
      return tail.point.distanceToSquared(head.point)
    }

    return -1
  },

  setTwin(edge) {
    this.twin = edge;
    edge.twin = this;

    return this
  },

});

// A vertex as a double linked list node.

function VertexNode(point) {
  this.point = point;
  this.prev = null;
  this.next = null;
  this.face = null; // the face that is able to see this vertex
}

// A double linked list that contains vertex nodes.

function VertexList() {
  this.head = null;
  this.tail = null;
}

Object.assign(VertexList.prototype, {

  first() {
    return this.head
  },

  last() {
    return this.tail
  },

  clear() {
    this.head = this.tail = null;

    return this
  },

  // Inserts a vertex before the target vertex

  insertBefore(target, vertex) {
    vertex.prev = target.prev;
    vertex.next = target;

    if (vertex.prev === null) {
      this.head = vertex;
    } else {
      vertex.prev.next = vertex;
    }

    target.prev = vertex;

    return this
  },

  // Inserts a vertex after the target vertex

  insertAfter(target, vertex) {
    vertex.prev = target;
    vertex.next = target.next;

    if (vertex.next === null) {
      this.tail = vertex;
    } else {
      vertex.next.prev = vertex;
    }

    target.next = vertex;

    return this
  },

  // Appends a vertex to the end of the linked list

  append(vertex) {
    if (this.head === null) {
      this.head = vertex;
    } else {
      this.tail.next = vertex;
    }

    vertex.prev = this.tail;
    vertex.next = null; // the tail has no subsequent vertex

    this.tail = vertex;

    return this
  },

  // Appends a chain of vertices where 'vertex' is the head.

  appendChain(vertex) {
    if (this.head === null) {
      this.head = vertex;
    } else {
      this.tail.next = vertex;
    }

    vertex.prev = this.tail;

    // ensure that the 'tail' reference points to the last vertex of the chain

    while (vertex.next !== null) {
      vertex = vertex.next;
    }

    this.tail = vertex;

    return this
  },

  // Removes a vertex from the linked list

  remove(vertex) {
    if (vertex.prev === null) {
      this.head = vertex.next;
    } else {
      vertex.prev.next = vertex.next;
    }

    if (vertex.next === null) {
      this.tail = vertex.prev;
    } else {
      vertex.next.prev = vertex.prev;
    }

    return this
  },

  // Removes a list of vertices whose 'head' is 'a' and whose 'tail' is b

  removeSubList(a, b) {
    if (a.prev === null) {
      this.head = b.next;
    } else {
      a.prev.next = b.next;
    }

    if (b.next === null) {
      this.tail = a.prev;
    } else {
      b.next.prev = a.prev;
    }

    return this
  },

  isEmpty() {
    return this.head === null
  },

});

/*
* @author Mugen87 / https://github.com/Mugen87
*/


// ConvexGeometry

function ConvexGeometry(points) {
  Geometry.call(this);

  this.fromBufferGeometry(new ConvexBufferGeometry(points));
  this.mergeVertices();
}

ConvexGeometry.prototype = Object.create(Geometry.prototype);
ConvexGeometry.prototype.constructor = ConvexGeometry;

// ConvexBufferGeometry

function ConvexBufferGeometry(points) {
  BufferGeometry.call(this);

  // buffers

  const vertices = [];
  const normals = [];

  // execute QuickHull

  if (QuickHull === undefined) {
    console.error('THREE.ConvexBufferGeometry: ConvexBufferGeometry relies on THREE.QuickHull');
  }

  const quickHull = new QuickHull().setFromPoints(points);

  // generate vertices and normals

  const faces = quickHull.faces;

  for (let i = 0; i < faces.length; i++) {
    const face = faces[i];
    let edge = face.edge;

    // we move along a doubly-connected edge list to access all face points (see HalfEdge docs)

    do {
      const point = edge.head().point;

      vertices.push(point.x, point.y, point.z);
      normals.push(face.normal.x, face.normal.y, face.normal.z);

      edge = edge.next;
    } while (edge !== face.edge)
  }

  // build geometry

  this.addAttribute('position', new Float32BufferAttribute(vertices, 3));
  this.addAttribute('normal', new Float32BufferAttribute(normals, 3));
}

ConvexBufferGeometry.prototype = Object.create(BufferGeometry.prototype);
ConvexBufferGeometry.prototype.constructor = ConvexBufferGeometry;

/**
 * This is the base class for `MorphologyPolyline` and `MorphologyPolycylinder`.
 * It handles the common features, mainly related to soma creation
 */
class MorphologyShapeBase extends Object3D {
  /**
   * @constructor
   * Builds a moprho as a polyline
   * @param {Object} morpho - raw object that describes a morphology (usually straight from a JSON file)
   * @param {object} options - the option object
   * @param {Number} options.color - the color of the polyline.
   * If provided, the whole neurone will be of the given color, if not provided,
   * the axon will be green, the basal dendrite will be red and the apical dendrite will be green
   */
  constructor(morpho, options) {
    super();

    this.userData.morphologyName = options.name;
    this._pointToTarget = null;
    this._morpho = morpho;

    // fetch the optional color
    const color = Tools.getOption(options, 'color', null);

    // simple color lookup, so that every section type is shown in a different color
    this._sectionColors = {
      axon: color || 0x1111ff,
      basal_dendrite: color || 0xff1111,
      apical_dendrite: color || 0xf442ad,
    };
  }


  /**
   * @private
   * The method to build a soma mesh using the 'default' way, aka using simply the
   * data from the soma.
   * @return {THREE.Mesh} the soma mesh
   */
  _buildSomaDefault() {
    const soma = this._morpho.getSoma();
    const somaPoints = soma.getPoints();

    // case when soma is a single point
    if (somaPoints.length === 1) {
      const somaSphere = new Mesh(
        new SphereGeometry(soma.getRadius(), 32, 32),
        new MeshPhongMaterial({ color: 0x000000, transparent: true, opacity: 0.3 }),
      );

      somaSphere.position.set(somaPoints[0][0], somaPoints[0][1], somaPoints[0][2]);
      return somaSphere

    // this is a 3-point soma, probably colinear
    } if (somaPoints.length === 3) {
      /*
      let radius = soma.getRadius()
      let mat = new THREE.MeshPhongMaterial( {color: 0x000000, transparent: true, opacity:0.3} )

      let c1 = Tools.makeCylinder(
        new THREE.Vector3(...somaPoints[0]),
        new THREE.Vector3(...somaPoints[1]),
        radius,
        radius,
        false,
        mat
      )

      let c2 = Tools.makeCylinder(
        new THREE.Vector3(...somaPoints[1]),
        new THREE.Vector3(...somaPoints[2]),
        radius,
        radius,
        false,
        mat
      )

      let somaCyl = new THREE.Object3D()
      somaCyl.add(c1)
      somaCyl.add(c2)
      return somaCyl
      */

      const somaSphere = new Mesh(
        new SphereGeometry(soma.getRadius(), 32, 32),
        new MeshPhongMaterial({ color: 0x000000, transparent: true, opacity: 0.3 }),
      );

      somaSphere.position.set(somaPoints[0][0], somaPoints[0][1], somaPoints[0][2]);
      return somaSphere


    // when soma is multiple points
    } if (somaPoints.length > 1) {
      // compute the average of the points
      const center = soma.getCenter();
      const centerV = new Vector3(center[0], center[1], center[2]);
      const geometry = new Geometry();

      for (let i = 0; i < somaPoints.length; i += 1) {
        geometry.vertices.push(
          new Vector3(somaPoints[i][0], somaPoints[i][1], somaPoints[i][2]),
          new Vector3(
            somaPoints[(i + 1) % somaPoints.length][0],
            somaPoints[(i + 1) % somaPoints.length][1],
            somaPoints[(i + 1) % somaPoints.length][2],
          ),
          centerV,
        );
        geometry.faces.push(new Face3(3 * i, 3 * i + 1, 3 * i + 2));
      }

      const somaMesh = new Mesh(geometry, new MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.3,
        side: DoubleSide,
      }));
      return somaMesh
    }
    console.warn('No soma defined');
    return null
  }


  /**
   * @private
   * Here we build a soma convex polygon based on the 1st points of the orphan
   * sections + the points available in the soma description
   * @return {THREE.Mesh} the soma mesh
   */
  _buildSomaFromOrphanSections() {
    const somaPoints = this._morpho.getSoma().getPoints();
    let somaMesh = null;

    try {
      // getting all the 1st points of orphan sections
      const somaPolygonPoints = this._morpho.getOrphanSections().map((s) => {
        const allPoints = s.getPoints();
        const firstOne = allPoints[1];
        return new Vector3(...firstOne)
      });

      // adding the points of the soma (adds values mostly if we a soma polygon)
      for (let i = 0; i < somaPoints.length; i += 1) {
        somaPolygonPoints.push(new Vector3(...somaPoints[i]));
      }

      const geometry = new ConvexBufferGeometry(somaPolygonPoints);
      const material = new MeshPhongMaterial({
        color: 0x555555,
        transparent: true,
        opacity: 0.7,
        side: DoubleSide,
      });
      somaMesh = new Mesh(geometry, material);
      return somaMesh
    } catch (e) {
      console.warn('Attempted to build a soma from orphan section points but failed. Back to the regular version.');
      return this._buildSomaDefault()
    }
  }


  /**
   * @private
   * Builds the soma. The type of soma depends on the option
   * @param {Object} options - The option object
   * @param {String|null} options.somaMode - "default" to display only the soma data or "fromOrphanSections" to build a soma using the orphan sections
   */
  _buildSoma(options) {
    this._pointToTarget = this._morpho.getSoma().getCenter();
    // can be 'default' or 'fromOrphanSections'
    const buildMode = Tools.getOption(options, 'somaMode', null);
    let somaMesh = null;

    if (buildMode === 'fromOrphanSections') {
      somaMesh = this._buildSomaFromOrphanSections();
    } else {
      somaMesh = this._buildSomaDefault();
    }

    return somaMesh
  }


  /**
   * Get the point to target when using the method lookAt. If the soma is valid,
   * this will be the center of the soma. If no soma is valid, it will be the
   * center of the box
   * @return {Array} center with the shape [x: Number, y: Number, z: Number]
   */
  getTargetPoint() {
    if (this._pointToTarget) {
      // rotate this because Allen needs it (just like the sections)
      const lookat = new Vector3(this._pointToTarget[0], this._pointToTarget[1], this._pointToTarget[2]);
      lookat.applyAxisAngle(new Vector3(1, 0, 0), Math.PI);
      lookat.applyAxisAngle(new Vector3(0, 1, 0), Math.PI);
      return lookat
    }
    const center = new Vector3();
    this.box.getCenter(center);
    return center
  }


  /**
   * Get the morphology object tied to _this_ mesh
   * @return {morphologycorejs.Morphology}
   */
  getMorphology() {
    return this._morpho
  }
}

/**
 * The MorphologyPolyline is the simplest 3D representation of a morphology, using
 * simple polylines.
 * Compared to its cylinder-based alternative (MorphologyPolycylinder), this one
 * is more suitable for displaying several morphologies (up to maybe a hundred,
 * depending on length and machine performance)
 * MorphologyPolyline extends from THREE.Object so that it's easy to integrate.
 * It's constructor
 */
class MorphologyPolyline extends MorphologyShapeBase {
  /**
   * @constructor
   * Builds a moprho as a polyline
   * @param {Morphology} morpho - raw object that describes a morphology (usually straight from a JSON file)
   * @param {object} options - the option object
   * @param {Number} options.color - the color of the polyline.
   * If provided, the whole neurone will be of the given color, if not provided,
   * the axon will be green, the basal dendrite will be red and the apical dendrite will be green
   */
  constructor(morpho, options) {
    super(morpho, options);
    const sections = this._morpho.getArrayOfSections();

    // creating a polyline for each section
    for (let i = 0; i < sections.length; i += 1) {
      const sectionPolyline = this._buildSection(sections[i]);
      this.add(sectionPolyline);
    }

    // adding the soma mesh, but sometimes, there is no soma
    const somaData = this._morpho.getSoma();
    if (somaData) {
      const somaShape = this._buildSoma(options);
      this.add(somaShape);
    }

    // this is because the Allen ref is not oriented the same way as WebGL
    this.rotateX(Math.PI);
    this.rotateY(Math.PI);

    // compute the bounding box, useful for further camera targeting
    this.box = new Box3().setFromObject(this);
  }


  /**
   * @private
   * Builds a single section from a raw segment description and returns it.
   * A section is usually composed of multiple segments
   * @param {Section} section - sub part of the morpho raw object thar deals with a single section
   * @return {THREE.Line} the constructed polyline
   */
  _buildSection(section) {
    const material = new LineBasicMaterial({
      color: this._sectionColors[section.getTypename()],
    });

    const sectionPoints = section.getPoints();
    const geometry = new Geometry();

    for (let i = 0; i < sectionPoints.length; i += 1) {
      geometry.vertices.push(new Vector3(
        sectionPoints[i][0], // x
        sectionPoints[i][1], // y
        sectionPoints[i][2], // z
      ));
    }

    const line = new Line(geometry, material);

    // adding some metadata as it can be useful for raycasting
    line.name = section.getId();
    line.userData.sectionId = section.getId();
    line.userData.typevalue = section.getTypevalue();
    line.userData.typename = section.getTypename();

    return line
  }
}

/*
 * @author mrdoob / http://mrdoob.com/
 */

const BufferGeometryUtils = {

  computeTangents(geometry) {
    const index = geometry.index;
    const attributes = geometry.attributes;

    // based on http://www.terathon.com/code/tangent.html
    // (per vertex tangents)

    if (index === null
       || attributes.position === undefined
       || attributes.normal === undefined
       || attributes.uv === undefined) {
      console.warn('THREE.BufferGeometry: Missing required attributes (index, position, normal or uv) in BufferGeometry.computeTangents()');
      return
    }

    const indices = index.array;
    const positions = attributes.position.array;
    const normals = attributes.normal.array;
    const uvs = attributes.uv.array;

    const nVertices = positions.length / 3;

    if (attributes.tangent === undefined) {
      geometry.addAttribute('tangent', new BufferAttribute(new Float32Array(4 * nVertices), 4));
    }

    const tangents = attributes.tangent.array;

    const tan1 = []; const
      tan2 = [];

    for (var i = 0; i < nVertices; i++) {
      tan1[i] = new Vector3();
      tan2[i] = new Vector3();
    }

    const vA = new Vector3();


    const vB = new Vector3();


    const vC = new Vector3();


    const uvA = new Vector2();


    const uvB = new Vector2();


    const uvC = new Vector2();


    const sdir = new Vector3();


    const tdir = new Vector3();

    function handleTriangle(a, b, c) {
      vA.fromArray(positions, a * 3);
      vB.fromArray(positions, b * 3);
      vC.fromArray(positions, c * 3);

      uvA.fromArray(uvs, a * 2);
      uvB.fromArray(uvs, b * 2);
      uvC.fromArray(uvs, c * 2);

      const x1 = vB.x - vA.x;
      const x2 = vC.x - vA.x;

      const y1 = vB.y - vA.y;
      const y2 = vC.y - vA.y;

      const z1 = vB.z - vA.z;
      const z2 = vC.z - vA.z;

      const s1 = uvB.x - uvA.x;
      const s2 = uvC.x - uvA.x;

      const t1 = uvB.y - uvA.y;
      const t2 = uvC.y - uvA.y;

      const r = 1.0 / (s1 * t2 - s2 * t1);

      sdir.set(
        (t2 * x1 - t1 * x2) * r,
        (t2 * y1 - t1 * y2) * r,
        (t2 * z1 - t1 * z2) * r,
      );

      tdir.set(
        (s1 * x2 - s2 * x1) * r,
        (s1 * y2 - s2 * y1) * r,
        (s1 * z2 - s2 * z1) * r,
      );

      tan1[a].add(sdir);
      tan1[b].add(sdir);
      tan1[c].add(sdir);

      tan2[a].add(tdir);
      tan2[b].add(tdir);
      tan2[c].add(tdir);
    }

    let groups = geometry.groups;

    if (groups.length === 0) {
      groups = [{
        start: 0,
        count: indices.length,
      }];
    }

    for (var i = 0, il = groups.length; i < il; ++i) {
      var group = groups[i];

      var start = group.start;
      var count = group.count;

      for (var j = start, jl = start + count; j < jl; j += 3) {
        handleTriangle(
          indices[j + 0],
          indices[j + 1],
          indices[j + 2],
        );
      }
    }

    const tmp = new Vector3(); const
      tmp2 = new Vector3();
    const n = new Vector3(); const
      n2 = new Vector3();
    let w; let t; let
      test;

    function handleVertex(v) {
      n.fromArray(normals, v * 3);
      n2.copy(n);

      t = tan1[v];

      // Gram-Schmidt orthogonalize

      tmp.copy(t);
      tmp.sub(n.multiplyScalar(n.dot(t))).normalize();

      // Calculate handedness

      tmp2.crossVectors(n2, t);
      test = tmp2.dot(tan2[v]);
      w = (test < 0.0) ? -1.0 : 1.0;

      tangents[v * 4] = tmp.x;
      tangents[v * 4 + 1] = tmp.y;
      tangents[v * 4 + 2] = tmp.z;
      tangents[v * 4 + 3] = w;
    }

    for (var i = 0, il = groups.length; i < il; ++i) {
      var group = groups[i];

      var start = group.start;
      var count = group.count;

      for (var j = start, jl = start + count; j < jl; j += 3) {
        handleVertex(indices[j + 0]);
        handleVertex(indices[j + 1]);
        handleVertex(indices[j + 2]);
      }
    }
  },

  /**
   * @param  {Array<THREE.BufferGeometry>} geometries
   * @return {THREE.BufferGeometry}
   */
  mergeBufferGeometries(geometries, useGroups) {
    const isIndexed = geometries[0].index !== null;

    const attributesUsed = new Set(Object.keys(geometries[0].attributes));
    const morphAttributesUsed = new Set(Object.keys(geometries[0].morphAttributes));

    const attributes = {};
    const morphAttributes = {};

    const mergedGeometry = new BufferGeometry();

    let offset = 0;

    for (var i = 0; i < geometries.length; ++i) {
      const geometry = geometries[i];

      // ensure that all geometries are indexed, or none

      if (isIndexed !== (geometry.index !== null)) return null

      // gather attributes, exit early if they're different

      for (var name in geometry.attributes) {
        if (!attributesUsed.has(name)) return null

        if (attributes[name] === undefined) attributes[name] = [];

        attributes[name].push(geometry.attributes[name]);
      }

      // gather morph attributes, exit early if they're different

      for (var name in geometry.morphAttributes) {
        if (!morphAttributesUsed.has(name)) return null

        if (morphAttributes[name] === undefined) morphAttributes[name] = [];

        morphAttributes[name].push(geometry.morphAttributes[name]);
      }

      // gather .userData

      mergedGeometry.userData.mergedUserData = mergedGeometry.userData.mergedUserData || [];
      mergedGeometry.userData.mergedUserData.push(geometry.userData);

      if (useGroups) {
        var count;

        if (isIndexed) {
          count = geometry.index.count;
        } else if (geometry.attributes.position !== undefined) {
          count = geometry.attributes.position.count;
        } else {
          return null
        }

        mergedGeometry.addGroup(offset, count, i);

        offset += count;
      }
    }

    // merge indices

    if (isIndexed) {
      let indexOffset = 0;
      const mergedIndex = [];

      for (var i = 0; i < geometries.length; ++i) {
        const index = geometries[i].index;

        for (var j = 0; j < index.count; ++j) {
          mergedIndex.push(index.getX(j) + indexOffset);
        }

        indexOffset += geometries[i].attributes.position.count;
      }

      mergedGeometry.setIndex(mergedIndex);
    }

    // merge attributes

    for (var name in attributes) {
      const mergedAttribute = this.mergeBufferAttributes(attributes[name]);

      if (!mergedAttribute) return null

      mergedGeometry.addAttribute(name, mergedAttribute);
    }

    // merge morph attributes

    for (var name in morphAttributes) {
      const numMorphTargets = morphAttributes[name][0].length;

      if (numMorphTargets === 0) break

      mergedGeometry.morphAttributes = mergedGeometry.morphAttributes || {};
      mergedGeometry.morphAttributes[name] = [];

      for (var i = 0; i < numMorphTargets; ++i) {
        const morphAttributesToMerge = [];

        for (var j = 0; j < morphAttributes[name].length; ++j) {
          morphAttributesToMerge.push(morphAttributes[name][j][i]);
        }

        const mergedMorphAttribute = this.mergeBufferAttributes(morphAttributesToMerge);

        if (!mergedMorphAttribute) return null

        mergedGeometry.morphAttributes[name].push(mergedMorphAttribute);
      }
    }

    return mergedGeometry
  },

  /**
   * @param {Array<THREE.BufferAttribute>} attributes
   * @return {THREE.BufferAttribute}
   */
  mergeBufferAttributes(attributes) {
    let TypedArray;
    let itemSize;
    let normalized;
    let arrayLength = 0;

    for (var i = 0; i < attributes.length; ++i) {
      const attribute = attributes[i];

      if (attribute.isInterleavedBufferAttribute) return null

      if (TypedArray === undefined) TypedArray = attribute.array.constructor;
      if (TypedArray !== attribute.array.constructor) return null

      if (itemSize === undefined) itemSize = attribute.itemSize;
      if (itemSize !== attribute.itemSize) return null

      if (normalized === undefined) normalized = attribute.normalized;
      if (normalized !== attribute.normalized) return null

      arrayLength += attribute.array.length;
    }

    const array = new TypedArray(arrayLength);
    let offset = 0;

    for (var i = 0; i < attributes.length; ++i) {
      array.set(attributes[i].array, offset);

      offset += attributes[i].array.length;
    }

    return new BufferAttribute(array, itemSize, normalized)
  },

};

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
   * @param {Number} options.color - the color of the polyline.
   * If provided, the whole neurone will be of the given color, if not provided,
   * the axon will be green, the basal dendrite will be red and the apical dendrite will be green
   */
  constructor(morpho, options) {
    super(morpho, options);

    this._sectionTubeMaterials = {
      axon: new MeshPhongMaterial({ color: this._sectionColors.axon }),
      basal_dendrite: new MeshPhongMaterial({ color: this._sectionColors.basal_dendrite }),
      apical_dendrite: new MeshPhongMaterial({ color: this._sectionColors.apical_dendrite }),
    };

    const sections = this._morpho.getArrayOfSections();

    // creating a polyline for each section
    for (let i = 0; i < sections.length; i += 1) {
      const section = this._buildSection(sections[i]);
      if (section) this.add(section);
    }

    // adding the soma, but sometimes, there is no soma data...
    const somaData = this._morpho.getSoma();
    if (somaData) {
      const somaShape = this._buildSoma(options);
      this.add(somaShape);
    }

    // this is because the Allen ref is not oriented the same way as WebGL
    this.rotateX(Math.PI);
    this.rotateY(Math.PI);

    // compute the bounding box, useful for further camera targeting
    this.box = new Box3().setFromObject(this);
  }


  /**
   * @private
   * Builds a single section from a raw segment description and returns it.
   * A section is usually composed of multiple segments
   * @param {Section} sectionDescription - sub part of the morpho raw object thar deals with a single section
   * @return {THREE.Line} the constructed polyline
   */
  _buildSection(section) {
    const material = this._sectionTubeMaterials[section.getTypename()];
    const sectionPoints = section.getPoints();
    const sectionRadius = section.getRadiuses();
    const startIndex = section.getParent() ? 0 : 1;

    if ((sectionPoints.length - startIndex) < 2) return null

    const arrayOfGeom = [];

    for (let i = startIndex; i < sectionPoints.length - 1; i += 1) {
      const cyl = Tools.makeCylinder(
        new Vector3( // vStart
          sectionPoints[i][0],
          sectionPoints[i][1],
          sectionPoints[i][2],
        ),
        new Vector3( // vEnd
          sectionPoints[i + 1][0],
          sectionPoints[i + 1][1],
          sectionPoints[i + 1][2],
        ),
        sectionRadius[i], // rStart
        sectionRadius[i + 1], // rEnd
        false, // openEnd
      );
      arrayOfGeom.push(cyl);
    }

    // merging the buffer geometries to make things faster
    const sectionGeom = BufferGeometryUtils.mergeBufferGeometries(arrayOfGeom);
    const sectionMesh = new Mesh(sectionGeom, material);

    // adding some metadata as it can be useful for raycasting
    sectionMesh.name = section.getId();
    sectionMesh.userData.sectionId = section.getId();
    sectionMesh.userData.typevalue = section.getTypevalue();
    sectionMesh.userData.typename = section.getTypename();

    return sectionMesh
  }
}

/**
* The MorphoViewer class is the entry point object of the MorphoViewer project
* and is the only object the user should be dealing with.
*/
class MorphoViewer {
  constructor(divObj = null) {
    if (!divObj) {
      console.error('MorphoViewer needs a div object to display WebGL context.');
      return
    }

    this._threeContext = new ThreeContext(divObj);
  }


  /**
   * Add a morphology to the collection so that it displays.
   * @param {Object|morphologycorejs.Morphology} morphoObj - describes the morphology of a neuron.
   * This data comes straight from the JSON file or it can also be a Morphology object from `morphologycorejs`
   * @param {object} options - the optional values
   * @param {String} options.name - The name to give to this morphology. Will be used as an identifier for several operations
   * @param {Boolean} options.asPolyline - if true: shows a polyline view. false: shows a tubular view (default: true)
   * @param {Boolean} options.focusOn - if true, the camera will focus on this added morphology. If false, the camera will not change
   * @param {Number} options.color - the color of the polyline.
   * If provided, the whole neurone will be of the given color, if not provided,
   * the axon will be green, the basal dendrite will be red and the apical dendrite will be green
   * @param {String} options.somaMode - "default" to display only the soma data or "fromOrphanSections" to build a soma using the orphan sections
   * @param {Function} options.onDone - callback when the morphology is displayed. Called with the name (given or generated) of the morphology
   * @param {Number} options.distance - the distance between the camera and the soma. Only relevant if `onFocus` is `true`
   */
  addMorphology(morphoObj, options) {
    // create a morphology object from the raw object
    let morphology = null;

    // creates an auto name if none is giver
    options.name = Tools.getOption(options, 'name', `morpho_${Math.round(Math.random() * 1000000).toString()}`);

    if (morphoObj instanceof morphologycorejs.Morphology) {
      morphology = morphoObj;
    } else {
      morphology = new morphologycorejs.Morphology();
      morphology.buildFromRawMorphology(morphoObj);
    }

    morphology.setId(options.name);

    const asPolyline = Tools.getOption(options, 'asPolyline', true);

    if (asPolyline) {
      const morphoPolyLine = new MorphologyPolyline(morphology, options);
      this._threeContext.addMorphology(morphoPolyLine, options);
    } else {
      const morpho = new MorphologyPolycylinder(morphology, options);
      this._threeContext.addMorphology(morpho, options);
    }
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
    this._threeContext.addStlToMeshCollection(url, options);
  }


  /**
   * Kill all to save up memory, stop the annimation, removes events, delete the canvas
   */
  destroy() {
    this._threeContext.destroy();
  }


  /**
   * Get the field of view angle of the camera, in degrees
   * @return {Number}
   */
  getCameraFieldOfView() {
    return this._threeContext.getCameraFieldOfView()
  }


  /**
   * Define the camera field of view, in degrees
   * @param {Number} fov - the fov
   */
  setCameraFieldOfView(fov) {
    this._threeContext.setCameraFieldOfView(fov);
  }


  /**
   * Make the camera look at the soma of a morphology (or the center of it's bounding box
   * if the neuron does not have soma data)
   * @param {String} name - the name of the neuron to focus on
   * @param {Number} distance - distance from the soma center (in world space, most likely microns)
   */
  focusOnMorphology(name, distance) {
    this._threeContext.focusOnMorphology(name, distance);
  }


  /**
   * Make the camera focus on the given mesh
   * @param {String} name - name of the mesh
   */
  focusOnMesh(name) {
    this._threeContext.focusOnMesh(name);
  }


  /**
   * Define a callback associated with clicking on a section. The callback function
   * is called with the `morphologycorejs.Section` instance as arguments (or `undefined`)
   */
  onRaycast(cb) {
    this._threeContext.on('onRaycast', cb);
  }


  /**
   * Take a screenshot of the webgl context and dowload the png image
   * @param {String} filename - name under which we want to dowload this file (optional)
   */
  takeScreenshot(filename = 'capture.png') {
    const imageData = this._threeContext.getSnapshotData();
    Tools.triggerDownload(imageData, filename);
  }


  /**
   * Adds a OBJ mesh to the scene
   * @param {String} objStr - the string from the OBJ file
   * @param {Object} options - the options object
   * @param {String} options.name - optional name of this mesh (useful for further operations such as centering the view)
   * @param {Boolean} options.focusOn - if true, the camera will focus on this added mesh. If false, the camera will not change
   * @param {Number} options.opacity - the opacity of the mesh
   * @param {Number} options.color - the color of the mesh
   * @param {Number} options.wireframe - only the wireframe will display if true. If false, the regular mesh will show
   * @param {Number} options.wireframe - only the wireframe will display if true. If false, the regular mesh will show
   * @param {Function} options.onDone - callback to be called when the mesh is added. Called with the name of the mesh in argument
   */
  addObjToMeshCollection (objStr, options) {
    this._threeContext.addObjToMeshCollection(objStr, options);
  }


  /**
   * Show the given mesh from the colelction
   * @param {String} name - Name of the mesh
   */
  showMesh (name) {
    this._threeContext.showMesh(name);
  }


  /**
   * Hide the given mesh from the colelction
   * @param {String} name - Name of the mesh
   */
  hideMesh (name) {
    this._threeContext.hideMesh(name);
  }



}

var main = ({
  MorphoViewer,
})

export default main;
//# sourceMappingURL=morphoviewer.js.map
