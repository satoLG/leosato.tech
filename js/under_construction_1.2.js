import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

import { loadModel, addText, createLights } from './utils.js';

const textMeshes = [];
const animationMixers = [];

const clock = new THREE.Clock();

// Scene setup
const container = document.getElementById( 'container' );

// Renderer
const renderer = new THREE.WebGLRenderer( { 
    antialias: true, 
    alpha: true,
    powerPreference: 'high-performance', 
} );
renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.shadowMap.enabled = true;

container.appendChild( renderer.domElement );

// Environment map
const pmremGenerator = new THREE.PMREMGenerator( renderer );

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color('#1d374d');
scene.environment = pmremGenerator.fromScene( new RoomEnvironment(), 0.04 ).texture;

// Camera and controls
window.camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 1, 2000 );
window.camera.position.set( 1, 50, 50 );

window.controls = new OrbitControls( window.camera, renderer.domElement );
window.controls.target.set( 0, 0.5, 0 );
window.controls.update();
window.controls.enablePan = false;
window.controls.enableDamping = true;
window.controls.maxPolarAngle = Math.PI / 2;
window.controls.minPolarAngle = Math.PI / 3;
window.controls.minAzimuthAngle = - Math.PI / 4; // radians
window.controls.maxAzimuthAngle = Math.PI / 4; // radians
window.controls.maxDistance = 100;
window.controls.minDistance = 50;
window.controls.maxZoom = 3;
window.controls.minZoom = 0.5;
window.controls.rotateSpeed = 0.5;

// Environment light setup
createLights(scene)

// Street lamp light setup
const bulbGeometry = new THREE.SphereGeometry( 0.002, 0.002, 0.002 );
const bulbLight = new THREE.PointLight( new THREE.Color( '0x332e2e' ), 1, 100, 2 );

const bulbMat = new THREE.MeshStandardMaterial( {
    emissive: new THREE.Color( 'white' ),
    emissiveIntensity: 150,
    color: new THREE.Color( 'white' )
} );
bulbLight.add( new THREE.Mesh( bulbGeometry, bulbMat ) );
// set bulbLight position to the street_lamp position
bulbLight.position.set( 0, 25, -10 );
bulbLight.intensity = 2;
bulbLight.distance = 80;
bulbLight.castShadow = true;
bulbLight.shadowMapVisible = true;
bulbLight.shadow.mapSize.width = 260;
bulbLight.shadow.mapSize.height = 260;
bulbLight.shadow.camera.far = 5;
scene.add( bulbLight );

// Ground plane setup 
const groundGeometry = new THREE.CircleGeometry(100, 100);
groundGeometry.wireframe = true;
const groundMaterial = new THREE.MeshPhongMaterial({color: new THREE.Color( 'gray' ), side: THREE.DoubleSide});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
scene.add(ground);
ground.position.set(0, 0, 0);
ground.rotation.set(-Math.PI/2, 0, 0);
ground.receiveShadow = true;

// Setup model loader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath( 'jsm/' );

const loader = new GLTFLoader();
loader.setDRACOLoader( dracoLoader );

// Loading models
loadModel( animationMixers, renderer, scene, loader, 'models/road_cone.glb', [15,0,15], [12,12,12] );
loadModel( animationMixers, renderer, scene, loader, 'models/road_cone.glb', [-15,0,15], [12,12,12] );
loadModel( animationMixers, renderer, scene, loader, 'models/road_cone.glb', [-15,0,-15], [12,12,12] );
loadModel( animationMixers, renderer, scene, loader, 'models/road_cone.glb', [15,0,-15], [12,12,12] );

loadModel( animationMixers, renderer, scene, loader, 'models/road_cone.glb', [-20.6,0,10.6], [12,12,12] );
loadModel( animationMixers, renderer, scene, loader, 'models/road_cone.glb', [-20.6,0,-10.6], [12,12,12] );
loadModel( animationMixers, renderer, scene, loader, 'models/road_cone.glb', [20.6,0,-10.6], [12,12,12] );
loadModel( animationMixers, renderer, scene, loader, 'models/road_cone.glb', [20.6,0,10.6], [12,12,12] );

loadModel( animationMixers, renderer, scene, loader, 'models/road_cone.glb', [0,0,21.2], [12,12,12] );
loadModel( animationMixers, renderer, scene, loader, 'models/road_cone.glb', [-21.2,0,0], [12,12,12] );
loadModel( animationMixers, renderer, scene, loader, 'models/road_cone.glb', [0,0,-21.2], [12,12,12] );
loadModel( animationMixers, renderer, scene, loader, 'models/road_cone.glb', [21.2,0,0], [12,12,12] );

loadModel( animationMixers, renderer, scene, loader, 'models/road_cone.glb', [10.6,0,20.6], [12,12,12] );
loadModel( animationMixers, renderer, scene, loader, 'models/road_cone.glb', [-10.6,0,20.6], [12,12,12] );
loadModel( animationMixers, renderer, scene, loader, 'models/road_cone.glb', [-10.6,0,-20.6], [12,12,12] );
loadModel( animationMixers, renderer, scene, loader, 'models/road_cone.glb', [10.6,0,-20.6], [12,12,12] );
// the street_lamp is upside down, so we need to rotate it
loadModel( animationMixers, renderer, scene, loader, 'models/street_lamp.glb', [10,0,-10], [6,4,6], [-Math.PI,Math.PI/2,0], true );

loadModel( animationMixers, renderer, scene, loader, 'models/office_worker.glb', [-5,-0.5,-10], [8,8,8] );

// Adding text
const fontPath = 'https://threejsfundamentals.org/threejs/resources/threejs/fonts/helvetiker_regular.typeface.json';
addText(
    textMeshes,
    scene,
    `
    under
    construction
    `, 
    fontPath, [-15, 10, 0], 2.5, 0.5, 'orange', 'black'
);

// Resize event
window.onresize = function () {

    window.camera.aspect = window.innerWidth / window.innerHeight;
    window.camera.updateProjectionMatrix();
    renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
    renderer.setSize( window.innerWidth, window.innerHeight );

};

// Animation loop
function animate() {

    const elapsedTime = clock.getElapsedTime();

    if (textMeshes.length > 0){
        textMeshes.forEach(textMesh => {
            textMesh.position.y = Math.sin( elapsedTime ) * 2 + 10;
        });
    }

    if (animationMixers.length > 0){
        animationMixers.forEach(mixer => {
            mixer.update( (1/60)*1.5 );
        });
    }

    window.controls.update();
    renderer.render( scene, window.camera );
    window.requestAnimationFrame( animate );

}

animate();