import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

let bulbLight, bulbMat;

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

window.camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 1, 2000 );
window.camera.position.set( 1, 50, 50 );

window.controls = new OrbitControls( window.camera, renderer.domElement );
window.controls.target.set( 0, 0.5, 0 );
window.controls.update();
window.controls.enablePan = false;
window.controls.enableDamping = true;
window.controls.maxPolarAngle = Math.PI / 2;
window.controls.minPolarAngle = Math.PI / 3;
window.controls.maxDistance = 100;
window.controls.minDistance = 50;
window.controls.maxZoom = 3;
window.controls.minZoom = 1;
window.controls.rotateSpeed = 0.5;

container.appendChild( renderer.domElement );

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
    emissiveIntensity: 150,
    color: new THREE.Color( 'orange' )
} );
bulbLight.add( new THREE.Mesh( bulbGeometry, bulbMat ) );
bulbLight.position.set( 0,30,0 );
bulbLight.intensity = 3;
bulbLight.distance = 120;
bulbLight.castShadow = true;
bulbLight.shadowMapVisible = true;
scene.add( bulbLight );

// we add the shadow plane automatically 
const groundGeometry = new THREE.CircleGeometry(100, 100);
const groundMaterial = new THREE.MeshPhongMaterial({color: new THREE.Color( 'lightgreen' ), side: THREE.DoubleSide});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
scene.add(ground);
ground.position.set(0, 0, 0);
ground.rotation.set(-Math.PI/2, 0, 0);
ground.receiveShadow = true;

// scene.fog = new THREE.Fog( 0xcccccc, 100, 1000);

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath( 'jsm/' );

const loader = new GLTFLoader();
loader.setDRACOLoader( dracoLoader );

function load_model( loader, model_path, position, scale ) {
    loader.load( model_path, function ( gltf ) {

        const model = gltf.scene;

        model.traverse( function ( child )
        {
            if ( child.isMesh ) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        model.position.set( position[0], position[1], position[2] );
        model.scale.set( scale[0], scale[1], scale[2] );
        scene.add( model );

        renderer.shadowMap.enabled = true;
        renderer.setAnimationLoop( animate );

    }, undefined, function ( e ) {

        console.error( e );

    } );
}

load_model( loader, 'models/road_cone.glb', [0,0,0], [30,30,30] );
load_model( loader, 'models/road_cone.glb', [-10,0,-15], [30,30,30] );
load_model( loader, 'models/road_cone.glb', [20,0,-10], [30,30,30] );
load_model( loader, 'models/road_cone.glb', [10,0,25], [30,30,30] );
load_model( loader, 'models/road_cone.glb', [-20,0,15], [30,30,30] );


const textLoader = new FontLoader();

textLoader.load('https://threejsfundamentals.org/threejs/resources/threejs/fonts/helvetiker_regular.typeface.json', function (font) {
   // TextGeometry(String, Object)
   const textObj = new TextGeometry(
    `
    tamo construindo, 
    tamo construindo
    - Sato, 2025
    `, {
      font: font,
      size: 2,
      height: 1,
      curveSegments: 12,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelOffset: 0,
      bevelSegments: 1
   });
   const material = new THREE.MeshBasicMaterial({color: 'red'});
   const mesh = new THREE.Mesh(textObj, material);
   mesh.position.set(10, 25, 0);
   mesh.castShadow = true;
    mesh.receiveShadow = true;
   scene.add(mesh);
   console.log('foo');
});

window.onresize = function () {

    window.camera.aspect = window.innerWidth / window.innerHeight;
    window.camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );

};

function animate() {

    window.controls.update();
    renderer.render( scene, window.camera );

}