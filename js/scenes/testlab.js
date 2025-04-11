import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import ThreejsScene from '../base/scene.js';

class TestLabScene extends ThreejsScene {
    constructor(debugGui = null) {
        super(debugGui);
        this.cube = null;
        this.cube2 = null;
        this.sphere = null;
        this.donut = null;
        this.plane = null;
        this.sky = null;
        this.directionalLight = null; // Directional light for global illumination
        this.ambientLight = null; // Ambient light to reduce overly dark areas
        this.character = null; // this.character model
        this.cubeVelocity = new THREE.Vector3(0, 0, 0); // Velocity for the cube
        this.isJumping = false; // Flag to track if the cube is in the air        
        this.keys = {}; // Track key presses

        this.objectModels = [];
        this.animationMixers = [];

        this.cameraTransitioning = false; // Flag to track camera transition

        this.backgroundMusic = null; // Reference to the audio object
    }

    initDebugGui() {
        // Add a folder for cube controls
        const cubeFolder = this.debugGui.gui.addFolder('Cubes');
    
        // Add a button to create a new cube
        cubeFolder.add({ addCube: () => this.addNewCube() }, 'addCube').name('Add New Cube');
    
        // Add a folder for camera controls
        const cameraFolder = this.debugGui.gui.addFolder('Camera');
        cameraFolder.add(this.camera.position, 'x', -50, 50).name('Position X').listen();
        cameraFolder.add(this.camera.position, 'y', -50, 50).name('Position Y').listen();
        cameraFolder.add(this.camera.position, 'z', -50, 50).name('Position Z').listen();
    
        // Add a folder for directional light controls
        const lightFolder = this.debugGui.gui.addFolder('Directional Light');
        lightFolder.add(this.directionalLight.position, 'x', -100, 100).name('Position X').listen();
        lightFolder.add(this.directionalLight.position, 'y', -100, 100).name('Position Y').listen();
        lightFolder.add(this.directionalLight.position, 'z', -100, 100).name('Position Z').listen();
        lightFolder.add(this.directionalLight, 'intensity', 0, 2).name('Intensity').listen();
    
        // Add a folder for ambient light controls
        const ambientLightFolder = this.debugGui.gui.addFolder('Ambient Light');
        ambientLightFolder.add(this.ambientLight, 'intensity', 0, 2).name('Intensity').listen();
    
        // Add a folder for the plane
        const planeFolder = this.debugGui.gui.addFolder('Plane');
        planeFolder.add(this.plane.position, 'x', -50, 50).name('Position X').listen();
        planeFolder.add(this.plane.position, 'y', -50, 50).name('Position Y').listen();
        planeFolder.add(this.plane.position, 'z', -50, 50).name('Position Z').listen();
        planeFolder.add(this.plane.rotation, 'x', -Math.PI, Math.PI).name('Rotation X').listen();
        planeFolder.add(this.plane.rotation, 'y', -Math.PI, Math.PI).name('Rotation Y').listen();
        planeFolder.add(this.plane.rotation, 'z', -Math.PI, Math.PI).name('Rotation Z').listen();
    
        // Add a folder for the character (if loaded)
        if (this.character) {
            const characterFolder = this.debugGui.gui.addFolder('Character');
            characterFolder.add(this.character.position, 'x', -50, 50).name('Position X').listen();
            characterFolder.add(this.character.position, 'y', -50, 50).name('Position Y').listen();
            characterFolder.add(this.character.position, 'z', -50, 50).name('Position Z').listen();
            characterFolder.add(this.character.rotation, 'x', -Math.PI, Math.PI).name('Rotation X').listen();
            characterFolder.add(this.character.rotation, 'y', -Math.PI, Math.PI).name('Rotation Y').listen();
            characterFolder.add(this.character.rotation, 'z', -Math.PI, Math.PI).name('Rotation Z').listen();
        }
    
        // Add a folder for the sphere
        const sphereFolder = this.debugGui.gui.addFolder('Sphere');
        sphereFolder.add(this.sphere.position, 'x', -50, 50).name('Position X').listen();
        sphereFolder.add(this.sphere.position, 'y', -50, 50).name('Position Y').listen();
        sphereFolder.add(this.sphere.position, 'z', -50, 50).name('Position Z').listen();
        sphereFolder.add(this.sphere.rotation, 'x', -Math.PI, Math.PI).name('Rotation X').listen();
        sphereFolder.add(this.sphere.rotation, 'y', -Math.PI, Math.PI).name('Rotation Y').listen();
        sphereFolder.add(this.sphere.rotation, 'z', -Math.PI, Math.PI).name('Rotation Z').listen();
    }

