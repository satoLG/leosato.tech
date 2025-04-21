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
        this.active3d = false; // Set to true for 3D mode, false for 2D mode
    }

    populateScene() {
        // Scene setup
        const pmremGenerator = new THREE.PMREMGenerator( this.renderer );
        this.scene.background = new THREE.Color('#172836');
        this.scene.environment = pmremGenerator.fromScene( new RoomEnvironment(), 0.04 ).texture;

        // Add exponential fog
        this.scene.fog = new THREE.FogExp2('#172836', 0.0042);

        // Add camera
        this.camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 2000 );
        this.camera.position.set( 0, 0.2, 70 );

        // Add controls
        // this.controls = new OrbitControls( this.camera, this.renderer.domElement );
        // this.controls.target.set( 0, 0.5, 0 );
        // this.controls.update();
        // this.controls.enablePan = false;
        // this.controls.enableDamping = true;
        // this.controls.maxPolarAngle = Math.PI / 2;
        // this.controls.minPolarAngle = Math.PI / 3;
        // this.controls.minAzimuthAngle = - Math.PI / 4; // radians
        // this.controls.maxAzimuthAngle = Math.PI / 4; // radians
        // this.controls.maxDistance = 100;
        // this.controls.minDistance = 50;
        // this.controls.maxZoom = 3;
        // this.controls.minZoom = 0.5;
        // this.controls.rotateSpeed = 0.5;

        // Add lights
        this.createLights();

        // Add ground
        this.createGround();

        document.getElementById('loading-screen').style.display = '';
        // Loading manager
        const loadingManager = new THREE.LoadingManager(
            () => {
                // On load complete
                setTimeout(() => {
                    document.getElementById('loading-screen').style.display = 'none';
                    document.getElementById('progress-bar').style.width = '0%';
                }, 1000);
            },
            (itemUrl, itemsLoaded, itemsTotal) => {
                // On progress
                const progress = (itemsLoaded / itemsTotal) * 100;
                document.getElementById('progress-bar').style.width = `${progress}%`;
            },
            (url) => {
                // On load start
                document.getElementById('loading-screen').style.display = '';
            }
        );

        // Setup model loader
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath( 'jsm/' );
        const loader = new GLTFLoader(loadingManager);
        loader.setDRACOLoader( dracoLoader );

        // Load models
        // this.loadModel(loader, 'models/under_construction/road_cone.glb', [15,0,15], [12,12,12], [0,0,0], true);
        // this.loadModel(loader, 'models/under_construction/road_cone.glb', [-15,0,15], [12,12,12], [0,0,0], true);
        // this.loadModel(loader, 'models/under_construction/road_cone.glb', [-20.6,0,10.6], [12,12,12], [0,0,0], true);
        // this.loadModel(loader, 'models/under_construction/road_cone.glb', [20.6,0,10.6], [12,12,12], [0,0,0], true);
        // this.loadModel(loader, 'models/under_construction/road_cone.glb', [0,0,21.2], [12,12,12], [0,0,0], true);
        // this.loadModel(loader, 'models/under_construction/road_cone.glb', [8.6,0,20.6], [12,12,12], [0,0,0], true);
        // this.loadModel(loader, 'models/under_construction/road_cone.glb', [-8.6,0,20.6], [12,12,12], [0,0,0], true);

        this.loadModel(loader, 'models/under_construction/street_lamp.glb', [15, 0, -10], [6, 4, 6], [-Math.PI, Math.PI / 2, 0], true);

        // Add text
        const fontPath = 'https://threejsfundamentals.org/threejs/resources/threejs/fonts/helvetiker_regular.typeface.json';
        this.addText(
            `
            under
            construction
            `, 
            fontPath, [-20, 8, 0], 2.5, 0.5, 'white'
        );

        // Add debug GUI features
        if (this.debugGui) {
            setTimeout(() => {
                this.addDebugGui();                
            }, 2000);
        }
    }

    addDebugGui() {
        const gui = this.debugGui.gui;
    
        // Lights folder
        const lightsFolder = gui.addFolder('Lights');
        lightsFolder.add(this.scene.children[0].position, 'x', -100, 100).name('Light X');
        lightsFolder.add(this.scene.children[0].position, 'y', -100, 100).name('Light Y');
        lightsFolder.add(this.scene.children[0].position, 'z', -100, 100).name('Light Z');
        lightsFolder.add(this.scene.children[0], 'intensity', 0, 10).name('Light Intensity');
    
        // Models folder
        const modelsFolder = gui.addFolder('Models');
        this.scene.children.forEach((child, index) => {
            if (child.isMesh) {
                const folder = modelsFolder.addFolder(`Model ${index + 1}`);
                folder.add(child.position, 'x', -50, 50).name('Position X');
                folder.add(child.position, 'y', -50, 50).name('Position Y');
                folder.add(child.position, 'z', -50, 50).name('Position Z');
                folder.add(child.rotation, 'x', -Math.PI, Math.PI).name('Rotation X');
                folder.add(child.rotation, 'y', -Math.PI, Math.PI).name('Rotation Y');
                folder.add(child.rotation, 'z', -Math.PI, Math.PI).name('Rotation Z');
                folder.add(child.scale, 'x', 0.1, 10).name('Scale X');
                folder.add(child.scale, 'y', 0.1, 10).name('Scale Y');
                folder.add(child.scale, 'z', 0.1, 10).name('Scale Z');
            }
        });
    
        // Text folder
        if (this.textMeshes.length > 0) {
            const textFolder = gui.addFolder('Text');
            this.textMeshes.forEach((textMesh, index) => {
                const folder = textFolder.addFolder(`Text ${index + 1}`);
                folder.add(textMesh.position, 'x', -50, 50).name('Position X');
                folder.add(textMesh.position, 'y', -50, 50).name('Position Y');
                folder.add(textMesh.position, 'z', -50, 50).name('Position Z');
                folder.add(textMesh.rotation, 'x', -Math.PI, Math.PI).name('Rotation X');
                folder.add(textMesh.rotation, 'y', -Math.PI, Math.PI).name('Rotation Y');
                folder.add(textMesh.rotation, 'z', -Math.PI, Math.PI).name('Rotation Z');
                folder.addColor({ color: textMesh.material.color.getHex() }, 'color')
                    .name('Text Color')
                    .onChange((value) => {
                        textMesh.material.color.set(value);
                    });
            });
        }
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
        bulbLight.position.set( 5, 15, -10 );
        bulbLight.intensity = 3;
        bulbLight.distance = 50;
        bulbLight.castShadow = true;
        bulbLight.shadowMapVisible = true;
        bulbLight.shadow.mapSize.width = 260;
        bulbLight.shadow.mapSize.height = 260;
        bulbLight.shadow.camera.far = 5;
        this.scene.add(bulbLight);
    }

    createGround() {
        const groundGeometry = new THREE.CircleGeometry(2000, 2000);
        groundGeometry.wireframe = true;
        const groundMaterial = new THREE.MeshPhongMaterial({color: new THREE.Color( 'gray' ), side: THREE.DoubleSide});
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.scene.add(ground);
        ground.position.set(0, 0, 0);
        ground.rotation.set(-Math.PI/2, 0, 0);
        ground.receiveShadow = true;
    }

    customAnimate() {
        // this.controls.update();

        const elapsedTime = this.clock.getElapsedTime();

        this.active3d = document.getElementById('3d-mode').classList.contains('active');

        if (this.textMeshes.length > 0) {
            if (this.active3d) {
                this.textMeshes.forEach(textMesh => {
                    // Smoothly interpolate the current Y position to the target Y position
                    textMesh.position.y = THREE.MathUtils.lerp(textMesh.position.y, 12, 0.05);
                });
            
                const textYPosition = this.textMeshes[0].position.y;
                // Smoothly interpolate the camera's Y position
                this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, textYPosition, 0.05);
                this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, -40, 0.05);
                this.camera.rotation.y = THREE.MathUtils.lerp(this.camera.rotation.y, -0.5, 0.05);
            }
            else {
                this.textMeshes.forEach(textMesh => {
                    // Smoothly interpolate the current Y position to the target Y position
                    textMesh.position.y = THREE.MathUtils.lerp(textMesh.position.y, 8, 0.05);
                });
                // Smoothly interpolate the camera's Y position
                this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, 0.2, 0.05);
                this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, 0, 0.05);
                this.camera.rotation.y = THREE.MathUtils.lerp(this.camera.rotation.y, 0, 0.05);
            }
        }

        if (this.animationMixers.length > 0) {
            this.animationMixers.forEach(mixer => {
                mixer.update((1 / 60) * 1.5);
            });
        }
    }
}

export default UnderConstructionScene;