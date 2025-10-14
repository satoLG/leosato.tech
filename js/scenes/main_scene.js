import ThreejsScene from '../base/scene.js';
import DialogManager from '../base/DialogManager.js?v=4';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

class MainScene extends ThreejsScene {
    constructor(debugGui=null) {
        super(debugGui);
        this.cssScene = new THREE.Scene();
        this.cssRenderer = null;
        this.iframeSizes = { width: 150, height: 60 };

        this.geometries = [];
        this.textMeshes = [];
        this.animationMixers = [];
        this.controls = null;
        this.active3d = false; // Set to true for 3D mode, false for 2D mode
        this.mode3dTransition = false; // Flag to indicate if the transition to 3D mode is in progress
    
        // Initialize Cannon.js physics world
        this.physicsWorld = new CANNON.World();
        this.physicsWorld.gravity.set(0, -400, 0); // Increase gravity intensity
        
        // Enable sleeping to reduce unnecessary calculations and prevent jittering
        this.physicsWorld.allowSleep = true;
        this.physicsWorld.sleepSpeedLimit = 0.1; // If speed is below this, body can sleep
        this.physicsWorld.sleepTimeLimit = 1; // Body must be slow for this long to sleep
        
        this.physicsBodies = []; // Store physics bodies for cubes

        // Ocean physics configuration
        this.oceanLevel = -1; // Y position of ocean surface (matches oceanMesh.position.y)
        this.gravityConfig = {
            normal: -375, // Normal gravity (above ocean)
            underwater: 75, 
            damping: 0.85, 
            hysteresis: 3.5
        };

        // Track underwater state for each body to prevent flickering
        this.bodyUnderwaterStates = new Map(); // body -> {isUnderwater: boolean}

        // Raycaster and interaction properties
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedCube = null; // The cube currently being dragged
        this.offset = new THREE.Vector3(); // Offset between the cube and the mouse
        this.lastClickTime = null; // For double-click detection

        this.pixelControls = null;
        this.pixelSizeController = null;
        
        // Audio setup
        this.seabreezeAudio = null;
        this.seagullAudio = null;
        this.beachAudio = null; // Renamed from flyawayAudio
        this.welcomeAudio = null; // New welcome music
        this.audioLoaded = false;
        this.loadAudio();

        // Seagull animation properties
        this.seagulls = [];
        this.seagullMixers = [];
        this.seagullConfig = {
            introFlightDuration: 8000, // Duration for initial flight to center (slower: 4000 → 6000ms)
            circularFlightRadius: 150, // Radius for circular flight around center
            circularFlightSpeed: 0.5, // Speed of circular movement (slower: 0.5 → 0.3)
            circularFlightHeight: 320, // Height above ground for circular flight (increased for more natural look)
            spawnDistance: 800, // Distance from center where seagulls spawn
            spawnHeight: 120, // Initial spawn height (increased for higher flight)
            wingFlappingSpeed: 0.6, // Speed of wing flapping animation (1.0 = normal, 0.5 = half speed)
            musicDelay: 3000 // Delay before background music starts
        };

        // Camera animation properties
        this.cameraConfig = {
            initialAngleUp: 0, // Initial upward angle in DEGREES - MORE EXTREME for testing
            finalAngleUp: 0, // Final angle in DEGREES (looking at center)
            introStarted: false,
            modelsLoaded: false,
            angleAnimationStarted: false,
            angleAnimationCompleted: false,
            currentTargetDistance: null
        };

        // Start button and loading state
        this.startButton = null;
        this.allModelsLoaded = false;
        
        // Dialog Manager - will be initialized after camera and renderer are ready
        this.dialogManager = null;
    }

    loadAudio() {
        // Seabreeze ambient audio
        this.seabreezeAudio = new Audio('sounds/background/seabreeze_high.wav');
        this.seabreezeAudio.loop = true;
        // this.seabreezeAudio.volume = 0.8;
        
        // Seagull sound effect
        this.seagullAudio = new Audio('sounds/background/seagulls.wav');
        // this.seagullAudio.volume = 0.3;
        
        // Background music
        this.beachAudio = new Audio('sounds/music/beach.mp3');
        this.beachAudio.loop = true;
        // this.beachAudio.volume = 0.2;
        
        // Welcome music
        this.welcomeAudio = new Audio('sounds/music/welcome.mp3');
        this.welcomeAudio.loop = false; // Play once
        // this.welcomeAudio.volume = 0.3;
        
        let audioLoadedCount = 0;
        const totalAudioFiles = 4; // Updated count
        
        const checkAllAudioLoaded = () => {
            audioLoadedCount++;
            if (audioLoadedCount === totalAudioFiles) {
                this.audioLoaded = true;
                console.log('All audio files loaded and ready to play');
            }
        };
        
        this.seabreezeAudio.addEventListener('canplaythrough', checkAllAudioLoaded);
        this.seagullAudio.addEventListener('canplaythrough', checkAllAudioLoaded);
        this.beachAudio.addEventListener('canplaythrough', checkAllAudioLoaded);
        this.welcomeAudio.addEventListener('canplaythrough', checkAllAudioLoaded);
        
        this.seabreezeAudio.addEventListener('error', (e) => {
            console.error('Error loading seabreeze audio:', e);
        });
        this.seagullAudio.addEventListener('error', (e) => {
            console.error('Error loading seagull audio:', e);
        });
        this.beachAudio.addEventListener('error', (e) => {
            console.error('Error loading beach audio:', e);
        });
        this.welcomeAudio.addEventListener('error', (e) => {
            console.error('Error loading welcome audio:', e);
        });
        
        // Preload all audio
        this.seabreezeAudio.load();
        this.seagullAudio.load();
        this.beachAudio.load();
        this.welcomeAudio.load();
    }

    playSeabreezeAudio() {
        if (this.seabreezeAudio && this.audioLoaded) {
            // Handle user interaction requirement for audio
            this.seabreezeAudio.play().then(() => {
                console.log('Seabreeze audio started playing');
            }).catch((error) => {
                console.log('Audio play failed (likely needs user interaction):', error);
                // Add a one-time click listener to start audio
                document.addEventListener('click', () => {
                    this.seabreezeAudio.play().then(() => {
                        console.log('Seabreeze audio started playing after user interaction');
                    }).catch((e) => {
                        console.error('Audio play failed even after user interaction:', e);
                    });
                }, { once: true });
            });
        } else {
            console.log('Audio not loaded yet, will try again in 1 second');
            setTimeout(() => this.playSeabreezeAudio(), 1000);
        }
    }

    populateScene() {
        // Scene setup
        const pmremGenerator = new THREE.PMREMGenerator( this.renderer );
        this.scene.environment = pmremGenerator.fromScene( new RoomEnvironment(), 0.07 ).texture;

        this.scene.background = new THREE.Color('#57a2df');

        // Add exponential fog
        this.scene.fog = new THREE.FogExp2('#57a2df', 0.00045);

        // Add camera
        this.camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 5500 );
        
        // Add OrbitControls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.target.set(0, 0, 0); // Start target at scene center
        this.controls.enableZoom = true; // Enable zooming
        this.controls.enablePan = true; // Enable panning
        this.controls.maxPolarAngle = Math.PI / 2.2; // Allow camera to look down to ground level
        this.controls.minPolarAngle = Math.PI / 6; // Allow camera to look up (30 degrees from vertical)
        this.controls.minDistance = 300; // Minimum zoom distance
        this.controls.maxDistance = 1200; // Maximum zoom distance
        
        // DISABLE OrbitControls initially - will be enabled after intro animation
        this.controls.enabled = false;
        
        // Set camera to start HIGH UP in the sky - MUST match intro animation start values
        const startDistance = 1500; // Same as animation
        const targetPosition = new THREE.Vector3(0, -5, 0); // Same as animation target
        
        // Position camera HIGH UP in the sky - exactly like animation start
        const x = 0;
        const startY = 2200; // Same as animation startY - High up in the sky
        const z = targetPosition.z + startDistance;
        
        this.camera.position.set(x, startY, z);
        
        // Set OrbitControls target high in the sky - same as animation
        const skyTargetY = startY + 1500; // Same calculation as animation
        this.controls.target.set(targetPosition.x, skyTargetY, targetPosition.z);
        this.controls.update(); // Apply the target
        
        console.log('Initial camera setup (matching intro animation):', {
            position: this.camera.position,
            target: this.controls.target,
            startDistance: startDistance,
            startY: startY,
            skyTargetY: skyTargetY,
            lookingUp: true
        });
        
        this.controls.update();

        // Initialize Dialog Manager
        this.dialogManager = new DialogManager(this.camera, this.renderer);
        this.setupDialogTranslations();

        // Add lights
        this.createLights();

        // Add island
        this.createIsland();

        this.createOcean();

        let cubeSize = Math.abs((window.innerWidth) * (this.isMobile() ? 0.085 : 0.02)); // Size of the cubes

        this.addNewCube(
            'textures/main/linkedin.png', 
            'https://www.linkedin.com/in/leonardo-gutierrez-sato/',
            'LinkedIn',
            cubeSize, 
            new THREE.Vector3(-30.1, 50, -30.1)
        );
        this.addNewCube(
            'textures/main/github.png', 
            'https://github.com/satoLG', 
            'GitHub',
            cubeSize, 
            new THREE.Vector3(30.1, 50, 30.1)
        );
        this.addNewCube(
            'textures/main/codepen.png', 
            'https://codepen.io/satoLG', 
            'CodePen',
            cubeSize, 
            new THREE.Vector3(45.1, 50, -45.1)
        );
        this.addNewCube(
            'textures/main/instagram.jpg', 
            'https://www.instagram.com/sato_leo_kun/',
            'Instagram',
            cubeSize, 
            new THREE.Vector3(35, 80, -18)
        );
        this.addNewCube(
            'textures/main/whatsapp.jpeg', 
            'https://wa.me/11952354083', 
            'WhatsApp',
            cubeSize, 
            new THREE.Vector3(15, 80, -38)
        );
        this.addNewCube(
            'textures/main/gmail.png', 
            'mailto:leonardogsato@gmail.com', 
            'Gmail',
            cubeSize, 
            new THREE.Vector3(-20, 80, 38)
        );

        // Add text
        const fontPaths = {
            helvetiker: 'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',
            optimer: 'https://threejs.org/examples/fonts/optimer_regular.typeface.json',
            gentilis: 'https://threejs.org/examples/fonts/gentilis_regular.typeface.json',
        };        
        
        // this.addText(
        //     `leo`, 
        //     fontPaths.helvetiker, [0, 350, 25], 20, [0, Math.PI/.5, 0], .27, 'brown'
        // );
        // this.addText(
        //     `sato`, 
        //     fontPaths.helvetiker, [-3, 350, 35], 20, [0, Math.PI/.5, 0], .27, 'brown'
        // );        

        // Add debug GUI features
        if (this.debugGui) {
            setTimeout(() => {
                this.addDebugGui();
            }, 2000);
        }

        //Add touchmove event for touch devices
        window.addEventListener('touchmove', (event) => {
            // Touch move functionality can be handled here if needed
            // Currently simplified without drop zone logic
        });

        // Add mouse event listeners
        window.addEventListener('mousedown', (event) => {
            // Don't prevent default - let OrbitControls handle it if no object is selected
            this.onMouseDown(event);
        });

        window.addEventListener('mousemove', (event) => {
            // Don't prevent default - let OrbitControls handle it if no object is selected
            this.onMouseMove(event);
        });

        window.addEventListener('mouseup', (event) => {
            // Don't prevent default - let OrbitControls handle it if no object is selected
            this.onMouseUp(event);
        });

        // Add touch event listeners
        window.addEventListener('touchstart', (event) => {
            // Only prevent default if we're interacting with an object
            this.onTouchStart(event);
        }, { passive: false });

        window.addEventListener('touchmove', (event) => {
            // Only prevent default if we're dragging an object
            if (this.selectedCube) {
                event.preventDefault();
            }
            this.onTouchMove(event);
        }, { passive: false });

        window.addEventListener('touchend', (event) => {
            // Only prevent default if we were dragging an object
            this.onTouchEnd(event);
        }, { passive: false });

        // Update boundaries on window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
        


        // Current pixel size state
        this.pixelControls = {
            pixelSize: 1,
            isHighPixel: false, // false = low pixel (100), true = high pixel (10)
            isAnimating: false // Flag to prevent multiple animations
        };

        this.composer = new EffectComposer( this.renderer );
        this.renderPixelatedPass = new RenderPixelatedPass( this.pixelControls.pixelSize, this.scene, this.camera );
        this.renderPixelatedPass.normalEdgeStrength = 0;
        this.composer.addPass( this.renderPixelatedPass );

        this.outputPass = new OutputPass();
        this.composer.addPass( this.outputPass );

        // document.getElementById('loading-screen').style.display = '';
        // Loading manager
        const loadingManager = new THREE.LoadingManager(
            () => {
                // All models loaded
                this.allModelsLoaded = true;
                console.log('All models loaded, ready for intro animation');
                
                // Setup start button after a short delay
                setTimeout(() => {
                    this.setupStartButton();
                    // Show start button with growing animation
                    const startButtonContainer = document.getElementById('start-button');
                    if (startButtonContainer) {
                        startButtonContainer.style.display = 'flex';
                        // Force reflow to ensure display change is applied
                        startButtonContainer.offsetHeight;
                        // Add show class to trigger growing animation
                        startButtonContainer.classList.add('show');
                    }
                }, 1000);
            },
            (itemUrl, itemsLoaded, itemsTotal) => {
                // On progress
                console.log(`Loading progress: ${itemsLoaded}/${itemsTotal} - ${itemUrl}`);
            },
            (url) => {
                // On load start
                console.log('Started loading:', url);
            }
        );

