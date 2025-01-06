import * as THREE from 'three';

import Stats from 'three/addons/libs/stats.module.js';

import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

let mixer, camera, controls;

const clock = new THREE.Clock();
const container = document.getElementById( 'container' );

const stats = new Stats();
container.appendChild( stats.dom );

const renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
container.appendChild( renderer.domElement );

const pmremGenerator = new THREE.PMREMGenerator( renderer );

const scene = new THREE.Scene();
scene.background = new THREE.Color( 0xbfe3dd );
scene.environment = pmremGenerator.fromScene( new RoomEnvironment(), 0.04 ).texture;

camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 1, 5000 );
camera.position.set( 100, 150, 100 );

controls = new TrackballControls( camera, renderer.domElement );
controls.rotateSpeed = 15;

// const controls = new OrbitControls( camera, renderer.domElement );
// controls.target.set( 0, 0.5, 0 );
// controls.update();
// controls.enablePan = false;
// controls.enableDamping = true;

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath( 'jsm/' );

const loader = new GLTFLoader();
loader.setDRACOLoader( dracoLoader );
loader.load( 'models/retro_computer_setup_free.glb', function ( gltf ) {

    const model = gltf.scene;
    // model.position.set( 1, 1, 0 );
    // model.scale.set( 0.01, 0.01, 0.01 );
    scene.add( model );

    // mixer = new THREE.AnimationMixer( model );
    // mixer.clipAction( gltf.animations[ 0 ] ).play();

    renderer.setAnimationLoop( animate );

}, undefined, function ( e ) {

    console.error( e );

} );


window.onresize = function () {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

};


function animate() {

    // const delta = clock.getDelta();

    // mixer.update( delta );

    controls.update();

    stats.update();

    renderer.render( scene, camera );

}