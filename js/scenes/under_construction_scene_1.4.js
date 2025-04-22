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
        this.mode3dTransition = false; // Flag to indicate if the transition to 3D mode is in progress
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
        this.controls = new OrbitControls( this.camera, this.renderer.domElement );
        this.controls.target.set( 0, 0, 0 );
        this.controls.enabled = false;
        this.controls.enablePan = false;
        this.controls.enableDamping = true;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.minPolarAngle = Math.PI / 3;
        // this.controls.minPolarAngle = 0; // Default value, unrestricted upward view
        // this.controls.maxPolarAngle = Math.PI; // Default value, unrestricted downward view        
        this.controls.minAzimuthAngle = - Math.PI / 4; // radians
        this.controls.maxAzimuthAngle = Math.PI / 4; // radians
        this.controls.maxDistance = 100;
        this.controls.minDistance = 50;
        this.controls.maxZoom = 3;
        this.controls.minZoom = 0.5;
        this.controls.rotateSpeed = 0.5;
        this.controls.update();

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

    resetControls() {
        // Smoothly interpolate the camera position
        this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, 0, 0.1);
        this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, 0.2, 0.1);
        this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, 70, 0.1);
    
        // Smoothly interpolate the camera rotation
        this.camera.rotation.x = THREE.MathUtils.lerp(this.camera.rotation.x, 0, 0.1);
        this.camera.rotation.y = THREE.MathUtils.lerp(this.camera.rotation.y, 0, 0.1);
        this.camera.rotation.z = THREE.MathUtils.lerp(this.camera.rotation.z, 0, 0.1);
    
        // Smoothly interpolate the controls target
        this.controls.target.x = THREE.MathUtils.lerp(this.controls.target.x, 0, 0.1);
        this.controls.target.y = THREE.MathUtils.lerp(this.controls.target.y, 0, 0.1);
        this.controls.target.z = THREE.MathUtils.lerp(this.controls.target.z, 0, 0.1);
    
        // Smoothly interpolate the zoom
        this.camera.zoom = THREE.MathUtils.lerp(this.camera.zoom, 1, 0.1);
        this.camera.updateProjectionMatrix(); // Ensure the zoom is applied
    
        // Update the controls to apply the changes
        this.controls.update();
    }

    customAnimate() {
        const elapsedTime = this.clock.getElapsedTime();

        this.active3d = document.getElementById('3d-mode').classList.contains('active');

        this.controls.update();

        if (this.textMeshes.length > 0) {
            if (this.active3d) {
                this.textMeshes.forEach(textMesh => {
                    // Smoothly interpolate the current Y position to the target Y position
                    textMesh.position.y = THREE.MathUtils.lerp(textMesh.position.y, 9, 0.1);
                });
            
                const textPosition = this.textMeshes[0].position;

                if (this.mode3dTransition && !this.controls.enabled) {
                    this.controls.maxPolarAngle = THREE.MathUtils.lerp(this.controls.maxPolarAngle, (Math.PI / 2) - 0.1, 0.1);
                    this.controls.minPolarAngle = THREE.MathUtils.lerp(this.controls.minPolarAngle, Math.PI / 3, 0.1);
                    this.controls.update();
                    // Smoothly interpolate the camera's Y position
                    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, textPosition.y, 0.1);
                    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, -40, 0.1);

                    const offset = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
                    const polarAngle = Math.acos(offset.y / offset.length());

                    const minPolarAngle = this.controls.minPolarAngle;
                    const maxPolarAngle = this.controls.maxPolarAngle;
                    
                    // Clamp the polar angle
                    const clampedPolarAngle = THREE.MathUtils.clamp(polarAngle, minPolarAngle, maxPolarAngle);
                    
                    // Update the camera's position to match the clamped polar angle
                    const radius = offset.length();
                    offset.setFromSphericalCoords(radius, clampedPolarAngle, Math.atan2(offset.x, offset.z));
                    this.camera.position.copy(this.controls.target).add(offset);
                    this.camera.lookAt(this.controls.target);                    
                }

                if (this.camera.position.x < -37) {
                    this.mode3dTransition = false;
                    this.controls.enabled = true;
                }
                else if (!this.controls.enabled) {
                    this.mode3dTransition = true;
                }
            }
            else {
                this.resetControls();
                this.controls.maxPolarAngle = THREE.MathUtils.lerp(this.controls.maxPolarAngle, Math.PI / 2, 0.1);
                this.controls.minPolarAngle = THREE.MathUtils.lerp(this.controls.minPolarAngle, Math.PI / 3, 0.1);                
                this.controls.enabled = false;
                this.controls.update();
                this.textMeshes.forEach(textMesh => {
                    // Smoothly interpolate the current Y position to the target Y position
                    textMesh.position.y = THREE.MathUtils.lerp(textMesh.position.y, 8, 0.1);
                });
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