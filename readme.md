# Morphology Viewer
Displays a neuron morphology. This relies on JSON morphology files, such as created by [Morphology Converter](https://github.com/jonathanlurie/morphologyconverter).

Follow the [examples](https://github.com/jonathanlurie/morphoviewer/tree/master/examples) and the [documentation](documentation.md) (also available in [HTML](http://me.jonathanlurie.fr/morphoviewer/doc/))


## Usage
### Create a `MorphoViewer` instance
```javascript
let threedeediv = document.getElementById( 'threedeediv' )
let morphoViewer = new morphoviewer.MorphoViewer(threedeediv)
```
Since `MorphoViewer` needs a `div` to create a WebGL context into, you need to get the reference to one.

### Add a morphology
To add a morphology, you need a morphology object. These can come from different source: straight from a JSON morphology file, or from [this SWC parser](https://www.npmjs.com/package/swcmorphologyparser). For this example, lets assume you have a JSon string from a JSON file.

```javascript
// ... you have loaded the content of a morphology JSON file in 'jsonStr'
let rawMorphoObj = JSON.parse( jsonStr )

// we display a morpho, second param is it's name (null: a autogenarated will do)
// last param is "do we focus the camera on it"
morphoViewer.addMorphology (
  rawMorphoObj,
  options
)
```

The `options` object may have the following properties:
- `name` : String. A name can be given to a morphology to identify it. This is useful especially to later focus on this morpho with `morphoViewer.focusOnMorphology(...)`. If not provided, a name with be generated automatically, of the form `morpho_XXX` where `XXX` is a random integer.
- `focusOn` : Boolean. If `true`, the viewer will focus on the center of the soma of the loaded morphology. For the morphologies without soma, the focus will be done on the center of its bounding box. If `false`, the camera will not move. Default is `false`.
- `distance` : Number. Relevant only if `focusOn` is `true`. Distance between the camera and the soma. Default: 1000 (most likely in microns)
- `asPolyline` : Boolean. If `true`, the morphology's axons and dendrites will be simple polylines with constant thickness of 1px on the screen, no matter the distance from the camera of the zoom - better performance. If `false`, the morphology's dendrites and axons will be displayed as cylinders - looks nicer, but can be very heavy with more than 10 morphologies. Default: `true`
- `color` : Integer. If provided, it's easier to use the hexadecimal form: `0xRRGGBB` , then, all the axons and dendrites are collored the same way. If not provided, the every axons will be blue, basal dendrite will be red and apical dendrite will be pink. Default: not provided
- `somaMode` : String. If `"fromOrphanSections"` then, the soma will be built using the 1st point of the axons and dendrite (this points is the connection to the soma). If it has a different value, only the data from the soma will be used.
- `onDone` : Function. This function is called once the morphology is displayed, with the `name` as argument.


## Add a mesh
For the moment, only STL files are compatible. On the contrary to morphologies, the `URL` of the mesh must be provided.
```javascript
// optional: we load a brain model. Last param is for focusing on it
morphoViewer.addStlToMeshCollection(
  '../data/meshes/mask_smooth_simple.stl',
  options
)
```

The `options` object may have the following properties:
- `name` : String. A name can be given to a mesh to identify it. This is useful especially to later focus on this morpho with `morphoViewer.focusOnMesh(...)`. If not provided, a name with be generated automatically, of the form `mesh_XXX` where `XXX` is a random integer.
- `focusOn` : Boolean. If `true`, the viewer will focus on the center of the mesh and the distance between the camera and the center of the mesh will be three times the radius of the bounding sphere of the mesh (this sort of guaranties we are neither too close nor too far). Default is `false`.
- `color` : Number. If provided, it's easier to use the hexadecimal form: `0xRRGGBB`. Default: `0xDDDDDD`, light grey
- `opacity` : Number. Must in [0, 1], 0 being totally transparent and 1 is totally opaque. Default: `0.15`
- `wireframe` : Boolean. If `true`, the mesh displays as a wireframe. Default: `false`
- `shininess` : Number. The shininess of the mesh `0` is very matter (not shinny at all) and 1000 is super slimy. Default: `300`
- `doubleSide`: Boolean. If `true`, the mesh will be visible from both side (outside and inside). If `false`, the mesh will be visible only from the outside. Default: `false`
- `onDone` : Function. This function is called once the mesh is displayed, with the `name` as argument.

### Other useful methods
[They are all listed on this nicely written documentation](https://github.com/jonathanlurie/morphoviewer/blob/master/documentation.md#morphoviewer)
