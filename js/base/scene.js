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

    customAnimate() {
        throw new Error('You have to implement the method preAnimate!');
    }

    animate() {
        this.customAnimate();

        this.renderer.render( this.scene, this.camera );
        window.requestAnimationFrame( this.animate.bind(this) );
    }



    destroy() {
        if (this.debugGui) this.debugGui.close();
    }

}

export default ThreejsScene;