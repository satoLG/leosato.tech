import * as THREE from 'three';

import Stats from 'three/addons/libs/stats.module.js';

import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

let camera, controls, bulbLight, bulbMat;
let sceneCss, rendererCss;

function Element( id, x, y, z, ry, html ) {

    const div = document.createElement( 'div' );
    div.style.width = '100px';
    div.style.height = '100px';
    div.style.backgroundColor = '#f0f8fff0';
    div.style.opacity = '1';

    let iframe = document.createElement('iframe');

    iframe.style.width ='100px';
    iframe.style.height = '100px';
    // iframe.style.padding = '32px';
    iframe.style.boxSizing = 'border-box';
    iframe.style.opacity = '1';
    // iframe.className = 'jitter';
    iframe.id = 'computer-screen';
    iframe.frameBorder = '0';
    iframe.title = 'SatoLaptop';

    iframe.src = 'data:text/html;charset=utf-8,' + encodeURI(html);

    // function bubbleIframeMouseMove(iframe){
    //     // Save any previous onmousemove handler
    //     var existingOnMouseMove = iframe.contentWindow.onmousemove;
    
    //     // Attach a new onmousemove listener
    //     iframe.contentWindow.onmousemove = function(e){
    //         // Fire any existing onmousemove listener 
    //         if(existingOnMouseMove) existingOnMouseMove(e);
    
    //         // Create a new event for the this window
    //         var evt = document.createEvent("MouseEvents");
    
    //         // We'll need this to offset the mouse move appropriately
    //         var boundingClientRect = iframe.getBoundingClientRect();
    
    //         // Initialize the event, copying exiting event values
    //         // for the most part
    //         evt.initMouseEvent( 
    //             "mousemove", 
    //             true, // bubbles
    //             false, // not cancelable 
    //             window,
    //             e.detail,
    //             e.screenX,
    //             e.screenY, 
    //             e.clientX + boundingClientRect.left, 
    //             e.clientY + boundingClientRect.top, 
    //             e.ctrlKey, 
    //             e.altKey,
    //             e.shiftKey, 
    //             e.metaKey,
    //             e.button, 
    //             null // no related element
    //         );
    //         console.log('evt', evt)
    //         // Dispatch the mousemove event on the iframe element
    //         iframe.dispatchEvent(evt);
    //     };
    // }

    // // Bubble mouse move events to the main application, so we can affect the camera
    // iframe.onload = () => {
    //     // Run it through the function to setup bubbling
    //     bubbleIframeMouseMove(iframe);
    // };

    div.appendChild(iframe);

    const object = new CSS3DObject( div );
    object.position.set( x, y, z );
    object.rotation.y = ry;

    return object;

}

const containerCss = document.getElementById( 'css' );

sceneCss = new THREE.Scene();

rendererCss = new CSS3DRenderer();
rendererCss.setSize( window.innerWidth, window.innerHeight );


const group = new THREE.Group();
group.add( new Element( 'SJOz3qjfQXU', 1, 1, 1, 0, `
<style>
    article {
        padding: 10px;
        font-family: monospace;
    }    
</style>
<article class="main-page-content" lang="pt-BR"><h1>WebGL</h1>
    <div class="section-content"><p>WebGL (Web Graphics Library) é uma API do JavaScript para renderizar gráficos 3D e
        2D dentro de um navegador web compatível sem o uso de plug-ins. O WebGL faz isso introduzindo uma API que está
        de acordo com o OpenGL ES 2.0 e que pode ser usada em elementos do HTML5 <a href="https://developer.mozilla.org/pt-BR/docs/Web/HTML/Element/canvas" target="_blank" rel="noopener noreferrer"><code>&lt;canvas&gt;</code></a>.</p>
        <p>O suporte para WebGL está presente no <a target="_blank" rel="noopener noreferrer" href="https://developer.mozilla.org/pt-BR/docs/Mozilla/Firefox">Firefox</a>
            4+, <a target="_blank" rel="noopener noreferrer" href="https://www.google.com/chrome/" class="external" target="_blank">Google Chrome</a> 9+, <a
                    href="https://www.opera.com/" class="external" target="_blank">Opera</a> 12+, <a
                    href="https://www.apple.com/safari/" class="external" target="_blank">Safari</a> 5.1+ e <a
                    href="https://windows.microsoft.com/en-us/internet-explorer/browser-ie" class="external"
                    target="_blank">Internet Explorer</a> 11+. No entanto, o dispositivo do usuário também deve ter um
            hardware que suporte esses recursos.</p>
        <p>O elemento <a target="_blank" rel="noopener noreferrer" href="https://developer.mozilla.org/pt-BR/docs/Web/HTML/Element/canvas"><code>&lt;canvas&gt;</code></a> é também usado pelo
            <a target="_blank" rel="noopener noreferrer" href="https://developer.mozilla.org/pt-BR/docs/Web/API/Canvas_API">Canvas 2D</a> para renderizar gráficos 2D em páginas web.</p></div>
</article>
` ) );
group.position.set( 100, 100, -100 );
group.rotation.y = -(Math.PI / 5);
sceneCss.add( group );