        //Setup model loader
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath( 'jsm/' );
        const loader = new GLTFLoader(loadingManager);
        loader.setDRACOLoader( dracoLoader );

        

        //Load the tree model - positioned to come out of island top
        this.loadModel(loader, 'models/tree.glb', [0, 35, 0], [25, 25, 25], [0, 0, 0], true, 
            null, // no physics config - tree doesn't need collision
            (model) => {
                // Store reference to palm tree for dialog interaction
                this.tree = model;
                
                // Add click interaction for palm tree
                model.userData.interactive = true;
                model.userData.dialogKey = 'tree_intro';
            }
        );

        this.loadModel(loader, 'models/rock.glb', [250, 15, -250], [1, 1, 1], [0, 0, 0], true, 
            null, // no physics config - tree doesn't need collision
            (model) => {
                // Store reference to rock for dialog interaction
                this.rock = model;

                // Add click interaction for rock
                model.userData.interactive = true;
                model.userData.dialogKey = 'rock_intro';
            }
        );

        this.loadModel(loader, 'models/rock.glb', [-250, 15, -90], [.7, .7, .7], [0, Math.PI / 2, 0], true, 
            null, // no physics config - tree doesn't need collision
            (model) => {
                // Store reference to rock for dialog interaction
                this.rock = model;

                // Add click interaction for rock
                model.userData.interactive = true;
                model.userData.dialogKey = 'rock_intro';
            }
        );
        this.loadModel(loader, 'models/rock.glb', [-255, 10, -5], [.5, .5, .5], [0, Math.PI / 4, 0], true, 
            null, // no physics config - tree doesn't need collision
            (model) => {
                // Store reference to rock for dialog interaction
                this.rock = model;

                // Add click interaction for rock
                model.userData.interactive = true;
                model.userData.dialogKey = 'rock_intro';
            }
        );

        // Load wooden boat - static like island, objects can sit on it
        this.loadModel(loader, 'models/boat.glb', [180, -20, 180], [0.3, 0.3, 0.3], [0, Math.PI / 4, 0], true,
            {
                type: 'static', // Static physics like island - won't move
                mass: 0, // No mass - completely static
                shape: 'box',
                sizeMultiplier: 0.7, // Reduced size - 70% of model size for better collision accuracy
                material: new CANNON.Material({ friction: 0.8, restitution: 0.2 })
            },
            (model) => {
                // Store reference to boat 
                this.boat = model;
                
                // No interactivity - boat is purely decorative/platform
                // model.userData.interactive = false; // Not interactive
                // model.userData.dialogKey = undefined; // No dialog
                // model.userData.draggable = false; // Not draggable
                model.userData.name = 'Wooden Boat (Static Platform)';
                
                // Don't add to geometries array since it's not interactive
                // this.geometries.push(model); // Removed - no interaction needed
                
                console.log('Wooden boat loaded as static platform - objects can sit on it, no interaction');
            }
        );

        // Load wooden crate - same size as cubes, with physics
        this.loadModel(loader, 'models/wooden_crate.glb', [60, 50, 30], [cubeSize * 0.5, cubeSize * 0.5, cubeSize * 0.5], [0, Math.PI / 6, 0], true,
            {
                type: 'dynamic',
                mass: 1,
                shape: 'box',
                sizeMultiplier: 1.0, // Use full size for physics body
                material: new CANNON.Material({ friction: 0.6, restitution: 0.2 })
            },
            (model) => {
                // Store reference to crate
                this.crate = model;
                
                // Add to geometries array for interaction and physics updates
                this.geometries.push(model);
                
                // Add interaction data like cubes - both draggable AND shows dialog on double-click
                model.userData.interactive = true;
                model.userData.draggable = true;
                model.userData.dialogKey = 'crate_interaction';
                model.userData.name = 'Wooden Crate';
                
                console.log('Wooden crate loaded with draggable physics like cubes');
            }
        );

        this.loadModel(loader, 'models/wooden_crate.glb', [60, 50, 160], [cubeSize * 0.5, cubeSize * 0.5, cubeSize * 0.5], [0, Math.PI / 6, 0], true,
            {
                type: 'dynamic',
                mass: 1,
                shape: 'box',
                sizeMultiplier: 1.0, // Use full size for physics body
                material: new CANNON.Material({ friction: 0.6, restitution: 0.2 })
            },
            (model) => {
                // Store reference to crate
                this.crate = model;
                
                // Add to geometries array for interaction and physics updates
                this.geometries.push(model);
                
                // Add interaction data like cubes - both draggable AND shows dialog on double-click
                model.userData.interactive = true;
                model.userData.draggable = true;
                model.userData.dialogKey = 'crate_interaction';
                model.userData.name = 'Wooden Crate';
                
                console.log('Wooden crate loaded with draggable physics like cubes');
            }
        );

        // Load me.glb character model - fixed position next to tree
        this.loadModel(loader, 'models/me.glb', [20, 45, 8], [1.5, 1.5, 1.5], [0, -Math.PI / 4, 0], true,
            null, // No physics - fixed position like island
            (model) => {
                // Store reference to character model
                this.characterModel = model;
                
                // Add click interaction for character - will show intro sequence first time
                model.userData.interactive = true;
                model.userData.dialogKey = 'leo_intro_sequence';
                model.userData.hasShownIntro = false; // Track if intro sequence was shown
                
                console.log('Character model (me.glb) loaded next to tree with intro sequence');
            }
        );