    init(container) {
        super.init(container);

        // Initialize and play background music
        this.backgroundMusic = new Audio('sounds/background/C418 - Haggstrom - Minecraft Volume Alpha.mp3');
        this.backgroundMusic.loop = true; // Loop the music
        this.backgroundMusic.volume = 0.5; // Set volume (adjust as needed)
        this.backgroundMusic.play().catch((error) => {
            console.error('Error playing background music:', error);
        });
    }

    destroy() {
        // Stop and clean up background music
        if (this.backgroundMusic) {
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0; // Reset playback position
            this.backgroundMusic = null;
        }

        super.destroy(); // Call the parent class's destroy method
    }

    addNewCube() {
        const textureLoader = new THREE.TextureLoader();
        const minecraftTexture = textureLoader.load('textures/testlab/minecraft.png');
        minecraftTexture.magFilter = THREE.NearestFilter; // Pixelated look for the cube
    
        // Create a new cube
        const cubeGeometry = new THREE.BoxGeometry();
        const cubeMaterial = new THREE.MeshStandardMaterial({ map: minecraftTexture });
        const newCube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    
        // Set random position for the new cube
        newCube.position.set(
            Math.random() * 20 - 5, // Random X position between -5 and 5
            Math.random() * 9 + 1,                   // Fixed Y position
            Math.random() * 20 - 5 // Random Z position between -5 and 5
        );
    
        newCube.castShadow = true; // Allow the cube to cast shadows
        newCube.receiveShadow = true; // Allow the cube to receive shadows
    
        // Add the cube to the scene
        this.scene.add(newCube);
    
        // Add a bounding box for the cube
        newCube.boundingBox = new THREE.Box3().setFromObject(newCube);
    
        // Add a helper for debugging
        // const cubeHelper = new THREE.BoxHelper(newCube, 0xff0000); // Red for the new cube
        // this.scene.add(cubeHelper);
    
        // Store the cube in the objectModels array
        this.objectModels.push(newCube);
    
        // Add GUI controls for the new cube
        if (this.debugGui.gui) {
            const cubeFolder = this.debugGui.gui.addFolder(`Cube ${this.objectModels.length}`);
            cubeFolder.add(newCube.position, 'x', -10, 10).name('Position X').listen();
            cubeFolder.add(newCube.position, 'y', 0, 10).name('Position Y').listen();
            cubeFolder.add(newCube.position, 'z', -10, 10).name('Position Z').listen();
        }
    
        console.log('New cube added:', newCube);
    }

