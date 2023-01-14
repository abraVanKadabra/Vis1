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
let x = null;
let y = null;
let histogramHeight, histogramWidth = null;
let svg = null;
let margin = null;


let volume = null;
let fileInput = null;
let dataTexture = null;

let volumeCubeShader = null;
let rayCastingShader = null;

let bufferTextureBack = null;
let bufferTextureFront = null;

let sceneBackFBO = null;
let sceneFrontFBO = null;

let resetCalled = false;

let r, g, b = null;

/**
 * Load all data and initialize UI here.
 */
function init() {
    // volume viewer
    container = document.getElementById("viewContainer");
    canvasWidth = window.innerWidth * 0.7;
    canvasHeight = window.innerHeight * 0.7;

    //histogram
    histoContainer = document.getElementById("histogramContainer");
    histogramWidth = 500;
    histogramHeight = 800;
    margin = 50;
    svg = d3.select(histoContainer)
        .append("svg")
        .attr("width", histogramWidth)
        .attr("height", histogramHeight);

    //x axis
    x = d3.scaleLinear()
        .domain([0.0, 1.0])
        .range([margin, histogramWidth - margin]);
    svg
        .append("g")
        .attr("transform", `translate(${0}, ${(histogramHeight / 2) - margin})`)
        .attr("id", "xAxis")
        .call(d3.axisBottom(x));
    svg
        .append("text")
        .style("fill", "white")
        .text("density")
        .attr("x", histogramWidth - (margin * 2))
        .attr("y", histogramHeight / 2 - 10);
    //y axis
    y = d3.scaleLinear()
        .domain([0.0, 1.0])
        .range([histogramHeight / 2 - margin, margin]);
    svg
        .append("g")
        .attr("transform", `translate(${margin},${0})`)
        .attr("id", "yAxis")
        .call(d3.axisLeft(y));
    svg
        .append("text")
        .style("fill", "white")
        .text("intensity")
        .attr("transform", `translate(${10},${margin * 2})rotate(270)`);


    // WebGL renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(canvasWidth, canvasHeight);
    container.appendChild(renderer.domElement);

    // read and parse volume file
    fileInput = document.getElementById("upload");
    fileInput.addEventListener('change', readFile);

    histoContainer.addEventListener('click', setIsoValue)
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

        if (resetCalled) {
            let rect = svg.selectAll("rect");
            rect.remove();
           // const test = histoContainer.removeChild(histoContainer.firstChild)
            //console.log(test);
        }


        resetVis();
    };
    reader.readAsArrayBuffer(fileInput.files[0]);
}

function setIsoValue() {
    const svg = d3.select("svg");
    const g = svg.append("g");


    svg.on("click", function (event) {
        const xy = d3.pointer(event, g.node());
        //console.log(xy);
        if (xy[0] > 50 && xy[0] < 450) {

            const isoValue = (xy[0] - 50) / 400;
            console.log(isoValue);
            //cameraPos = [orbitCamera.camera.position.x,
            updateShader('rayCast_firstHit_frag', isoValue);
            drawCircle(svg, xy[0], xy[1]);
        }
    })


}

/**
 * Construct the THREE.js scene and update histogram when a new volume is loaded by the user.
 *
 * Currently renders the bounding box of the volume.
 */
async function resetVis() {


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
    dataTexture = new THREE.Data3DTexture(volume.voxels, volume.width, volume.height, volume.depth);
    dataTexture.type = THREE.FloatType;
    dataTexture.format = THREE.RedFormat;
    dataTexture.needsUpdate = true;
    rayCastingShader = new RaycastingShader("rayCast_mip_frag", bufferTextureFront.texture, bufferTextureBack.texture, dataTexture, 0.3);

    // pass textures to ray casting shader and render the result on a plane
    const plane = new THREE.PlaneGeometry(2, 2);
    const rayResultMaterial = rayCastingShader.material;
    await rayCastingShader.load();
    const volumeResult = new THREE.Mesh(plane, rayResultMaterial);
    scene.add(volumeResult);


    // our camera orbits around an object centered at (0,0,0)
    orbitCamera = new OrbitCamera(camera, new THREE.Vector3(0, 0, 0), 2 * volume.max, renderer.domElement);


    drawHistogram(volume.voxels);

    // init paint loop
    requestAnimationFrame(paint);

    resetCalled = true;
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

async function updateShader(fragShaderProgram, isoValue) {
    rayCastingShader = new RaycastingShader(fragShaderProgram, bufferTextureFront.texture, bufferTextureBack.texture, dataTexture, isoValue);

    // pass textures to ray casting shader and render the result on a plane
    const plane = new THREE.PlaneGeometry(2, 2);
    const rayResultMaterial = rayCastingShader.material;
    await rayCastingShader.load();
    const volumeResult = new THREE.Mesh(plane, rayResultMaterial);
    scene = new THREE.Scene();
    scene.add(volumeResult);


    // our camera orbits around an object centered at (0,0,0)
    orbitCamera = new OrbitCamera(camera, new THREE.Vector3(0, 0, 0), 2 * volume.max, renderer.domElement);
}

function drawHistogram(data) {

    // histogram
    const histogram = d3
        .histogram()
        .domain(x.domain())
        .thresholds(x.ticks(100));

    const bins = histogram(data);
    console.log(bins);

    const yHist = d3.scalePow()
        .range([histogramHeight / 2, 0])
        .domain([0, d3.max(bins, function (d) {
            return d.length;
        })])
        .exponent(0.2);


    svg.selectAll("rect")
        .data(bins)
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", margin)
        .attr("opacity", 0.5)
        .attr("transform", function (d) {
            return "translate(" + x(d.x0) + "," + 300 + ")";
        })
        .transition()
        .duration(500)
        .attr("width", function (d) {
            if ((x(d.x1) - x(d.x0)) === 0) { //no negative values
                return 0;
            }
            return (x(d.x1) - x(d.x0)) - 1;
        })
        .attr("height", function (d) {
            return (histogramHeight / 2) - yHist(d.length);
        })
        .style("fill", "#69b4a2");
}
