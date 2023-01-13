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
let histoContainer = null;

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
    canvasWidth = window.innerWidth * 0.5;
    canvasHeight = window.innerHeight * 0.7;

    //histogram


    // WebGL renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(canvasWidth, canvasHeight);
    container.appendChild(renderer.domElement);

    // read and parse volume file
    fileInput = document.getElementById("upload");
    fileInput.addEventListener('change', readFile);
}

/**
 * Handles the file reader. No need to change anything here.
 */
function readFile() {
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
async function resetVis() {

    drawHistogram(volume.voxels);

    // create new empty scene and perspective camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, canvasWidth / canvasHeight, 0.1, 1000);

    const volumeCube = new THREE.BoxGeometry(volume.width, volume.height, volume.depth);

    //back
    const volumeCubeShaderBack = new VolumeCubeShader(false);
    const materialBack = volumeCubeShaderBack.material;
    await volumeCubeShaderBack.load();
    const meshBack = new THREE.Mesh(volumeCube, materialBack);
    sceneBackFBO = new THREE.Scene().add(meshBack);
    bufferTextureBack = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.NearestFilter
    });

    //front
    const volumeCubeShaderFront = new VolumeCubeShader(true);
    await volumeCubeShaderFront.load();
    const materialFront = volumeCubeShaderFront.material;
    const meshFront = new THREE.Mesh(volumeCube, materialFront);
    sceneFrontFBO = new THREE.Scene().add(meshFront);
    bufferTextureFront = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.NearestFilter
    });

    //data texture
    const dataTexture = new THREE.Data3DTexture(volume.voxels, volume.width, volume.height, volume.depth);
    dataTexture.type = THREE.FloatType;
    dataTexture.format = THREE.RedFormat;
    dataTexture.needsUpdate = true;
    rayCastingShader = new RaycastingShader("rayCast_firstHit_frag", bufferTextureFront.texture, bufferTextureBack.texture, dataTexture);

    // pass textures to ray casting shader and render the result on a plane
    const plane = new THREE.PlaneGeometry(2, 2);
    const rayResultMaterial = rayCastingShader.material;
    await rayCastingShader.load();
    const volumeResult = new THREE.Mesh(plane, rayResultMaterial);
    scene.add(volumeResult);


    // our camera orbits around an object centered at (0,0,0)
    orbitCamera = new OrbitCamera(camera, new THREE.Vector3(0, 0, 0), 2 * volume.max, renderer.domElement);

    // init paint loop
    requestAnimationFrame(paint);
}

/**
 * Render the scene and update all necessary shader information.
 */
function paint() {
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

function drawHistogram(data) {

    histoContainer = document.getElementById("histogramContainer");
    const margin = {top: 10, right: 30, bottom: 30, left: 40};
    const width = 230 - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;
    const svg = d3.select(histoContainer)
        .append("svg")
        .attr("width",  width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`)

    const x = d3.scaleLinear()
        .domain([0.0, 1.0])
        .range([0, width])
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

    const y = d3.scaleLinear()
        .domain([0.0, 1.0])   // d3.hist has to be called before the Y axis obviously
        .range([height, 0]);
    svg.append("g")
        .call(d3.axisLeft(y));
    /*
    const histogram = d3.histogram()
        .value(function(d) { return d.price; })   // I need to give the vector of value
        .domain(x.domain())  // then the domain of the graphic
        .thresholds(x.ticks(70)); // then the numbers of bin

    const bins = histogram(data);
     */


}
