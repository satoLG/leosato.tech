<!DOCTYPE html>
<html lang="pt">
    <head>
        <title>Leonardo Sato</title>
        <link rel="icon" type="image/x-icon" href="./img/dev.ico">
        <meta charset="utf-8">
        <meta content="IE=edge,chrome=1" http-equiv="X-UA-Compatible">
        <meta content="Página padrão" name="description">
        <meta content="width=device-width, initial-scale=1" name="viewport">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans&display=swap" rel="stylesheet">
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&display=swap" rel="stylesheet">
        <link href="./css/main_1.4.css" rel="stylesheet">
    </head>
    <body>
        <div id="header">
            <div id="headerinfo">
                <span class="nametag">LEONARDO SATO</span>
                <div class="link_icons">
                    <a href="https://www.linkedin.com/in/leonardo-gutierrez-sato/" class="icon" id="linkedin" target="_blank" title="Linkedin">    
                        <svg xmlns="http://www.w3.org/2000/svg" height="25px" width="25px" aria-label="LinkedIn" role="img" viewBox="0 0 512 512" fill="#ffffff" stroke="#ffffff">
                            <g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                            <g id="SVGRepo_iconCarrier">
                                <rect width="512" height="512" rx="15%" fill="#0077b5"></rect>
                                <circle cx="142" cy="138" r="37"></circle>
                                <path stroke="#ffffff" stroke-width="66" d="M244 194v198M142 194v198"></path>
                                <path d="M276 282c0-20 13-40 36-40 24 0 33 18 33 45v105h66V279c0-61-32-89-76-89-34 0-51 19-59 32">

                                </path>
                            </g>
                        </svg>
                    </a>
                    <a href="https://github.com/satoLG/" class="icon" id="github" target="_blank" title="Github">
                        <svg xmlns="http://www.w3.org/2000/svg" aria-label="GitHub" role="img" viewBox="0 0 512 512" height="25px" width="25px" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><rect width="512" height="512" rx="15%" fill="#1B1817"></rect><path fill="#ffffff" d="M335 499c14 0 12 17 12 17H165s-2-17 12-17c13 0 16-6 16-12l-1-50c-71 16-86-28-86-28-12-30-28-37-28-37-24-16 1-16 1-16 26 2 40 26 40 26 22 39 59 28 74 22 2-17 9-28 16-35-57-6-116-28-116-126 0-28 10-51 26-69-3-6-11-32 3-67 0 0 21-7 70 26 42-12 86-12 128 0 49-33 70-26 70-26 14 35 6 61 3 67 16 18 26 41 26 69 0 98-60 120-117 126 10 8 18 24 18 48l-1 70c0 6 3 12 16 12z"></path></g></svg>                    
                    </a>
                    <a href="https://codepen.io/satoLG/" class="icon" id="codepen" target="_blank" title="Codepen">
                        <svg xmlns="http://www.w3.org/2000/svg" height="25px" width="25px" aria-label="CodePen" role="img" viewBox="0 0 512 512" fill="#000000">
                            <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                            <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                            <g id="SVGRepo_iconCarrier"> 
                                <rect width="512" height="512" rx="15%" fill="#111"></rect> 
                                <g fill="none" stroke="#ffffff" stroke-width="33" stroke-linejoin="round"> 
                                    <path d="M81 198v116l175 117 175-117V198L256 81z"></path> 
                                    <path d="M81 198l175 116 175-116M256 81v117"></path> <path d="M81 314l175-116 175 116M256 431V314">
                                    </path> 
                            </g> 
                            </g>
                        </svg>
                    </a>
                </div>    
            </div>
            <div id="actions" class="tabs">
                <div class="tab" id="2d-mode">2D</div>
                <div class="tab" id="3d-mode">3D</div>
            </div>
        </div>
        <div id="footer">
            <div id="scenes" class="tabs" style="display: none;">
                <div class="tab" id="under-construction-tab">Under Construction</div>
                <div class="tab" id="fire-camp-tab">Fire Camp</div>
                <div class="tab" id="test-lab-tab">Test Lab</div>
                <div class="tab" id="test-lab-tab2">Test Lab 2</div>
                <div class="tab" id="test-lab-tab3">Test Lab 3</div>
            </div>
        </div>
        <div id="css"></div>
		<div id="container"></div>
        <div id="collision-info" style="z-index: 2; position: absolute; top: 10px; left: 10px; color: white; background: rgba(0, 0, 0, 0.7); padding: 10px; border-radius: 5px; display: none;">
            Collision with: <span id="object-name"></span>
        </div>
        <div id="loading-screen">
            <span id="loading-desc">Loading...</span>
            <div id="progress-bar-container">
                <div id="progress-bar"></div>
            </div>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.7/dist/gsap.min.js"></script>
		<!-- Import maps polyfill -->
		<!-- Remove this when import maps will be widely supported -->
		<script async src="https://unpkg.com/es-module-shims@1.6.3/dist/es-module-shims.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/lil-gui@0.20"></script>
        <script>
            var GUI = lil.GUI;
        </script>
		<script type="importmap">
			{
				"imports": {
					"three": "https://unpkg.com/three@0.150.0/build/three.module.js",
					"three/addons/": "https://unpkg.com/three@0.150.0/examples/jsm/"
				}
			}
		</script>
        <script type="module" src="./js/main.js">
        </script>
    </body>
</html>