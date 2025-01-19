import * as THREE from 'three';

import Stats from 'three/addons/libs/stats.module.js';

import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

import { walkingPkmnTrainerString } from './walking_pkmn_trainer.js';

let camera, controls, bulbLight, bulbMat;
let sceneCss, rendererCss;

window.SCREEN_SIZE = { width: 225, height: 120 };
window.IFRAME_PADDING = 5;
window.IFRAME_SIZE = {
    w: SCREEN_SIZE.width - IFRAME_PADDING,
    h: SCREEN_SIZE.height - IFRAME_PADDING,
};

function createIframe(html) {
    // Create container
    const container = document.createElement('div');
    container.style.width = SCREEN_SIZE.width + 'px';
    container.style.height = SCREEN_SIZE.height + 'px';
    container.style.opacity = '1';
    container.style.background = '#1d2e2f';

    // Create iframe
    const iframe = document.createElement('iframe');

    // Bubble mouse move events to the main application, so we can affect the window.camera
    iframe.onload = () => {
        if (iframe.contentWindow) {
            window.addEventListener('message', (event) => {
                var evt = new CustomEvent(event.data.type, {
                    bubbles: true,
                    cancelable: false,
                });

                // @ts-ignore
                evt.inComputer = true;
                if (event.data.type === 'mousemove') {
                    console.log('iframe event', event.data.clientX, event.data.clientY);
                    var clRect = iframe.getBoundingClientRect();
                    const { top, left, width, height } = clRect;
                    // const widthRatio = width / IFRAME_SIZE.w;
                    // const heightRatio = height / IFRAME_SIZE.h;

                    // @ts-ignore
                    evt.clientX = Math.round(
                        event.data.clientX * widthRatio + left
                    );
                    //@ts-ignore
                    evt.clientY = Math.round(
                        event.data.clientY * heightRatio + top
                    );
                } else if (event.data.type === 'keydown') {
                    console.log('iframe event', event.data.clientX, event.data.clientY);
                    // @ts-ignore
                    evt.key = event.data.key;
                } else if (event.data.type === 'keyup') {
                    console.log('iframe event', event.data.clientX, event.data.clientY);
                    // @ts-ignore
                    evt.key = event.data.key;
                }

                iframe.dispatchEvent(evt);
            });
        }
    };

    // Set iframe attributes
    iframe.src = 'data:text/html;charset=utf-8,' + encodeURI(html);

    // iframe.src = 'https://os.henryheffernan.com/';

    iframe.style.width = SCREEN_SIZE.width + 'px';
    iframe.style.height = SCREEN_SIZE.height + 'px';
    iframe.style.padding = IFRAME_PADDING + 'px';
    // iframe.style.zoom = '0.5';
    iframe.style.boxSizing = 'border-box';
    iframe.style.opacity = '1';
    iframe.className = 'jitter';
    iframe.id = 'computer-screen';
    iframe.frameBorder = '0';
    iframe.title = 'HeffernanOS';

    // Add iframe to container
    container.appendChild(iframe);

    // Create CSS plane
    createCssPlane(container);
}

function createCssPlane(element) {
    // Create CSS3D object
    const object = new CSS3DObject(element);

    window.tela = object;

    // copy monitor position and rotation
    object.position.copy(window.laptop.position);
    object.position.y += 90;
    object.position.x += 3.8;
    object.position.z -= 24;
    object.rotation.y -= 0.55;
    object.rotation.x = window.laptop.rotation.x - 0.35;
    object.rotation.z = window.laptop.rotation.z - 0.18;
    // object.rotation.copy(window.laptop.rotation);

    // Add to CSS scene
    sceneCss.add(object);

    // Create GL plane
    const material = new THREE.MeshLambertMaterial();
    material.side = THREE.DoubleSide;
    material.opacity = 0;
    material.transparent = true;
    // NoBlending allows the GL plane to occlude the CSS plane
    material.blending = THREE.NoBlending;

    // Create plane geometry
    const geometry = new THREE.PlaneGeometry(
        SCREEN_SIZE.width,
        SCREEN_SIZE.height
    );

    // Create the GL plane mesh
    const mesh = new THREE.Mesh(geometry, material);

    // Copy the position, rotation and scale of the CSS plane to the GL plane
    mesh.position.copy(object.position);
    mesh.rotation.copy(object.rotation);
    mesh.scale.copy(object.scale);

    // Add to gl scene
    scene.add(mesh);
}

