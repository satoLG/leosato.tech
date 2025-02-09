import ThreejsScene from '../base/scene.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

class UnderConstructionScene extends ThreejsScene {
    constructor(debugGui=null) {
        super(debugGui);
        this.textMeshes = [];
        this.animationMixers = [];
        this.controls = null;
    }

    populateScene() {
        // Scene setup
        const pmremGenerator = new THREE.PMREMGenerator( this.renderer );
        this.scene.background = new THREE.Color('#1d374d');
        this.scene.environment = pmremGenerator.fromScene( new RoomEnvironment(), 0.04 ).texture;

        // Add camera
        this.camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 2000 );
        this.camera.position.set( 1, 50, 50 );

        // Add controls
        this.controls = new OrbitControls( this.camera, this.renderer.domElement );
        this.controls.target.set( 0, 0.5, 0 );
        this.controls.update();
        this.controls.enablePan = false;
        this.controls.enableDamping = true;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.minPolarAngle = Math.PI / 3;
        this.controls.minAzimuthAngle = - Math.PI / 4; // radians
        this.controls.maxAzimuthAngle = Math.PI / 4; // radians
        this.controls.maxDistance = 120;
        this.controls.minDistance = 80;
        this.controls.maxZoom = 3;
        this.controls.minZoom = 0.5;
        this.controls.rotateSpeed = 0.5;

        // Add lights
        this.createLights();

        // Add ground
        this.createGround();

        // Setup model loader
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath( 'jsm/' );
        const loader = new GLTFLoader();
        loader.setDRACOLoader( dracoLoader );

        // Load models
        this.loadModel(loader, 'models/road_cone.glb', [15,0,15], [12,12,12] );
        this.loadModel(loader, 'models/road_cone.glb', [-15,0,15], [12,12,12] );
        this.loadModel(loader, 'models/road_cone.glb', [-20.6,0,10.6], [12,12,12] );
        this.loadModel(loader, 'models/road_cone.glb', [20.6,0,10.6], [12,12,12] );
        this.loadModel(loader, 'models/road_cone.glb', [0,0,21.2], [12,12,12] );
        this.loadModel(loader, 'models/road_cone.glb', [8.6,0,20.6], [12,12,12] );
        this.loadModel(loader, 'models/road_cone.glb', [-8.6,0,20.6], [12,12,12] );

        this.loadModel(loader, 'models/street_lamp.glb', [10, 0, -10], [6, 4, 6], [-Math.PI, Math.PI / 2, 0], true);
        this.loadModel(loader, 'models/office_worker.glb', [-5, -0.5, -10], [8, 8, 8]);

        // Add text
        const fontPath = 'https://threejsfundamentals.org/threejs/resources/threejs/fonts/helvetiker_regular.typeface.json';
        this.addText(
            `
            under
            construction
            `, 
            fontPath, [-15, 10, 0], 2.5, 0.5, 'orange', 'black'
        );
    }

    loadModel(loader, path, position, scale, rotation = [0, 0, 0], allowShadow = false) {
        loader.load(path, (gltf) => {
            const model = gltf.scene;
            model.traverse( function ( child )
            {
                if ( child.isMesh && allowShadow ) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            model.position.set(...position);
            model.scale.set(...scale);
            model.rotation.set(...rotation);
            this.scene.add(model);

            if (gltf.animations.length > 0) {
                const mixer = new THREE.AnimationMixer(model);
                gltf.animations.forEach((clip) => {
                    mixer.clipAction(clip).play();
                });
                this.animationMixers.push(mixer);
            }
        });
    }

    addText(text, fontPath, position, size, height, color, border=undefined) {
        let scene = this.scene;
        let textMeshes = this.textMeshes;
        const textLoader = new FontLoader();
    
        textLoader.load(fontPath, function (font) {
            // TextGeometry(String, Object)
            const textObj = new TextGeometry(
            text, {
                font: font,
                size: size,
                height: height,
                depth: 11,
                curveSegments: 12,
                bevelEnabled: false,
            });
            const material = new THREE.MeshPhysicalMaterial({color: color});
            const mesh = new THREE.Mesh(textObj, material);
            mesh.position.set(position[0], position[1], position[2]);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
    
            if (border) {
                const outerGeometry = new TextGeometry( text, {
                    font: font,
                    size: size,
                    height: height/2,
                    depth: 10,
                    curveSegments: 12,
                    bevelEnabled: true,
                    bevelThickness: 0,
                    bevelSize: 0.2, // size of border
                    bevelOffset: 0,
                    bevelSegments: 1
                } );
    
                const borderText = new THREE.Mesh(
                    outerGeometry,
                    new THREE.MeshPhysicalMaterial( {color: border} )
                );	
                borderText.position.z = 0.1;
                mesh.add( borderText );
            }
    
            scene.add(mesh);
            textMeshes.push(mesh);
        });
    }

    createLights() {
        const light = new THREE.DirectionalLight( new THREE.Color( 'white' ), 0.2 );
        light.position.set( 1, 500, 1 );
    
        light.castShadow = true;
    
        light.shadow.mapSize.width = 512;
        light.shadow.mapSize.height = 512;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 50;
    
        this.scene.add(light);

        // Street lamp light setup
        const bulbGeometry = new THREE.SphereGeometry( 0.002, 0.002, 0.002 );
        const bulbLight = new THREE.PointLight( new THREE.Color( 'white' ), 1, 100, 2 );

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
        this.scene.add(bulbLight);
    }

    createGround() {
        const groundGeometry = new THREE.CircleGeometry(100, 100);
        groundGeometry.wireframe = true;
        const groundMaterial = new THREE.MeshPhongMaterial({color: new THREE.Color( 'gray' ), side: THREE.DoubleSide});
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.scene.add(ground);
        ground.position.set(0, 0, 0);
        ground.rotation.set(-Math.PI/2, 0, 0);
        ground.receiveShadow = true;
    }

    customAnimate() {
        this.controls.update();

        const elapsedTime = this.clock.getElapsedTime();

        if (this.textMeshes.length > 0) {
            this.textMeshes.forEach(textMesh => {
                textMesh.position.y = Math.sin(elapsedTime) * 2 + 10;
            });
        }

        if (this.animationMixers.length > 0) {
            this.animationMixers.forEach(mixer => {
                mixer.update((1 / 60) * 1.5);
            });
        }
    }
}

export default UnderConstructionScene;