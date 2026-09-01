class ArmoryTerminal extends Phaser.Scene {
    constructor() {
        super({ key: 'ArmoryTerminal' });
    }

    create() {
        // Terminal Background Overlay
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x111111).setOrigin(0, 0);
        
        // Terminal Header
        this.add.text(this.cameras.main.centerX, 100, 'COMBAT SIMULATOR TERMINAL', {
            fontSize: '32px',
            fill: '#00ff00',
            fontFamily: 'Courier'
        }).setOrigin(0.5);

        this.add.text(this.cameras.main.centerX, 140, 'Select Deployment Mode:', {
            fontSize: '20px',
            fill: '#aaaaaa',
            fontFamily: 'Courier'
        }).setOrigin(0.5);

        // --- Menu Options ---
        
        // 1. Endless Survival
        const endlessBtn = this.createMenuButton(this.cameras.main.centerX, 250, '[ ENDLESS SURVIVAL ]', 'Horde Mode: Infinite Grunts');
        endlessBtn.on('pointerdown', () => {
            console.log("Routing to Endless Arena...");
            window.location.href = 'arena.html?mode=endless'; 
        });

        // 2. Proving Grounds (PvP)
        const pvpBtn = this.createMenuButton(this.cameras.main.centerX, 350, '[ PROVING GROUNDS ]', 'Local PvP: Head-to-Head');
        pvpBtn.on('pointerdown', () => {
            console.log("Routing to PvP Arena...");
            window.location.href = 'arena.html?mode=pvp'; 
        });

        // 3. The Drop Zone (Battle Royale)
        // We will lock this dynamically if the user hasn't unlocked it yet
        const brBtn = this.createMenuButton(this.cameras.main.centerX, 450, '[ THE DROP ZONE ]', 'Battle Royale: Last Stand');
        
        // Placeholder check - you will replace this with your Supabase boolean query
        let battleRoyaleUnlocked = true; 

        if (battleRoyaleUnlocked) {
            brBtn.on('pointerdown', () => {
                console.log("Routing to Battle Royale...");
                window.location.href = 'battleroyale.html'; 
            });
        } else {
            brBtn.setFill('#555555'); // Gray out text
            brBtn.setText('[ THE DROP ZONE ] - LOCKED');
        }

        // Return to Armory Main Hub Button
        const exitBtn = this.add.text(50, 50, '< EXIT TERMINAL', { fontSize: '18px', fill: '#ff0000', fontFamily: 'Courier' })
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                // Logic to return to the main Armory upgrade screen
                console.log("Exiting terminal...");
            });
    }

    // Helper function to build interactive text buttons with hover effects
    createMenuButton(x, y, text, desc) {
        const btn = this.add.text(x, y, text, {
            fontSize: '28px',
            fill: '#ffffff',
            fontFamily: 'Courier'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const descText = this.add.text(x, y + 35, desc, {
            fontSize: '16px',
            fill: '#aaaaaa',
            fontFamily: 'Courier',
            alpha: 0 // Hidden by default
        }).setOrigin(0.5);

        // Hover Effects
        btn.on('pointerover', () => {
            btn.setFill('#00ff00');
            descText.setAlpha(1); // Show description
        });

        btn.on('pointerout', () => {
            btn.setFill('#ffffff');
            descText.setAlpha(0); // Hide description
        });

        return btn;
    }
}

// Phaser Configuration
const config = {
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
    backgroundColor: '#000000',
    scene: [ArmoryTerminal]
};

const game = new Phaser.Game(config);
