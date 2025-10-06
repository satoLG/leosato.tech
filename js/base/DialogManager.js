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
            // audio.volume = 0.8;
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
                    
                    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.05, audioCtx.currentTime + 0.1);
                    
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
     * Detect if device is mobile
     */
    isMobile() {
        return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               window.innerWidth <= 768;
    }
    
    /**
     * Calculate scaling factor based on screen width and camera distance
     */
    calculateScaleFactor() {
        // Base scaling factor for screen width
        const screenWidthFactor = Math.min(window.innerWidth / 1920, 1); // Normalize to 1920px width
        const mobileScaleFactor = this.isMobile() ? 1.2 : 1; // Slightly larger on mobile
        
        // Camera distance scaling (if camera is available)
        let distanceScaleFactor = 1;
        if (this.camera && this.camera.position) {
            const cameraDistance = this.camera.position.distanceTo(
                new THREE.Vector3(0, 0, 0) // Distance to scene center
            );
            
            // Scale based on camera distance (closer = larger dialogs)
            // Assuming min distance ~700, max distance ~1500
            const minDistance = 700;
            const maxDistance = 1500;
            const normalizedDistance = Math.max(0, Math.min(1, 
                (cameraDistance - minDistance) / (maxDistance - minDistance)
            ));
            
            // Inverse relationship: closer camera = larger dialogs
            distanceScaleFactor = 1.5 - (normalizedDistance * 0.7); // Range: 0.8 to 1.5
        }
        
        return screenWidthFactor * mobileScaleFactor * distanceScaleFactor;
    }
    
    /**
     * Update CSS custom properties for dynamic scaling
     */
    updateDialogScale() {
        const scaleFactor = this.calculateScaleFactor();
        document.documentElement.style.setProperty('--dialog-scale-factor', scaleFactor.toString());
        
        // Update font size based on scale
        const baseFontSize = 12;
        const scaledFontSize = Math.max(8, Math.min(16, baseFontSize * scaleFactor));
        document.documentElement.style.setProperty('--dialog-font-size', `${scaledFontSize}px`);
        
        // Update padding based on scale
        const basePadding = 50;
        const scaledPadding = basePadding * scaleFactor;
        document.documentElement.style.setProperty('--dialog-padding', `${scaledPadding}px`);
        
        // Update minimum width based on scale
        const baseMinWidth = 250;
        const scaledMinWidth = baseMinWidth * scaleFactor;
        document.documentElement.style.setProperty('--dialog-min-width', `${scaledMinWidth}px`);
    }
    
    /**
     * Initialize CSS styles for dialog boxes
     */
    initializeStyles() {
        // Set initial CSS custom properties
        document.documentElement.style.setProperty('--dialog-scale-factor', '1');
        document.documentElement.style.setProperty('--dialog-font-size', '12px');
        document.documentElement.style.setProperty('--dialog-padding', '50px');
        document.documentElement.style.setProperty('--dialog-min-width', '250px');
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            .dialog-manager-container {
                position: fixed;
                pointer-events: none;
                z-index: 1000;
                transition: all 0.3s ease;
                transition: all 0.3s ease;
                transition: all 0.3s ease;
                transform-origin: center;
            }
            
            .dialog-box {
                display: flex;
                align-items: center;
                justify-content: left;
                font-family: 'Press Start 2P', monospace !important;
                font-size: var(--dialog-font-size);
                letter-spacing: 1px;
                line-height: 1.4; /* Add proper line spacing for multi-line text */
                color: #ffffff;
                text-align: center;
                padding: var(--dialog-padding) calc(var(--dialog-padding) * 1.4);
                background: linear-gradient(145deg, #2a2a2aff, #1a1a1aff);
                border: 3px solid #ffffff;
                box-shadow: 0 0 calc(14px * var(--dialog-scale-factor)) #0000008f;
                cursor: pointer;
                user-select: none;
                min-width: var(--dialog-min-width);
                max-width: calc(90vw);
                min-height: calc(25px * var(--dialog-scale-factor));
                position: relative;
                transition: opacity 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55), 
                           transform 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                pointer-events: auto;
                opacity: 0;
                transform: scale(0);
                transform-origin: center center;
                word-wrap: break-word;
                overflow-wrap: break-word;
            }
            
            @media (max-width: 768px) {
                .dialog-box {
                    max-width: 85vw;
                    font-size: calc(var(--dialog-font-size) * 1.1);
                    line-height: 1.3;
                }
            }
            
            .dialog-box.show {
                opacity: 1;
                transform: scale(1);
            }
            
            .dialog-box.fade-out {
                opacity: 0 !important;
                transform: scale(0) !important;
                pointer-events: none !important;
                transition: opacity 0.5s cubic-bezier(0.55, 0.085, 0.68, 0.53),
                           transform 0.5s cubic-bezier(0.55, 0.085, 0.68, 0.53) !important;
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
                border-top: 10px solid #2a2a2aff;
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
        // Immediately destroy any existing dialogs and their animations
        if (this.getActiveDialogCount() > 0) {
            console.log('Immediately destroying existing dialogs for new one');
            this.destroyAllDialogs();
        }
        
        // Reset transition flag and create new dialog immediately
        this.isTransitioning = false;
        return this._createDialog(options);
    }
    
    /**
     * Internal method to actually create and display the dialog
     */
    _createDialog(options = {}) {
        const {
            textKey,
            text,
            textSequence = null, // New: array of texts to cycle through
            position = this.defaultPosition,
            followObject = null,
            followOffset = { x: 0, y: -100, z: 0 },
            trianglePosition = 'bottom',
            autoClose = false,
            autoCloseDelay = 5000,
            onComplete = null,
            onClose = null,
            onSequenceComplete = null, // New: called when all sequence texts are shown
            onFirstClick = null, // New: called on first click
            typewriterSpeed = 50
        } = options;
        
        const dialogId = `dialog-${this.dialogCounter++}`;
        
        // Update scaling before creating dialog
        this.updateDialogScale();
        
        // Handle text content - prioritize sequence over single text
        let content;
        let currentSequenceIndex = 0;
        
        if (textSequence && Array.isArray(textSequence) && textSequence.length > 0) {
            // Use first item in sequence
            if (typeof textSequence[0] === 'object') {
                content = textSequence[0].text || this.getText(textSequence[0].textKey) || 'Dialog text';
            } else {
                content = textSequence[0];
            }
        } else {
            content = text || this.getText(textKey) || 'Dialog text';
        }
        
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
        
        // Store dialog reference with sequence data
        this.activeDialogs.set(dialogId, {
            dialogId: dialogId, // Store ID for self-reference
            container,
            dialogBox,
            textContainer,
            typewriter: null,
            typingTimeoutId: null, // Track typing animation timeout
            followObject,
            followOffset,
            onComplete,
            onClose,
            // Sequence-related properties
            textSequence: textSequence,
            currentSequenceIndex: currentSequenceIndex,
            onSequenceComplete: onSequenceComplete,
            onFirstClick: onFirstClick,
            firstClickFired: false, // Track if first click has happened
            typewriterSpeed: typewriterSpeed,
            originalOptions: options // Store original options for sequence progression
        });
        
        // Show dialog with animation - ensure DOM is fully rendered first
        console.log('Dialog created, triggering animation for:', dialogId);
        setTimeout(() => {
            console.log('Adding show class to dialog:', dialogId);
            dialogBox.classList.add('show');
        }, 50); // Small delay to ensure DOM is rendered
        
        // Initialize typewriter with sound effects
        this.initializeTypewriter(dialogId, content, typewriterSpeed, (dialogId) => {
            // After typewriter completes, set up click handler for next text or completion
            this.setupDialogClickHandler(dialogId);
            
            // Call original onComplete if provided
            if (onComplete) onComplete(dialogId);
        });
        
        // Auto close if specified (but not if we have a sequence)
        if (autoClose && !textSequence) {
            setTimeout(() => {
                this.closeDialog(dialogId);
            }, autoCloseDelay);
        }
        
        return dialogId;
    }
    
    /**
     * Set up click handler for dialog - handles both single dialogs and sequences
     */
    setupDialogClickHandler(dialogId) {
        const dialog = this.activeDialogs.get(dialogId);
        if (!dialog) return;
        
        // Remove any existing click listeners
        const newDialogBox = dialog.dialogBox.cloneNode(true);
        dialog.dialogBox.parentNode.replaceChild(newDialogBox, dialog.dialogBox);
        dialog.dialogBox = newDialogBox;
        
        // CRITICAL: Update textContainer reference after DOM replacement
        dialog.textContainer = newDialogBox.querySelector('.dialog-text');
        
        newDialogBox.addEventListener('click', () => {
            this.handleDialogClick(dialogId);
        });
        
        // Make it visually clickable
        newDialogBox.style.cursor = 'pointer';
    }
    
    /**
     * Handle dialog click - advance sequence or close dialog
     */
    handleDialogClick(dialogId) {
        const dialog = this.activeDialogs.get(dialogId);
        if (!dialog) return;
        
        // Call onFirstClick callback if this is the first click
        if (!dialog.firstClickFired && dialog.onFirstClick) {
            console.log('Firing onFirstClick callback for dialog:', dialogId);
            dialog.onFirstClick(dialogId);
            dialog.firstClickFired = true;
        }
        
        // Check if this dialog has a link URL (from cube interaction)
        if (dialog.linkUrl) {
            window.open(dialog.linkUrl, '_blank');
            this.closeDialog(dialogId);
            return;
        }
        
        // If dialog has a text sequence, advance to next text
        if (dialog.textSequence && Array.isArray(dialog.textSequence)) {
            const nextIndex = dialog.currentSequenceIndex + 1;
            
            if (nextIndex < dialog.textSequence.length) {
                // Advance to next text in sequence
                dialog.currentSequenceIndex = nextIndex;
                
                let nextContent;
                const nextItem = dialog.textSequence[nextIndex];
                
                if (typeof nextItem === 'object') {
                    nextContent = nextItem.text || this.getText(nextItem.textKey) || 'Dialog text';
                } else {
                    nextContent = nextItem;
                }
                
                console.log(`Advancing to text ${nextIndex + 1}/${dialog.textSequence.length}: "${nextContent}"`);
                
                // CRITICAL: Stop ALL ongoing animations for this dialog before starting new text
                if (dialog.typewriter && dialog.typewriter.stop) {
                    try {
                        dialog.typewriter.stop();
                    } catch (error) {
                        console.warn('Error stopping typewriter during sequence advance:', error);
                    }
                }
                
                // Clear any ongoing typing timeout from previous text
                if (dialog.typingTimeoutId) {
                    clearTimeout(dialog.typingTimeoutId);
                    dialog.typingTimeoutId = null;
                    console.log('Cleared previous text typing timeout');
                }
                
                // Clear current text and start typing next text
                if (dialog.textContainer) {
                    const cursorChar = this.getCursorCharacter();
                    dialog.textContainer.innerHTML = `<span class="Typewriter__cursor">${cursorChar}</span>`;
                    this.typeWithSound(dialog.textContainer, nextContent, dialog.typewriterSpeed, () => {
                        this.setupDialogClickHandler(dialogId); // Reset click handler
                    });
                } else {
                    console.error('textContainer not found for dialog:', dialogId);
                }
                
            } else {
                // Sequence is complete
                console.log('Text sequence completed');
                if (dialog.onSequenceComplete) {
                    dialog.onSequenceComplete(dialogId);
                }
                // Always close the dialog after sequence completion
                this.closeDialog(dialogId);
            }
        } else {
            // Single text dialog - just close
            this.closeDialog(dialogId);
        }
    }
    
    /**
     * Get appropriate cursor character with fallback for mobile compatibility
     */
    getCursorCharacter() {
        // Test if the device supports the fancy cursor character
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = '12px monospace';
        
        // Measure the fancy character
        const fancyWidth = context.measureText('⯆').width;
        const testWidth = context.measureText('?').width; // Question mark as reference
        
        // If the character renders as the same width as a question mark, it's likely not supported
        if (Math.abs(fancyWidth - testWidth) < 1) {
            // Fallback characters in order of preference
            const fallbacks = ['▶', '►', '>', '|'];
            
            for (const char of fallbacks) {
                const charWidth = context.measureText(char).width;
                if (Math.abs(charWidth - testWidth) > 1) {
                    console.log(`Using cursor fallback: ${char}`);
                    return char;
                }
            }
            
            // Ultimate fallback
            console.log('Using ultimate cursor fallback: |');
            return '|';
        }
        
        console.log('Using fancy cursor: ⯆');
        return '⯆';
    }
    
    /**
     * Initialize typewriter effect with sound
     */
    initializeTypewriter(dialogId, text, speed, onComplete) {
        const dialog = this.activeDialogs.get(dialogId);
        if (!dialog) return;
        
        const cursorChar = this.getCursorCharacter();
        
        const typewriter = new Typewriter(dialog.textContainer, {
            loop: false,
            delay: speed,
            cursor: cursorChar,
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
        // Find the dialog that owns this container to store timeout ID
        let ownerDialog = null;
        this.activeDialogs.forEach((dialog) => {
            if (dialog.textContainer === container) {
                ownerDialog = dialog;
            }
        });
        
        let index = 0;
        const typeChar = () => {
            // Check if dialog still exists (not destroyed)
            if (!ownerDialog || !this.activeDialogs.has(ownerDialog.dialogId)) {
                console.log('Dialog destroyed during typing, stopping animation');
                return;
            }
            
            if (index < text.length) {
                // Clear container and add text up to current index
                const cursorChar = this.getCursorCharacter();
                container.innerHTML = text.substring(0, index + 1) + `<span class="Typewriter__cursor">${cursorChar}</span>`;
                this.playTypingSound();
                index++;
                
                // Store timeout ID for potential cancellation
                if (ownerDialog) {
                    ownerDialog.typingTimeoutId = setTimeout(typeChar, delay);
                }
            } else {
                // Keep cursor visible after typing is complete
                const cursorChar = this.getCursorCharacter();
                container.innerHTML = text + `<span class="Typewriter__cursor">${cursorChar}</span>`;
                if (ownerDialog) {
                    ownerDialog.typingTimeoutId = null; // Clear timeout ID
                }
                if (onComplete) onComplete();
            }
        };
        
        // Start with empty content and cursor
        const cursorChar = this.getCursorCharacter();
        container.innerHTML = `<span class="Typewriter__cursor">${cursorChar}</span>`;
        if (ownerDialog) {
            ownerDialog.typingTimeoutId = setTimeout(typeChar, delay);
        }
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
        
        // Stop any ongoing animations
        if (dialog.typewriter && dialog.typewriter.stop) {
            try {
                dialog.typewriter.stop();
            } catch (error) {
                console.warn('Error stopping typewriter in closeDialog:', error);
            }
        }
        
        // Clear typing timeout
        if (dialog.typingTimeoutId) {
            clearTimeout(dialog.typingTimeoutId);
            dialog.typingTimeoutId = null;
        }
        
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
     * Immediately destroy all dialogs and their animations (for rapid dialog switching)
     */
    destroyAllDialogs() {
        console.log(`Destroying ${this.activeDialogs.size} active dialogs immediately`);
        
        this.activeDialogs.forEach((dialog, dialogId) => {
            // Stop any typewriter animations
            if (dialog.typewriter && dialog.typewriter.stop) {
                try {
                    dialog.typewriter.stop();
                } catch (error) {
                    console.warn('Error stopping typewriter:', error);
                }
            }
            
            // Clear any ongoing typing animations by clearing timeouts
            // This stops the typeWithSound method's setTimeout chain
            if (dialog.typingTimeoutId) {
                clearTimeout(dialog.typingTimeoutId);
            }
            
            // Remove DOM element immediately
            if (dialog.container && dialog.container.parentNode) {
                dialog.container.parentNode.removeChild(dialog.container);
            }
        });
        
        // Clear all maps
        this.activeDialogs.clear();
        this.followingObjects.clear();
        
        // Reset transition flag
        this.isTransitioning = false;
        
        console.log('All dialogs destroyed immediately');
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
        // Update dialog scaling for new screen dimensions
        this.updateDialogScale();
        
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