        // Load seagull models for intro animation
        this.loadSeagullModels(loader);

    }

    isMobile() {
        return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    getPredominantColor(texture, callback) {
        // Create a canvas to draw the texture
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
    
        // Wait for the texture to load
        const image = texture.image;
        if (!image) {
            console.error('Texture image not loaded.');
            return;
        }
    
        // Set canvas size to match the texture
        canvas.width = image.width;
        canvas.height = image.height;
    
        // Draw the texture onto the canvas
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
    
        // Get pixel data
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
    
        // Calculate the average color
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
            r += data[i];     // Red
            g += data[i + 1]; // Green
            b += data[i + 2]; // Blue
            count++;
        }
    
        // Average the colors
        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);
    
        // Convert to a CSS-compatible color
        const color = `rgb(${r}, ${g}, ${b})`;
    
        // Return the color via callback
        if (callback) callback(color);
    }



    onWindowResize() {
        // Update camera aspect ratio and projection matrix
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    
        // Update renderer size
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onMouseDown(event) {
        // Calculate mouse position in normalized device coordinates
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
        // Use raycaster to find intersected objects
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.geometries);
    
        if (intersects.length > 0) {
            // Check if the intersected object is an interactive model
            const intersectedObject = intersects[0].object;
            let parentModel = intersectedObject;
            
            // Find the root model by traversing up the hierarchy
            while (parentModel.parent && parentModel.parent.type !== 'Scene') {
                parentModel = parentModel.parent;
            }
            
            // Check if this is an interactive model (but NOT a draggable cube)
            if (parentModel.userData && parentModel.userData.interactive && !parentModel.userData.draggable) {
                this.handleModelInteraction(parentModel, intersects[0].point);
                return;
            }
            
            // Handle cubes - they are both draggable AND can show dialogs on double-click
            if (parentModel.userData && parentModel.userData.draggable) {
                // Check for double-click to show dialog
                const now = Date.now();
                if (this.lastClickTime && (now - this.lastClickTime) < 300) {
                    // Double-click detected - show dialog
                    this.handleModelInteraction(parentModel, intersects[0].point);
                    this.lastClickTime = null; // Reset to prevent triple-click issues
                    return;
                } else {
                    // Single click - start dragging
                    this.lastClickTime = now;
                    // Continue to dragging logic below
                }
                
                // Only continue to dragging logic if object is actually draggable
                // Prevent OrbitControls from handling this event
                event.preventDefault();
                event.stopPropagation();
                
                // Disable OrbitControls when dragging objects
                this.controls.enabled = false;
            } else {
                // Object is not draggable, don't interfere with OrbitControls
                return;
            }
            
            // Select the parent model instead of child mesh for boats and other models
            this.selectedCube = parentModel;

            // Create a plane perpendicular to the camera's viewing direction
            // This allows movement in 3D space relative to the camera view
            const cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);
            const plane = new THREE.Plane(cameraDirection, -cameraDirection.dot(this.selectedCube.position));
    
            // Calculate the intersection point
            const intersectionPoint = new THREE.Vector3();
            this.raycaster.ray.intersectPlane(plane, intersectionPoint);
    
            // Calculate the offset between the intersection point and the object's position
            this.offset.copy(intersectionPoint).sub(this.selectedCube?.position);
    
            // Disable physics for the selected object
            if (this.selectedCube.userData && this.selectedCube.userData.physicsBody) {
                // For models with userData.physicsBody (like boats)
                const body = this.selectedCube.userData.physicsBody;
                body.type = CANNON.Body.KINEMATIC; // Kinematic bodies are not affected by forces
                body.velocity.set(0, 0, 0); // Clear velocities
                body.angularVelocity.set(0, 0, 0);
                body.wakeUp();
            } else {
                // Fallback for cubes
                const index = this.geometries.indexOf(this.selectedCube);
                if (index !== -1 && this.physicsBodies[index]) {
                    const body = this.physicsBodies[index];
                    body.type = CANNON.Body.KINEMATIC;
                    body.velocity.set(0, 0, 0);
                    body.angularVelocity.set(0, 0, 0);
                    body.wakeUp();
                }
            }

            console.log('Selected Cube:', this.selectedCube);
        }
    }
    
    onMouseMove(event) {
        if (this.selectedCube) {
            // Prevent default only when dragging
            event.preventDefault();
            
            // Calculate mouse position in normalized device coordinates
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
            // Create a plane perpendicular to the camera's viewing direction
            // This allows movement in 3D space relative to the camera view
            const cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);
            const plane = new THREE.Plane(cameraDirection, -cameraDirection.dot(this.selectedCube.position));
    
            console.log('Selected Cube:', this.selectedCube);
        }
    }
    
    onMouseMove(event) {
        if (this.selectedCube) {
            // Prevent default only when dragging
            event.preventDefault();
            event.stopPropagation();
            
            // Calculate mouse position in normalized device coordinates
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
            // Create a plane perpendicular to the camera's viewing direction
            // This allows movement in 3D space relative to the camera view
            const cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);
            const plane = new THREE.Plane(cameraDirection, -cameraDirection.dot(this.selectedCube.position));
    
            // Use raycaster to find the intersection point in 3D space
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersectionPoint = new THREE.Vector3();
            this.raycaster.ray.intersectPlane(plane, intersectionPoint);
    
            // Update the position of the selected object
            this.selectedCube.position.copy(intersectionPoint.sub(this.offset));
    
            // Update the physics body position - use userData.physicsBody if available
            if (this.selectedCube.userData && this.selectedCube.userData.physicsBody) {
                const offset = this.selectedCube.userData.physicsOffset || new THREE.Vector3(0, 0, 0);
                // Add offset to model position to get physics body position
                const physicsPosition = this.selectedCube.position.clone().add(offset);
                this.selectedCube.userData.physicsBody.position.copy(physicsPosition);
            } else {
                // Fallback to index-based lookup for cubes
                const index = this.geometries.indexOf(this.selectedCube);
                if (index !== -1 && this.physicsBodies[index]) {
                    this.physicsBodies[index].position.copy(this.selectedCube.position);
                }
            }
        }
    }
    
    onMouseUp(event) {
        if (this.selectedCube) {
            // Re-enable OrbitControls
            this.controls.enabled = true;
            
            // Reset the physics body to dynamic
            if (this.selectedCube.userData && this.selectedCube.userData.physicsBody) {
                // Use userData.physicsBody for models like boats
                const body = this.selectedCube.userData.physicsBody;
                body.type = CANNON.Body.DYNAMIC;
                
                // Sync the physics body position with the visual object - account for physics offset
                const offset = this.selectedCube.userData.physicsOffset || new THREE.Vector3(0, 0, 0);
                const physicsPosition = this.selectedCube.position.clone().add(offset);
                body.position.copy(physicsPosition);
                body.quaternion.copy(this.selectedCube.quaternion);
                
                // Apply a small impulse to wake up the physics body
                const impulse = new CANNON.Vec3(0, 1, 0);
                body.applyImpulse(impulse);
                body.wakeUp();
            } else {
                // Fallback to index-based lookup for cubes
                const index = this.geometries.indexOf(this.selectedCube);
                if (index !== -1 && this.physicsBodies[index]) {
                    const body = this.physicsBodies[index];
                    body.type = CANNON.Body.DYNAMIC;
                    
                    body.position.copy(this.selectedCube.position);
                    body.quaternion.copy(this.selectedCube.quaternion);
                    
                    const impulse = new CANNON.Vec3(0, 1, 0);
                    body.applyImpulse(impulse);
                    body.wakeUp();
                }
            }
            
            // Clear the selected cube
            this.selectedCube = null;
            
            console.log('Released cube');
        }
    }

    onTouchStart(event) {
        // Extract touch position
        const touch = event.touches[0];
        const simulatedMouseEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => {}, // Prevent default behavior
            stopPropagation: () => {}, // Prevent event propagation            
        };
    
        // Calculate mouse position in normalized device coordinates
        this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    
        // Use raycaster to find intersected objects
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.geometries);
    
        if (intersects.length > 0) {
            // Prevent default only when touching an object
            event.preventDefault();
            // Disable OrbitControls when dragging objects
            this.controls.enabled = false;
        }
        
        // Reuse the onMouseDown logic
        this.onMouseDown(simulatedMouseEvent);
    }
    
    onTouchMove(event) {
        // Extract touch position
        const touch = event.touches[0];
        const simulatedMouseEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => {}, // Prevent default behavior
            stopPropagation: () => {}, // Prevent event propagation            
        };
    
        // Reuse the onMouseMove logic
        this.onMouseMove(simulatedMouseEvent);
    }
    
    onTouchEnd(event) {
        if (event.changedTouches.length > 0) {
            // Re-enable OrbitControls
            this.controls.enabled = true;
            
            // Extract touch position from changedTouches
            const touch = event.changedTouches[0];
            const simulatedMouseEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY,
                preventDefault: () => {}, // Prevent default behavior
                stopPropagation: () => {}, // Prevent event propagation
            };
    
            // Reuse the onMouseUp logic
            this.onMouseUp(simulatedMouseEvent);
        }
    }

    /**
     * Handle interaction with 3D models (like palm tree)
     */
    handleModelInteraction(model, intersectionPoint) {
        if (!this.dialogManager) return;
        
        const dialogKey = model.userData.dialogKey;
        if (!dialogKey) return;
        
        console.log(`Interacting with model: ${dialogKey}`);
        
        // Prevent rapid clicking by checking if a dialog is already being created
        if (this.dialogManager.isTransitioning) {
            console.log('Dialog interaction blocked - already transitioning');
            return;
        }
        
        // Special handling for Leo's intro sequence
        if (dialogKey === 'leo_intro_sequence') {
            if (!model.userData.hasShownIntro) {
                // Show intro sequence first time
                model.userData.hasShownIntro = true;
                const leoIntroId = this.dialogManager.showDialog({
                    textSequence: [
                        { textKey: 'leo_intro_1' },
                        { textKey: 'leo_intro_2' },
                        { textKey: 'leo_intro_3' }
                    ],
                    followObject: model,
                    followOffset: { x: 0, y: 150, z: 0 },
                    trianglePosition: 'bottom',
                    typewriterSpeed: 45,
                    onSequenceComplete: (dialogId) => {
                        console.log('Leo intro sequence completed, starting beach music');
                        // Start beach music after intro sequence
                        this.playBackgroundMusic();
                        
                        // Add dramatic delay before follow-up sequence
                        console.log('Starting 3-second dramatic pause before follow-up dialog...');
                        setTimeout(() => {
                            console.log('Starting Leo follow-up dialog sequence');
                            this.startLeoFollowUpSequence(model);
                        }, 3000); // 3-second delay for dramatic effect
                        
                        // Dialog will be closed automatically by DialogManager
                    }
                });
            } else if (model.userData.hasShownFullStory) {
                // Show brief interaction after full story is complete
                const characterDialogId = this.dialogManager.showDialog({
                    textKey: 'leo_brief_interaction',
                    followObject: model,
                    followOffset: { x: 0, y: 150, z: 0 },
                    trianglePosition: 'bottom',
                    autoClose: true,
                    autoCloseDelay: 4000,
                    typewriterSpeed: 40
                });
            } else {
                // Show regular character dialog (fallback)
                const characterDialogId = this.dialogManager.showDialog({
                    textKey: 'character_intro',
                    followObject: model,
                    followOffset: { x: 0, y: 150, z: 0 },
                    trianglePosition: 'bottom',
                    autoClose: true,
                    autoCloseDelay: 5000,
                    typewriterSpeed: 35
                });
            }
            return;
        }
        
        // Special handling for cubes - they should open links and show dialog
        if (model.userData.url && model.userData.name) {
            const customText = `${model.userData.name}`;
            
            this.dialogManager.showDialog({
                text: customText,
                followObject: model,
                followOffset: { x: 0, y: 100, z: 0 }, // Show dialog above the cube
                trianglePosition: 'bottom',
                autoClose: true,
                autoCloseDelay: 4000,
                typewriterSpeed: 45,
                onComplete: (dialogId) => {
                    // Store the URL in dialog for click handling
                    const dialog = this.dialogManager.activeDialogs.get(dialogId);
                    if (dialog) {
                        dialog.linkUrl = model.userData.url;
                    }
                }
            });
        } else {
            // Standard model interaction dialog
            this.dialogManager.showDialog({
                textKey: dialogKey,
                followObject: model,
                followOffset: { x: 0, y: 150, z: 0 }, // Show dialog above the model
                trianglePosition: 'bottom',
                autoClose: true,
                autoCloseDelay: 5000,
                typewriterSpeed: 45
            });
        }
    }

    addNewCube(texturePath, cubeUrl, cubeName, cubeSize, cubePosition) {
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load(texturePath);
        // texture.colorSpace = THREE.SRGBColorSpace
        texture.magFilter = THREE.NearestFilter; // Pixelated look for the cube
    
        // Preprocess the texture to replace transparent areas with white
        textureLoader.load(texturePath, (loadedTexture) => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
    
            // Set canvas size to match the texture
            canvas.width = loadedTexture.image.width;
            canvas.height = loadedTexture.image.height;
    
            // Draw the texture onto the canvas
            context.drawImage(loadedTexture.image, 0, 0);
    
            // Get image data
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
    
            // Replace transparent pixels with white
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] < 255) { // Check alpha channel
                    data[i] = 255;     // Red
                    data[i + 1] = 255; // Green
                    data[i + 2] = 255; // Blue
                    data[i + 3] = 255; // Alpha
                }
            }
    
            // Put the modified image data back onto the canvas
            context.putImageData(imageData, 0, 0);
    
            // Create a new texture from the canvas
            const processedTexture = new THREE.CanvasTexture(canvas);
    
            // Create a new cube with the processed texture
            const cubeGeometry = new RoundedBoxGeometry(cubeSize, cubeSize, cubeSize, 16, 0.5); // Width, Height, Depth, Segments, Radius
            const cubeMaterial = new THREE.MeshStandardMaterial({
                map: processedTexture,
                color: new THREE.Color('#ffffff'), // Changed to white for better lighting
                roughness: 0.5,
                metalness: 0.5
            });

            const newCube = new THREE.Mesh(cubeGeometry, cubeMaterial);
            newCube.position.set(cubePosition.x, cubePosition.y, cubePosition.z);

            newCube.castShadow = true; // Allow the cube to cast shadows
            newCube.receiveShadow = true; // Allow the cube to receive shadows

            newCube.name = `Cube ${cubeName}`; // Name based on the number of cubes
            newCube.userData = {
                name: cubeName, // Name of the cube
                url: cubeUrl, // URL to open on click
                texturePath: texturePath, // Path to the original texture
                originalPosition: { x: cubePosition.x, y: cubePosition.y, z: cubePosition.z } // Store original position for reset
            };

            // Add the cube to the scene
            this.scene.add(newCube);
            
            // CRITICAL: Add to geometries array for physics synchronization
            this.geometries.push(newCube);

            // Create physics body for the cube
            const cubeShape = new CANNON.Box(new CANNON.Vec3(cubeSize/2, cubeSize/2, cubeSize/2));
            const cubeBody = new CANNON.Body({
                mass: 1,
                position: new CANNON.Vec3(cubePosition.x, cubePosition.y, cubePosition.z),
                shape: cubeShape,
                linearDamping: 0.02,
                angularDamping: 0.02,
                material: new CANNON.Material({ friction: 0.6, restitution: 0 })
            });
            
            this.physicsWorld.addBody(cubeBody);
            this.physicsBodies.push(cubeBody);
            newCube.userData.physicsBody = cubeBody;
            
            // Create contact material between cube and island for proper collision
            if (this.groundBody && this.groundBody.material) {
                const cubeIslandContact = new CANNON.ContactMaterial(
                    cubeBody.material,
                    this.groundBody.material,
                    {
                        friction: 0.8,
                        restitution: 0.1, // Slight bounce
                        contactEquationStiffness: 1e8,
                        contactEquationRelaxation: 3,
                        frictionEquationStiffness: 1e8,
                        frictionEquationRelaxation: 3
                    }
                );
                this.physicsWorld.addContactMaterial(cubeIslandContact);
            }
            
            // Add interaction data for cubes - they are draggable AND can show dialogs
            newCube.userData.interactive = true;
            newCube.userData.draggable = true;
            newCube.userData.dialogKey = 'cube_interaction';
            newCube.userData.url = cubeUrl;
            newCube.userData.name = cubeName;

            console.log('New cube added with physics:', newCube);            
        });
    }

    addDebugGui() {
        const gui = this.debugGui.gui;

        // Pixelated render controls
        if (this.renderPixelatedPass) {
            const renderFolder = gui.addFolder('Render Effects');
            
            this.pixelSizeController = renderFolder.add(this.pixelControls, 'pixelSize', 1, 100)
                .name('Pixel Size')
                .step(1)
                .onChange((value) => {
                    // Update the pixelated pass pixel size
                    this.renderPixelatedPass.setPixelSize(value);
                    console.log('Pixel size changed to:', value);
                });

            // Toggle button for quick switching between 100 and 10
            renderFolder.add(this.pixelControls, 'isHighPixel')
                .name('Toggle Quality')
                .onChange((value) => {
                    const currentPixelSize = this.pixelControls.pixelSize;
                    const targetPixelSize = value ? 10 : 100;
                    
                    console.log('Starting pixel size transition from', currentPixelSize, 'to', targetPixelSize);
                    
                    // Animate from current value to target value
                    this.animatePixelSize(currentPixelSize, targetPixelSize);
                });
        }

        // Lights folder
        // const lightsFolder = gui.addFolder('Lights');
        // lightsFolder.add(this.scene.children[0].position, 'x', -100, 100).name('Light X');
        // lightsFolder.add(this.scene.children[0].position, 'y', -100, 100).name('Light Y');
        // lightsFolder.add(this.scene.children[0].position, 'z', -100, 100).name('Light Z');
        // lightsFolder.add(this.scene.children[0], 'intensity', 0, 10).name('Light Intensity');
    
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

        // Seagull Animation Controls
        const seagullFolder = gui.addFolder('Seagull Animation');
        
        seagullFolder.add(this.seagullConfig, 'introFlightDuration', 1000, 10000)
            .name('Intro Flight Duration (ms)')
            .step(100);
            
        seagullFolder.add(this.seagullConfig, 'circularFlightRadius', 50, 500)
            .name('Circular Flight Radius')
            .step(10);
            
        seagullFolder.add(this.seagullConfig, 'circularFlightSpeed', 0.1, 2)
            .name('Circular Flight Speed')
            .step(0.1);
            
        seagullFolder.add(this.seagullConfig, 'circularFlightHeight', 20, 200)
            .name('Circular Flight Height')
            .step(5);
            
        seagullFolder.add(this.seagullConfig, 'spawnDistance', 500, 1500)
            .name('Spawn Distance')
            .step(50);
            
        seagullFolder.add(this.seagullConfig, 'spawnHeight', 20, 200)
            .name('Spawn Height')
            .step(5);

        // Audio Controls
        const audioFolder = gui.addFolder('Audio Controls');
        
        audioFolder.add(this.seagullConfig, 'musicDelay', 0, 10000)
            .name('Music Delay (ms)')
            .step(100);

        // Manual audio controls
        const audioActions = {
            playSeagullSound: () => this.playSeagullSound(),
            playWelcomeMusic: () => this.playWelcomeMusic(),
            stopWelcomeMusic: () => this.stopWelcomeMusic(),
            playBackgroundMusic: () => this.playBackgroundMusic(),
            stopBackgroundMusic: () => {
                if (this.beachAudio) {
                    this.beachAudio.pause();
                    this.beachAudio.currentTime = 0;
                    console.log('Beach background music stopped');
                }
            },
            restartIntro: () => this.startIntroAnimation(),
            checkSeagulls: () => {
                console.log('Seagulls loaded:', this.seagulls.length);
                console.log('Seagull positions:', this.seagulls.map(s => s.position));
                console.log('Seagull visibility:', this.seagulls.map(s => s.visible));
            },
            showSeagulls: () => {
                this.seagulls.forEach((seagull, index) => {
                    seagull.visible = true;
                    console.log(`Seagull ${index + 1} made visible`);
                });
            }
        };
        
        audioFolder.add(audioActions, 'playSeagullSound').name('Play Seagull Sound');
        audioFolder.add(audioActions, 'playWelcomeMusic').name('Play Welcome Music');
        audioFolder.add(audioActions, 'stopWelcomeMusic').name('Stop Welcome Music');
        audioFolder.add(audioActions, 'playBackgroundMusic').name('Play Beach Music');
        audioFolder.add(audioActions, 'stopBackgroundMusic').name('Stop Beach Music');
        audioFolder.add(audioActions, 'restartIntro').name('Restart Intro Animation');
        audioFolder.add(audioActions, 'checkSeagulls').name('Check Seagulls Status');
        audioFolder.add(audioActions, 'showSeagulls').name('Show Seagulls Manually');

        // Ocean Physics Controls
        const physicsFolder = gui.addFolder('Ocean Physics');
        
        physicsFolder.add(this.gravityConfig, 'normal', -1000, 0)
            .name('Normal Gravity')
            .step(10)
            .onChange((value) => {
                this.physicsWorld.gravity.set(0, value, 0);
            });
            
        physicsFolder.add(this.gravityConfig, 'underwater', -100, 200)
            .name('Underwater Buoyancy')
            .step(5);
            
        physicsFolder.add(this.gravityConfig, 'damping', 0.1, 1)
            .name('Underwater Damping')
            .step(0.05);
            
        physicsFolder.add(this.gravityConfig, 'hysteresis', 0.5, 10)
            .name('Transition Hysteresis')
            .step(0.5);
            
        physicsFolder.add(this, 'oceanLevel', -50, 50)
            .name('Ocean Level (Y)')
            .step(1);

        // Physics testing actions
        const physicsActions = {
            throwCubeIntoOcean: () => {
                if (this.geometries.length > 0) {
                    const randomIndex = Math.floor(Math.random() * this.geometries.length);
                    const body = this.physicsBodies[randomIndex];
                    if (body) {
                        // Position cube above ocean and give it downward velocity
                        body.position.set(
                            Math.random() * 100 - 50, // Random X
                            50, // Above ocean
                            Math.random() * 100 - 50  // Random Z
                        );
                        body.velocity.set(0, -20, 0); // Downward velocity
                        console.log('Threw cube into ocean for testing!');
                    }
                }
            },
            resetAllCubes: () => {
                this.geometries.forEach((cube, index) => {
                    const body = this.physicsBodies[index];
                    if (body) {
                        // Reset to original positions (above ground)
                        body.position.set(
                            cube.userData.originalPosition?.x || 0,
                            70,
                            cube.userData.originalPosition?.z || 0
                        );
                        body.velocity.set(0, 0, 0);
                        body.angularVelocity.set(0, 0, 0);
                        body.force.set(0, 0, 0); // Clear any accumulated forces
                        
                        // Reset underwater state
                        this.bodyUnderwaterStates.delete(body);
                    }
                });
                console.log('Reset all cubes to original positions');
            },
            clearPhysicsStates: () => {
                // Clear all underwater states to reset physics tracking
                this.bodyUnderwaterStates.clear();
                
                // Clear forces on all bodies
                this.physicsBodies.forEach(body => {
                    if (body) {
                        body.force.set(0, 0, 0);
                        body.velocity.scale(0.5, body.velocity); // Slow down all bodies
                    }
                });
                console.log('Cleared all physics states and forces');
            }
        };
        
        physicsFolder.add(physicsActions, 'throwCubeIntoOcean').name('Test: Throw Cube in Ocean');
        physicsFolder.add(physicsActions, 'resetAllCubes').name('Reset All Cubes');
        physicsFolder.add(physicsActions, 'clearPhysicsStates').name('Clear Physics States');
    }

    animatePixelSize(startValue, endValue, duration = 1000) {
        if (!this.pixelControls) return; // Prevent multiple animations

        this.pixelControls.isAnimating = true;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation (ease-in-out)
            const easeInOut = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            const currentValue = startValue + (endValue - startValue) * easeInOut;
            
            // Update the pixel size
            this.pixelControls.pixelSize = Math.round(currentValue);
            this.renderPixelatedPass.setPixelSize(this.pixelControls.pixelSize);

            // Update the GUI display
            // this.pixelSizeController.updateDisplay();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.pixelControls.isAnimating = false;
                console.log('Pixel size animation completed at:', endValue);
                if (this.animationsCompleted) {
                    this.animationsCompleted.pixel = true;
                    this.checkAnimationsComplete();
                }
            }
        };
        
        requestAnimationFrame(animate);
    }

    startIntroAnimation() {
        // Don't start if models aren't loaded or intro already started
        if (!this.allModelsLoaded || this.cameraConfig.introStarted) {
            console.log('Cannot start intro - models loaded:', this.allModelsLoaded, 'intro started:', this.cameraConfig.introStarted);
            return;
        }
        
        this.cameraConfig.introStarted = true;
        console.log('Starting intro animation...');
        
        // Track completion of both animations
        this.animationsCompleted = {
            camera: false,
            pixel: false
        };
        
        let animationDuration = 5000;

        // Start combined camera animation (zoom + angle together)
        this.animateCameraComplete(animationDuration);
        this.animatePixelSize(this.pixelControls.pixelSize, 5, animationDuration);
        this.startSeagullIntroFlight(); // Start seagull animation
    }

    setupStartButton() {
        // Initialize dialog with DialogManager instead of direct typewriter
        this.initializeWelcomeDialog();
    }

    initializeWelcomeDialog() {
        if (!this.dialogManager) {
            console.error('DialogManager not initialized');
            return;
        }
        
        console.log('Initializing welcome dialog - creating with animation');
        
        // Track if welcome music has started
        let welcomeMusicStarted = false;
        
        // Create the full welcome sequence: 1,2,3,4,5,6,7
        // Dialog 4 will be a question, dialog 5 will use the answer
        const welcomeDialogId = this.dialogManager.showDialog({
            textSequence: [
                { textKey: 'welcome_1' },
                { textKey: 'welcome_2' },
                { textKey: 'welcome_3' },
                { 
                    textKey: 'welcome_4',
                    isQuestion: true,
                    questionId: 'how_did_you_get_here',
                    answers: [
                        { text: 'Google', value: 'Google', color: 'red' },
                        { text: 'LinkedIn', value: 'LinkedIn', color: 'blue' },
                        { text: 'External Link', value: 'External Link', color: 'green' },
                        { text: 'Others', value: 'Others', color: 'yellow' }
                    ]
                },
                { 
                    textKey: 'welcome_5',
                    useDynamicText: true,
                    getDynamicText: () => {
                        const userAnswer = this.dialogManager.getUserAnswer('how_did_you_get_here');
                        let welcome5Text = this.dialogManager.getText('welcome_5');
                        
                        // Replace {source} with the actual answer, wrapped in highlight styling with its color
                        if (userAnswer) {
                            const colorClass = userAnswer.color || 'green'; // Default to green if no color
                            const highlightedAnswer = `<span class="dialog-answer-highlight ${colorClass}">${userAnswer.value}</span>`;
                            welcome5Text = welcome5Text.replace('{source}', highlightedAnswer);
                        }
                        return welcome5Text;
                    }
                },
                { textKey: 'welcome_6' }
            ],
            position: 'center',
            typewriterSpeed: 45,
            onSequenceComplete: this.handleWelcomeComplete.bind(this),
            onFirstClick: () => {
                // Play welcome music on first click
                if (!welcomeMusicStarted) {
                    console.log('Starting welcome music on first dialog click');
                    this.playWelcomeMusic();
                    welcomeMusicStarted = true;
                }
            }
        });
    }

    hideStartButton() {
        const startButtonContainer = document.getElementById('start-button');
        if (startButtonContainer) {
            startButtonContainer.classList.add('fade-out');
            
            // Remove from DOM after animation
            setTimeout(() => {
                startButtonContainer.style.display = 'none';
            }, 800);
        }
    }
    
    handleWelcomeComplete(dialogId) {
        console.log('Welcome sequence completed, starting intro animation');
        this.dialogManager.closeDialog(dialogId);
        this.hideStartButton();
        
        // Stop welcome music and start intro
        this.stopWelcomeMusic();
        
        // Wait a moment then start intro
        if (this.allModelsLoaded) {
            setTimeout(() => {
                this.startIntroAnimation();
            }, 800); // Wait for shrinking animation
        } else {
            console.log('Dialog sequence completed, waiting for models to load...');
            const checkModels = setInterval(() => {
                if (this.allModelsLoaded) {
                    clearInterval(checkModels);
                    this.startIntroAnimation();
                }
            }, 100);
        }
    }

    checkAnimationsComplete() {
        if (this.animationsCompleted.camera && this.animationsCompleted.pixel) {
            console.log('All intro animations completed, starting seabreeze audio');
            this.playSeabreezeAudio();
            
            // Start Leo's introduction sequence automatically after camera animation
            setTimeout(() => {
                this.startLeoIntroSequence();
            }, 1000); // Small delay after camera animation
        }
    }
    
    /**
     * Start Leo's introduction sequence automatically
     */
    startLeoIntroSequence() {
        if (this.characterModel && !this.characterModel.userData.hasShownIntro) {
            console.log('Starting Leo intro sequence automatically');
            
            // Trigger the intro sequence
            this.characterModel.userData.hasShownIntro = true;
            const leoIntroId = this.dialogManager.showDialog({
                textSequence: [
                    { textKey: 'leo_intro_1' },
                    { textKey: 'leo_intro_2' },
                    { textKey: 'leo_intro_3' }
                ],
                followObject: this.characterModel,
                followOffset: { x: 0, y: 150, z: 0 },
                trianglePosition: 'bottom',
                typewriterSpeed: 45,
                onSequenceComplete: (dialogId) => {
                    console.log('Leo intro sequence completed, closing dialog and starting music');
                    // Close the dialog first
                    this.dialogManager.closeDialog(dialogId);
                    
                    // Start beach music immediately
                    this.playBackgroundMusic();
                    
                    // Wait 3 seconds for dramatic effect, then start follow-up sequence
                    setTimeout(() => {
                        console.log('Starting Leo follow-up sequence after dramatic pause');
                        this.startLeoFollowUpSequence(this.characterModel);
                    }, 3000);
                }
            });
        }
    }

    /**
     * Start Leo's follow-up dialog sequence after the music has been playing
     */
    startLeoFollowUpSequence(characterModel) {
        if (!this.dialogManager || !characterModel) {
            console.warn('Cannot start Leo follow-up sequence - missing DialogManager or character model');
            return;
        }

        console.log('Starting Leo follow-up dialog sequence...');
        
        const followUpDialogId = this.dialogManager.showDialog({
            textSequence: [
                { textKey: 'leo_followup_1' },
                { textKey: 'leo_followup_2' },
                { textKey: 'leo_followup_3' }
            ],
            followObject: characterModel,
            followOffset: { x: 0, y: 150, z: 0 },
            trianglePosition: 'bottom',
            typewriterSpeed: 50, // Slightly faster for the follow-up
            onSequenceComplete: (dialogId) => {
                console.log('Leo follow-up sequence completed - story introduction finished');
                // Mark that the full introduction story has been told
                characterModel.userData.hasShownFullStory = true;
            }
        });
    }

    animateCameraComplete(duration = 3000) {
        if (!this.controls) return;

        console.log('🎬 Starting combined camera animation (zoom + angle)...');
        
        // Enable OrbitControls for the animation (they were disabled initially)
        this.controls.enabled = true;
        
        // Animation parameters
        const startTime = performance.now();
        const startDistance = 1500; // Start from max distance
        const endDistance = 700;    // End at min distance
        
        // Angle parameters
        const startAngleDegrees = this.cameraConfig.initialAngleUp; // 45°
        const endAngleDegrees = this.cameraConfig.finalAngleUp;     // 0°
        const angleChange = endAngleDegrees - startAngleDegrees;    // -45°
        
        const targetPosition = new THREE.Vector3(0, -5, 0);
        
        console.log(`   Distance: ${startDistance} → ${endDistance}`);
        console.log(`   Angle: ${startAngleDegrees}° → ${endAngleDegrees}° (change: ${angleChange}°)`);
        console.log(`   OrbitControls ENABLED for target animation`);
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation (ease-in-out)
            const easeInOut = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            // Calculate current distance (zoom)
            const currentDistance = startDistance + (endDistance - startDistance) * easeInOut;

            // Position camera - move from HIGH UP (1200) down to normal level (195)
            const startY = 2200; // High up in the sky
            const endY = 195;   // Normal scene level
            const currentY = startY + (endY - startY) * easeInOut;
            
            const x = 0;
            const z = targetPosition.z + currentDistance;
            
            this.camera.position.set(x, currentY, z);
            
            // Animate OrbitControls target from sky down to scene center
            const skyTargetY = currentY + 1500; // Target high in the sky
            const sceneTargetY = targetPosition.y; // Target at scene center
            const currentTargetY = skyTargetY + (sceneTargetY - skyTargetY) * easeInOut;
            
            // Update OrbitControls target instead of using camera.lookAt()
            this.controls.target.set(targetPosition.x, currentTargetY, targetPosition.z);
            this.controls.update(); // Update controls to apply the new target
            
            // Log every 20% progress
            if (Math.floor(progress * 5) !== Math.floor((progress - 0.2) * 5)) {
                console.log(`📐 Animation Progress: ${Math.floor(progress * 100)}%`);
                console.log(`   Distance: ${currentDistance.toFixed(1)} | Camera Y: ${currentY.toFixed(1)} | Target Y: ${currentTargetY.toFixed(1)}`);
                console.log(`   Camera: (${x.toFixed(1)}, ${currentY.toFixed(1)}, ${z.toFixed(1)})`);
                console.log(`   OrbitControls Target: (${this.controls.target.x.toFixed(1)}, ${this.controls.target.y.toFixed(1)}, ${this.controls.target.z.toFixed(1)})`);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Animation completed - OrbitControls stay enabled
                console.log('🏁 Combined camera animation completed');
                console.log(`   Final Position: ${this.camera.position.x.toFixed(1)}, ${this.camera.position.y.toFixed(1)}, ${this.camera.position.z.toFixed(1)}`);
                console.log(`   Final Target: ${this.controls.target.x.toFixed(1)}, ${this.controls.target.y.toFixed(1)}, ${this.controls.target.z.toFixed(1)}`);
                console.log(`   OrbitControls remain ENABLED`);
                
                // Mark completion
                this.cameraConfig.angleAnimationCompleted = true;
                this.animationsCompleted.camera = true;
                this.checkAnimationsComplete();
            }
        };
        
        requestAnimationFrame(animate);
    }

    animateCameraAngle() {
        if (this.cameraConfig.angleAnimationStarted) return;
        
        this.cameraConfig.angleAnimationStarted = true;
        
        // Temporarily disable OrbitControls to prevent interference
        const originalEnabled = this.controls.enabled;
        this.controls.enabled = false;
        
        const startTime = Date.now();
        const duration = 2000; // 2 second transition
        
        // Get angle values in degrees
        const startAngleDegrees = this.cameraConfig.initialAngleUp;
        const endAngleDegrees = this.cameraConfig.finalAngleUp;
        const angleChange = endAngleDegrees - startAngleDegrees;
        
        console.log(`🎬 STARTING CAMERA ANGLE ANIMATION:`);
        console.log(`   From: ${startAngleDegrees}° | To: ${endAngleDegrees}° | Change: ${angleChange}°`);
        console.log(`   OrbitControls DISABLED during animation`);
        
        const targetPosition = new THREE.Vector3(0, -5, 0);
        
        const animateAngle = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Smooth easing function
            const easedProgress = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            
            // Calculate current angle in degrees, then convert to radians
            const currentAngleDegrees = startAngleDegrees + (angleChange * easedProgress);
            const currentAngleRadians = THREE.MathUtils.degToRad(currentAngleDegrees);
            
            // Use current target distance from zoom animation, or fallback to current distance
            const distance = this.cameraConfig.currentTargetDistance || this.camera.position.distanceTo(targetPosition);
            
            // Store old position for comparison
            const oldPosition = this.camera.position.clone();
            
            // Keep camera position relatively stable, just adjust slightly
            const x = 0;
            const y = targetPosition.y + 200 - (easedProgress * 205); // Gradually lower camera
            const z = targetPosition.z + distance;
            
            this.camera.position.set(x, y, z);
            
            // Animate the look-at point from sky down to center
            if (currentAngleDegrees > 0) {
                // Looking up - interpolate between sky point and center
                const skyLookAtY = targetPosition.y + Math.tan(THREE.MathUtils.degToRad(45)) * distance;
                const centerLookAtY = targetPosition.y;
                
                const currentLookAtY = skyLookAtY - (easedProgress * (skyLookAtY - centerLookAtY));
                this.camera.lookAt(targetPosition.x, currentLookAtY, targetPosition.z);
            } else {
                // Looking at center
                this.camera.lookAt(targetPosition);
            }
            
            // Log every 10% progress
            if (Math.floor(progress * 10) !== Math.floor((progress - 0.1) * 10)) {
                console.log(`📐 Angle Progress: ${Math.floor(progress * 100)}%`);
                console.log(`   Current Angle: ${currentAngleDegrees.toFixed(1)}°`);
                console.log(`   Camera Position: ${this.camera.position.x.toFixed(1)}, ${this.camera.position.y.toFixed(1)}, ${this.camera.position.z.toFixed(1)}`);
                console.log(`   Position Changed: ${!oldPosition.equals(this.camera.position)}`);
                console.log(`   Distance: ${distance.toFixed(1)}`);
            }
            
            // DON'T call this.controls.update() during animation
            
            if (progress < 1) {
                requestAnimationFrame(animateAngle);
            } else {
                // Re-enable OrbitControls after animation
                this.controls.enabled = originalEnabled;
                this.controls.update();
                
                console.log('🏁 Camera angle animation completed - now looking at center');
                console.log(`   Final Position: ${this.camera.position.x.toFixed(1)}, ${this.camera.position.y.toFixed(1)}, ${this.camera.position.z.toFixed(1)}`);
                console.log(`   OrbitControls RE-ENABLED`);
                this.cameraConfig.angleAnimationCompleted = true;
            }
        };
        
        animateAngle();
    }

    animateCameraZoom(duration = 3000) {
        if (!this.controls) return;

        console.log('Starting camera zoom animation...');

        const startDistance = 1500; // Start from max distance
        const endDistance = 700;    // End at min distance
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation (ease-in-out)
            const easeInOut = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            const currentDistance = startDistance + (endDistance - startDistance) * easeInOut;
            
            // Store the target distance for angle animation to use
            this.cameraConfig.currentTargetDistance = currentDistance;
            
            // Only update position if angle animation hasn't started yet
            if (!this.cameraConfig.angleAnimationStarted) {
                const targetPosition = new THREE.Vector3(0, -5, 0);
                
                // Position camera normally but looking up initially
                const x = 0;
                const y = targetPosition.y + 200; // Slightly elevated
                const z = targetPosition.z + currentDistance;
                
                this.camera.position.set(x, y, z);
                
                // Look up at the sky initially
                const initialAngleRadians = THREE.MathUtils.degToRad(this.cameraConfig.initialAngleUp);
                const lookAtY = targetPosition.y + Math.tan(initialAngleRadians) * currentDistance;
                this.camera.lookAt(targetPosition.x, lookAtY, targetPosition.z);
            }
            
            // Update controls
            this.controls.update();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                console.log('Camera zoom animation completed');
                this.animationsCompleted.camera = true;
                this.checkAnimationsComplete();
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * Load a 3D model with physics configuration options
     * @param {GLTFLoader} loader - The GLTF loader instance
     * @param {string} path - Path to the model file
     * @param {Array} position - [x, y, z] position
     * @param {Array} scale - [x, y, z] scale
     * @param {Array} rotation - [x, y, z] rotation in radians
     * @param {boolean} allowShadow - Enable shadow casting/receiving
     * @param {Object} physicsConfig - Physics configuration object
     * @param {Function} onModelLoaded - Callback when model loads
     */
    loadModel(loader, path, position, scale, rotation = [0, 0, 0], allowShadow = false, physicsConfig = null, onModelLoaded = null) {
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

            // Handle physics based on configuration
            if (physicsConfig && physicsConfig.type !== 'none') {
                this.createModelPhysics(model, physicsConfig);
            }

            // Handle animations
            if (gltf.animations.length > 0) {
                const mixer = new THREE.AnimationMixer(model);
                gltf.animations.forEach((clip) => {
                    const action = mixer.clipAction(clip);
                    action.play();
                });
                this.animationMixers.push(mixer);
            }
            
            // Store model reference if specified
            if (physicsConfig && physicsConfig.type !== 'none') {
                this.geometries.push(model);
            }
            
            // Call callback if provided
            if (onModelLoaded && typeof onModelLoaded === 'function') {
                onModelLoaded(model);
            }
        });
    }
    
    /**
     * Create physics body for a model based on configuration
     * @param {THREE.Object3D} model - The 3D model
     * @param {Object} physicsConfig - Physics configuration
     */
    createModelPhysics(model, physicsConfig) {
        const { type, mass = 0, shape = 'box', material = null, sizeMultiplier = 1.0 } = physicsConfig;
        
        // Calculate bounding box for physics shape
        const box = new THREE.Box3().setFromObject(model);
        const originalSize = box.getSize(new THREE.Vector3());
        const size = originalSize.clone().multiplyScalar(sizeMultiplier); // Apply size multiplier
        const center = box.getCenter(new THREE.Vector3());
        
        let physicsShape;
        
        switch (shape) {
            case 'cylinder':
                const radius = Math.max(size.x, size.z) / 2;
                physicsShape = new CANNON.Cylinder(radius, radius, size.y, 16);
                break;
            case 'sphere':
                const sphereRadius = Math.max(size.x, size.y, size.z) / 2;
                physicsShape = new CANNON.Sphere(sphereRadius);
                break;
            case 'box':
            default:
                physicsShape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
                break;
        }
        
        // Calculate offset between model position and bounding box center
        const physicsOffset = center.clone().sub(model.position);
        
        // Create physics body positioned at the bounding box center for proper alignment
        const physicsBody = new CANNON.Body({
            mass: mass,
            position: new CANNON.Vec3(center.x, center.y, center.z),
            shape: physicsShape,
            material: material || new CANNON.Material({ friction: 0.6, restitution: 0 })
        });
        
        // Set rotation if needed
        physicsBody.quaternion.setFromEuler(model.rotation.x, model.rotation.y, model.rotation.z);
        
        // Add to physics world
        this.physicsWorld.addBody(physicsBody);
        
        // Store physics body based on type
        if (type === 'static') {
            // Static bodies like island, tree - don't move but provide collision
            if (model.name === 'island' || model.userData.isIsland) {
                this.groundBody = physicsBody;
            }
        } else if (type === 'dynamic') {
            // Dynamic bodies like cubes - can move and be dragged
            this.physicsBodies.push(physicsBody);
            model.userData.physicsBody = physicsBody;
            model.userData.physicsOffset = physicsOffset; // Store offset for synchronization
            model.userData.draggable = true;
            
            // Create contact materials with island bodies for proper collision
            if (this.groundBody && this.groundBody.material) {
                const contactMaterial = new CANNON.ContactMaterial(
                    physicsBody.material,
                    this.groundBody.material,
                    {
                        friction: 0.8,
                        restitution: 0.1,
                        contactEquationStiffness: 1e8,
                        contactEquationRelaxation: 3,
                        frictionEquationStiffness: 1e8,
                        frictionEquationRelaxation: 3
                    }
                );
                this.physicsWorld.addContactMaterial(contactMaterial);
            }
            
            // Create contact materials with all island bodies if available
            if (this.islandBodies && this.islandBodies.length > 0) {
                this.islandBodies.forEach(islandBody => {
                    if (islandBody.material) {
                        const contactMaterial = new CANNON.ContactMaterial(
                            physicsBody.material,
                            islandBody.material,
                            {
                                friction: 0.8,
                                restitution: 0.1,
                                contactEquationStiffness: 1e8,
                                contactEquationRelaxation: 3
                            }
                        );
                        this.physicsWorld.addContactMaterial(contactMaterial);
                    }
                });
            }
        }
        
        console.log(`Created ${type} physics body for model:`, { 
            mass, 
            shape, 
            originalSize: originalSize,
            adjustedSize: size,
            sizeMultiplier: sizeMultiplier,
            modelPosition: model.position,
            physicsBodyPosition: physicsBody.position,
            offset: physicsOffset
        });
    }

    loadSeagullModels(loader) {
        console.log('Starting to load seagull models...');
        
        // Calculate spawn positions for seagulls
        const seagull1Angle = -0.3;
        const seagull2Angle = 0.3;
        
        const seagull1X = Math.sin(seagull1Angle) * this.seagullConfig.spawnDistance;
        const seagull1Z = Math.cos(seagull1Angle) * this.seagullConfig.spawnDistance;
        
        const seagull2X = Math.sin(seagull2Angle) * this.seagullConfig.spawnDistance;
        const seagull2Z = Math.cos(seagull2Angle) * this.seagullConfig.spawnDistance;
        
        console.log('Seagull spawn positions:', {
            seagull1: { x: seagull1X, y: this.seagullConfig.spawnHeight, z: seagull1Z },
            seagull2: { x: seagull2X, y: this.seagullConfig.spawnHeight, z: seagull2Z }
        });
        
        // Load first seagull using existing loadModel function
        loader.load('models/seagull.glb', 
            (gltf) => {
                console.log('Seagull 1 GLTF loaded successfully:', gltf);
                const seagull1 = gltf.scene;
                seagull1.scale.set(2.5, 2.5, 2.5); // Reduced from 15 to 4 for better proportions
                seagull1.position.set(seagull1X, this.seagullConfig.spawnHeight, seagull1Z);
                seagull1.lookAt(0, this.seagullConfig.spawnHeight, 0);
                seagull1.visible = false; // Initially hidden
                
                // Enable shadows
                seagull1.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                
                this.scene.add(seagull1);
                this.seagulls.push(seagull1);
                
                // Add interaction data for seagull - no physics needed
                seagull1.userData.interactive = true;
                seagull1.userData.dialogKey = 'seagull_arrival';
                seagull1.userData.hasPhysics = false; // Seagulls don't need physics
                
                // Setup animation mixer for first seagull
                if (gltf.animations && gltf.animations.length > 0) {
                    console.log('Setting up animations for seagull 1, found', gltf.animations.length, 'animations');
                    const mixer = new THREE.AnimationMixer(seagull1);
                    this.seagullMixers.push(mixer);
                    
                    gltf.animations.forEach((clip) => {
                        const action = mixer.clipAction(clip);
                        action.play();
                    });
                } else {
                    console.warn('No animations found for seagull 1');
                }
                
                console.log('Seagull 1 loaded at position:', seagull1.position);
            },
            (progress) => {
                console.log('Loading seagull 1:', (progress.loaded / progress.total * 100) + '%');
            },
            (error) => {
                console.error('Error loading seagull 1:', error);
            }
        );

    }

    playSeagullSound() {
        if (this.seagullAudio && this.audioLoaded) {
            this.seagullAudio.currentTime = 0; // Reset to beginning
            this.seagullAudio.play().then(() => {
                console.log('Seagull sound playing');
            }).catch((error) => {
                console.log('Seagull audio autoplay prevented, will try on user interaction:', error);
            });
        }
    }

    playWelcomeMusic() {
        if (this.welcomeAudio && this.audioLoaded) {
            this.welcomeAudio.currentTime = 0; // Reset to beginning
            this.welcomeAudio.play().then(() => {
                console.log('Welcome music started');
            }).catch((error) => {
                console.error('Error playing welcome music:', error);
            });
        }
    }

    stopWelcomeMusic() {
        if (this.welcomeAudio) {
            this.welcomeAudio.pause();
            this.welcomeAudio.currentTime = 0;
            console.log('Welcome music stopped');
        }
    }

    playBackgroundMusic() {
        if (this.beachAudio && this.audioLoaded) {
            this.beachAudio.currentTime = 0;
            this.beachAudio.play().then(() => {
                console.log('Beach background music started');
            }).catch((error) => {
                console.log('Beach background music autoplay prevented:', error);
            });
        }
    }



    startSeagullIntroFlight() {
        console.log('Starting seagull intro flight, seagulls loaded:', this.seagulls.length);
        
        if (this.seagulls.length === 0) {
            console.warn('No seagulls loaded yet, cannot start intro flight');
            return;
        }
        
        // Make seagulls visible and play sound
        this.seagulls.forEach((seagull, index) => {
            console.log(`Making seagull ${index + 1} visible at position:`, seagull.position);
            seagull.visible = true;
        });
        
        this.playSeagullSound();
        
        // Animate seagulls flying towards center
        const startTime = performance.now();
        const duration = this.seagullConfig.introFlightDuration;
        
        // Store initial positions
        const startPositions = this.seagulls.map(seagull => seagull.position.clone());
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Smooth easing function
            const easeInOut = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            
            this.seagulls.forEach((seagull, index) => {
                const startPos = startPositions[index];
                
                // Target position near center island
                const targetX = (index === 0 ? -30 : 30); // Spread them apart at destination
                const targetY = this.seagullConfig.circularFlightHeight;
                const targetZ = 0;
                
                // Interpolate position
                seagull.position.x = startPos.x + (targetX - startPos.x) * easeInOut;
                seagull.position.y = startPos.y + (targetY - startPos.y) * easeInOut;
                seagull.position.z = startPos.z + (targetZ - startPos.z) * easeInOut;
                
                // Make seagull look in flight direction
                const direction = new THREE.Vector3(targetX - startPos.x, 0, targetZ - startPos.z).normalize();
                seagull.lookAt(
                    seagull.position.x + direction.x,
                    seagull.position.y,
                    seagull.position.z + direction.z
                );
            });
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Store final positions for smooth transition to circular flight
                this.seagulls.forEach((seagull, index) => {
                    seagull.userData.lastPosition = seagull.position.clone();
                    
                    // Calculate the angle from center for smooth circular transition
                    const dx = seagull.position.x;
                    const dz = seagull.position.z;
                    const currentRadius = Math.sqrt(dx * dx + dz * dz);
                    seagull.userData.transitionAngle = Math.atan2(dz, dx);
                    
                    console.log(`Seagull ${index + 1} final position:`, seagull.position, 'angle:', seagull.userData.transitionAngle);
                });
                
                // Start circular flight - music will start only after Leo's intro
                this.startCircularFlight();
                console.log('Seagulls have arrived, but music will wait for Leo\'s introduction');
            }
        };
        
        requestAnimationFrame(animate);
    }

    startCircularFlight() {
        this.circularFlightStartTime = performance.now();
        this.isCircularFlightActive = true;
        
        // Setup transition parameters for smooth circular flight
        this.circularFlightTransition = {
            duration: 4000, // 4 seconds to transition to circular flight (slower for more natural look)
            isTransitioning: true
        };
        
        console.log('Starting circular flight transition');
    }

    addText(text, fontPath, position, size, rotation, height, color, border = undefined) {
        const textLoader = new FontLoader();
    
        textLoader.load(fontPath, (font) => {
            // Create the text geometry
            const textObj = new TextGeometry(text, {
                font: font,
                size: size,
                // height: height,
                depth: 8, // Depth for 3D effect
                curveSegments: 12,
                bevelEnabled: false,
            });
    
            const material = new THREE.MeshPhysicalMaterial({ color: color });
            const mesh = new THREE.Mesh(textObj, material);
            mesh.position.set(position[0], position[1], position[2]);
            mesh.rotation.set(rotation[0], rotation[1], rotation[2]); // Apply custom rotation
            mesh.castShadow = true;
            mesh.receiveShadow = true;
    
            if (border) {
                const outerGeometry = new TextGeometry(text, {
                    font: font,
                    size: size,
                    height: height / 2,
                    curveSegments: 12,
                    bevelEnabled: true,
                    bevelThickness: 0,
                    bevelSize: 0.2, // size of border
                    bevelOffset: 0,
                    bevelSegments: 1,
                });
    
                const borderText = new THREE.Mesh(
                    outerGeometry,
                    new THREE.MeshPhysicalMaterial({ color: border })
                );
                borderText.position.z = 0.1;
                mesh.add(borderText);
            }
    
            // Add the text mesh to the scene
            this.scene.add(mesh);
            this.textMeshes.push(mesh);
    
            // Dynamically calculate the bounding box of the text
            mesh.geometry.computeBoundingBox();
            const boundingBox = mesh.geometry.boundingBox;
            const boxSize = new THREE.Vector3();
            boundingBox.getSize(boxSize);
    
            //  + ((boxSize.y / 2) - 0.35)
            // Add physics body for the text
            const textShape = new CANNON.Box(new CANNON.Vec3(boxSize.x / 2, (boxSize.y / 6), boxSize.z / 2));
            const textBody = new CANNON.Body({
                mass: 1, // Dynamic body
                position: new CANNON.Vec3(position[0], position[1], position[2]), // Adjust position to match the bounding box
                shape: textShape,
            });
    

            // Apply rotation to the physics body
            textBody.position.set(position[0], position[1], position[2]);
            textBody.quaternion.setFromEuler(rotation[0], rotation[1], rotation[2]);
    
            // Add bouncing effect by setting restitution
            const textPhysicsMaterial = new CANNON.Material();
            textBody.material = textPhysicsMaterial;
    
            // Create a contact material for bouncing
            const groundMaterial = this.groundBody.material; // Assuming the ground has a material
            const contactMaterial = new CANNON.ContactMaterial(textPhysicsMaterial, groundMaterial, {
                restitution: 0.2, // Lower bounciness for stacking
                friction: 0.8, // Friction for stability
            });
            this.physicsWorld.addContactMaterial(contactMaterial);
    
            // Add the physics body to the world
            this.physicsWorld.addBody(textBody);
    
            // Store the text mesh and its physics body
            this.geometries.push(mesh); // Add to raycasting list
            this.physicsBodies.push(textBody);
        });
    }

    createLights() {
        // const ambientLight = new THREE.AmbientLight('#86cdff', 0.275)
        // this.scene.add(ambientLight)

        const directionalLight = new THREE.DirectionalLight('#ffffff', 0.7)
        directionalLight.position.set(10, 35, 10); // Better position for shadows
        directionalLight.castShadow = true; // Enable shadow casting
        
        // Configure shadow camera
        directionalLight.shadow.mapSize.width = 2048; // Higher resolution for shadows
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 400;
        directionalLight.shadow.camera.left = -200;
        directionalLight.shadow.camera.right = 200;
        directionalLight.shadow.camera.top = 200;
        directionalLight.shadow.camera.bottom = -200;
        directionalLight.shadow.bias = -0.0001;
        this.scene.add(directionalLight)
    }

    createIsland() {
        // Position for the island - centered at origin, higher up for tree connection
        const islandPosition = new THREE.Vector3(0, 45, 0);
        
        // Create the loader for the island model
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('jsm/');
        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);
        
        // Load the island 3D model with physics
        this.loadModel(loader, 'models/island.glb', 
            [islandPosition.x, islandPosition.y, islandPosition.z], // position
            [150, 150, 150], // scale - bigger
            [0, 0, 0], // rotation
            true, // shadows
            null, // no physics config - handle manually
            (model) => {
                console.log('Island model loaded successfully');
                this.islandModel = model;
                model.userData.isIsland = true;
                
                // Create simple physics body for island
                const islandRadius = 155; // Approximate radius based on model size
                const islandShape = new CANNON.Cylinder(islandRadius, islandRadius, 25, 16);
                const islandBody = new CANNON.Body({
                    mass: 0, // Static body
                    shape: islandShape,
                    position: new CANNON.Vec3(0, 35, 0),
                    material: new CANNON.Material({ friction: 0.6, restitution: 0 })
                });
                
                this.physicsWorld.addBody(islandBody);
                this.groundBody = islandBody;
                
                // Apply enhanced materials to the model
                model.traverse((child) => {
                    if (child.isMesh && child.material) {
                        child.material.needsUpdate = true;
                    }
                });
            }
        );
    }
    
    /**
     * Create physics body for the irregular island model
     * Provides multiple options from simple to complex
     */
    createIslandPhysics(islandModel, position) {
        // Calculate bounding box of the model for physics approximation
        const box = new THREE.Box3().setFromObject(islandModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        console.log('Island model bounds:', { size, center });
        
        // Option 1: Simple Cylinder Physics (Recommended for performance)
        //this.createSimpleIslandPhysics(size, position);
        
        // Option 2: Multi-body approximation (uncomment for better accuracy)
        this.createMultiBodyIslandPhysics(islandModel, position);
        
        // Option 3: Heightfield physics (most accurate, but complex)
        // this.createHeightfieldIslandPhysics(islandModel, position);
    }
    
    /**
     * Simple physics: Use a cylinder that approximates the island
     */
    createSimpleIslandPhysics(modelSize, position) {
        // Use the model's bounding box to create an appropriate cylinder
        const radius = Math.max(modelSize.x, modelSize.z) / 2;
        const height = modelSize.y;
        
        console.log(`Creating simple cylinder physics - radius: ${radius}, height: ${height}`);
        
        const islandShape = new CANNON.Cylinder(radius, radius, height, 16);
        const islandBody = new CANNON.Body({
            mass: 0, // Static body
            shape: islandShape,
            material: new CANNON.Material()
        });
        
        islandBody.position.copy(position);
        
        // Add physics material - stable, no bouncing
        const islandPhysicsMaterial = new CANNON.Material({
            friction: 0.6,
            restitution: 0
        });
        islandBody.material = islandPhysicsMaterial;
        
        this.physicsWorld.addBody(islandBody);
        this.groundBody = islandBody;
    }
    
    /**
     * Multi-body physics: Create multiple collision shapes to better match irregular surface
     */
    createMultiBodyIslandPhysics(islandModel, position) {
        console.log('Creating multi-body island physics...');
        
        // Sample points around the island to create multiple collision bodies
        const sampleRadius = 300; // Adjust based on your island size
        const samples = 24; // Number of sample points around the island
        const raycastHeight = 80; // Height to start raycasting from
        
        const raycaster = new THREE.Raycaster();
        const tempBodies = [];
        
        for (let i = 0; i < samples; i++) {
            const angle = (i / samples) * Math.PI * 2;
            const x = Math.cos(angle) * sampleRadius;
            const z = Math.sin(angle) * sampleRadius;
            
            // Create concentric rings of samples
            for (let ring = 0; ring < 3; ring++) {
                const ringRadius = (ring + 1) * sampleRadius / 3;
                const ringX = Math.cos(angle) * ringRadius;
                const ringZ = Math.sin(angle) * ringRadius;
                
                // Raycast down from above to find the island surface
                const origin = new THREE.Vector3(ringX, position.y + raycastHeight, ringZ);
                const direction = new THREE.Vector3(0, -1, 0);
                
                raycaster.set(origin, direction);
                const intersects = raycaster.intersectObject(islandModel, true);
                
                if (intersects.length > 0) {
                    const intersectionPoint = intersects[0].point;
                    
                    // Create a small physics body at this point
                    const bodyRadius = 15; // Adjust size as needed
                    const bodyHeight = 10;
                    
                    const shape = new CANNON.Cylinder(bodyRadius, bodyRadius, bodyHeight, 8);
                    const body = new CANNON.Body({ mass: 0, shape });
                    body.position.set(intersectionPoint.x, intersectionPoint.y - bodyHeight/2, intersectionPoint.z);
                    
                    body.material = new CANNON.Material({
                        friction: 0.6,
                        restitution: 0
                    });
                    
                    this.physicsWorld.addBody(body);
                    tempBodies.push(body);
                }
            }
        }
        
        // Store the first body as the main ground reference
        this.groundBody = tempBodies[0] || this.createFallbackPhysics(position);
        
        // Store all island bodies for contact material creation with other objects
        this.islandBodies = tempBodies;
        
        console.log(`Created ${tempBodies.length} physics bodies for island approximation`);
    }
    
    /**
     * Heightfield physics: Most accurate but complex approach
     */
    createHeightfieldIslandPhysics(islandModel, position) {
        console.log('Creating heightfield island physics...');
        
        // This would require sampling the island surface in a grid
        // and creating a heightfield - very complex, so we'll use a simpler approach
        
        // For now, fall back to multi-body or simple physics
        this.createMultiBodyIslandPhysics(islandModel, position);
    }
    
    /**
     * Fallback island creation if 3D model fails to load
     */
    createFallbackIsland(position) {
        console.log('Creating fallback procedural island...');
        
        const textureLoader = new THREE.TextureLoader();
        
        // Create a simple cylinder as fallback
        const islandGeometry = new THREE.CylinderGeometry(200, 200, 20, 32, 8, false);
        
        const material = new THREE.MeshStandardMaterial({
            color: 0x8B7355,
            roughness: 1,
            metalness: 0
        });
        
        const island = new THREE.Mesh(islandGeometry, material);
        island.receiveShadow = true;
        island.castShadow = true;
        island.position.copy(position);
        this.scene.add(island);
        
        // Create simple physics for fallback
        this.createFallbackPhysics(position);
    }
    
    /**
     * Create simple fallback physics
     */
    createFallbackPhysics(position) {
        const islandShape = new CANNON.Cylinder(200, 200, 20, 16);
        const islandBody = new CANNON.Body({
            mass: 0,
            shape: islandShape,
            material: new CANNON.Material({
                friction: 0.6,
                restitution: 0
            })
        });
        
        islandBody.position.copy(position);
        this.physicsWorld.addBody(islandBody);
        this.groundBody = islandBody;
        
        return islandBody;
    }

    createOcean() {
        this.oceanGeometry = new THREE.PlaneGeometry(30000, 30000, 128, 128);
        this.oceanGeometry.rotateX(-Math.PI * 0.5);

        // Create vertex data array with initial height, phase, and amplitude
        this.vertData = [];
        for (let i = 0; i < this.oceanGeometry.attributes.position.count; i++) {
            const position = new THREE.Vector3();
            position.fromBufferAttribute(this.oceanGeometry.attributes.position, i);
            this.vertData.push({
                initH: position.y,
                amplitude: THREE.MathUtils.randFloatSpread(2),
                phase: THREE.MathUtils.randFloat(0, Math.PI * 2)
            });
        }

        // Create a gradient texture that spreads across the plane surface
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');

        // Create radial gradient from center to edges
        const gradient = context.createRadialGradient(
            256, 256, 0,      // Inner circle (center)
            256, 256, 256     // Outer circle (edges)
        );
        
        gradient.addColorStop(0, '#2aabbc');   // Light aquamarine in center
        gradient.addColorStop(.1, '#0a2d4d');   // Darker ocean blue at edges

        // Fill canvas with gradient
        context.fillStyle = gradient;
        context.fillRect(0, 0, 512, 512);

        // Create texture from canvas
        const gradientTexture = new THREE.CanvasTexture(canvas);

        // Create ocean material with frosted glass effect
        const oceanMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                map: { value: gradientTexture },
                distortionStrength: { value: 0.5 },
                opacity: { value: 0.955 }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vWorldPosition;
                varying vec4 vScreenPosition;
                
                uniform float time;
                
                void main() {
                    vUv = uv;
                    
                    // Create wave animation
                    vec3 pos = position;
                    float wave1 = sin(pos.x * 0.02 + time * 0.5) * 0.8;
                    float wave2 = sin(pos.z * 0.015 + time * 0.3) * 0.6;
                    float wave3 = sin((pos.x + pos.z) * 0.01 + time * 0.8) * 0.4;
                    
                    float totalWave = wave1 + wave2 + wave3;
                    pos.y += totalWave;
                    
                    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
                    vWorldPosition = worldPos.xyz;
                    vScreenPosition = projectionMatrix * viewMatrix * worldPos;
                    
                    gl_Position = vScreenPosition;
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform sampler2D map;
                uniform sampler2D noiseTexture;
                uniform float distortionStrength;
                uniform float opacity;
                
                varying vec2 vUv;
                varying vec3 vWorldPosition;
                varying vec4 vScreenPosition;
                
                void main() {
                    // Sample the gradient texture
                    vec4 gradientColor = texture2D(map, vUv);
                    
                    // Add animated distortion using noise
                    vec2 noiseUV = vUv * 10.0 + time * 0.1;
                    vec4 noise = texture2D(noiseTexture, noiseUV);
                    
                    // Create distortion effect
                    vec2 distortion = (noise.rg - 0.5) * distortionStrength;
                    vec4 distortedColor = texture2D(map, vUv + distortion);
                    
                    // Mix colors for frosted effect
                    vec3 finalColor = mix(gradientColor.rgb, distortedColor.rgb, 0.5);
                    
                    gl_FragColor = vec4(finalColor, opacity);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });

        this.oceanMesh = new THREE.Mesh(this.oceanGeometry, oceanMaterial);
        this.oceanMesh.position.y = -1;
        this.scene.add(this.oceanMesh);

        // Store material reference for updates
        this.oceanMaterial = oceanMaterial;

        // Create small circular foam planes with holes
        this.createOceanFoam();
    }

    createOceanFoam() {
        this.foamMeshes = [];
        this.foamVertData = [];
        
        // Define positions of rocks and island for foam placement
        const foamTargets = [
            // Island center - foam ring around the island
            { x: 0, z: 0, innerRadius: 120, outerRadius: 140 },
            // Rock positions (from populateScene method) - foam rings around rocks
            { x: 250, z: -250, innerRadius: 60, outerRadius: 80 },
            { x: -250, z: -90, innerRadius: 40, outerRadius: 60 },
            { x: -255, z: -5, innerRadius: 20, outerRadius: 40 }
        ];
        
        const foamSegments = 16; // Segments for circular geometry
        
        // Create one foam ring for each target
        foamTargets.forEach((target, targetIndex) => {
            // Create ring geometry with the object's size as inner radius
            const foamGeometry = new THREE.RingGeometry(target.innerRadius, target.outerRadius, foamSegments, 3);
            foamGeometry.rotateX(-Math.PI * 0.5); // Rotate to be horizontal like ocean
            
            // Create vertex data for wave animation
            const vertData = [];
            for (let j = 0; j < foamGeometry.attributes.position.count; j++) {
                const position = new THREE.Vector3();
                position.fromBufferAttribute(foamGeometry.attributes.position, j); 
                vertData.push({
                    initH: position.y,
                    amplitude: THREE.MathUtils.randFloatSpread(0.8), // Wave amplitude
                    phase: THREE.MathUtils.randFloat(0, Math.PI * 2)
                });
            }
            this.foamVertData.push(vertData);
            
            // Create foam material that only shows when below ocean level
            const foamMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    oceanLevel: { value: -1 }, // Ocean Y position
                    opacity: { value: targetIndex === 0 ? 0.4 : 0.7 }, // Island vs rocks opacity
                    color: { value: new THREE.Vector3(1.0, 1.0, 1.0) }
                },
                vertexShader: `
                    varying vec3 vWorldPosition;
                    varying vec2 vUv;
                    
                    void main() {
                        vUv = uv;
                        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                        vWorldPosition = worldPosition.xyz;
                        gl_Position = projectionMatrix * viewMatrix * worldPosition;
                    }
                `,
                fragmentShader: `
                    uniform float time;
                    uniform float oceanLevel;
                    uniform float opacity;
                    uniform vec3 color;
                    
                    varying vec3 vWorldPosition;
                    varying vec2 vUv;
                    
                    void main() {
                        // Calculate dynamic ocean height at this position (same waves as ocean)
                        float wave1 = sin(vWorldPosition.x * 0.02 + time * 0.5) * 0.8;
                        float wave2 = sin(vWorldPosition.z * 0.015 + time * 0.3) * 0.6;
                        float wave3 = sin((vWorldPosition.x + vWorldPosition.z) * 0.01 + time * 0.8) * 0.4;
                        float dynamicOceanLevel = oceanLevel + wave1 + wave2 + wave3;
                        
                        // Only show foam when it's below the dynamic ocean surface
                        float foamVisibility = step(vWorldPosition.y, dynamicOceanLevel);
                        
                        // Add some fade effect near the ocean surface
                        float fadeDistance = 1.0; // Distance for fade effect
                        float surfaceDistance = dynamicOceanLevel - vWorldPosition.y;
                        float fadeFactor = smoothstep(0.0, fadeDistance, surfaceDistance);
                        
                        // Combine visibility with fade
                        float finalOpacity = foamVisibility * fadeFactor * opacity;
                        
                        gl_FragColor = vec4(color, finalOpacity);
                    }
                `,
                transparent: true,
                side: THREE.DoubleSide,
                depthWrite: false // Prevent depth issues with transparency
            });
            
            // Create mesh positioned exactly at the target
            const foamMesh = new THREE.Mesh(foamGeometry, foamMaterial);
            
            // Position foam ring exactly at the object's position
            foamMesh.position.x = target.x;
            foamMesh.position.z = target.z;
            foamMesh.position.y = 50; // 1 unit above ocean level (-1 + 1 = 0)
            
            // Add slight random rotation for natural look
            foamMesh.rotation.y = Math.random() * Math.PI * 2;
            
            this.scene.add(foamMesh);
            this.foamMeshes.push(foamMesh);
        });
    }

    animate() {
        this.customAnimate();

        this.composer.render();
        window.requestAnimationFrame( this.animate.bind(this) );
    }

    customAnimate() {
        const elapsedTime = this.clock.getElapsedTime();

        // Update controls
        if (this.controls) {
            this.controls.update();
        }

        // Apply dynamic gravity based on object position relative to ocean level
        this.physicsBodies.forEach((body, index) => {
            if (!body) return;
            
            // Skip ocean gravity effects for the currently dragged object
            if (this.selectedCube) {
                // Check if this body belongs to the selected object
                if (this.selectedCube.userData && this.selectedCube.userData.physicsBody === body) {
                    // Clear forces but don't apply ocean gravity - let manual dragging handle it
                    body.force.set(0, 0, 0);
                    return;
                }
                // Also check by index for cubes without userData.physicsBody
                const selectedIndex = this.geometries.indexOf(this.selectedCube);
                if (selectedIndex !== -1 && index === selectedIndex) {
                    body.force.set(0, 0, 0);
                    return;
                }
            }
            
            // CRITICAL: Clear accumulated forces from previous frame
            body.force.set(0, 0, 0);
            
            // Check if this is a boat - boats should float higher
            const isBoat = body.userData?.isBoat || (body.material && body.mass === 5);
            const effectiveOceanLevel = isBoat ? this.oceanLevel + 15 : this.oceanLevel; // Boats float 15 units higher
            
            // Get or initialize the underwater state for this body
            if (!this.bodyUnderwaterStates.has(body)) {
                this.bodyUnderwaterStates.set(body, {
                    isUnderwater: false,
                    timeUnderwater: 0, // Track how long it's been underwater
                    isSettled: false, // Track if object has settled on water surface
                    isFullySettled: false, // Track if object should stop moving completely
                    settledY: 0, // Store the Y position where object settled
                    lastVelocityCheck: 0 // Track time since last velocity check
                });
            }
            
            const state = this.bodyUnderwaterStates.get(body);
            const currentY = body.position.y;
            
            // Simple hysteresis to prevent flickering - use effective ocean level for boats
            const upperThreshold = effectiveOceanLevel + this.gravityConfig.hysteresis;
            const lowerThreshold = effectiveOceanLevel - this.gravityConfig.hysteresis;
            
            let shouldBeUnderwater;
            if (state.isUnderwater) {
                // Currently underwater, switch to air only if well above ocean
                shouldBeUnderwater = currentY < upperThreshold;
            } else {
                // Currently in air, switch to underwater only if well below ocean
                shouldBeUnderwater = currentY < lowerThreshold;
            }
            
            // Update state if it changed
            if (shouldBeUnderwater !== state.isUnderwater) {
                state.isUnderwater = shouldBeUnderwater;
                if (shouldBeUnderwater) {
                    state.timeUnderwater = 0; // Reset timer when entering water
                    state.isSettled = false; // Reset settled state
                }
            }
            
            // Update underwater timer
            if (state.isUnderwater) {
                state.timeUnderwater += 1/60; // Increment by timestep (assuming 60fps)
                
                // Check if object should be considered "settled" (after 2 seconds)
                if (state.timeUnderwater > 2.0 && !state.isSettled) {
                    state.isSettled = true;
                    state.settledY = currentY; // Record settle position
                    console.log('Object initial settle on water surface at Y:', currentY);
                }
                
                // Check if object should be fully settled (after 5 seconds of low velocity)
                if (state.isSettled && !state.isFullySettled) {
                    const velocity = body.velocity.length();
                    if (velocity < 0.5) { // Very low velocity threshold
                        state.lastVelocityCheck += 1/60;
                        if (state.lastVelocityCheck > 3.0) { // 3 seconds of low velocity
                            state.isFullySettled = true;
                            state.settledY = currentY; // Final settle position
                            console.log('Object fully settled - stopping all movement at Y:', currentY);
                        }
                    } else {
                        state.lastVelocityCheck = 0; // Reset timer if velocity increases
                    }
                }
            }
            
            // Apply underwater physics
            if (state.isUnderwater) {
                const mass = body.mass;
                
                if (state.isFullySettled) {
                    // Fully settled - no forces, just maintain position
                    body.force.set(0, 0, 0);
                    
                    // Aggressive damping to stop all movement
                    body.velocity.scale(0.8, body.velocity);
                    body.angularVelocity.scale(0.8, body.angularVelocity);
                    
                    // If velocity is very small, set it to zero
                    if (body.velocity.length() < 0.1) {
                        body.velocity.set(0, 0, 0);
                    }
                    if (body.angularVelocity.length() < 0.1) {
                        body.angularVelocity.set(0, 0, 0);
                    }
                    
                    // Keep object at settled position
                    const positionDrift = currentY - state.settledY;
                    if (Math.abs(positionDrift) > 0.5) {
                        body.position.y = state.settledY;
                    }
                    
                } else if (!state.isSettled) {
                    // Initial settling phase - active buoyancy and damping
                    const netUpwardForce = (-this.gravityConfig.normal + this.gravityConfig.underwater) * mass;
                    body.force.set(0, netUpwardForce, 0);
                    
                    // Apply underwater damping
                    body.velocity.scale(this.gravityConfig.damping, body.velocity);
                    body.angularVelocity.scale(this.gravityConfig.damping, body.angularVelocity);
                    
                } else {
                    // Intermediate settling phase - very gentle buoyancy only
                    const buoyancyForce = (-this.gravityConfig.normal + 50) * mass; // Much weaker buoyancy
                    body.force.set(0, buoyancyForce, 0);
                    
                    // Strong damping to encourage settling
                    body.velocity.scale(0.9, body.velocity);
                    body.angularVelocity.scale(0.9, body.angularVelocity);
                }
            }
            // When above water, let normal world gravity apply (no custom forces needed)
        });

        // Step the physics world
        const timeStep = 1 / 60; // 60 FPS
        this.physicsWorld.step(timeStep);

        // Synchronize Three.js cubes with Cannon.js bodies
        this.geometries.forEach((cube, index) => {
            // Check if this model has its own physics body stored in userData
            if (cube.userData && cube.userData.physicsBody) {
                const body = cube.userData.physicsBody;
                const offset = cube.userData.physicsOffset || new THREE.Vector3(0, 0, 0);
                
                // Synchronize model position accounting for physics offset
                cube.position.copy(body.position).sub(offset);
                cube.quaternion.copy(body.quaternion);
            } else {
                // Fallback to index-based lookup for regular cubes
                const body = this.physicsBodies[index];
                if (!body) return;
                // Synchronize the Three.js cube with the physics body
                cube.position.copy(body.position);
                cube.quaternion.copy(body.quaternion);
            }
        });

        // Update seagull animations with custom wing flapping speed
        if (this.seagullMixers) {
            const seagullTimeStep = timeStep * this.seagullConfig.wingFlappingSpeed;
            this.seagullMixers.forEach(mixer => {
                mixer.update(seagullTimeStep);
            });
        }

        // Update circular flight for seagulls
        if (this.isCircularFlightActive && this.seagulls.length > 0) {
            const circularElapsed = (performance.now() - this.circularFlightStartTime) / 1000;
            
            this.seagulls.forEach((seagull, index) => {
                // Check if we're still transitioning to circular flight
                if (this.circularFlightTransition && this.circularFlightTransition.isTransitioning) {
                    const transitionProgress = Math.min(circularElapsed / (this.circularFlightTransition.duration / 1000), 1);
                    
                    if (transitionProgress < 1) {
                        // During transition: blend from current position to circular path
                        const currentPos = seagull.position.clone();
                        
                        // Calculate target circular position
                        const baseAngle = seagull.userData.transitionAngle || (index * Math.PI);
                        const angle = baseAngle + circularElapsed * this.seagullConfig.circularFlightSpeed;
                        const radius = this.seagullConfig.circularFlightRadius;
                        
                        const targetX = Math.cos(angle) * radius;
                        const targetZ = Math.sin(angle) * radius;
                        const targetY = this.seagullConfig.circularFlightHeight + Math.sin(circularElapsed * 2) * 8; // Slight up/down movement
                        
                        // Smoothly interpolate between current position and target circular position
                        const easeInOut = transitionProgress < 0.5 
                            ? 2 * transitionProgress * transitionProgress 
                            : 1 - Math.pow(-2 * transitionProgress + 2, 2) / 2;
                        
                        seagull.position.x = currentPos.x + (targetX - currentPos.x) * easeInOut;
                        seagull.position.y = currentPos.y + (targetY - currentPos.y) * easeInOut;
                        seagull.position.z = currentPos.z + (targetZ - currentPos.z) * easeInOut;
                        
                        // Make seagull look in flight direction
                        const lookAheadAngle = angle + 0.5;
                        const lookX = Math.cos(lookAheadAngle) * radius;
                        const lookZ = Math.sin(lookAheadAngle) * radius;
                        seagull.lookAt(lookX, seagull.position.y, lookZ);
                    } else {
                        // Transition complete, switch to pure circular flight
                        this.circularFlightTransition.isTransitioning = false;
                        console.log('Transition to circular flight completed');
                    }
                } else {
                    // Pure circular flight
                    const baseAngle = seagull.userData.transitionAngle || (index * Math.PI);
                    const angle = baseAngle + circularElapsed * this.seagullConfig.circularFlightSpeed;
                    const radius = this.seagullConfig.circularFlightRadius;
                    
                    const x = Math.cos(angle) * radius;
                    const z = Math.sin(angle) * radius;
                    const y = this.seagullConfig.circularFlightHeight + Math.sin(circularElapsed * 2) * 8; // Slight up/down movement
                    
                    seagull.position.set(x, y, z);
                    
                    // Make seagull look in flight direction
                    const lookAheadAngle = angle + 0.5; // Look ahead in flight direction
                    const lookX = Math.cos(lookAheadAngle) * radius;
                    const lookZ = Math.sin(lookAheadAngle) * radius;
                    seagull.lookAt(lookX, y, lookZ);
                }
            });
        }

        // Update other animation mixers
        if (this.animationMixers) {
            this.animationMixers.forEach(mixer => {
                mixer.update(timeStep);
            });
        }

        // Update ocean waves
        if (this.vertData) {
            this.vertData.forEach((vd, idx) => {
                const y = vd.initH + Math.sin((elapsedTime) + vd.phase) * vd.amplitude * 5;
                this.oceanGeometry.attributes.position.setY(idx, y);
            });
            
            this.oceanGeometry.attributes.position.needsUpdate = true;
            this.oceanGeometry.computeVertexNormals();
        }

        // Update foam waves with similar animation to ocean
        if (this.foamMeshes && this.foamVertData) {
            this.foamMeshes.forEach((foamMesh, foamIndex) => {
                const vertData = this.foamVertData[foamIndex];
                
                // Update vertices with wave animation
                vertData.forEach((vd, idx) => {
                    // Similar wave calculation to ocean but with different parameters
                    const waveOffset = elapsedTime * 0.8; // Slightly different speed
                    const y = vd.initH + Math.sin(waveOffset + vd.phase) * vd.amplitude * 50; // Smaller amplitude
                    foamMesh.geometry.attributes.position.setY(idx, y);
                });
                
                foamMesh.geometry.attributes.position.needsUpdate = true;
                foamMesh.geometry.computeVertexNormals();
                
                // Update shader uniform for time-based ocean level calculation
                if (foamMesh.material.uniforms && foamMesh.material.uniforms.time) {
                    foamMesh.material.uniforms.time.value = elapsedTime;
                }
                
                // Add gentle vertical floating motion to the entire foam patch
                const foamFloatAmplitude = 0.3;
                const foamFloatSpeed = 0.6 + (foamIndex * 0.1); // Slightly different speeds for each foam
                const baseY = 2; // Raise the base Y position of foam (change this value)
                foamMesh.position.y = baseY + Math.sin(elapsedTime * foamFloatSpeed + foamIndex) * foamFloatAmplitude;
                
                // Optional: Add slight rotation for more natural movement
                foamMesh.rotation.y += 0.001 * (foamIndex % 2 === 0 ? 1 : -1); // Slow rotation
            });
        }

        // Update boat ondulation (floating animation)
        if (this.boat) {
            // Gentle floating motion - up/down movement
            const floatAmplitude = 1.2; // How much the boat moves up and down
            const floatSpeed = 0.8; // Speed of floating motion
            const baseY = -20; // Original Y position of the boat
            
            // Apply gentle up/down floating motion
            this.boat.position.y = baseY + Math.sin(elapsedTime * floatSpeed) * floatAmplitude;
            
            // Gentle rocking motion - rotation around X and Z axes
            const rockAmplitude = 0.08; // How much the boat rocks (in radians)
            const rockSpeedX = 0.6; // Speed of front-to-back rocking
            const rockSpeedZ = 0.4; // Speed of side-to-side rocking
            
            // Apply gentle rocking rotations
            this.boat.rotation.x = Math.sin(elapsedTime * rockSpeedX) * rockAmplitude;
            this.boat.rotation.z = Math.sin(elapsedTime * rockSpeedZ + 1.5) * rockAmplitude * 0.7; // Slightly less side rocking
            
            // Keep original Y rotation (boat orientation) unchanged
            // this.boat.rotation.y stays at Math.PI / 4 as set in loadModel
        }

        // Update ocean material time uniform
        // if (this.oceanMaterial) {
        //     this.oceanMaterial.uniforms.time.value = elapsedTime;
        // }

        // Update dialog positions for dialogs following 3D objects
        if (this.dialogManager) {
            this.dialogManager.updateFollowingDialogs();
        }
    }
    
    /**
     * Setup dialog translations for different languages
     */
    setupDialogTranslations() {
        if (!this.dialogManager) return;
        
        // Welcome message sequence translations
        this.dialogManager.addTranslation('welcome_1', {
            'pt': 'OI...',
            'en': 'HI...'
        });
        
        this.dialogManager.addTranslation('welcome_2', {
            'pt': 'EI, VOCÊ ...',
            'en': 'HEY, YOU ...'
        });
        
        this.dialogManager.addTranslation('welcome_3', {
            'pt': 'SABE QUE LUGAR É ESSE ? ...',
            'en': 'DO YOU KNOW WHAT PLACE THIS IS ? ...',
        });

        this.dialogManager.addTranslation('welcome_4', {
            'pt': 'COMO VOCÊ CHEGOU AQUI ? ...',
            'en': 'HOW DID YOU GET HERE ? ...'
        });

        this.dialogManager.addTranslation('welcome_5', {
            'pt': 'ENTENDI, VOCÊ VEIO DE {source} ...',
            'en': 'I SEE, SO YOU CAME FROM {source} ...'
        });

        this.dialogManager.addTranslation('welcome_6', {
            'pt': 'BOM, O QUE ESTÁ FAZENDO AÍ EM CIMA ? DESÇA PRA CÁ PRA CONVERSAR ...',
            'en': 'WELL, WHAT ARE YOU DOING UP THERE? COME DOWN HERE TO TALK ...'
        });

        // Example interactions with objects
        this.dialogManager.addTranslation('tree_intro', {
            'en': 'A very tall tree, how did it grow on an island like this? ...',
            'pt': 'Uma árvore bem alta, como cresceu em uma ilha dessas ? ...'
        });
        
        // Rock interaction
        this.dialogManager.addTranslation('rock_intro', {
            'en': 'Ancient rocks scattered around the island...',
            'pt': 'Rochas antigas espalhadas pela ilha...'
        });
        
        // Boat interaction
        this.dialogManager.addTranslation('boat_intro', {
            'en': 'This is Leo\'s boat...',
            'pt': 'Esse é o barco do Leo...'
        });
        
        // Crate interaction
        this.dialogManager.addTranslation('crate_interaction', {
            'en': 'Just a wooden crate with some junk inside...',
            'pt': 'Apenas uma caixa de madeira com umas tralhas dentro...'
        });
        
        // Character interaction - Leo introduction sequence
        this.dialogManager.addTranslation('leo_intro_1', {
            'en': 'HEY... I\'M LEO, HOW\'S IT GOING?',
            'pt': 'OPA... SOU LEO, COMO VAI?'
        });
        
        this.dialogManager.addTranslation('leo_intro_2', {
            'en': 'I DON\'T KNOW HOW I ENDED UP HERE...',
            'pt': 'NÃO SEI COMO VIM PARAR AQUI...'
        });
        
        this.dialogManager.addTranslation('leo_intro_3', {
            'en': 'I WAS TRAVELING WITH MY THINGS, AND SUDDENLY...',
            'pt': 'ESTAVA VIAJANDO COM MINHAS COISAS, E DE REPENTE...'
        });
        
        // Leo follow-up sequence - continues the story after music starts
        this.dialogManager.addTranslation('leo_followup_1', {
            'pt': 'ESTA ILHA... E ESSAS ROCHAS, SURGIRAM DO NADA...',
            'en': 'THIS ISLAND... AND THESE ROCKS, APPEARED OUT OF NOWHERE...'

        });
        
        this.dialogManager.addTranslation('leo_followup_2', {
            'pt': 'AGORA ESTOU PRESO AQUI...',
            'en': 'NOW I\'M STUCK HERE...'
        });
        
        this.dialogManager.addTranslation('leo_followup_3', {
            'pt': 'BOM, JÁ QUE NÃO TENHO PRA ONDE IR, PODEMOS CONVERSAR SE QUISER...',
            'en': 'WELL, SINCE I HAVE NOWHERE TO GO, WE CAN TALK IF YOU WANT...'
        });
    }
    

}

export default MainScene;