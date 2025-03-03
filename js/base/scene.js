import * as THREE from 'three';

class ThreejsScene {
    constructor(debugGui=null) {
        this.scene = new THREE.Scene();
        this.renderer = null;
        this.camera = null;
        this.clock = new THREE.Clock();

        this.debugGui = debugGui;
    }

    init(container) {
        this.renderer = new THREE.WebGLRenderer( { 
            antialias: true, 
            alpha: true,
            powerPreference: 'high-performance', 
        } );
        this.renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.shadowMap.enabled = true;
        
        container.appendChild( this.renderer.domElement );

        this.populateScene();

        this.animate();
    }

    populateScene() {
        throw new Error('You have to implement the method populateScene!');
    }

    animate() {
        this.customAnimate();

        this.renderer.render( this.scene, this.camera );
        window.requestAnimationFrame( this.animate.bind(this) );
    }

    customAnimate() {
        throw new Error('You have to implement the method customAnimate!');
    }

    destroy() {
        if (this.debugGui) this.debugGui.close();

        // Dispose of scene resources
        this.scene.traverse((object) => {
            if (!object.isMesh) return;

            object.geometry.dispose();

            if (object.material.isMaterial) {
                this.disposeMaterial(object.material);
            } else {
                // an array of materials
                for (const material of object.material) this.disposeMaterial(material);
            }
        });

        this.renderer.dispose();
    }

    disposeMaterial(material) {
        // Dispose of material resources
        for (const key in material) {
            if (!material.hasOwnProperty(key)) continue;

            const value = material[key];
            if (value && typeof value.dispose === 'function') {
                value.dispose();
            }
        }
    }

}

export default ThreejsScene;