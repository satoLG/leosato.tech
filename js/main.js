import DebugGui from './base/debug_gui.js';
import UnderConstructionScene from './scenes/under_construction_scene.js';
import FireCampScene from './scenes/fire_camp_scene.js';

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

document.addEventListener('DOMContentLoaded', () => {
    const underConstructionTab = document.getElementById('under-construction-tab');
    const fireCampTab = document.getElementById('fire-camp-tab');

    underConstructionTab.addEventListener('click', () => {
        initScene(UnderConstructionScene);
        underConstructionTab.classList.add('active');
        fireCampTab.classList.remove('active');
    });

    fireCampTab.addEventListener('click', () => {
        initScene(FireCampScene);
        fireCampTab.classList.add('active');
        underConstructionTab.classList.remove('active');
    });

    // Initialize with the first scene
    initScene(UnderConstructionScene);
    underConstructionTab.classList.add('active');
});