import ThreejsScene from '../base/scene.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

class FireCampScene extends ThreejsScene {
    constructor(debugGui=null) {
        super(debugGui);
        this.textMeshes = [];
        this.objectModels = [];
        this.animationMixers = [];
        this.controls = null;
    }

    populateScene() {
        // Set the shadow map type to PCFSoftShadowMap
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Scene setup
        const pmremGenerator = new THREE.PMREMGenerator( this.renderer );
        this.scene.background = new THREE.Color('#172836');
        this.scene.environment = pmremGenerator.fromScene( new RoomEnvironment(), 0.04 ).texture;

        // Add exponential fog
        this.scene.fog = new THREE.FogExp2('#172836', 0.0042);

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
        this.controls.maxDistance = 100;
        this.controls.minDistance = 20;
        this.controls.maxZoom = 3;
        this.controls.minZoom = 0.5;
        this.controls.rotateSpeed = 0.5;

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
                }, 500);
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
        this.loadModel(loader, 'models/fire_camp/firecamp.glb', [0, -1, 0], [15, 15, 15], [0, 0, 0], true);

        console.log('debugGui', this.debugGui);

        if (this.debugGui) {
            setTimeout(() => {
                if (this.textMeshes.length > 0) {
                    this.textMeshes.forEach(textMesh => {
                        const folder = this.debugGui.gui.addFolder('Text');
                        folder.add(textMesh.position, 'x').name('position x')
                        folder.add(textMesh.position, 'z').name('position z')
                        folder.add(textMesh.rotation, 'x', -Math.PI, Math.PI).name('rotation x')
                        folder.add(textMesh.rotation, 'y', -Math.PI, Math.PI).name('rotation y')
                        folder.add(textMesh.rotation, 'z', -Math.PI, Math.PI).name('rotation z')

                        const debugObject = {};
                        debugObject.color = textMesh.material.color;
                        folder.addColor(debugObject, 'color')
                        .onChange(() =>
                        {
                            textMesh.material.color.set(debugObject.color)
                        })
                    });
                }
                
                if (this.objectModels.length > 0) {
                    this.objectModels.forEach(objectModel => {
                        console.log('objectModel', objectModel)
                        const folder = this.debugGui.gui.addFolder(objectModel.name);
                        folder.add(objectModel.position, 'x').name('position x')
                        folder.add(objectModel.position, 'y').name('position y')
                        folder.add(objectModel.position, 'z').name('position z')
                        folder.add(objectModel.scale, 'x', 0, 100).name('scale x')
                        folder.add(objectModel.scale, 'y', 0, 100).name('scale y')
                        folder.add(objectModel.scale, 'z', 0, 100).name('scale z')
                        folder.add(objectModel.rotation, 'x', -Math.PI, Math.PI).name('rotation x')
                        folder.add(objectModel.rotation, 'y', -Math.PI, Math.PI).name('rotation y')
                        folder.add(objectModel.rotation, 'z', -Math.PI, Math.PI).name('rotation z')

                        const debugObject = {};
                        debugObject.scale = objectModel.scale.x; // Assuming uniform scaling
                        folder.add(debugObject, 'scale', 0, 100).name('scale').onChange(value => {
                            objectModel.scale.set(value, value, value);
                        });
                        debugObject.spin = () =>
                        {
                            gsap.to(objectModel.rotation, { duration: 1, y: objectModel.rotation.y + Math.PI * 2 })
                        }
                        folder.add(debugObject, 'spin').name('spin')                     
                    });
                }

                // Add fog controls to debugGui
                const fogFolder = this.debugGui.gui.addFolder('Fog');
                fogFolder.addColor(this.scene.fog, 'color').name('Fog Color');
                fogFolder.add(this.scene.fog, 'density', 0, 0.1).name('Fog Density');
            }, 1500);
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
            this.objectModels.push(model);

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
        const light = new THREE.DirectionalLight(new THREE.Color('white'), 0.2);
        light.position.set(1, 500, 1);
    
        light.castShadow = true;
    
        light.shadow.mapSize.width = 512;
        light.shadow.mapSize.height = 512;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 50;
    
        this.scene.add(light);
    
        // Street lamp light setup
        const bulbGeometry = new THREE.SphereGeometry(0.002, 0.002, 0.002);
        const bulbLight = new THREE.PointLight(new THREE.Color('orange'), 1, 100, 2);
    
        const bulbMat = new THREE.MeshStandardMaterial({
            emissive: new THREE.Color('orange'),
            emissiveIntensity: 150,
            color: new THREE.Color('orange')
        });
        bulbLight.add(new THREE.Mesh(bulbGeometry, bulbMat));
        // set bulbLight position to the street_lamp position
        bulbLight.position.set(0, 25, -10);
        bulbLight.intensity = 2;
        bulbLight.distance = 80;
        bulbLight.castShadow = true;
        bulbLight.shadowMapVisible = true;
        bulbLight.shadow.mapSize.width = 260;
        bulbLight.shadow.mapSize.height = 260;
        bulbLight.shadow.camera.far = 5;
        this.scene.add(bulbLight);
    
        // Add PointLightHelper to visualize the bulb light position
        const bulbLightHelper = new THREE.PointLightHelper(bulbLight, 1);
        bulbLightHelper.visible = false; // Initially hidden
        this.scene.add(bulbLightHelper);
    
        if (this.debugGui) {
            const lightFolder = this.debugGui.gui.addFolder('Directional Light');
            lightFolder.add(light.position, 'x').name('Position X');
            lightFolder.add(light.position, 'y').name('Position Y');
            lightFolder.add(light.position, 'z').name('Position Z');
            lightFolder.add(light, 'intensity', 0, 1).name('Intensity');
            lightFolder.add(light.shadow.camera, 'near', 0.1, 100).name('Shadow Near');
            lightFolder.add(light.shadow.camera, 'far', 0.1, 100).name('Shadow Far');
    
            const bulbLightFolder = this.debugGui.gui.addFolder('Bulb Light');
            bulbLightFolder.add(bulbLight.position, 'x').name('Position X');
            bulbLightFolder.add(bulbLight.position, 'y').name('Position Y');
            bulbLightFolder.add(bulbLight.position, 'z').name('Position Z');
            bulbLightFolder.add(bulbLight, 'intensity', 0, 10).name('Intensity');
            bulbLightFolder.add(bulbLight, 'distance', 0, 200).name('Distance');
            bulbLightFolder.add(bulbLight.shadow.camera, 'far', 0.1, 100).name('Shadow Far');
    
            const debugObject = {};
            debugObject.bulbColor = bulbLight.color;
            debugObject.showHelper = false;
            bulbLightFolder.addColor(debugObject, 'bulbColor').name('Bulb Color').onChange(() => {
                bulbLight.color.set(debugObject.bulbColor);
            });
            bulbLightFolder.add(debugObject, 'showHelper').name('Show Helper').onChange(() => {
                bulbLightHelper.visible = debugObject.showHelper;
            });
        }
    }

    createGround() {
        const innerRadius = 15;
        const outerRadius = 100;
    
        // Create a canvas and draw a gradient on it for the inner circle
        const innerCanvas = document.createElement('canvas');
        innerCanvas.width = 312;
        innerCanvas.height = 312;
        const innerContext = innerCanvas.getContext('2d');
    
        // Initial gradient colors for the inner circle
        let innerStartColor = '#261408';
        let innerEndColor = '#572c0f';
    
        const drawInnerGradient = () => {
            const gradient = innerContext.createRadialGradient(
                innerCanvas.width / 2,
                innerCanvas.height / 2,
                innerRadius,
                innerCanvas.width / 2,
                innerCanvas.height / 2,
                outerRadius
            );
            gradient.addColorStop(0.5, innerStartColor);
            gradient.addColorStop(1, innerEndColor);
    
            innerContext.fillStyle = gradient;
            innerContext.fillRect(0, 0, innerCanvas.width, innerCanvas.height);
        };
    
        drawInnerGradient();
    
        // Create a texture from the inner canvas
        const innerTexture = new THREE.CanvasTexture(innerCanvas);
    
        // Inner circle
        const innerGeometry = new THREE.CircleGeometry(innerRadius, 32);
        const innerMaterial = new THREE.MeshPhongMaterial({
            map: innerTexture,
            side: THREE.DoubleSide
        });
        const innerCircle = new THREE.Mesh(innerGeometry, innerMaterial);
        innerCircle.position.set(0, 0, 0);
        innerCircle.rotation.set(-Math.PI / 2, 0, 0);
        innerCircle.receiveShadow = true;
    
        // Create a canvas and draw a gradient on it for the outer ring
        const outerCanvas = document.createElement('canvas');
        outerCanvas.width = 512;
        outerCanvas.height = 512;
        const outerContext = outerCanvas.getContext('2d');
    
        // Initial gradient colors for the outer ring
        let outerStartColor = '#572c0f';
        let outerEndColor = '#0f490e';
    
        const drawOuterGradient = () => {
            const gradient = outerContext.createRadialGradient(
                outerCanvas.width / 2,
                outerCanvas.height / 2,
                innerRadius,
                outerCanvas.width / 2,
                outerCanvas.height / 2,
                outerRadius
            );
            gradient.addColorStop(0.0001, outerStartColor);
            gradient.addColorStop(1, outerEndColor);
    
            outerContext.fillStyle = gradient;
            outerContext.fillRect(0, 0, outerCanvas.width, outerCanvas.height);
        };
    
        drawOuterGradient();
    
        // Create a texture from the outer canvas
        const outerTexture = new THREE.CanvasTexture(outerCanvas);
    
        // Outer ring
        const initialOuterScale = 5;
        const newOuterRadius = outerRadius * initialOuterScale;
        let outerGeometry = new THREE.RingGeometry(innerRadius - 0.09, newOuterRadius, 64);
        const outerMaterial = new THREE.MeshPhongMaterial({
            map: outerTexture,
            side: THREE.DoubleSide
        });
        let outerRing = new THREE.Mesh(outerGeometry, outerMaterial);
        outerRing.position.set(0, 0, 0);
        outerRing.rotation.set(-Math.PI / 2, 0, 0);
        outerRing.receiveShadow = true;
    
        // Add to scene
        this.scene.add(innerCircle);
        this.scene.add(outerRing);
    
        if (this.debugGui) {
            const folder = this.debugGui.gui.addFolder('Ground');
            folder.add(innerMaterial, 'wireframe').name('Inner Wireframe');
            folder.add(outerMaterial, 'wireframe').name('Outer Wireframe');
            folder.add(innerCircle.position, 'x').name('Inner Position X');
            folder.add(innerCircle.position, 'y').name('Inner Position Y');
            folder.add(innerCircle.position, 'z').name('Inner Position Z');
            folder.add(innerCircle.rotation, 'x', -Math.PI, Math.PI).name('Inner Rotation X');
            folder.add(innerCircle.rotation, 'y', -Math.PI, Math.PI).name('Inner Rotation Y');
            folder.add(innerCircle.rotation, 'z', -Math.PI, Math.PI).name('Inner Rotation Z');
            folder.add(outerRing.position, 'x').name('Outer Position X');
            folder.add(outerRing.position, 'y').name('Outer Position Y');
            folder.add(outerRing.position, 'z').name('Outer Position Z');
            folder.add(outerRing.rotation, 'x', -Math.PI, Math.PI).name('Outer Rotation X');
            folder.add(outerRing.rotation, 'y', -Math.PI, Math.PI).name('Outer Rotation Y');
            folder.add(outerRing.rotation, 'z', -Math.PI, Math.PI).name('Outer Rotation Z');
    
            const debugObject = {
                innerStartColor: innerStartColor,
                innerEndColor: innerEndColor,
                outerStartColor: outerStartColor,
                outerEndColor: outerEndColor,
                outerScale: initialOuterScale
            };
    
            folder.addColor(debugObject, 'innerStartColor').name('Inner Start Color').onChange((value) => {
                innerStartColor = value;
                drawInnerGradient();
                innerTexture.needsUpdate = true;
            });
    
            folder.addColor(debugObject, 'innerEndColor').name('Inner End Color').onChange((value) => {
                innerEndColor = value;
                drawInnerGradient();
                innerTexture.needsUpdate = true;
            });
    
            folder.addColor(debugObject, 'outerStartColor').name('Outer Start Color').onChange((value) => {
                outerStartColor = value;
                drawOuterGradient();
                outerTexture.needsUpdate = true;
            });
    
            folder.addColor(debugObject, 'outerEndColor').name('Outer End Color').onChange((value) => {
                outerEndColor = value;
                drawOuterGradient();
                outerTexture.needsUpdate = true;
            });
    
            folder.add(debugObject, 'outerScale', 1, 5).name('Outer Scale').onChange((value) => {
                const newOuterRadius = outerRadius * value;
                const newOuterGeometry = new THREE.RingGeometry(innerRadius - 0.09, newOuterRadius, 64);
                outerRing.geometry.dispose();
                outerRing.geometry = newOuterGeometry;
            });
        }
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

export default FireCampScene;