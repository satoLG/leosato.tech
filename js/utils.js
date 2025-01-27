import * as THREE from 'three';

import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

export function loadModel(scene, loader, model_path, position, scale, rotation=[0,0,0], allowShadow=true) {
    loader.load( model_path, function ( gltf ) {

        const model = gltf.scene;

        model.traverse( function ( child )
        {
            if ( child.isMesh && allowShadow ) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        model.position.set( position[0], position[1], position[2] );
        model.scale.set( scale[0], scale[1], scale[2] );
        model.rotation.set( rotation[0], rotation[1], rotation[2] );
        scene.add( model );

    }, undefined, function ( e ) {

        console.error( e );

    } );
}

export function addText(sceneTexts, scene, text, fontPath, position, size, height, color, border=undefined) {
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
        sceneTexts.push(mesh);
    });
}

export function createLights(scene) {
    const light1 = new THREE.DirectionalLight( new THREE.Color( 'white' ), 0.2 );
    light1.position.set( 1, 500, 1 );

    light1.castShadow = true;  // Enable shadow casting for the light

    // Configure the shadow properties (optional, but can give better shadow quality)
    light1.shadow.mapSize.width = 512;  // Default is 512
    light1.shadow.mapSize.height = 512; // Default is 512
    light1.shadow.camera.near = 0.5;    // Default is 0.5
    light1.shadow.camera.far = 50;      // Default is 500

    scene.add( light1 );
}