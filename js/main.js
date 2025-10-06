import DebugGui from './base/debug_gui.js';
import MainScene from './scenes/main_scene.js?v=3';

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
    const mainTab = document.getElementById('main-tab');

    mainTab.addEventListener('click', () => {
        initScene(MainScene);
        document.querySelectorAll('#scenes .tab').forEach(tab => tab.classList.remove('active'));
        mainTab.classList.add('active');
    });

    window.addEventListener('keydown', (event) => {
        if(event.key == 't'|| event.key == 'T') {
            let tabs = document.querySelector('#scenes.tabs');
            tabs.style.display = (tabs.style.display === '') ? 'none' : '';
        }
    })

    // Initialize with the first scene
    initScene(MainScene);
    mainTab.classList.add('active');

    // Add resize event listener
    window.addEventListener('resize', onWindowResize);
});