class DebugGui {
    constructor() {
        this.gui = new GUI();
        this.gui.close();
        this.gui.add(this, 'close');

        window.addEventListener('keydown', (event) =>
            {
                if(event.key == 'h')
                    if (this.gui) this.gui.show(this.gui._hidden)
            })
    }
    
    close() {
        this.gui.destroy();
    }
}

export default DebugGui;
