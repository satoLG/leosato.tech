import * as THREE from 'three';

/**
 * DialogManager - Manages multilingual dialog boxes with typewriter effects
 * Supports dynamic positioning, language detection, and retro sound effects
 */
class DialogManager {
    constructor(camera, renderer) {
        this.camera = camera;
        this.renderer = renderer;
        
        // Language detection and management
        this.currentLanguage = this.detectLanguage();
        this.translations = new Map();
        
        // Dialog state management
        this.activeDialogs = new Map(); // dialogId -> dialog instance
        this.dialogCounter = 0;
        this.isTransitioning = false; // Flag to prevent rapid dialog creation
        
        // 3D positioning system
        this.followingObjects = new Map(); // dialogId -> { object, offset }
        
        // Audio system for typing sounds
        this.typingSounds = [];
        this.soundIndex = 0;
        this.audioEnabled = true;
        this.loadTypingSounds();
        
        // Default positioning
        this.defaultPosition = {
            x: 50, // percentage
            y: 50, // percentage
            anchor: 'center' // 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'
        };
        
        // Initialize CSS
        this.initializeStyles();
        
        // Track window resize for repositioning
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }
    
    /**
     * Detect user's preferred language from browser settings
     */
    detectLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        const shortLang = browserLang.split('-')[0].toLowerCase();
        
        // Supported languages (can be expanded)
        const supportedLanguages = ['en', 'pt', 'es', 'fr', 'de', 'ja', 'zh'];
        
