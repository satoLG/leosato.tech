import DebugGui from './base/debug_gui.js';
import UnderConstructionScene from './scenes/under_construction_scene_3.js';
import FireCampScene from './scenes/fire_camp_scene_1.0.js';
import TestLabScene from './scenes/testlab_1.1.js';

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
        document.querySelectorAll('#scenes .tab').forEach(tab => tab.classList.remove('active'));
        underConstructionTab.classList.add('active');
    });

    fireCampTab.addEventListener('click', () => {
        initScene(FireCampScene);
        document.querySelectorAll('#scenes .tab').forEach(tab => tab.classList.remove('active'));
        fireCampTab.classList.add('active');
    });

    testLabTab.addEventListener('click', () => {
        initScene(TestLabScene);
        document.querySelectorAll('#scenes .tab').forEach(tab => tab.classList.remove('active'));
        testLabTab.classList.add('active');
    });

    const mode2dTab = document.getElementById('2d-mode');
    const mode3dTab = document.getElementById('3d-mode');

    mode2dTab?.addEventListener('click', () => {
        document.querySelectorAll('#actions .tab').forEach(tab => tab.classList.remove('active'));
        mode2dTab.classList.add('active');
    });

    mode3dTab?.addEventListener('click', () => {
        document.querySelectorAll('#actions .tab').forEach(tab => tab.classList.remove('active'));
        mode3dTab.classList.add('active');
    });

    window.addEventListener('keydown', (event) => {
        if(event.key == 't'|| event.key == 'T') {
            let tabs = document.querySelector('#scenes.tabs');
            tabs.style.display = (tabs.style.display === '') ? 'none' : '';
        }
    })

    mode2dTab?.classList.add('active');

    // Initialize with the first scene
    initScene(UnderConstructionScene);
    underConstructionTab.classList.add('active');

    // Add resize event listener
    window.addEventListener('resize', onWindowResize);
});