class DebugGui {
    constructor() {
        this.gui = new GUI();
        this.gui.close();
        this.gui.add(this, 'close');
    }
    
    close() {
        this.gui.destroy();
    }
}

export default DebugGui;