    populateScene() {
        // Set the shadow map type to PCFSoftShadowMap
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Add camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 10;

        // Create orbit controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.maxPolarAngle = Math.PI / 2.5;
        this.controls.minPolarAngle = Math.PI / 3.5;
        this.controls.rotateSpeed = 1;

        const textureLoader = new THREE.TextureLoader();

        // Add a dark blue sky
        const skyColor = '#1d3557'; // Dark blue color
        const skyGeometry = new THREE.SphereGeometry(50, 64, 64);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(skyColor),
            side: THREE.BackSide, // Render the inside of the sphere
        });
        this.sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(this.sky);

        // Add fog to match the background color
        this.scene.fog = new THREE.Fog(skyColor, 10, 50); // Fog starts at 10 and ends at 50

        // Load minecraft.png texture for objects
        const minecraftTexture = textureLoader.load('textures/testlab/minecraft.png');
        minecraftTexture.magFilter = THREE.NearestFilter; // Pixelated look for the first cube

        // Create a cube and apply the minecraft texture
        const cubeGeometry = new THREE.BoxGeometry();
        const cubeMaterial = new THREE.MeshStandardMaterial({ map: minecraftTexture });
        this.cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        this.cube.castShadow = true; // Allow the cube to cast shadows
        this.cube.receiveShadow = true; // Allow the cube to receive shadows
        this.cube.position.set(2.5, 0.5, 2.5); // Slightly closer
        this.scene.add(this.cube);

        // Create a second cube with bad resolution
        const lowResTexture = textureLoader.load('textures/testlab/minecraft.png');
        lowResTexture.magFilter = THREE.LinearFilter; // Blurry look for the second cube
        const cube2Geometry = new THREE.BoxGeometry();
        const cube2Material = new THREE.MeshStandardMaterial({ map: lowResTexture });
        this.cube2 = new THREE.Mesh(cube2Geometry, cube2Material);
        this.cube2.castShadow = true; // Allow the cube to cast shadows
        this.cube2.receiveShadow = true; // Allow the cube to receive shadows
        this.cube2.position.set(-5.5, 0.5, -5.5); // Slightly closer
        this.scene.add(this.cube2);

        // Create a sphere and apply the minecraft texture
        const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        const sphereMaterial = new THREE.MeshStandardMaterial({ map: minecraftTexture });
        this.sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        this.sphere.castShadow = true; // Allow the sphere to cast shadows
        this.sphere.receiveShadow = true; // Allow the sphere to receive shadows
        this.sphere.position.set(5, 0.5, 0); // Slightly closer
        this.scene.add(this.sphere);

        // Load cobble.png texture for new objects
        const cobbleTexture = textureLoader.load('textures/testlab/cobble.png');
        cobbleTexture.wrapS = THREE.RepeatWrapping;
        cobbleTexture.wrapT = THREE.RepeatWrapping;
        cobbleTexture.repeat.set(50, 50); // Repeat the texture for better detail on a larger plane
        cobbleTexture.magFilter = THREE.NearestFilter; // Ensure the cobble texture looks sharp

        // Create a large plane and apply the cobble texture
        const planeGeometry = new THREE.PlaneGeometry(500, 500); // Much larger plane for the floor
        const planeMaterial = new THREE.MeshStandardMaterial({ map: cobbleTexture, side: THREE.DoubleSide });
        this.plane = new THREE.Mesh(planeGeometry, planeMaterial);
        this.plane.rotation.x = -Math.PI / 2; // Rotate to make it horizontal
        this.plane.position.set(0, 0, 0); // Slightly closer
        this.plane.receiveShadow = true; // Allow the plane to receive shadows
        this.scene.add(this.plane);

        this.plane.boundingBox = new THREE.Box3().setFromObject(this.plane);
        this.cube.boundingBox = new THREE.Box3().setFromObject(this.cube);
        this.cube2.boundingBox = new THREE.Box3().setFromObject(this.cube2);
        this.sphere.boundingBox = new THREE.Box3().setFromObject(this.sphere);
        // Create a bounding sphere for the sphere
        this.sphere.boundingSphere = new THREE.Sphere(this.sphere.position.clone(), 0.5); // Radius matches the sphere's geometry
        
        // Add bounding box helpers for debugging
        this.cubeHelper = new THREE.BoxHelper(this.cube, 0xff0000); // Red for the first cube
        this.scene.add(this.cubeHelper);

        this.cube2Helper = new THREE.BoxHelper(this.cube2, 0x00ff00); // Green for the second cube
        this.scene.add(this.cube2Helper);

        this.sphereHelper = new THREE.BoxHelper(this.sphere, 0x0000ff); // Blue for the sphere
        this.scene.add(this.sphereHelper);

        this.planeHelper = new THREE.BoxHelper(this.plane, 0xffff00); // Yellow for the plane
        this.scene.add(this.planeHelper);

        // Add a bounding box helper for the character (if loaded later)
        this.characterHelper = null; // 

        // Add a directional light for global illumination
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.5); // White light
        this.directionalLight.position.set(10, 50, 10); // Position the light
        this.directionalLight.castShadow = true; // Enable shadow casting for the directional light
        this.directionalLight.shadow.mapSize.width = 2048; // Shadow map resolution
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.camera.left = -50; // Adjust shadow camera frustum
        this.directionalLight.shadow.camera.right = 50;
        this.directionalLight.shadow.camera.top = 50;
        this.directionalLight.shadow.camera.bottom = -50;
        this.directionalLight.shadow.camera.near = 0.5; // Near clipping plane
        this.directionalLight.shadow.camera.far = 100; // Far clipping plane
        this.scene.add(this.directionalLight);

        // Add ambient light to reduce overly dark areas
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3); // Soft white light
        this.scene.add(this.ambientLight);

        document.getElementById('loading-screen').style.display = '';
        // Loading manager
        const loadingManager = new THREE.LoadingManager(
            () => {
                // On load complete
                document.getElementById('loading-screen').style.display = 'none';
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
        this.loadModel(loader, 'models/testlab/goblin.glb', [0, 15, 0], [1, 1, 1], [0, 0, 0], true);

        // Add event listeners for keyboard input
        window.addEventListener('keydown', (event) => {
            this.keys[event.key] = true;

            // Handle jump on space bar press
            console.log('Key pressed:', event.key, 'IS JUMPING ?', this.isJumping); // Debugging line
            if (event.key === ' ' && !this.isJumping) {
                console.log('YES Jumping!'); // Debugging line
                this.cubeVelocity.y = 0.15; // Initial upward velocity
                this.isJumping = true; // Set jumping flag
            }
        });

        window.addEventListener('keyup', (event) => {
            this.keys[event.key] = false;
        });

        setTimeout(() => {
            if (this.debugGui.gui) this.initDebugGui();
            this.cameraTransitioning = true; // Start camera transition
        }, 5000); // Adjust the delay as needed
    }

    loadModel(loader, path, position, scale, rotation = [0, 0, 0], allowShadow = false) {
        loader.load(path, (gltf) => {
            const model = gltf.scene;
            model.traverse(function (child) {
                if (child.isMesh && allowShadow) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            model.position.set(...position);
            model.scale.set(...scale);
            model.rotation.set(...rotation);
            this.scene.add(model);
            this.objectModels.push(model);
    
            // Create a static bounding box for the character
            if (!this.character) {
                this.character = model;
                const boxSize = new THREE.Vector3(0.5, 2, 0.5); // Adjust X and Z dimensions to make it smaller horizontally
                this.character.staticBoundingBox = new THREE.Box3().setFromCenterAndSize(
                    this.character.position.clone(),
                    boxSize
                );
            }
    
            // Store animations if available
            if (gltf.animations.length > 0) {
                const mixer = new THREE.AnimationMixer(model);
                this.animationMixers.push(mixer);
    
                // Store animations in an object for later use
                model.animations = {}; // Add an `animations` property to the model
                gltf.animations.forEach((clip) => {
                    console.log('Animation clip:', clip.name, clip);
                    model.animations[clip.name] = mixer.clipAction(clip); // Store each animation by name
                });
            }
        });
    }

    smoothCameraFollow() {
        if (!this.character || !this.camera) return;
    
        // Define the fixed offset for the camera (behind and above the character)
        const offset = new THREE.Vector3(0, 2, -5); // Y = height, Z = distance behind
    
        // Calculate the target position for the camera
        const characterPosition = this.character.position.clone();
        const characterDirection = new THREE.Vector3(0, 0, -1); // Default forward direction
        characterDirection.applyQuaternion(this.character.quaternion); // Rotate based on the character's orientation
        const targetPosition = characterPosition.addScaledVector(characterDirection, offset.z); // Move behind the character
        targetPosition.y += offset.y; // Move above the character
    
        // Smoothly interpolate the camera's position toward the target position
        this.camera.position.lerp(targetPosition, 0.1); // Adjust the interpolation factor (0.1 = smooth, 1 = instant)
    
        // Make the camera look at the character
        const lookAtTarget = this.character.position.clone().add(new THREE.Vector3(0, 1, 0)); // Focus slightly above the character
        this.camera.lookAt(lookAtTarget);
    }

    updateCharacterPosition() {
        this.character = this.objectModels[0]; // Assuming the first model is the character
        if (!this.character) return; // Ensure the character is loaded
    
        let speed = 0.1; // Fixed movement speed per frame

        // Increase speed if Shift is pressed
        if (this.keys['Shift'] || this.keys['SHIFT']) {
            speed = 0.25; // Adjust this value for the desired sprint speed
        }        

        const direction = new THREE.Vector3();
    
        // Get the camera's forward and right vectors
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward); // Get the camera's forward direction
        forward.y = 0; // Ignore vertical movement
        forward.normalize();
    
        const right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)); // Calculate the right vector
        right.normalize();
    
        // Check for movement keys and calculate the movement direction
        if (this.keys['w'] || this.keys['W']) direction.add(forward); // Forward
        // if (this.keys['s'] || this.keys['S']) direction.sub(forward); // Backward
        // if (this.keys['a'] || this.keys['A']) direction.sub(right);   // Left
        // if (this.keys['d'] || this.keys['D']) direction.add(right);   // Right
    
        if (direction.length() > 0) {
            direction.normalize(); // Normalize to prevent faster diagonal movement
            direction.multiplyScalar(speed); // Scale by fixed speed
    
            // Set cameraTransitioning to true when the character starts moving
            if (!this.cameraTransitioning) {
                this.cameraTransitioning = true;
            }
    
            // Cast rays in the movement direction to check for horizontal collisions
            const rayDirection = direction.clone().normalize();
            const isHorizontalCollision = this.checkRaycastCollisions(rayDirection);
    
            // Cast a ray downward to check for vertical collisions (e.g., climbing)
            const downwardRay = new THREE.Vector3(0, -1, 0); // Downward direction
            const isVerticalCollision = this.checkRaycastCollisions(downwardRay, true);
    
            if (!isHorizontalCollision) { // && isVerticalCollision
                // If no horizontal collision and the character is grounded, update the position
                this.character.position.add(direction);
            }
    
            // Rotate the character to face the movement direction
            const angle = Math.atan2(direction.x, direction.z); // Calculate the angle
            this.character.rotation.y = angle + Math.PI; // Rotate the character to face the opposite direction
    
            // Transition to the walking animation
            if (this.character.animations) {
                const walkingAction = this.character.animations['animation.goblin.walk'];
                const idleAction = this.character.animations['animation.goblin.idle'];
    
                if (idleAction && idleAction.isRunning()) {
                    idleAction.fadeOut(0.1); // Fade out the idle animation
                    setTimeout(() => {
                        idleAction.stop(); // Stop the idle animation after fading out
                    }, 100); // Match the fade-out duration
                }
    
                if (walkingAction && !walkingAction.isRunning()) {
                    walkingAction.reset().fadeIn(0.2).play(); // Smoothly fade in the walking animation
                }
            }
        } else {
            // Transition to the idle animation
            if (this.character.animations) {
                const walkingAction = this.character.animations['animation.goblin.walk'];
                const idleAction = this.character.animations['animation.goblin.idle'];
    
                if (walkingAction && walkingAction.isRunning()) {
                    walkingAction.fadeOut(0.1); // Fade out the walking animation
                    setTimeout(() => {
                        walkingAction.stop(); // Stop the walking animation after fading out
                    }, 100); // Match the fade-out duration
                }
    
                if (idleAction && !idleAction.isRunning()) {
                    idleAction.reset().fadeIn(0.2).play(); // Smoothly fade in the idle animation
                }
            }
    
            // Set cameraTransitioning to false when the character stops moving
            if (this.cameraTransitioning) {
                this.cameraTransitioning = false;
            }
        }
    }

    applyGravity() {
        this.character = this.objectModels[0]; // Assuming the first model is the character
        if (!this.character) return; // Ensure the character is loaded
    
        const gravity = -0.005; // Gravity force
    
        // Apply gravity to the vertical velocity
        this.cubeVelocity.y += gravity;
    
        // Update the character's position based on its velocity
        this.character.position.y += this.cubeVelocity.y;
    
        // Create a bounding box for the character
        const characterBox = new THREE.Box3().setFromObject(this.character);
    
        // Check for vertical collisions with other objects
        let isGrounded = false;
        [this.cube, this.cube2, this.sphere, this.plane].forEach((geometry) => {
            if (geometry && geometry.boundingBox) {
                const geometryBox = geometry.boundingBox;
    
                // Check if the character is standing on top of the object
                if (
                    characterBox.max.y >= geometryBox.min.y && // Character's feet are at or below the object's top
                    characterBox.min.y <= geometryBox.max.y && // Character's bottom is above the object's top
                    characterBox.max.x > geometryBox.min.x && // Horizontal overlap (X-axis)
                    characterBox.min.x < geometryBox.max.x &&
                    characterBox.max.z > geometryBox.min.z && // Horizontal overlap (Z-axis)
                    characterBox.min.z < geometryBox.max.z
                ) {
                    // Snap the character to the top of the object
                    this.character.position.y = geometryBox.max.y;
                    this.cubeVelocity.y = 0; // Stop vertical movement
                    this.isJumping = false; // Reset jumping flag
                    isGrounded = true;
                }
            }
        });

        this.objectModels.forEach((geometry) => {
            if (geometry && geometry.boundingBox) {
                const geometryBox = geometry.boundingBox;
    
                // Check if the character is standing on top of the object
                if (
                    characterBox.max.y >= geometryBox.min.y && // Character's feet are at or below the object's top
                    characterBox.min.y <= geometryBox.max.y && // Character's bottom is above the object's top
                    characterBox.max.x > geometryBox.min.x && // Horizontal overlap (X-axis)
                    characterBox.min.x < geometryBox.max.x &&
                    characterBox.max.z > geometryBox.min.z && // Horizontal overlap (Z-axis)
                    characterBox.min.z < geometryBox.max.z
                ) {
                    // Snap the character to the top of the object
                    this.character.position.y = geometryBox.max.y;
                    this.cubeVelocity.y = 0; // Stop vertical movement
                    this.isJumping = false; // Reset jumping flag
                    isGrounded = true;
                }
            }
        });
    
        // If no ground is detected, continue applying gravity
        if (!isGrounded) {
            this.cubeVelocity.y += gravity;
            this.character.position.y += this.cubeVelocity.y;
        }
    }

    // applyGravity() {
    //     this.character = this.objectModels[0]; // Assuming the first model is the this.character
    //     if (!this.character) return; // Ensure the this.character is loaded

    //     const gravity = -0.01; // Gravity force

    //     // Apply gravity to the cube's velocity
    //     this.cubeVelocity.y += gravity;

    //     // Update the cube's position based on its velocity
    //     this.character.position.y += this.cubeVelocity.y;

    //     // Check if the cube has landed on the ground
    //     if (this.character.position.y <= 0) {
    //         this.character.position.y = 0; // Reset to ground level
    //         this.cubeVelocity.y = 0; // Stop vertical movement
    //         this.isJumping = false; // Reset jumping flag
    //     }
    // }

    checkCollisions() {
        if (!this.character || !this.character.boundingBox) return;
    
        const characterBox = new THREE.Box3().setFromObject(this.character);
    
        // Iterate through all objects in the scene
        [this.cube, this.cube2, this.sphere, this.plane].forEach((geometry) => {
            if (geometry && geometry.boundingBox) {
                if (characterBox.intersectsBox(geometry.boundingBox)) {
                    console.log('Collision detected with:', geometry);
    
                    // Handle collision
                    this.handleCollision(this.character, geometry);
                }
            }
        });

        // Iterate through all objects in the objectModels array
        this.objectModels.forEach((geometry) => {
            if (geometry && geometry.boundingBox) {
                if (characterBox.intersectsBox(geometry.boundingBox)) {
                    console.log('Collision detected with:', geometry);

                    // Handle collision
                    this.handleCollision(this.character, geometry);
                }
            }
        });
    }

    handleCollision(character, geometry) {
        const characterBox = new THREE.Box3().setFromObject(character);
        const geometryBox = geometry.boundingBox;
    
        // Calculate the direction of movement
        const movementDirection = this.cubeVelocity.clone().normalize();
    
        // Stop horizontal movement if colliding on the sides
        if (characterBox.min.y < geometryBox.max.y && characterBox.max.y > geometryBox.min.y) {
            // Check for collision along the X-axis
            if (characterBox.max.x > geometryBox.min.x && characterBox.min.x < geometryBox.max.x) {
                if (characterBox.max.z > geometryBox.min.z && characterBox.min.z < geometryBox.max.z) {
                    if (characterBox.max.x - geometryBox.min.x < geometryBox.max.x - characterBox.min.x) {
                        if (movementDirection.x > 0) {
                            character.position.x = geometryBox.min.x - (characterBox.max.x - characterBox.min.x) / 2;
                        }
                    } else {
                        if (movementDirection.x < 0) {
                            character.position.x = geometryBox.max.x + (characterBox.max.x - characterBox.min.x) / 2;
                        }
                    }
                }
            }
    
            // Check for collision along the Z-axis
            if (characterBox.max.z > geometryBox.min.z && characterBox.min.z < geometryBox.max.z) {
                if (characterBox.max.x > geometryBox.min.x && characterBox.min.x < geometryBox.max.x) {
                    if (characterBox.max.z - geometryBox.min.z < geometryBox.max.z - characterBox.min.z) {
                        if (movementDirection.z > 0) {
                            character.position.z = geometryBox.min.z - (characterBox.max.z - characterBox.min.z) / 2;
                        }
                    } else {
                        if (movementDirection.z < 0) {
                            character.position.z = geometryBox.max.z + (characterBox.max.z - characterBox.min.z) / 2;
                        }
                    }
                }
            }
        }
    
        // Handle standing on top of the object
        if (characterBox.min.y <= geometryBox.max.y && this.cubeVelocity.y <= 0) {
            character.position.y = geometryBox.max.y; // Place the character on top of the object
            this.cubeVelocity.y = 0; // Stop vertical movement
            this.isJumping = false; // Reset jumping flag
        }
    }

    checkRaycastCollisions(direction, vertical = false) {
        const raycaster = new THREE.Raycaster();
        const rayOrigin = this.character.position.clone();
    
        // Adjust the ray's origin based on whether it's a vertical or horizontal check
        if (vertical) {
            rayOrigin.y += 1; // Start the ray slightly above the character for vertical checks
        } else {
            rayOrigin.y += 0.5; // Slightly above the ground for horizontal checks
        }
    
        raycaster.set(rayOrigin, direction);
    
        // Check for intersections with objects in the scene
        const intersects = raycaster.intersectObjects([this.cube, this.cube2, this.sphere, this.plane], true);
    
        // Return true if there is a collision within a small distance
        return intersects.length > 0 && intersects[0].distance < (vertical ? 1.5 : 0.6); // Adjust thresholds as needed
    }

    customAnimate() {
        this.controls.update();

        // Update bounding boxes for all objects in the objectModels array
        this.objectModels.forEach((object) => {
            if (object && object.boundingBox) {
                object.boundingBox.setFromObject(object);
            }
        });

        // Update bounding boxes for all geometries
        if (this.cube && this.cube.boundingBox) {
            this.cube.boundingBox.setFromObject(this.cube);
            this.cubeHelper.update(); // Update the visual helper
        }
        if (this.cube2 && this.cube2.boundingBox) {
            this.cube2.boundingBox.setFromObject(this.cube2);
            this.cube2Helper.update(); // Update the visual helper
        }
        if (this.sphere && this.sphere.boundingBox) {
            this.sphere.boundingBox.setFromObject(this.sphere);
            this.sphereHelper.update(); // Update the visual helper
        }
        if (this.sphere && this.sphere.boundingSphere) {
            this.sphere.boundingSphere.center.copy(this.sphere.position); // Update the center of the bounding sphere
        }
        if (this.plane && this.plane.boundingBox) {
            this.plane.boundingBox.setFromObject(this.plane);
            this.planeHelper.update(); // Update the visual helper
        }

        // Update the character's static bounding box
        if (this.character && this.character.staticBoundingBox) {
            this.character.staticBoundingBox.setFromCenterAndSize(
                this.character.position.clone(),
                new THREE.Vector3(0.5, 2, 0.5) // Adjust X and Z dimensions to make it smaller horizontally
            );
        }

        // Handle collisions
        this.checkCollisions();

        // Update cube position based on WASD input
        this.updateCharacterPosition();

        // Apply gravity and handle jumping
        this.applyGravity();

        // Smoothly move the camera behind the character if transitioning
        if (this.cameraTransitioning) {
            this.smoothCameraFollow();
        }

        this.character = this.objectModels[0]; // Assuming the first model is the this.character
        // Update OrbitControls to target the cube
        if (this.character) {
            this.controls.target.copy(this.character.position); // Set the controls' target to the cube's position
            this.controls.update(); // Update the controls to reflect the new target
        }

        if (this.animationMixers.length > 0) {
            this.animationMixers.forEach(mixer => {
                mixer.update((1 / 60) * 1.5);
            });     
        }
    }
}

export default TestLabScene;