import UnderConstructionScene from './scenes/under_construction_scene.js';

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('container');
    const scene = new UnderConstructionScene();
    scene.init(container);
});