import ThreejsScene from '../base/scene.js';
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
        this.physicsWorld.gravity.set(0, -50, 0); // Increase gravity intensity
        this.physicsBodies = []; // Store physics bodies for cubes

        // Raycaster and interaction properties
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedCube = null; // The cube currently being dragged
        this.offset = new THREE.Vector3(); // Offset between the cube and the mouse
    
        // Define boundaries for cube movement
        this.boundaries = {
            minX: -20,
            maxX: 200,
            minY: 0, // Prevent going below the ground
            maxY: 200,
            minZ: -20,
            maxZ: 200,
        };

        this.pixelControls = null;
        this.pixelSizeController = null;
        
        // Audio setup
        this.seabreezeAudio = null;
        this.seagullAudio = null;
        this.flyawayAudio = null;
        this.audioLoaded = false;
        this.loadAudio();

        // Seagull animation properties
        this.seagulls = [];
        this.seagullMixers = [];
        this.seagullConfig = {
            introFlightDuration: 4000, // Duration for initial flight to center
            circularFlightRadius: 150, // Radius for circular flight around center
            circularFlightSpeed: 0.5, // Speed of circular movement
            circularFlightHeight: 220, // Height above ground for circular flight (increased from 60)
            spawnDistance: 800, // Distance from center where seagulls spawn
            spawnHeight: 80, // Initial spawn height
            musicDelay: 3000, // Delay before background music starts
            musicFadeInDuration: 2000, // Duration for music volume fade-in
            maxMusicVolume: 0.3 // Maximum volume for background music
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
    }

    loadAudio() {
        // Seabreeze ambient audio
        this.seabreezeAudio = new Audio('sounds/background/seabreeze.wav');
        this.seabreezeAudio.loop = true;
        this.seabreezeAudio.volume = 0.8;
        
        // Seagull sound effect
        this.seagullAudio = new Audio('sounds/background/seagulls.wav');
        this.seagullAudio.volume = 0.3;
        
        // Background music
        this.flyawayAudio = new Audio('sounds/music/flyaway.mp3');
        this.flyawayAudio.loop = true;
        this.flyawayAudio.volume = 0.2;
        
        let audioLoadedCount = 0;
        const totalAudioFiles = 3;
        
        const checkAllAudioLoaded = () => {
            audioLoadedCount++;
            if (audioLoadedCount === totalAudioFiles) {
                this.audioLoaded = true;
                console.log('All audio files loaded and ready to play');
            }
        };
        
        this.seabreezeAudio.addEventListener('canplaythrough', checkAllAudioLoaded);
        this.seagullAudio.addEventListener('canplaythrough', checkAllAudioLoaded);
        this.flyawayAudio.addEventListener('canplaythrough', checkAllAudioLoaded);
        
        this.seabreezeAudio.addEventListener('error', (e) => {
            console.error('Error loading seabreeze audio:', e);
        });
        this.seagullAudio.addEventListener('error', (e) => {
            console.error('Error loading seagull audio:', e);
        });
        this.flyawayAudio.addEventListener('error', (e) => {
            console.error('Error loading flyaway audio:', e);
        });
        
        // Preload all audio
        this.seabreezeAudio.load();
        this.seagullAudio.load();
        this.flyawayAudio.load();
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

        // let sky = new Sky();
        // sky.scale.setScalar( 450000 );
        // this.scene.add( sky );

        // Create a realistic day sky
        // sky.material.uniforms['turbidity'].value = 5; // Lower turbidity for clearer sky
        // sky.material.uniforms['rayleigh'].value = 1.5; // Reduced for less blue scattering
        // sky.material.uniforms['mieCoefficient'].value = 0.15; // Lower for less haze
        // sky.material.uniforms['mieDirectionalG'].value = 0.7; // Directional scattering
        // sky.material.uniforms['sunPosition'].value.set(0.3, -0.4, -0.2); // Higher sun position for daylight

        // Add exponential fog
        this.scene.fog = new THREE.FogExp2('#57a2df', 0.00045);

        // Add camera
        this.camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 2500 );
        
        // Add OrbitControls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.target.set(0, 1200, 0); // Start target high in the sky
        this.controls.enableZoom = true; // Enable zooming
        this.controls.enablePan = true; // Enable panning
        this.controls.maxPolarAngle = Math.PI / 2.2; // Allow camera to look down to ground level
        this.controls.minPolarAngle = Math.PI / 6; // Allow camera to look up (30 degrees from vertical)
        this.controls.minDistance = 700; // Minimum zoom distance
        this.controls.maxDistance = 1500; // Maximum zoom distance
        
        // DISABLE OrbitControls initially - will be enabled after intro animation
        this.controls.enabled = false;
        
        // Set camera to start HIGH UP in the sky looking down at nothing but sky
        const maxDistance = 1500;
        const targetPosition = new THREE.Vector3(0, -5, 0);
        
        // Position camera HIGH UP in the sky - much higher than the scene
        const x = 0;
        const y = 1200; // WAY HIGH UP - above everything
        const z = targetPosition.z + maxDistance;
        
        this.camera.position.set(x, y, z);
        
        // Look straight up at the sky (so user sees nothing but sky initially)
        const skyPoint = new THREE.Vector3(0, y + 500, 0); // Point even higher in the sky
        this.camera.lookAt(skyPoint);
        
        console.log('Initial camera setup:', {
            position: this.camera.position,
            skyPoint: skyPoint,
            cameraY: y,
            lookingUp: true
        });
        
        this.controls.update();

        this.calculateViewportBoundaries();

        // Add lights
        this.createLights();

        // Add ground
        this.createGround();

        this.createOcean();

        let cubeSize = Math.abs((window.innerWidth) * (this.isMobile() ? 0.035 : 0.02)); // Size of the cubes

        this.addNewCube(
            'textures/main/linkedin.png', 
            'https://www.linkedin.com/in/leonardo-gutierrez-sato/',
            'LinkedIn',
            cubeSize, 
            new THREE.Vector3(-30.1, 70, -30.1)
        );
        this.addNewCube(
            'textures/main/github.png', 
            'https://github.com/satoLG', 
            'GitHub',
            cubeSize, 
            new THREE.Vector3(30.1, 70, 30.1)
        );
        this.addNewCube(
            'textures/main/codepen.png', 
            'https://codepen.io/satoLG', 
            'CodePen',
            cubeSize, 
            new THREE.Vector3(45.1, 70, -45.1)
        );
        this.addNewCube(
            'textures/main/instagram.jpg', 
            'https://www.instagram.com/sato_leo_kun/',
            'Instagram',
            cubeSize, 
            new THREE.Vector3(35, 70, -18)
        );
        this.addNewCube(
            'textures/main/whatsapp.jpeg', 
            'https://wa.me/11952354083', 
            'WhatsApp',
            cubeSize, 
            new THREE.Vector3(15, 70, -38)
        );
        this.addNewCube(
            'textures/main/gmail.png', 
            'mailto:leonardogsato@gmail.com', 
            'leonardogsato@gmail.com',
            cubeSize, 
            new THREE.Vector3(-20, 70, 38)
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

        this.dropZone = document.querySelector('#drop-zone');
        this.dropZone.addEventListener('mouseover', () => {
            console.log(this.selectedCube)
            if (this.selectedCube?.userData.url) {
                if (this.selectedCube?.userData.url && this.selectedCube.material && this.selectedCube.material.map) {
                    const texture = this.selectedCube.material.map;
                
                    this.getPredominantColor(texture, (color) => {
                        console.log('Predominant Color:', color);
                
                        // Apply the color to the drop zone
                        this.dropZone.style.boxShadow = `${color} 0px 0px 15px`;
                    });
                }

                this.dropZone.querySelector('#drop-zone-link').textContent = this.selectedCube.userData.name;
                this.dropZone.querySelector('#drop-zone-link').href = this.selectedCube.userData.url;
                this.dropZone.querySelector('#drop-zone-icon').src = this.selectedCube.userData.texturePath;
            }
        });

        this.dropZone.addEventListener('mouseout', () => {
            this.dropZone.style.boxShadow = 'none'; // Reset the box shadow
            this.dropZone.classList.remove('hover');
            // Reset the drop zone content if not hovering
            this.dropZone.querySelector('#drop-zone-link').textContent = 'Solte aqui!';
            this.dropZone.querySelector('#drop-zone-link').href = '';
            this.dropZone.querySelector('#drop-zone-icon').src = 'img/external-link.png';
        });

        // Add touchstart event for touch devices
        this.dropZone.addEventListener('touchstart', (event) => {
            if (this.selectedCube?.userData.url) {
                this.dropZone.querySelector('#drop-zone-link').textContent = this.selectedCube.userData.name;
                this.dropZone.querySelector('#drop-zone-link').href = this.selectedCube.userData.url;
                this.dropZone.querySelector('#drop-zone-icon').src = this.selectedCube.userData.texturePath;
            }

            // Prevent default behavior to avoid scrolling
            event.preventDefault();
        });

        //Add touchmove event for touch devices
        window.addEventListener('touchmove', (event) => {
            if (this.selectedCube?.userData.url) {
                // Get the touch position
                const touch = event.touches[0];
                const touchX = touch.clientX;
                const touchY = touch.clientY;

                // Get the drop zone's bounding rectangle
                const dropZoneRect = this.dropZone.getBoundingClientRect();

                // Check if the touch is over the drop zone
                if (
                    touchX >= dropZoneRect.left &&
                    touchX <= dropZoneRect.right &&
                    touchY >= dropZoneRect.top &&
                    touchY <= dropZoneRect.bottom
                ) {
                    if (this.selectedCube?.userData.url && this.selectedCube.material && this.selectedCube.material.map) {
                        const texture = this.selectedCube.material.map;
                    
                        this.getPredominantColor(texture, (color) => {
                            console.log('Predominant Color:', color);
                    
                            // Apply the color to the drop zone
                            this.dropZone.style.boxShadow = `${color} 0px 0px 15px`;
                        });
                    }

                    this.dropZone.classList.add('hover');
                    // Update the drop zone content
                    this.dropZone.querySelector('#drop-zone-link').textContent = this.selectedCube.userData.name;
                    this.dropZone.querySelector('#drop-zone-link').href = this.selectedCube.userData.url;
                    this.dropZone.querySelector('#drop-zone-icon').src = this.selectedCube.userData.texturePath;
                }
                else {
                    this.dropZone.style.boxShadow = 'none'; // Reset the box shadow
                    this.dropZone.classList.remove('hover');
                    // Reset the drop zone content if not hovering
                    this.dropZone.querySelector('#drop-zone-link').textContent = 'Solte aqui!';
                    this.dropZone.querySelector('#drop-zone-link').href = '';
                    this.dropZone.querySelector('#drop-zone-icon').src = 'img/external-link.png';
                }
            }
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
            pixelSize: 50,
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
                    // Show start button by removing any initial hide styles
                    const startButtonContainer = document.getElementById('start-button');
                    if (startButtonContainer) {
                        startButtonContainer.style.display = 'flex';
                        startButtonContainer.style.opacity = '1';
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

        //Load the laptop model
        this.loadModel(loader, 'models/palmtree.glb', [0, 20, 0], [80, 80, 80], [0, 0, 0], true);

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

    calculateViewportBoundaries() {
        const aspect = window.innerWidth / window.innerHeight;
        const vFOV = THREE.MathUtils.degToRad(this.camera.fov); // Vertical field of view in radians
        const height = 2 * Math.tan(vFOV / 2) * this.camera.position.z; // Visible height
        const width = height * aspect; // Visible width
    
        this.boundaries = {
            minX: -(width / 2 - 6),
            maxX: width / 2 - 6,
            minY: 0, // Prevent going below the ground
            maxY: height,
            minZ: -40, // Keep Z boundaries fixed
            maxZ: 80,
        };
    }

    onWindowResize() {
        // Update camera aspect ratio and projection matrix
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    
        // Recalculate viewport boundaries
        this.calculateViewportBoundaries();
    
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
            // Prevent OrbitControls from handling this event
            event.preventDefault();
            event.stopPropagation();
            
            // Disable OrbitControls when dragging objects
            this.controls.enabled = false;
            
            // Select the first intersected object
            this.selectedCube = intersects[0].object;

            // Dynamically align the intersection plane with the object's current position
            const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -this.selectedCube.position.z);
    
            // Calculate the intersection point
            const intersectionPoint = new THREE.Vector3();
            this.raycaster.ray.intersectPlane(plane, intersectionPoint);
    
            // Calculate the offset between the intersection point and the object's position
            this.offset.copy(intersectionPoint).sub(this.selectedCube?.position);
    
            // Disable physics for the selected object
            const index = this.geometries.indexOf(this.selectedCube);
            if (index !== -1) {
                const body = this.physicsBodies[index];
                body.type = CANNON.Body.KINEMATIC; // Make the body kinematic
                body.velocity.set(0, 0, 0); // Stop any linear motion
                body.angularVelocity.set(0, 0, 0); // Stop any rotational motion
            }

            console.log('Selected Cube:', this.selectedCube);
            if (this.selectedCube?.userData.url) {
                // Show the drop zone
                this.dropZone.style.opacity = '1';
                this.dropZone.style.pointerEvents = 'auto'; // Enable pointer events for the drop zone
            }
        }
    }
    
    onMouseMove(event) {
        if (this.selectedCube) {
            // Prevent default only when dragging
            event.preventDefault();
            
            // Calculate mouse position in normalized device coordinates
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
            // Dynamically align the intersection plane with the object's current position
            const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -this.selectedCube.position.z);
    
            // Use raycaster to find the intersection point in 3D space
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersectionPoint = new THREE.Vector3();
            this.raycaster.ray.intersectPlane(plane, intersectionPoint);
    
            // Update the position of the selected object
            this.selectedCube.position.copy(intersectionPoint.sub(this.offset));
    
            // Clamp the object's position within the boundaries
            const { minX, maxX, minY, maxY, minZ, maxZ } = this.boundaries;
            this.selectedCube.position.x = THREE.MathUtils.clamp(this.selectedCube?.position.x, minX, maxX);
            this.selectedCube.position.y = THREE.MathUtils.clamp(this.selectedCube?.position.y, minY, maxY);
            this.selectedCube.position.z = THREE.MathUtils.clamp(this.selectedCube?.position.z, minZ, maxZ);
    
            // Update the physics body position
            const index = this.geometries.indexOf(this.selectedCube);
            if (index !== -1) {
                this.physicsBodies[index].position.copy(this.selectedCube?.position);
            }

            // Add drop zone detection for mouse events (similar to touch events)
            if (this.selectedCube?.userData.url) {
                // Get the mouse position
                const mouseX = event.clientX;
                const mouseY = event.clientY;

                // Get the drop zone's bounding rectangle
                const dropZoneRect = this.dropZone.getBoundingClientRect();

                // Check if the mouse is over the drop zone
                if (
                    mouseX >= dropZoneRect.left &&
                    mouseX <= dropZoneRect.right &&
                    mouseY >= dropZoneRect.top &&
                    mouseY <= dropZoneRect.bottom
                ) {
                    if (this.selectedCube?.userData.url && this.selectedCube.material && this.selectedCube.material.map) {
                        const texture = this.selectedCube.material.map;
                    
                        this.getPredominantColor(texture, (color) => {
                            console.log('Predominant Color:', color);
                    
                            // Apply the color to the drop zone
                            this.dropZone.style.boxShadow = `${color} 0px 0px 15px`;
                        });
                    }

                    this.dropZone.classList.add('hover');
                    // Update the drop zone content
                    this.dropZone.querySelector('#drop-zone-link').textContent = this.selectedCube.userData.name;
                    this.dropZone.querySelector('#drop-zone-link').href = this.selectedCube.userData.url;
                    this.dropZone.querySelector('#drop-zone-icon').src = this.selectedCube.userData.texturePath;
                }
                else {
                    this.dropZone.style.boxShadow = 'none'; // Reset the box shadow
                    this.dropZone.classList.remove('hover');
                    // Reset the drop zone content if not hovering
                    this.dropZone.querySelector('#drop-zone-link').textContent = 'Solte aqui!';
                    this.dropZone.querySelector('#drop-zone-link').href = '';
                    this.dropZone.querySelector('#drop-zone-icon').src = 'img/external-link.png';
                }
            }
        }
    }
    
    onMouseUp(event) {
        if (this.selectedCube) {
            // Re-enable OrbitControls
            this.controls.enabled = true;
            
            // Check if the object is dropped inside the drop zone
            const dropZoneRect = this.dropZone.getBoundingClientRect();
            // Calculate mouse position in normalized device coordinates
            const mouseX = event.clientX;
            const mouseY = event.clientY;
    
            console.log('Mouse X:', mouseX, 'Mouse Y:', mouseY);
            console.log('Drop Zone Rect:', dropZoneRect);
            if (
                mouseX >= dropZoneRect.left &&
                mouseX <= dropZoneRect.right &&
                mouseY >= dropZoneRect.top &&
                mouseY <= dropZoneRect.bottom
            ) {
                if (this.selectedCube?.userData.url) {
                    try {
                        // Attempt to open the URL in a new tab
                        const newWindow = window.open(this.selectedCube?.userData.url, '_blank');
                        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                            // Fallback: Navigate to the URL in the same tab
                            window.location.href = this.selectedCube?.userData.url;
                        }
                    } catch (error) {
                        console.error('Failed to open URL:', error);
                        // Fallback: Navigate to the URL in the same tab
                        window.location.href = this.selectedCube?.userData.url;
                    } 
                }
            }
    
            // Hide the drop zone
            this.dropZone.style.opacity = '0';
            // this.dropZone.style.pointerEvents = 'none'; // Disable pointer events for the drop zone
    
            // Re-enable physics for the selected cube
            const index = this.geometries.indexOf(this.selectedCube);
            if (index !== -1) {
                this.physicsBodies[index].type = CANNON.Body.DYNAMIC; // Make the body dynamic again
            }
    
            // Clear the selected cube
            this.selectedCube = null;
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
            };

            // Add the cube to the scene
            this.scene.add(newCube);

            // Add a physics body for the cube
            const cubeShape = new CANNON.Box(new CANNON.Vec3(cubeSize/2, (cubeSize/2), cubeSize/2)); // Half extents of the cube (match the size of the RoundedBoxGeometry)
            const cubeBody = new CANNON.Body({
                mass: 1, // Dynamic body
                position: new CANNON.Vec3(cubePosition.x, cubePosition.y, cubePosition.z),
                shape: cubeShape,
            });

            // Set random rotation for the physics body
            // cubeBody.quaternion.setFromEuler(randomRotation.x, randomRotation.y, randomRotation.z);

            // Add bouncing effect by setting restitution
            const cubePhysicsMaterial = new CANNON.Material();
            cubeBody.material = cubePhysicsMaterial;

            // Create a contact material for bouncing
            const groundMaterial = this.groundBody.material; // Assuming the ground has a material
            const contactMaterial = new CANNON.ContactMaterial(cubePhysicsMaterial, groundMaterial, {
                restitution: 0.05, // Bounciness (higher values = more bounce)
                friction: 0.8, // Friction
            });
            this.physicsWorld.addContactMaterial(contactMaterial);

            // Add the physics body to the world
            this.physicsWorld.addBody(cubeBody);

            // Store the cube and its physics body
            this.geometries.push(newCube);
            this.physicsBodies.push(cubeBody);

            console.log('New cube added:', newCube);            
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
            
        audioFolder.add(this.seagullConfig, 'musicFadeInDuration', 500, 5000)
            .name('Music Fade Duration (ms)')
            .step(100);
            
        audioFolder.add(this.seagullConfig, 'maxMusicVolume', 0, 1)
            .name('Max Music Volume')
            .step(0.05)
            .onChange((value) => {
                if (this.flyawayAudio) {
                    this.flyawayAudio.volume = Math.min(value, this.flyawayAudio.volume);
                }
            });

        // Manual audio controls
        const audioActions = {
            playSeagullSound: () => this.playSeagullSound(),
            playBackgroundMusic: () => this.playBackgroundMusic(),
            stopBackgroundMusic: () => {
                if (this.flyawayAudio) {
                    this.flyawayAudio.pause();
                    this.flyawayAudio.currentTime = 0;
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
        audioFolder.add(audioActions, 'playBackgroundMusic').name('Play Background Music');
        audioFolder.add(audioActions, 'stopBackgroundMusic').name('Stop Background Music');
        audioFolder.add(audioActions, 'restartIntro').name('Restart Intro Animation');
        audioFolder.add(audioActions, 'checkSeagulls').name('Check Seagulls Status');
        audioFolder.add(audioActions, 'showSeagulls').name('Show Seagulls Manually');
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
        
        let animationDuration = 3000; // 3 seconds

        // Start combined camera animation (zoom + angle together)
        this.animateCameraComplete(animationDuration);
        this.animatePixelSize(this.pixelControls.pixelSize, 5, animationDuration); // 3 second transition to high quality
        this.startSeagullIntroFlight(); // Start seagull animation
    }

    setupStartButton() {
        this.startButton = document.getElementById('start-intro-btn');
        if (this.startButton) {
            this.startButton.addEventListener('click', () => {
                this.hideStartButton();
                
                // Wait a moment then start intro (or immediately if models are loaded)
                if (this.allModelsLoaded) {
                    setTimeout(() => {
                        this.startIntroAnimation();
                    }, 500); // Small delay for button animation
                } else {
                    // Models not loaded yet, wait for them
                    console.log('Start button clicked, waiting for models to load...');
                    const checkModels = setInterval(() => {
                        if (this.allModelsLoaded) {
                            clearInterval(checkModels);
                            this.startIntroAnimation();
                        }
                    }, 100);
                }
            });
        }
    }

    hideStartButton() {
        if (this.startButton) {
            const startButtonContainer = document.getElementById('start-button');
            if (startButtonContainer) {
                startButtonContainer.classList.add('fade-out');
                
                // Remove from DOM after animation
                setTimeout(() => {
                    startButtonContainer.style.display = 'none';
                }, 800);
            }
        }
    }

    checkAnimationsComplete() {
        if (this.animationsCompleted.camera && this.animationsCompleted.pixel) {
            console.log('All intro animations completed, starting seabreeze audio');
            this.playSeabreezeAudio();
        }
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
            const startY = 1200; // High up in the sky
            const endY = 195;   // Normal scene level
            const currentY = startY + (endY - startY) * easeInOut;
            
            const x = 0;
            const z = targetPosition.z + currentDistance;
            
            this.camera.position.set(x, currentY, z);
            
            // Animate OrbitControls target from sky down to scene center
            const skyTargetY = currentY + 500; // Target high in the sky
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

            // --- Improved bounding box calculation ---
            // Find the largest visible mesh in the model
            let largestMesh = null;
            let largestVolume = 0;
            model.traverse((child) => {
                if (child.isMesh && child.visible) {
                    const box = new THREE.Box3().setFromObject(child);
                    const size = new THREE.Vector3();
                    box.getSize(size);
                    const volume = size.x * size.y * size.z;
                    if (volume > largestVolume) {
                        largestVolume = volume;
                        largestMesh = child;
                    }
                }
            });

            let box, size;
            if (largestMesh) {
                box = new THREE.Box3().setFromObject(largestMesh);
                size = new THREE.Vector3();
                box.getSize(size);
            } else {
                // fallback to whole model
                box = new THREE.Box3().setFromObject(model);
                size = new THREE.Vector3();
                box.getSize(size);
            }

            // Optionally, visualize the bounding box for debugging
            // const helper = new THREE.Box3Helper(box, 0xff0000);
            // this.scene.add(helper);

            // Create Cannon.js box shape (half extents)
            const boxShape = new CANNON.Box(new CANNON.Vec3(size.x / 2, 0, size.z / 2));
            const boxBody = new CANNON.Body({
                mass: 1,
                position: new CANNON.Vec3(model.position.x, model.position.y, model.position.z),
                shape: boxShape,
            });

            boxBody.quaternion.setFromEuler(rotation[0], rotation[1], rotation[2]);

            // this.physicsWorld.addBody(boxBody);
            this.geometries.push(model);
            // this.physicsBodies.push(boxBody);

            if (gltf.animations.length > 0) {
                const mixer = new THREE.AnimationMixer(model);
                gltf.animations.forEach((clip) => {
                    mixer.clipAction(clip).play();
                });
                this.animationMixers.push(mixer);
            }
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
                seagull1.scale.set(15, 15, 15);
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
        
        // Load second seagull using existing loadModel function
        loader.load('models/seagull.glb', 
            (gltf) => {
                console.log('Seagull 2 GLTF loaded successfully:', gltf);
                const seagull2 = gltf.scene;
                seagull2.scale.set(15, 15, 15);
                seagull2.position.set(seagull2X, this.seagullConfig.spawnHeight, seagull2Z);
                seagull2.lookAt(0, this.seagullConfig.spawnHeight, 0);
                seagull2.visible = false; // Initially hidden
                
                // Enable shadows
                seagull2.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                
                this.scene.add(seagull2);
                this.seagulls.push(seagull2);
                
                // Setup animation mixer for second seagull
                if (gltf.animations && gltf.animations.length > 0) {
                    console.log('Setting up animations for seagull 2, found', gltf.animations.length, 'animations');
                    const mixer = new THREE.AnimationMixer(seagull2);
                    this.seagullMixers.push(mixer);
                    
                    gltf.animations.forEach((clip) => {
                        const action = mixer.clipAction(clip);
                        action.play();
                    });
                } else {
                    console.warn('No animations found for seagull 2');
                }
                
                console.log('Seagull 2 loaded at position:', seagull2.position);
            },
            (progress) => {
                console.log('Loading seagull 2:', (progress.loaded / progress.total * 100) + '%');
            },
            (error) => {
                console.error('Error loading seagull 2:', error);
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

    playBackgroundMusic() {
        if (this.flyawayAudio && this.audioLoaded) {
            this.flyawayAudio.currentTime = 0;
            this.flyawayAudio.play().then(() => {
                console.log('Background music started');
                this.fadeInMusic();
            }).catch((error) => {
                console.log('Background music autoplay prevented:', error);
            });
        }
    }

    fadeInMusic() {
        const startTime = performance.now();
        const startVolume = 0;
        const endVolume = this.seagullConfig.maxMusicVolume;
        const duration = this.seagullConfig.musicFadeInDuration;
        
        const fadeIn = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            this.flyawayAudio.volume = 0.08;
            //startVolume + (endVolume - startVolume) * progress;
            
            if (progress < 1) {
                requestAnimationFrame(fadeIn);
            }
        };
        
        requestAnimationFrame(fadeIn);
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
                
                // Start circular flight and schedule background music
                this.startCircularFlight();
                setTimeout(() => {
                    this.playBackgroundMusic();
                }, this.seagullConfig.musicDelay);
            }
        };
        
        requestAnimationFrame(animate);
    }

    startCircularFlight() {
        this.circularFlightStartTime = performance.now();
        this.isCircularFlightActive = true;
        
        // Setup transition parameters for smooth circular flight
        this.circularFlightTransition = {
            duration: 2000, // 2 seconds to transition to circular flight
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
                restitution: 0.1, // Lower bounciness for stacking
                friction: 0.6, // Friction for stability
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

    createGround() {
        const textureLoader = new THREE.TextureLoader()

        // Floor
        const floorColorTexture = textureLoader.load('./textures/main/sand_01_1k/sand_01_color_1k.png')
        const floorARMTexture = textureLoader.load('./textures/main/sand_01_1k/sand_01_ambient_occlusion_1k.png')
        const floorNormalTexture = textureLoader.load('./textures/main/sand_01_1k/sand_01_normal_gl_1k.png')
        const floorDisplacementTexture = textureLoader.load('./textures/main/sand_01_1k/sand_01_height_1k.png')

        floorColorTexture.colorSpace = THREE.SRGBColorSpace

        floorColorTexture.repeat.set(12, 12)
        floorARMTexture.repeat.set(12, 12)
        floorNormalTexture.repeat.set(12, 12)
        floorDisplacementTexture.repeat.set(12, 12)

        floorColorTexture.wrapS = THREE.RepeatWrapping
        floorARMTexture.wrapS = THREE.RepeatWrapping
        floorNormalTexture.wrapS = THREE.RepeatWrapping
        floorDisplacementTexture.wrapS = THREE.RepeatWrapping

        floorColorTexture.wrapT = THREE.RepeatWrapping
        floorARMTexture.wrapT = THREE.RepeatWrapping
        floorNormalTexture.wrapT = THREE.RepeatWrapping
        floorDisplacementTexture.wrapT = THREE.RepeatWrapping

        const groundGeometry = new THREE.SphereGeometry( 
            800, 
            600, 
            600, 
            0, 
            Math.PI * 2, 
            0, 
            Math.PI // Ground half-sphere
        ); 
        //const groundGeometry = new THREE.PlaneGeometry(520, 520, 256, 256);
        const groundMaterial = new THREE.MeshStandardMaterial({
            // alphaMap: floorAlphaTexture,
            transparent: true,
            map: floorColorTexture,
            aoMap: floorARMTexture,
            roughnessMap: floorARMTexture,
            metalnessMap: floorARMTexture,
            normalMap: floorNormalTexture,
            displacementMap: floorDisplacementTexture,
            displacementScale: 25,
            displacementBias: -0.2,
            side: THREE.DoubleSide,
            // Ensure proper lighting
            roughness: 1,
            metalness: 0
        });

        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.receiveShadow = true;
        this.scene.add(ground);
        ground.position.set(0, -760, 0);
        ground.rotation.set(-Math.PI / 2, 0, 0);
        
    
        // Add physics body for the ground
        const radius = 800; // Match your THREE.SphereGeometry radius
        const groundShape = new CANNON.Sphere(radius);
        const groundBody = new CANNON.Body({
            mass: 0, // Static body
            shape: groundShape,
            material: new CANNON.Material()
        });
        groundBody.position.set(0, -radius+50, 0); // Position to match your visual hemisphere
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Match the rotation of the Three.js ground
    
        // Add a physics material for the ground
        const groundPhysicsMaterial = new CANNON.Material({
            friction: 0.8,
            restitution: 0.05
        });
        groundBody.material = groundPhysicsMaterial;
    
        this.physicsWorld.addBody(groundBody);
    
        // Store the ground body for contact materials
        this.groundBody = groundBody;
    }

    createOcean() {
        this.oceanGeometry = new THREE.PlaneGeometry(10000, 10000, 128, 128);
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
        gradient.addColorStop(.25, '#0a2d4d');   // Darker ocean blue at edges

        // Fill canvas with gradient
        context.fillStyle = gradient;
        context.fillRect(0, 0, 512, 512);

        // Create texture from canvas
        const gradientTexture = new THREE.CanvasTexture(canvas);

        // Create noise texture for refraction/distortion
        const noiseCanvas = document.createElement('canvas');
        noiseCanvas.width = 256;
        noiseCanvas.height = 256;
        const noiseContext = noiseCanvas.getContext('2d');
        
        // Generate noise pattern
        const imageData = noiseContext.createImageData(256, 256);
        for (let i = 0; i < imageData.data.length; i += 4) {
            const noise = Math.random() * 255;
            imageData.data[i] = noise;     // R
            imageData.data[i + 1] = noise; // G
            imageData.data[i + 2] = noise; // B
            imageData.data[i + 3] = 255;   // A
        }
        noiseContext.putImageData(imageData, 0, 0);
        
        const noiseTexture = new THREE.CanvasTexture(noiseCanvas);
        noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;

        // Create ocean material with frosted glass effect
        const oceanMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                map: { value: gradientTexture },
                noiseTexture: { value: noiseTexture },
                distortionStrength: { value: 0.03 },
                opacity: { value: 0.96 }
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

        // Step the physics world
        const timeStep = 1 / 60; // 60 FPS
        this.physicsWorld.step(timeStep);

        // Synchronize Three.js cubes with Cannon.js bodies
        this.geometries.forEach((cube, index) => {
            const body = this.physicsBodies[index];
            if (!body) return;
            // Synchronize the Three.js cube with the physics body
            cube.position.copy(body.position);
            cube.quaternion.copy(body.quaternion);
        });

        // Update seagull animations
        if (this.seagullMixers) {
            this.seagullMixers.forEach(mixer => {
                mixer.update(timeStep);
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
                const y = vd.initH + Math.sin((elapsedTime) + vd.phase) * vd.amplitude * 8;
                this.oceanGeometry.attributes.position.setY(idx, y);
            });
            
            this.oceanGeometry.attributes.position.needsUpdate = true;
            this.oceanGeometry.computeVertexNormals();
        }

        // Update ocean material time uniform
        // if (this.oceanMaterial) {
        //     this.oceanMaterial.uniforms.time.value = elapsedTime;
        // }
    }
}

export default MainScene;