// Create GL plane
const materialGL = new THREE.MeshLambertMaterial();
materialGL.side = THREE.DoubleSide;
materialGL.opacity = 0;
materialGL.transparent = true;
// materialGL.alphaMap = 'black';
// NoBlending allows the GL plane to occlude the CSS plane
materialGL.blending = THREE.NoBlending;
console.log('materialGL', materialGL)

const SCREEN_SIZE = { w: 100, h: 100 };
const screenSize = new THREE.Vector2(SCREEN_SIZE.w, SCREEN_SIZE.h);

// Create plane geometry
const geometryGL = new THREE.PlaneGeometry(
    screenSize.width,
    screenSize.height
);

// Create the GL plane mesh
const mesh = new THREE.Mesh(geometryGL, materialGL);

// Copy the position, rotation and scale of the CSS plane to the GL plane
mesh.position.copy(group.position);
mesh.rotation.copy(group.rotation);
mesh.scale.copy(group.scale);



// const clock = new THREE.Clock();
const container = document.getElementById( 'container' );

// const stats = new Stats();
// container.appendChild( stats.dom );

const renderer = new THREE.WebGLRenderer( { 
    antialias: true, 
    alpha: true,
    powerPreference: 'high-performance', 
} );
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );

const pmremGenerator = new THREE.PMREMGenerator( renderer );

const scene = new THREE.Scene();
scene.background = new THREE.Color('#1d374d');
scene.environment = pmremGenerator.fromScene( new RoomEnvironment(), 0.04 ).texture;

camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 1, 12000 );
camera.position.set( 1, 350, 260 );

controls = new OrbitControls( camera, renderer.domElement );
controls.target.set( 0, 0.5, 0 );
controls.update();
controls.enablePan = false;
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2;
controls.minPolarAngle = Math.PI / 3;
controls.maxDistance = 500;
controls.minDistance = 150;
controls.maxZoom = 10;
controls.minZoom = 3;
controls.rotateSpeed = 0.5;

// Block iframe events when dragging camera

const blocker = document.getElementById( 'blocker' );
blocker.style.display = 'none';

controls.addEventListener( 'start', function () {

    blocker.style.display = '';

} );
controls.addEventListener( 'end', function () {

    blocker.style.display = 'none';

} );

// Add to gl scene
scene.add(mesh);

// renderer.domElement.style.position = 'absolute';
// renderer.domElement.style.zIndex = '1';
// renderer.domElement.style.top = '0px';

// rendererCss.domElement.style.position = 'absolute';
// rendererCss.domElement.style.zindex = '2';
// rendererCss.domElement.style.top = '0px';

container.appendChild( renderer.domElement );
containerCss.appendChild( rendererCss.domElement );

function createLights() {
    const light1 = new THREE.DirectionalLight( new THREE.Color( 'white' ), 0.2 );
    light1.position.set( 1, 500, 1 );

    light1.castShadow = true;  // Enable shadow casting for the light

    // Configure the shadow properties (optional, but can give better shadow quality)
    light1.shadow.mapSize.width = 512;  // Default is 512
    light1.shadow.mapSize.height = 512; // Default is 512
    light1.shadow.camera.near = 0.5;    // Default is 0.5
    light1.shadow.camera.far = 50;      // Default is 500

    scene.add( light1 );
    // scene.add( new THREE.CameraHelper( light1.shadow.camera ) );
}

createLights()

const bulbGeometry = new THREE.SphereGeometry( 0.02, 0.020, 0.02 );
bulbLight = new THREE.PointLight( new THREE.Color( 'orange' ), 1, 100, 2 );

bulbMat = new THREE.MeshStandardMaterial( {
    emissive: new THREE.Color( 'orange' ),
    emissiveIntensity: 1500,
    color: new THREE.Color( 'orange' )
} );
bulbLight.add( new THREE.Mesh( bulbGeometry, bulbMat ) );
bulbLight.position.set( 1,25,-5 );
bulbLight.intensity = 3;
bulbLight.distance = 250.0;
bulbLight.castShadow = true;
bulbLight.shadowMapVisible = true;
scene.add( bulbLight );

// we add the shadow plane automatically 
const groundGeometry = new THREE.CircleGeometry(1500, 1500);
const groundMaterial = new THREE.MeshPhongMaterial({color: new THREE.Color( 'lightgreen' ), side: THREE.DoubleSide});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
scene.add(ground);
ground.position.set(0, -0, 0);
ground.rotation.set(-Math.PI/2, 0, 0);
ground.receiveShadow = true;

// scene.fog = new THREE.Fog( 0xcccccc, 100, 1000);

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath( 'jsm/' );

