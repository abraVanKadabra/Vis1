/**
 * Vis 1 Task 1 Framework
 * Copyright (C) TU Wien
 *   Institute of Visual Computing and Human-Centered Technology
 *   Research Unit of Computer Graphics
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are not permitted.
 *
 * Main script for Vis1 exercise. Loads the volume, initializes the scene, and contains the paint function.
 *
 * @author Manuela Waldner
 * @author Laura Luidolt
 * @author Diana Schalko
 */
let renderer, camera, scene, orbitCamera;
let canvasWidth, canvasHeight = 0;
let container = null;
let volume = null;
let fileInput = null;
let testShader = null;

let volumeCubeShader = null;
let rayCastingShader = null;

let bufferTextureBack = null;
let bufferTextureFront = null;

let sceneBackFBO = null;
let sceneFrontFBO = null;

/**
 * Load all data and initialize UI here.
 */
function init() {
    // volume viewer
    container = document.getElementById("viewContainer");
    canvasWidth = window.innerWidth * 0.7;
    canvasHeight = window.innerHeight * 0.7;

    // WebGL renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize( canvasWidth, canvasHeight );
    container.appendChild( renderer.domElement );

    // read and parse volume file
    fileInput = document.getElementById("upload");
    fileInput.addEventListener('change', readFile);

    // dummy shader gets a color as input
    testShader = new TestShader([255.0, 255.0, 0.0]);
}

/**
 * Handles the file reader. No need to change anything here.
 */
function readFile(){
    let reader = new FileReader();
    reader.onloadend = function () {
        console.log("data loaded: ");

        let data = new Uint16Array(reader.result);
        volume = new Volume(data);

        resetVis();
    };
    reader.readAsArrayBuffer(fileInput.files[0]);
}

/**
 * Construct the THREE.js scene and update histogram when a new volume is loaded by the user.
 *
 * Currently renders the bounding box of the volume.
 */
async function resetVis(){
    // create new empty scene and perspective camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 75, canvasWidth / canvasHeight, 0.1, 1000 );


    const volumeCube = new THREE.BoxGeometry(volume.width, volume.height, volume.depth);
    /*
    // dummy scene: we render a box and attach our color test shader as material
    const testCube = new THREE.BoxGeometry(volume.width, volume.height, volume.depth);
    const testMaterial = testShader.material;
    await testShader.load(); // this function needs to be called explicitly, and only works within an async function!
    const testMesh = new THREE.Mesh(testCube, testMaterial);
    scene.add(testMesh);
     */

    //back
    const volumeCubeShaderBack = new VolumeCubeShader(false);
    const materialBack = volumeCubeShaderBack.material;
    await volumeCubeShaderBack.load();
    const meshBack = new THREE.Mesh(volumeCube, materialBack);
    //fbo
    sceneBackFBO = new THREE.Scene().add(meshBack);
    bufferTextureBack = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter});



    //front
    const volumeCubeShaderFront = new VolumeCubeShader(true);
    await volumeCubeShaderFront.load();
    const materialFront = volumeCubeShaderFront.material;
    const meshFront = new THREE.Mesh(volumeCube, materialFront);
    //fbo
    sceneFrontFBO = new THREE.Scene().add(meshFront);
    bufferTextureFront = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter});



    //data texture
    const dataTexture = new THREE.Data3DTexture(volume.voxels, volume.width, volume.height, volume.depth);
    dataTexture.type = THREE.FloatType;
    dataTexture.format = THREE.RedFormat;
    dataTexture.needsUpdate = true;



    // pass textures to ray casting shader and render the result on a plane
    const plane = new THREE.PlaneGeometry(2, 2);
    rayCastingShader = new RaycastingShader(bufferTextureFront.texture, bufferTextureBack.texture, dataTexture);
    const rayResultMaterial = rayCastingShader.material;
    await rayCastingShader.load();
    let volumeResult = new THREE.Mesh(plane, rayResultMaterial);
    scene.add(volumeResult);






   // scene.add(meshBack)

    // our camera orbits around an object centered at (0,0,0)
    orbitCamera = new OrbitCamera(camera, new THREE.Vector3(0,0,0), 2*volume.max, renderer.domElement);

    // init paint loop
    requestAnimationFrame(paint);
}

/**
 * Render the scene and update all necessary shader information.
 */
function paint(){
    if (volume) {
        orbitCamera.update();

        renderFBO(sceneBackFBO, bufferTextureBack)
        renderFBO(sceneFrontFBO, bufferTextureFront)
        renderer.render(scene, camera);
    }
}

function renderFBO(scene, renderTarget) {
    renderer.setRenderTarget(renderTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
}
