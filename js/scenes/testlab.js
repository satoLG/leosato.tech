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
        this.character = null; // this.character model
        this.torchLight = null;
        this.torchLightAngle = 0; // Angle for moving the light
        this.cubeVelocity = new THREE.Vector3(0, 0, 0); // Velocity for the cube
        this.isJumping = false; // Flag to track if the cube is in the air        
        this.keys = {}; // Track key presses

        this.objectModels = [];
        this.animationMixers = [];

        // Touchscreen variables
        this.touchStart = { x: 0, y: 0 };
        this.touchEnd = { x: 0, y: 0 };

        // Add touch event listeners
        window.addEventListener('touchstart', (event) => this.onTouchStart(event), false);
        window.addEventListener('touchmove', (event) => this.onTouchMove(event), false);
        window.addEventListener('touchend', (event) => this.onTouchEnd(event), false);
    }

    onTouchStart(event) {
        // Record the starting position of the touch
        this.touchStart.x = event.touches[0].clientX;
        this.touchStart.y = event.touches[0].clientY;
    }
    
    onTouchMove(event) {
        // Update the current touch position
        this.touchEnd.x = event.touches[0].clientX;
        this.touchEnd.y = event.touches[0].clientY;
    }
    
    onTouchEnd() {
        // Calculate the swipe direction
        const deltaX = this.touchEnd.x - this.touchStart.x;
        const deltaY = this.touchEnd.y - this.touchStart.y;
    
        // Determine the swipe direction
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe
            if (deltaX > 0) {
                this.keys['d'] = true; // Swipe right -> Move right
            } else {
                this.keys['a'] = true; // Swipe left -> Move left
            }
        } else {
            // Vertical swipe
            if (deltaY > 0) {
                this.keys['s'] = true; // Swipe down -> Move backward
            } else {
                this.keys['w'] = true; // Swipe up -> Move forward
            }
        }
    
        // Reset keys after a short delay to simulate a single movement
        setTimeout(() => {
            this.keys['w'] = false;
            this.keys['a'] = false;
            this.keys['s'] = false;
            this.keys['d'] = false;
        }, 200); // Adjust the delay as needed
    }

    populateScene() {
        // Create a perspective camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 10;

        // Create orbit controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

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

        // Add global ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3); // Soft white light
        this.scene.add(ambientLight);

        // Load minecraft.png texture for objects
        const minecraftTexture = textureLoader.load('textures/testlab/minecraft.png');
        minecraftTexture.magFilter = THREE.NearestFilter; // Pixelated look for the first cube

        // Create a cube and apply the minecraft texture
        const cubeGeometry = new THREE.BoxGeometry();
        const cubeMaterial = new THREE.MeshStandardMaterial({ map: minecraftTexture });
        this.cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        this.cube.position.set(2.5, -2, 2.5); // Slightly closer
        this.scene.add(this.cube);

        this.cube.boundingBox = new THREE.Box3().setFromObject(this.cube);

        // Create a second cube with bad resolution
        const lowResTexture = textureLoader.load('textures/testlab/minecraft.png');
        lowResTexture.magFilter = THREE.LinearFilter; // Blurry look for the second cube
        const cube2Geometry = new THREE.BoxGeometry();
        const cube2Material = new THREE.MeshStandardMaterial({ map: lowResTexture });
        this.cube2 = new THREE.Mesh(cube2Geometry, cube2Material);
        this.cube2.position.set(-2.5, 0, -2.5); // Slightly closer
        this.scene.add(this.cube2);

        this.cube2.boundingBox = new THREE.Box3().setFromObject(this.cube2);

        // Create a sphere and apply the minecraft texture
        const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        const sphereMaterial = new THREE.MeshStandardMaterial({ map: minecraftTexture });
        this.sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        this.sphere.position.set(0, 1.5, 0); // Slightly closer
        this.scene.add(this.sphere);

        this.sphere.boundingBox = new THREE.Box3().setFromObject(this.sphere);

        // Create a donut (torus) and apply the minecraft texture
        const donutGeometry = new THREE.TorusGeometry(0.5, 0.2, 16, 100);
        const donutMaterial = new THREE.MeshStandardMaterial({ map: minecraftTexture });
        this.donut = new THREE.Mesh(donutGeometry, donutMaterial);
        this.donut.position.set(0, -1.5, 0); // Slightly closer
        this.scene.add(this.donut);

        this.donut.boundingBox = new THREE.Box3().setFromObject(this.donut);

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
        this.plane.position.set(0, -0.5, 0); // Slightly closer
        this.plane.receiveShadow = true; // Allow the plane to receive shadows
        this.scene.add(this.plane);

        this.plane.boundingBox = new THREE.Box3().setFromObject(this.plane);

        // Add a moving point light resembling a torch
        this.torchLight = new THREE.PointLight(0xffa500, 2, 20); // Increased intensity and range
        this.torchLight.position.set(0, 2, 0); // Initial position
        this.scene.add(this.torchLight);

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
        this.loadModel(loader, 'models/testlab/steve.glb', [0, -0.5, 0], [1, 1, 1], [0, 0, 0], true);

        // Add event listeners for keyboard input
        window.addEventListener('keydown', (event) => {
            this.keys[event.key] = true;

            // Handle jump on space bar press
            if (event.key === ' ' && !this.isJumping) {
                this.cubeVelocity.y = 0.2; // Initial upward velocity
                this.isJumping = true; // Set jumping flag
            }
        });

        window.addEventListener('keyup', (event) => {
            this.keys[event.key] = false;
        });
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

        // Add a bounding box for collision detection
        model.boundingBox = new THREE.Box3().setFromObject(model);

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

    checkCollisions() {
        const character = this.character; // The moving object (e.g., the cube or character)
        if (!character || !character.boundingBox) return;
    
        // Check collisions with other geometries
        [this.cube, this.sphere].forEach((geometry) => {
            if (geometry && geometry.boundingBox) {
                if (character.boundingBox.intersectsBox(geometry.boundingBox)) {
                    console.log('Collision detected with:', geometry);
    
                    // Handle collision (e.g., stop movement)
                    this.handleCollision(character, geometry);
                }
            }
        });
    }

    handleCollision(character) {
        // Example: Stop the character's movement
        this.cubeVelocity.set(0, 0, 0); // Stop velocity
        character.position.sub(this.cubeVelocity); // Prevent further movement
        console.log('Collision handled between character and geometry.');
    }

    updateCubePosition() {
        this.character = this.objectModels[0]; // Assuming the first model is the character
        if (!this.character) return; // Ensure the character is loaded
    
        const speed = 0.1; // Fixed movement speed per frame
        const direction = new THREE.Vector3();
    
        // Check for movement keys
        if (this.keys['w'] || this.keys['W']) direction.z -= 1; // Forward
        if (this.keys['s'] || this.keys['S']) direction.z += 1; // Backward
        if (this.keys['a'] || this.keys['A']) direction.x -= 1; // Left
        if (this.keys['d'] || this.keys['D']) direction.x += 1; // Right
    
        if (direction.length() > 0) {
            direction.normalize(); // Normalize to prevent faster diagonal movement
            direction.multiplyScalar(speed); // Scale by fixed speed
            this.character.position.add(direction); // Update character position
    
            // Rotate the character to face the movement direction
            const angle = Math.atan2(direction.x, direction.z); // Calculate the angle
            this.character.rotation.y = angle; // Set the character's Y-axis rotation

            // Transition to the walking animation
            if (this.character.animations) {
                const walkingAction = this.character.animations['Skeleton|Walking'];
                const idleAction = this.character.animations['Skeleton|Idle'];
    
                if (idleAction && idleAction.isRunning()) {
                    idleAction.fadeOut(0.1); // Fade out the idle animation
                    setTimeout(() => {
                        idleAction.stop(); // Stop the walking animation after fading out
                    }, 100); // Match the fade out duration
                }
    
                if (walkingAction && !walkingAction.isRunning()) {
                    walkingAction.reset().fadeIn(0.2).play(); // Smoothly fade in the walking animation
                }
            }
        } else {
            // Transition to the idle animation
            if (this.character.animations) {
                const walkingAction = this.character.animations['Skeleton|Walking'];
                const idleAction = this.character.animations['Skeleton|Idle'];
    
                if (walkingAction && walkingAction.isRunning()) {
                    walkingAction.fadeOut(0.1); // Fade out the walking animation
                    setTimeout(() => {
                        walkingAction.stop(); // Stop the walking animation after fading out
                    }, 100); // Match the fade out duration
                }
    
                if (idleAction && !idleAction.isRunning()) {
                    idleAction.reset().fadeIn(0.2).play(); // Smoothly fade in the idle animation
                }
            }
        }
    }    

    applyGravity() {
        this.character = this.objectModels[0]; // Assuming the first model is the this.character
        if (!this.character) return; // Ensure the this.character is loaded

        const gravity = -0.01; // Gravity force

        // Apply gravity to the cube's velocity
        this.cubeVelocity.y += gravity;

        // Update the cube's position based on its velocity
        this.character.position.y += this.cubeVelocity.y;

        // Check if the cube has landed on the ground
        if (this.character.position.y <= -0.5) {
            this.character.position.y = -0.5; // Reset to ground level
            this.cubeVelocity.y = 0; // Stop vertical movement
            this.isJumping = false; // Reset jumping flag
        }
    }

    customAnimate() {
        this.controls.update();

        // Update bounding boxes for all geometries
        if (this.cube && this.cube.boundingBox) {
            this.cube.boundingBox.setFromObject(this.cube);
        }
        if (this.sphere && this.sphere.boundingBox) {
            this.sphere.boundingBox.setFromObject(this.sphere);
        }

        // Check for collisions
        this.checkCollisions();

        // Rotate all meshes slowly in random directions
        if (this.cube) this.cube.rotation.y += 0.01;
        if (this.cube2) this.cube2.rotation.x += 0.01;
        if (this.sphere) this.sphere.rotation.z += 0.01;
        if (this.donut) this.donut.rotation.y += 0.01;
        if (this.cone) this.cone.rotation.x += 0.01;
        if (this.cylinder) this.cylinder.rotation.z += 0.01;
        if (this.cobbleCube) this.cobbleCube.rotation.y += 0.01;

        // Move the torch light in a circular path
        this.torchLightAngle += 0.02; // Increment angle
        this.torchLight.position.x = Math.sin(this.torchLightAngle) * 3; // Circular motion
        this.torchLight.position.z = Math.cos(this.torchLightAngle) * 3;
    
        // Update cube position based on WASD input
        this.updateCubePosition();

        // // Apply gravity and handle jumping
        this.applyGravity();

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