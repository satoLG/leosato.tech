import DebugGui from './base/debug_gui.js';
import UnderConstructionScene from './scenes/under_construction_scene_1.0.js';
import FireCampScene from './scenes/fire_camp_scene.js';
import TestLabScene from './scenes/testlab.js';

let currentScene = null;

function initScene(SceneClass) {
    const container = document.getElementById('container');
    if (currentScene) {
        currentScene.destroy();
        container.innerHTML = '';
    }
    currentScene = new SceneClass(new DebugGui());
    currentScene.init(container);
}

function onWindowResize() {
    if (currentScene && typeof currentScene.resize === 'function') {
        currentScene.resize();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const underConstructionTab = document.getElementById('under-construction-tab');
    const fireCampTab = document.getElementById('fire-camp-tab');
    const testLabTab = document.getElementById('test-lab-tab');

    underConstructionTab.addEventListener('click', () => {
        initScene(UnderConstructionScene);
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        underConstructionTab.classList.add('active');
    });

    fireCampTab.addEventListener('click', () => {
        initScene(FireCampScene);
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        fireCampTab.classList.add('active');
    });

    testLabTab.addEventListener('click', () => {
        initScene(TestLabScene);
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        testLabTab.classList.add('active');
    });

    window.addEventListener('keydown', (event) => {
        if(event.key == 't'|| event.key == 'T') {
            let tabs = document.querySelector('.tabs');
            tabs.style.display = (tabs.style.display === '') ? 'none' : '';
        }
    })

    // Initialize with the first scene
    initScene(UnderConstructionScene);
    underConstructionTab.classList.add('active');

    // Add resize event listener
    window.addEventListener('resize', onWindowResize);
});