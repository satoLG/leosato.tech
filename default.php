<!DOCTYPE html>
<html lang="pt">
    <head>
        <title>Leonardo Sato</title>
        <link rel="icon" type="image/x-icon" href="./img/dev.ico">
        <meta charset="utf-8">
        <meta content="IE=edge,chrome=1" http-equiv="X-UA-Compatible">
        <meta content="Página de portfólio de Leonardo Sato" name="description">
        <meta content="width=device-width, initial-scale=1" name="viewport">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans&display=swap" rel="stylesheet">
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&display=swap" rel="stylesheet">
        <link href="./css/main.css?v=1" rel="stylesheet">
    </head>
    <body>
        <div id="footer">
            <div id="scenes" class="tabs" style="display: none;">
                <div class="tab" id="main-tab">Main</div>
            </div>
        </div>
        <div id="css"></div>
		<div id="container"></div>
        <div id="collision-info" style="z-index: 2; position: absolute; top: 10px; left: 10px; color: white; background: rgba(0, 0, 0, 0.7); padding: 10px; border-radius: 5px; display: none;">
            Collision with: <span id="object-name"></span>
        </div>
        <div id="loading-screen" style="display: none;">
            <span id="loading-desc">Loading...</span>
            <div id="progress-bar-container">
                <div id="progress-bar"></div>
            </div>
        </div>
        <div id="drop-zone" style="opacity: 0;">
            <img id="drop-zone-icon" src="img/external-link.png" alt="Drop Zone Icon">
            <a id="drop-zone-link" href="" target="_blank">Solte aqui!</a>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.7/dist/gsap.min.js"></script>
		<script async src="https://unpkg.com/es-module-shims@1.6.3/dist/es-module-shims.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/lil-gui@0.20"></script>
        <script>
            var GUI = lil.GUI;
        </script>
		<script type="importmap">
			{
				"imports": {
					"three": "https://unpkg.com/three@0.150.0/build/three.module.js",
					"three/addons/": "https://unpkg.com/three@0.150.0/examples/jsm/",
                    "cannon-es": "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js"
				}
			}
		</script>
        <script type="module" src="./js/main.js?v=1">
        </script>
    </body>
</html>