const manager = new THREE.LoadingManager();
manager.onStart = function ( url, itemsLoaded, itemsTotal ) {
	console.log( 'Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
};

manager.onLoad = function ( ) {
	console.log( 'Loading complete!');
};

manager.onProgress = function ( url, itemsLoaded, itemsTotal ) {
	console.log( 'Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
};

manager.onError = function ( url ) {
	console.log( 'There was an error loading ' + url );
};

const loader = new GLTFLoader(manager);
loader.setDRACOLoader( dracoLoader );

loader.load( 'models/fogueira.glb', function ( gltf ) {

    const model = gltf.scene;

    model.traverse( function ( child )
    {
        console.log(child)
        if ( child.isMesh ) {
            child.emissive = new THREE.Color( 'orange' );
            child.emissiveIntensity = 100;
        }
        // child.castShadow = true;
        // child.receiveShadow = true;
    });

    model.position.set( 1, 1, 1 );
    model.scale.set( 10, 10, 10 );
    console.log(model)
    scene.add( model );

    // mixer = new THREE.AnimationMixer( model );
    // mixer.clipAction( gltf.animations[ 0 ] ).play();
    renderer.shadowMap.enabled = true;
    renderer.setAnimationLoop( animate );


}, undefined, function ( e ) {

    console.error( e );

} );

loader.load( 'models/tent.glb', function ( gltf ) {

    const model = gltf.scene;
    model.traverse( function ( child )
    {
        console.log(child)
        // child.castShadow = true;
        // child.receiveShadow = true;
    });

    model.position.set( -100, 1, -60 );
    // model.scale.set( 0.01, 0.01, 0.01 );
    console.log(model)
    model.rotation.y = Math.PI / 3;
    scene.add( model );

    // mixer = new THREE.AnimationMixer( model );
    // mixer.clipAction( gltf.animations[ 0 ] ).play();
    renderer.shadowMap.enabled = true;
    renderer.setAnimationLoop( animate );


}, undefined, function ( e ) {

    console.error( e );

} );

loader.load( 'models/retro_computer.glb', function ( gltf ) {

    const model = gltf.scene;
    model.traverse( function ( child )
    {
        console.log(child)
        // child.castShadow = true;
        // child.receiveShadow = true;
    });

    model.position.set( 100, 0, -100 );
    // model.scale.set( 0.01, 0.01, 0.01 );
    console.log(model)
    model.rotation.y = -(Math.PI / 5);
    scene.add( model );

    // group.position = model.position;
    // group.rotation = model.rotation;

    // mixer = new THREE.AnimationMixer( model );
    // mixer.clipAction( gltf.animations[ 0 ] ).play();
    renderer.shadowMap.enabled = true;
    renderer.setAnimationLoop( animate );


}, undefined, function ( e ) {

    console.error( e );

} );

// loader.load( 'models/smartphone.glb', function ( gltf ) {

//     const model = gltf.scene;
//     model.traverse( function ( child )
//     {
//         console.log(child)
//         child.castShadow = true;
//         child.receiveShadow = true;
//     });

//     model.position.set( 1, 11, -70 );
//     model.scale.set( 3, 3, 3 );
//     console.log(model)
//     model.rotation.x = -(Math.PI / 2);
//     // model.rotation.z = Math.PI / 2;
//     scene.add( model );

//     renderer.shadowMap.enabled = true;
//     renderer.setAnimationLoop( animate );


// }, undefined, function ( e ) {

//     console.error( e );

// } );

// loader.load( 'models/nintendo_game_boy.glb', function ( gltf ) {

//     const model = gltf.scene;
//     model.traverse( function ( child )
//     {
//         console.log(child)
//         child.castShadow = true;
//         child.receiveShadow = true;
//     });

//     model.position.set( 15, 11, -70 );
//     model.scale.set( 100, 100, 100 );
//     console.log(model)
//     model.rotation.x = -(Math.PI / 2);
//     // model.rotation.z = Math.PI / 2;
//     scene.add( model );

//     renderer.shadowMap.enabled = true;
//     renderer.setAnimationLoop( animate );


// }, undefined, function ( e ) {

//     console.error( e );

// } );

loader.load( 'models/trees.glb', function ( gltf ) {

    const model = gltf.scene;
    model.traverse( function ( child )
    {
        console.log(child)
        child.castShadow = true;
        child.receiveShadow = true;
    });

    model.position.set( -500, 1, -460 );
    model.scale.set( 15, 15, 15 );
    console.log(model)
    scene.add( model );

    renderer.shadowMap.enabled = true;
    renderer.setAnimationLoop( animate );


}, undefined, function ( e ) {

    console.error( e );

} );

loader.load( 'models/trees.glb', function ( gltf ) {

    const model = gltf.scene;
    model.traverse( function ( child )
    {
        console.log(child)
        child.castShadow = true;
        child.receiveShadow = true;
    });

    model.position.set( 500, 1, -460 );
    model.scale.set( 15, 15, 15 );
    console.log(model)
    scene.add( model );

    renderer.shadowMap.enabled = true;
    renderer.setAnimationLoop( animate );


}, undefined, function ( e ) {

    console.error( e );

} );

window.onresize = function () {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
    rendererCss.setSize( window.innerWidth, window.innerHeight );

};


function animate() {
    controls.update();
    renderer.render( scene, camera );
    rendererCss.render( sceneCss, camera );
}