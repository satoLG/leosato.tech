import ThreejsScene from '../base/scene.js';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

class UnderConstructionScene extends ThreejsScene {
    constructor(debugGui=null) {
        super(debugGui);
        this.geometries = [];
        this.textMeshes = [];
        this.animationMixers = [];
        this.controls = null;
        this.active3d = false; // Set to true for 3D mode, false for 2D mode
        this.mode3dTransition = false; // Flag to indicate if the transition to 3D mode is in progress
    
        // Initialize Cannon.js physics world
        this.physicsWorld = new CANNON.World();
        this.physicsWorld.gravity.set(0, -20, 0); // Increase gravity intensity
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
        this.camera.position.set( 0, 5, 50 );

        this.calculateViewportBoundaries();

        // Add lights
        this.createLights();

        // Add ground
        this.createGround();

        this.addNewCube('textures/main/linkedin.png', '', 2.2, new THREE.Vector3(-5, 25.5, 20));
        this.addNewCube('textures/main/github.png', '', 2.2, new THREE.Vector3(0, 25.5, 20));
        this.addNewCube('textures/main/codepen.png', '', 2.2, new THREE.Vector3(5, 25.5, 20));
        this.addNewCube('textures/main/instagram.jpg', '', 2.2, new THREE.Vector3(5, 20.5, 20));
        this.addNewCube('textures/main/whatsapp.jpeg', '', 2.2, new THREE.Vector3(0, 20.5, 20));
        this.addNewCube('textures/main/gmail.png', '', 2.2, new THREE.Vector3(-5, 20.5, 20));

        // Add text
        const fontPath = 'https://threejsfundamentals.org/threejs/resources/threejs/fonts/helvetiker_regular.typeface.json';
        this.addText(
            `LEO`, 
            fontPath, [-1.8, 15, 33], 1, .5, 'white'
        );
        this.addText(
            `SATO`, 
            fontPath, [-1.8, 15, 38], 1, .5, 'white'
        );        

        // Add debug GUI features
        if (this.debugGui) {
            setTimeout(() => {
                this.addDebugGui();                
            }, 2000);
        }

        // Create the drag-and-drop div
        const dropZone = document.createElement('div');
        dropZone.id = 'drop-zone';
        dropZone.style.display = 'none'; // Initially hidden
        dropZone.innerText = 'Solte aqui para abrir o link!';
        document.body.appendChild(dropZone);

        this.dropZone = dropZone;


        // Add mouse event listeners
        window.addEventListener('mousedown', this.onMouseDown.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('mouseup', this.onMouseUp.bind(this));
        
        window.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        window.addEventListener('touchend', this.onTouchEnd.bind(this));

        // Update boundaries on window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    calculateViewportBoundaries() {
        const aspect = window.innerWidth / window.innerHeight;
        const vFOV = THREE.MathUtils.degToRad(this.camera.fov); // Vertical field of view in radians
        const height = 2 * Math.tan(vFOV / 2) * this.camera.position.z; // Visible height
        const width = height * aspect; // Visible width
    
        this.boundaries = {
            minX: -(width / 2 - 8),
            maxX: width / 2 - 8,
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
            // Select the first intersected cube
            this.selectedCube = intersects[0].object;
    
            // Calculate the offset between the cube and the mouse
            const intersectionPoint = intersects[0].point;
            this.offset.copy(intersectionPoint).sub(this.selectedCube.position);
    
            // Disable physics for the selected cube
            const index = this.geometries.indexOf(this.selectedCube);
            if (index !== -1) {
                this.physicsBodies[index].type = CANNON.Body.KINEMATIC; // Make the body kinematic
            }
        }

        if (this.selectedCube) {
            // Show the drop zone
            this.dropZone.style.display = 'block';
        }        
    }
    
    onMouseMove(event) {
        if (this.selectedCube) {
            // Calculate mouse position in normalized device coordinates
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
            // Use raycaster to find the intersection point in 3D space
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersectionPoint = new THREE.Vector3();
            this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), intersectionPoint);
    
            // Update the position of the selected cube
            //this.selectedCube.position.copy(intersectionPoint.sub(this.offset));
    
            // Prevent the cube from going below the ground
            if (this.selectedCube.position.y < 2.2) {
                this.selectedCube.position.y = 2.2; // Clamp the y position to 0
            }
        
            // Preserve the original Z position of the selected object
            const originalZ = this.selectedCube.position.z;

            // Update the position of the selected cube (only X and Y)
            this.selectedCube.position.copy(intersectionPoint.sub(this.offset));
            this.selectedCube.position.z = originalZ; // Keep the Z position fixed

            // Clamp the cube's position within the boundaries
            const { minX, maxX, minY, maxY, minZ, maxZ } = this.boundaries;
            this.selectedCube.position.x = THREE.MathUtils.clamp(this.selectedCube.position.x, minX, maxX);
            this.selectedCube.position.y = THREE.MathUtils.clamp(this.selectedCube.position.y, minY, maxY);
            this.selectedCube.position.z = THREE.MathUtils.clamp(this.selectedCube.position.z, minZ, maxZ);

            // Update the physics body position
            const index = this.geometries.indexOf(this.selectedCube);
            if (index !== -1) {
                this.physicsBodies[index].position.copy(this.selectedCube.position);
            }
        }
    }
    
    onMouseUp(event) {
        if (this.selectedCube) {
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
                // Open the link in a new tab
                window.open('https://www.linkedin.com/in/leonardo-gutierrez-sato/', '_blank');
            }
    
            // Hide the drop zone
            this.dropZone.style.display = 'none';
    
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
        // Check if the touch is on the Three.js canvas
        if (event.target !== this.renderer.domElement) return;
    
        // Extract touch position
        const touch = event.touches[0];
        const simulatedMouseEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
        };
    
        // Reuse the onMouseDown logic
        this.onMouseDown(simulatedMouseEvent);
    }
    
    onTouchMove(event) {
        // Check if the touch is on the Three.js canvas
        if (event.target !== this.renderer.domElement) return;
    
        // Extract touch position
        const touch = event.touches[0];
        const simulatedMouseEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
        };
    
        // Reuse the onMouseMove logic
        this.onMouseMove(simulatedMouseEvent);
    }
    
    onTouchEnd(event) {
        if (event.changedTouches.length > 0) {
            // Extract touch position from changedTouches
            const touch = event.changedTouches[0];
            const simulatedMouseEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY,
            };
    
            // Reuse the onMouseUp logic
            this.onMouseUp(simulatedMouseEvent);
        }
    }

    addNewCube(texturePath, cubeUrl, cubeSize, cubePosition) {
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load(texturePath);
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
            const cubeGeometry = new RoundedBoxGeometry(cubeSize, cubeSize, cubeSize, 5, 0.2); // Width, Height, Depth, Segments, Radius
            const cubeMaterial = new THREE.MeshStandardMaterial({
                map: processedTexture, // Use the processed texture
                color: new THREE.Color('white'), // Set the base color to white
            });
            const newCube = new THREE.Mesh(cubeGeometry, cubeMaterial);
            newCube.position.set(cubePosition.x, cubePosition.y, cubePosition.z);
    
            newCube.castShadow = true; // Allow the cube to cast shadows
            newCube.receiveShadow = true; // Allow the cube to receive shadows
    
            newCube.name = `Cube ${this.geometries.length + 1}`; // Name based on the number of cubes
    
            // Add the cube to the scene
            this.scene.add(newCube);
    
            // Add a physics body for the cube
            const cubeShape = new CANNON.Box(new CANNON.Vec3(cubeSize/2, cubeSize/2, cubeSize/2)); // Half extents of the cube (match the size of the RoundedBoxGeometry)
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
                restitution: 0.1, // Bounciness (higher values = more bounce)
                friction: 0.6, // Friction
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

    addText(text, fontPath, position, size, height, color, border = undefined) {
        let scene = this.scene;
        let textMeshes = this.textMeshes;
        const textLoader = new FontLoader();
    
        textLoader.load(fontPath, (font) => {
            // Create the text geometry
            const textObj = new TextGeometry(text, {
                font: font,
                size: size,
                height: height,
                curveSegments: 12,
                bevelEnabled: false,
            });
    
            const material = new THREE.MeshPhysicalMaterial({ color: color });
            const mesh = new THREE.Mesh(textObj, material);
            mesh.position.set(position[0], position[1], position[2]);
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
            scene.add(mesh);
            textMeshes.push(mesh);
    
            // Dynamically calculate the bounding box of the text
            mesh.geometry.computeBoundingBox();
            const boundingBox = mesh.geometry.boundingBox;
            const boxSize = new THREE.Vector3();
            boundingBox.getSize(boxSize);
    
            // Add physics body for the text
            const textShape = new CANNON.Box(new CANNON.Vec3(boxSize.x / 2, boxSize.y / 2, boxSize.z / 2));
            const textBody = new CANNON.Body({
                mass: 1, // Dynamic body
                position: new CANNON.Vec3(position[0], position[1] + boxSize.y / 2, position[2]), // Adjust position to match the bounding box
                shape: textShape,
            });
    
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
        const light = new THREE.DirectionalLight( new THREE.Color( 'white' ), 0.15 );
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
        bulbLight.position.set( 3, 5, 45 );
        bulbLight.intensity = 0.8;
        bulbLight.distance = 500;
        bulbLight.castShadow = true;
        bulbLight.shadowMapVisible = true;
        bulbLight.shadow.mapSize.width = 260;
        bulbLight.shadow.mapSize.height = 260;
        bulbLight.shadow.camera.far = 5;
        this.scene.add(bulbLight);
    }

    createGround() {
        const groundGeometry = new THREE.CircleGeometry(2000, 2000);
        const groundMaterial = new THREE.MeshPhongMaterial({ color: new THREE.Color('gray'), side: THREE.DoubleSide });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.scene.add(ground);
        ground.position.set(0, 0, 0);
        ground.rotation.set(-Math.PI / 2, 0, 0);
        ground.receiveShadow = true;
    
        // Add physics body for the ground
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({
            mass: 0, // Static body
            shape: groundShape,
        });
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Match the rotation of the Three.js ground
    
        // Add a physics material for the ground
        const groundPhysicsMaterial = new CANNON.Material();
        groundBody.material = groundPhysicsMaterial;
    
        this.physicsWorld.addBody(groundBody);
    
        // Store the ground body for contact materials
        this.groundBody = groundBody;
    }

    customAnimate() {
        const elapsedTime = this.clock.getElapsedTime();

        // Step the physics world
        const timeStep = 1 / 60; // 60 FPS
        this.physicsWorld.step(timeStep);

        // Synchronize Three.js cubes with Cannon.js bodies
        this.geometries.forEach((cube, index) => {
            const body = this.physicsBodies[index];

            // Clamp the physics body's position within the boundaries
            const { minX, maxX, minY, maxY, minZ, maxZ } = this.boundaries;
            body.position.x = THREE.MathUtils.clamp(body.position.x, minX, maxX);
            body.position.y = THREE.MathUtils.clamp(body.position.y, minY, maxY);
            body.position.z = THREE.MathUtils.clamp(body.position.z, minZ, maxZ);

            // Synchronize the Three.js cube with the clamped physics body
            cube.position.copy(body.position);
            cube.quaternion.copy(body.quaternion);
        });
    }
}

export default UnderConstructionScene;