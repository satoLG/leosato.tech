import * as THREE from 'three';

import Stats from 'three/addons/libs/stats.module.js';

import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

let mixer, camera, controls, bulbLight, bulbMat;

// const clock = new THREE.Clock();
const container = document.getElementById( 'container' );

// const stats = new Stats();
// container.appendChild( stats.dom );

const renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
container.appendChild( renderer.domElement );

const pmremGenerator = new THREE.PMREMGenerator( renderer );

const scene = new THREE.Scene();
scene.background = new THREE.Color('#1d374d');
scene.environment = pmremGenerator.fromScene( new RoomEnvironment(), 0.04 ).texture;

camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 1, 5000 );
camera.position.set( 100, 150, 100 );

controls = new TrackballControls( camera, renderer.domElement );
controls.rotateSpeed = 10;

// const controls = new OrbitControls( camera, renderer.domElement );
// controls.target.set( 0, 0.5, 0 );
// controls.update();
// controls.enablePan = false;
// controls.enableDamping = true;


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
    // ... (existing code for other lights, if any)
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
bulbLight.position.set( 1,15,-5 );
bulbLight.intensity = 3;
bulbLight.distance = 250.0;
bulbLight.castShadow = true;
bulbLight.shadowMapVisible = true;
scene.add( bulbLight );

// we add the shadow plane automatically 
const groundGeometry = new THREE.CircleGeometry(200, 200);
const groundMaterial = new THREE.MeshPhongMaterial({color: new THREE.Color( 'lightgreen' ), side: THREE.DoubleSide});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
scene.add(ground);
ground.position.set(0, -0, 0);
ground.rotation.set(-Math.PI/2, 0, 0);
ground.receiveShadow = true;

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath( 'jsm/' );

const loader = new GLTFLoader();
loader.setDRACOLoader( dracoLoader );

loader.load( 'models/fogueira.glb', function ( gltf ) {

    const model = gltf.scene;
    // model.traverse( function ( child )
    // {
    //     console.log(child)
    //     child.castShadow = true;
    //     child.receiveShadow = true;
    // });

    model.position.set( 1, 1, 1 );
    model.scale.set( 10, 10, 10 );
    console.log(model)
    scene.add( model );

    mixer = new THREE.AnimationMixer( model );
    mixer.clipAction( gltf.animations[ 0 ] ).play();
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
        child.castShadow = true;
        child.receiveShadow = true;
    });

    model.position.set( 1, 1, -60 );
    // model.scale.set( 0.01, 0.01, 0.01 );
    console.log(model)
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
        child.castShadow = true;
        child.receiveShadow = true;
    });

    model.position.set( 1, 1, 100 );
    // model.scale.set( 0.01, 0.01, 0.01 );
    console.log(model)
    model.rotation.y = Math.PI;
    scene.add( model );

    // mixer = new THREE.AnimationMixer( model );
    // mixer.clipAction( gltf.animations[ 0 ] ).play();
    renderer.shadowMap.enabled = true;
    renderer.setAnimationLoop( animate );


}, undefined, function ( e ) {

    console.error( e );

} );

loader.load( 'models/smartphone.glb', function ( gltf ) {

    const model = gltf.scene;
    model.traverse( function ( child )
    {
        console.log(child)
        child.castShadow = true;
        child.receiveShadow = true;
    });

    model.position.set( 1, 11, -70 );
    model.scale.set( 3, 3, 3 );
    console.log(model)
    model.rotation.x = -(Math.PI / 2);
    // model.rotation.z = Math.PI / 2;
    scene.add( model );

    // mixer = new THREE.AnimationMixer( model );
    // mixer.clipAction( gltf.animations[ 0 ] ).play();
    renderer.shadowMap.enabled = true;
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

    // stats.update();

    renderer.render( scene, camera );

}