const containerCss = document.getElementById( 'css' );

sceneCss = new THREE.Scene();

rendererCss = new CSS3DRenderer();
rendererCss.setSize( window.innerWidth, window.innerHeight );

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

window.camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 1, 12000 );
window.camera.position.set( 1, 350, 5000 );

window.controls = new OrbitControls( window.camera, renderer.domElement );
window.controls.target.set( 0, 0.5, 0 );
window.controls.update();
window.controls.enablePan = false;
window.controls.enableDamping = true;
window.controls.maxPolarAngle = Math.PI / 2;
window.controls.minPolarAngle = Math.PI / 3;
window.controls.maxDistance = 2500;
window.controls.minDistance = 250;
window.controls.maxZoom = 20;
window.controls.minZoom = 3;
window.controls.rotateSpeed = 0.5;

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
bulbLight.position.set( 1,225,-5 );
bulbLight.intensity = 3;
bulbLight.distance = 550;
bulbLight.castShadow = true;
bulbLight.shadowMapVisible = true;
scene.add( bulbLight );

// we add the shadow plane automatically 
const groundGeometry = new THREE.CircleGeometry(4000, 4000);
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
    model.scale.set( 50, 50, 50 );
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

    model.position.set( -400, 1, -60 );
    model.scale.set( 5, 5, 5 );
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

window.lista_ids = [];

loader.load( 'models/laptop.glb', function ( gltf ) {

    const model = gltf.scene;
    model.traverse( function ( child )
    {
        window.lista_ids.push(child.uuid);
        console.log('notebook', child)
        // child.castShadow = true;
        // child.receiveShadow = true;
    });

    model.position.set( 500, 0, -100 );
    model.scale.set( 400, 400, 400 );
    console.log(model)
    model.rotation.y = (Math.PI / 2) + 1;
    window.laptop = model;
    scene.add( model );
    
    createIframe(walkingPkmnTrainerString);

    // mixer = new THREE.AnimationMixer( model );
    // mixer.clipAction( gltf.animations[ 0 ] ).play();
    renderer.shadowMap.enabled = true;
    renderer.setAnimationLoop( animate );


}, undefined, function ( e ) {

    console.error( e );

} );

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onPointerClick( event ) {

	// calculate pointer position in normalized device coordinates
	// (-1 to +1) for both components

	pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    // console.log(pointer, event.clientX, event.clientY)
}

window.addEventListener( 'mousedown', onPointerClick );

window.onresize = function () {

    window.camera.aspect = window.innerWidth / window.innerHeight;
    window.camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
    rendererCss.setSize( window.innerWidth, window.innerHeight );

};


function animate() {
	// update the picking ray with the window.camera and pointer position
	raycaster.setFromCamera( pointer, window.camera );

	// calculate objects intersecting the picking ray
	const intersects = raycaster.intersectObjects( scene.children );

	for ( let i = 0; i < intersects.length; i ++ ) {
        //window.lista_ids.includes(intersects[i].object.uuid) && intersects[i].object.isMesh
		if (window.lista_ids.includes(intersects[i].object.uuid) && intersects[i].object.isMesh){ 
            
            console.log(intersects[i].object)
            console.log('click')

            
            setTimeout(() => {
                window.controls.target.set( window.laptop.position.x, window.laptop.position.y, window.laptop.position.z );
                window.controls.update();
                document.querySelector('#container').style.pointerEvents = 'none';
                window.camera.position.lerp(new THREE.Vector3(window.laptop.position.x, window.laptop.position.y + 800, window.laptop.position.z), 0.05);

            }, 700);
            
        }
        else {
            // document.querySelector('#container').style.pointerEvents = 'unset';
            // window.controls.target.set( 0, 0.5, 0 );
            // window.camera.position.lerp(new THREE.Vector3(1, 350, 5000), 0.5);
        }

	}

    window.controls.update();
    renderer.render( scene, window.camera );
    rendererCss.render( sceneCss, window.camera );
}