        return supportedLanguages.includes(shortLang) ? shortLang : 'en';
    }
    
    /**
     * Load multiple typing sound variations for natural effect
     */
    loadTypingSounds() {
        // We'll create multiple variations of the same sound for variety
        const soundPaths = [
            'sounds/ui/typing2.wav',
            'sounds/ui/typing2.wav',
            'sounds/ui/typing2.wav'
        ];
        
        soundPaths.forEach((path, index) => {
            const audio = new Audio(path);
            audio.volume = 0.3;
            audio.preload = 'auto';
            
            // Fallback - if files don't exist, we'll create a simple beep sound
            audio.addEventListener('error', () => {
                console.warn(`Typing sound ${path} not found, using fallback`);
                this.createFallbackSound(index);
            });
            
            this.typingSounds.push(audio);
        });
    }
    
    /**
     * Create a simple beep sound as fallback for missing audio files
     */
    createFallbackSound(index) {
        // Create a simple audio context beep
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            const AudioContextClass = AudioContext || webkitAudioContext;
            const audioCtx = new AudioContextClass();
            
            this.typingSounds[index] = {
                play: () => {
                    if (!this.audioEnabled) return;
                    
                    const oscillator = audioCtx.createOscillator();
                    const gainNode = audioCtx.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                    
                    // Different frequencies for variation
                    const frequencies = [800, 900, 750];
                    oscillator.frequency.setValueAtTime(frequencies[index] || 800, audioCtx.currentTime);
                    oscillator.type = 'square';
                    
                    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
                    
                    oscillator.start(audioCtx.currentTime);
                    oscillator.stop(audioCtx.currentTime + 0.1);
                }
            };
        }
    }
    
    /**
     * Play a typing sound with variation
     */
    playTypingSound() {
        if (!this.audioEnabled || this.typingSounds.length === 0) return;
        
        const sound = this.typingSounds[this.soundIndex];
        if (sound && sound.play) {
            try {
                const playPromise = sound.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.warn('Audio play failed:', error);
                    });
                }
            } catch (error) {
                console.warn('Audio play error:', error);
            }
        }
        
        // Cycle through sounds for variation
        this.soundIndex = (this.soundIndex + 1) % this.typingSounds.length;
    }
    
    /**
     * Add translation for a specific key and language
     */
    addTranslation(key, translations) {
        this.translations.set(key, translations);
    }
    
    /**
     * Get translated text for current language
     */
    getText(key, fallbackLanguage = 'en') {
        const translationMap = this.translations.get(key);
        if (!translationMap) {
            console.warn(`Translation key "${key}" not found`);
            return key;
        }
        
        return translationMap[this.currentLanguage] || 
               translationMap[fallbackLanguage] || 
               translationMap['en'] || 
               key;
    }
    
    /**
     * Initialize CSS styles for dialog boxes
     */
    initializeStyles() {
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            .dialog-manager-container {
                position: fixed;
                pointer-events: none;
                z-index: 1000;
                transition: all 0.3s ease;
            }
            
            .dialog-box {
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Press Start 2P', monospace !important;
                font-size: 12px;
                letter-spacing: 1px;
                color: #ffffff;
                text-align: center;
                padding: 25px 35px;
                background: linear-gradient(145deg, #2a2a2aaf, #1a1a1aaf);
                border: 3px solid #ffffff;
                box-shadow: 0 0 14px #0000008f;
                cursor: pointer;
                user-select: none;
                min-width: 250px;
                min-height: 25px;
                position: relative;
                transition: all 0.5s ease;
                pointer-events: auto;
                opacity: 0;
                transform: scale(0);
            }
            
            .dialog-box.show {
                opacity: 1;
                transform: scale(1);
            }
            
            .dialog-box.fade-out {
                opacity: 0;
                transform: scale(0);
                pointer-events: none;
                transition: all 0.5s cubic-bezier(0.55, 0.085, 0.68, 0.53);
            }
            
            .dialog-triangle {
                content: '';
                position: absolute;
                width: 0;
                height: 0;
                border-left: 12px solid transparent;
                border-right: 12px solid transparent;
                border-top: 12px solid #ffffff;
            }
            
            .dialog-triangle-inner {
                content: '';
                position: absolute;
                width: 0;
                height: 0;
                border-left: 10px solid transparent;
                border-right: 10px solid transparent;
                border-top: 10px solid #2a2a2a;
            }
            
            .dialog-triangle.bottom {
                bottom: -12px;
                left: 15%;
                transform: translateX(-50%);
            }
            
            .dialog-triangle-inner.bottom {
                bottom: -8px;
                left: 15%;
                transform: translateX(-50%);
            }
            
            .dialog-triangle.top {
                top: -12px;
                left: 15%;
                transform: translateX(-50%) rotate(180deg);
            }
            
            .dialog-triangle-inner.top {
                top: -8px;
                left: 15%;
                transform: translateX(-50%) rotate(180deg);
            }
            
            .dialog-triangle.left {
                left: -12px;
                top: 50%;
                transform: translateY(-50%) rotate(-90deg);
            }
            
            .dialog-triangle-inner.left {
                left: -8px;
                top: 50%;
                transform: translateY(-50%) rotate(-90deg);
            }
            
            .dialog-triangle.right {
                right: -12px;
                top: 50%;
                transform: translateY(-50%) rotate(90deg);
            }
            
            .dialog-triangle-inner.right {
                right: -8px;
                top: 50%;
                transform: translateY(-50%) rotate(90deg);
            }
            
            .Typewriter__cursor {
                font-weight: bold;
                animation: blink 1s infinite;
                margin-left: 2px;
            }
            
            @keyframes blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0; }
            }
        `;
        
        document.head.appendChild(styleSheet);
    }
    
    /**
     * Create a new dialog box
     */
    showDialog(options = {}) {
        // Prevent rapid-fire dialog creation during transitions
        if (this.isTransitioning) {
            console.log('Dialog creation blocked - transition in progress');
            return null;
        }
        
        // Close any existing dialogs before showing a new one
        if (this.getActiveDialogCount() > 0) {
            console.log('Closing existing dialogs before showing new one');
            this.isTransitioning = true;
            this.closeAllDialogs(true); // Close immediately for smooth transition
            
            // Wait a brief moment for any cleanup, then show the new dialog
            setTimeout(() => {
                this.isTransitioning = false;
                this._createDialog(options);
            }, 100);
            
            return `dialog-${this.dialogCounter}`; // Return future dialog ID
        } else {
            // No existing dialogs, show immediately
            return this._createDialog(options);
        }
    }
    
    /**
     * Internal method to actually create and display the dialog
     */
    _createDialog(options = {}) {
        const {
            textKey,
            text,
            position = this.defaultPosition,
            followObject = null,
            followOffset = { x: 0, y: -100, z: 0 },
            trianglePosition = 'bottom',
            autoClose = false,
            autoCloseDelay = 5000,
            onComplete = null,
            onClose = null,
            typewriterSpeed = 50
        } = options;
        
        const dialogId = `dialog-${this.dialogCounter++}`;
        
        // Get text content
        const content = text || this.getText(textKey) || 'Dialog text';
        
        // Create dialog container
        const container = document.createElement('div');
        container.className = 'dialog-manager-container';
        container.id = dialogId;
        
        // Create dialog box
        const dialogBox = document.createElement('div');
        dialogBox.className = 'dialog-box';
        
        // Create text container for typewriter
        const textContainer = document.createElement('div');
        textContainer.className = 'dialog-text';
        
        // Add triangle pointer
        const triangle = document.createElement('div');
        triangle.className = `dialog-triangle ${trianglePosition}`;
        
        const triangleInner = document.createElement('div');
        triangleInner.className = `dialog-triangle-inner ${trianglePosition}`;
        
        dialogBox.appendChild(textContainer);
        dialogBox.appendChild(triangle);
        dialogBox.appendChild(triangleInner);
        container.appendChild(dialogBox);
        
        // Add to DOM
        document.body.appendChild(container);
        
        // Position the dialog
        if (followObject) {
            this.followingObjects.set(dialogId, { object: followObject, offset: followOffset });
            this.updateObjectPosition(dialogId);
        } else {
            this.setStaticPosition(container, position);
        }
        
        // Store dialog reference
        this.activeDialogs.set(dialogId, {
            container,
            dialogBox,
            textContainer,
            typewriter: null,
            followObject,
            followOffset,
            onComplete,
            onClose
        });
        
        // Show dialog with animation
        requestAnimationFrame(() => {
            dialogBox.classList.add('show');
        });
        
        // Initialize typewriter with sound effects
        this.initializeTypewriter(dialogId, content, typewriterSpeed, onComplete);
        
        // Auto close if specified
        if (autoClose) {
            setTimeout(() => {
                this.closeDialog(dialogId);
            }, autoCloseDelay);
        }
        
        // Add click to close functionality
        dialogBox.addEventListener('click', () => {
            this.closeDialog(dialogId);
        });
        
        return dialogId;
    }
    
    /**
     * Initialize typewriter effect with sound
     */
    initializeTypewriter(dialogId, text, speed, onComplete) {
        const dialog = this.activeDialogs.get(dialogId);
        if (!dialog) return;
        
        const typewriter = new Typewriter(dialog.textContainer, {
            loop: false,
            delay: speed,
            cursor: '⯆',
            deleteSpeed: 30,
        });
        
        // Override the original type method to add sound
        const originalType = typewriter.typeString.bind(typewriter);
        typewriter.typeString = (string) => {
            // Add character-by-character typing with sound
            return typewriter.callFunction(() => {
                this.typeWithSound(dialog.textContainer, string, speed, () => {
                    if (onComplete) onComplete(dialogId);
                    if (dialog.onComplete) dialog.onComplete(dialogId);
                });
            });
        };
        
        dialog.typewriter = typewriter;
        
        typewriter
            .typeString(text)
            .start();
    }
    
    /**
     * Type text character by character with sound effects
     */
    typeWithSound(container, text, delay, onComplete) {
        let index = 0;
        const typeChar = () => {
            if (index < text.length) {
                // Clear container and add text up to current index
                container.innerHTML = text.substring(0, index + 1) + '<span class="Typewriter__cursor">⯆</span>';
                this.playTypingSound();
                index++;
                setTimeout(typeChar, delay);
            } else {
                // Keep cursor visible after typing is complete
                container.innerHTML = text + '<span class="Typewriter__cursor">⯆</span>';
                if (onComplete) onComplete();
            }
        };
        
        // Start with empty content and cursor
        container.innerHTML = '<span class="Typewriter__cursor">⯆</span>';
        setTimeout(typeChar, delay);
    }
    
    /**
     * Set static position for dialog
     */
    setStaticPosition(container, position) {
        const { x, y, anchor } = position;
        
        let left = `${x}%`;
        let top = `${y}%`;
        let transform = 'translate(0, 0)';
        
        switch (anchor) {
            case 'center':
                transform = 'translate(-50%, -50%)';
                break;
            case 'top-left':
                transform = 'translate(0, 0)';
                break;
            case 'top-right':
                transform = 'translate(-100%, 0)';
                break;
            case 'bottom-left':
                transform = 'translate(0, -100%)';
                break;
            case 'bottom-right':
                transform = 'translate(-100%, -100%)';
                break;
        }
        
        container.style.left = left;
        container.style.top = top;
        container.style.transform = transform;
    }
    
    /**
     * Update position of dialog following a 3D object
     */
    updateObjectPosition(dialogId) {
        const dialog = this.activeDialogs.get(dialogId);
        const followData = this.followingObjects.get(dialogId);
        
        if (!dialog || !followData) return;
        
        const { object, offset } = followData;
        
        // Get world position of the object
        const worldPosition = new THREE.Vector3();
        object.getWorldPosition(worldPosition);
        
        // Apply offset
        worldPosition.add(new THREE.Vector3(offset.x, offset.y, offset.z));
        
        // Project to screen coordinates
        const screenPosition = worldPosition.clone().project(this.camera);
        
        // Convert to pixel coordinates
        const x = (screenPosition.x + 1) / 2 * window.innerWidth;
        const y = (-screenPosition.y + 1) / 2 * window.innerHeight;
        
        // Check if object is behind camera or outside view
        const isVisible = screenPosition.z < 1 && 
                         x >= 0 && x <= window.innerWidth && 
                         y >= 0 && y <= window.innerHeight;
        
        if (isVisible) {
            dialog.container.style.left = `${x+100}px`;
            dialog.container.style.top = `${y+100}px`;
            dialog.container.style.transform = 'translate(-50%, -100%)';
            dialog.container.style.opacity = '1';
        } else {
            dialog.container.style.opacity = '0';
        }
    }
    
    /**
     * Update all following dialogs positions
     */
    updateFollowingDialogs() {
        this.followingObjects.forEach((_, dialogId) => {
            this.updateObjectPosition(dialogId);
        });
    }
    
    /**
     * Close a specific dialog
     */
    closeDialog(dialogId, immediate = false) {
        const dialog = this.activeDialogs.get(dialogId);
        if (!dialog) return;
        
        // Call onClose callback if provided
        if (dialog.onClose) {
            dialog.onClose(dialogId);
        }
        
        if (immediate) {
            // Remove immediately without animation
            if (dialog.container.parentNode) {
                dialog.container.parentNode.removeChild(dialog.container);
            }
            this.activeDialogs.delete(dialogId);
            this.followingObjects.delete(dialogId);
        } else {
            // Fade out animation
            dialog.dialogBox.classList.add('fade-out');
            
            // Remove after animation
            setTimeout(() => {
                if (dialog.container.parentNode) {
                    dialog.container.parentNode.removeChild(dialog.container);
                }
                this.activeDialogs.delete(dialogId);
                this.followingObjects.delete(dialogId);
            }, 500);
        }
        
        return true;
    }
    
    /**
     * Close all active dialogs
     */
    closeAllDialogs(immediate = false) {
        const dialogIds = Array.from(this.activeDialogs.keys());
        dialogIds.forEach(id => this.closeDialog(id, immediate));
    }
    
    /**
     * Set language and update existing dialogs if needed
     */
    setLanguage(language) {
        this.currentLanguage = language;
        // Could implement dialog refresh here if needed
    }
    
    /**
     * Enable/disable typing sounds
     */
    setAudioEnabled(enabled) {
        this.audioEnabled = enabled;
    }
    
    /**
     * Handle window resize
     */
    onWindowResize() {
        // Update following dialogs positions
        this.updateFollowingDialogs();
    }
    
    /**
     * Check if a dialog exists
     */
    hasDialog(dialogId) {
        return this.activeDialogs.has(dialogId);
    }
    
    /**
     * Get active dialog count
     */
    getActiveDialogCount() {
        return this.activeDialogs.size;
    }
    
    /**
     * Cleanup - remove all dialogs and event listeners
     */
    destroy() {
        this.closeAllDialogs();
        window.removeEventListener('resize', this.onWindowResize.bind(this));
    }
}

export default DialogManager;