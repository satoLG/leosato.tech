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
        this.audioLoaded = false;
        this.loadAudio();
    }

    loadAudio() {
        this.seabreezeAudio = new Audio('sounds/background/seabreeze.wav');
        this.seabreezeAudio.loop = true;
        this.seabreezeAudio.volume = 0.3; // Set volume to 30%
        
        this.seabreezeAudio.addEventListener('canplaythrough', () => {
            this.audioLoaded = true;
            console.log('Seabreeze audio loaded and ready to play');
        });
        
        this.seabreezeAudio.addEventListener('error', (e) => {
            console.error('Error loading seabreeze audio:', e);
        });
        
        // Preload the audio
        this.seabreezeAudio.load();
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
        this.controls.target.set(0, -5, 0);
        this.controls.enableZoom = true; // Enable zooming
        this.controls.enablePan = true; // Enable panning
        this.controls.maxPolarAngle = Math.PI / 2.5; // i need it just a bit above the ground level
        this.controls.minPolarAngle = Math.PI / 2.5;
        // this.controls.minPolarAngle = Math.PI / 3.5;
        this.controls.minDistance = 700; // Minimum zoom distance
        this.controls.maxDistance = 1500; // Maximum zoom distance
        
        // Set camera to start at maximum distance
        const maxDistance = 1500;
        const targetPosition = new THREE.Vector3(0, -5, 0);
        const cameraDirection = new THREE.Vector3(0, 55, 10).normalize(); // Use your original direction
        this.camera.position.copy(targetPosition).add(cameraDirection.multiplyScalar(maxDistance));
        this.camera.lookAt(targetPosition);
        
        this.controls.update();

        this.calculateViewportBoundaries();

        // Add lights
        this.createLights();

        // Add ground
        this.createGround();

        this.createOcean();

        let cubeSize = Math.abs((window.innerWidth) * (this.isMobile() ? 0.035 : 0.03)); // Size of the cubes

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
            pixelSize: 100,
            isHighPixel: false, // false = low pixel (100), true = high pixel (10)
            isAnimating: false // Flag to prevent multiple animations
        };

        const currentPixelSize = 100;

        this.composer = new EffectComposer( this.renderer );
        this.renderPixelatedPass = new RenderPixelatedPass( currentPixelSize, this.scene, this.camera );
        this.renderPixelatedPass.normalEdgeStrength = 0;
        this.composer.addPass( this.renderPixelatedPass );

        this.outputPass = new OutputPass();
        this.composer.addPass( this.outputPass );

        // document.getElementById('loading-screen').style.display = '';
        // Loading manager
        const loadingManager = new THREE.LoadingManager(
            () => {
                this.startIntroAnimation();
                // On load complete
                // setTimeout(() => {
                //     document.getElementById('loading-screen').style.display = 'none';
                //     document.getElementById('progress-bar').style.width = '0%';
                // }, 500);
            },
            (itemUrl, itemsLoaded, itemsTotal) => {
                // On progress
                // const progress = (itemsLoaded / itemsTotal) * 100;
                // document.getElementById('progress-bar').style.width = `${progress}%`;
            },
            (url) => {
                // On load start
                // document.getElementById('loading-screen').style.display = '';
            }
        );

        //Setup model loader
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath( 'jsm/' );
        const loader = new GLTFLoader(loadingManager);
        loader.setDRACOLoader( dracoLoader );

        //Load the laptop model
        this.loadModel(loader, 'models/palmtree.glb', [0, 20, 0], [80, 80, 80], [0, 0, 0], true);

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
        // Track completion of both animations
        this.animationsCompleted = {
            camera: false,
            pixel: false
        };
        
        // Start both animations simultaneously
        this.animateCameraZoom();
        this.animatePixelSize(100, 10, 3000); // 3 second transition to high quality
    }

    checkAnimationsComplete() {
        if (this.animationsCompleted.camera && this.animationsCompleted.pixel) {
            console.log('All intro animations completed, starting seabreeze audio');
            this.playSeabreezeAudio();
        }
    }

    animateCameraZoom(duration = 3000) {
        if (!this.controls) return;

        const startDistance = this.controls.maxDistance; // Should be 1500
        const endDistance = this.controls.minDistance;   // Should be 500
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation (ease-in-out)
            const easeInOut = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            const currentDistance = startDistance + (endDistance - startDistance) * easeInOut;
            
            // Update camera position maintaining the same direction
            const targetPosition = new THREE.Vector3(0, -5, 0);
            const cameraDirection = new THREE.Vector3(0, 55, 10).normalize();
            this.camera.position.copy(targetPosition).add(cameraDirection.multiplyScalar(currentDistance));
            this.camera.lookAt(targetPosition);
            
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
        const floorAlphaTexture = textureLoader.load('./textures/main/alpha.webp')
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
        this.oceanGeometry = new THREE.PlaneGeometry(5500, 5500, 128, 128);
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
        gradient.addColorStop(.45, '#0a2d4d');   // Darker ocean blue at edges

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

        // Update ocean waves
        if (this.vertData) {
            this.vertData.forEach((vd, idx) => {
                const y = vd.initH + Math.sin((elapsedTime) + vd.phase) * vd.amplitude * 8;
                this.oceanGeometry.attributes.position.setY(idx, y);
            });
            
            this.oceanGeometry.attributes.position.needsUpdate = true;
            this.oceanGeometry.computeVertexNormals();
        }      
    }
}

export default MainScene;