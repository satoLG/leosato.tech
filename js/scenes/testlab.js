import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import ThreejsScene from '../base/scene.js';

class TestLabScene extends ThreejsScene {
    constructor(debugGui = null) {
        super(debugGui);
        this.cube = null;
    }

    populateScene() {
        // Create a perspective camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 5;

        // Create orbit controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('textures/testlab/minecraft.png');

        // Create a cube and apply the texture
        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshBasicMaterial({ map: texture });
        this.cube = new THREE.Mesh(geometry, material);
        this.scene.add(this.cube);

        const texture2 = textureLoader.load('textures/testlab/minecraft.png');

        texture2.magFilter = THREE.NearestFilter

        // Create a cube 2 and apply the texture
        const geometry2 = new THREE.BoxGeometry();
        const material2 = new THREE.MeshBasicMaterial({ map: texture2 });
        this.cube2 = new THREE.Mesh(geometry2, material2);
        this.cube.position.set(1, 0, 1);
        this.scene.add(this.cube2);        
    }

    customAnimate() {
        this.controls.update();
    }
}

export default TestLabScene;