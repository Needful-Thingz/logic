// --- SUPABASE INITIALIZATION ---
// Ensure this matches your actual Supabase URL and Anon Key
const supabaseUrl = 'https://zndgwxlnwftschvwwvob.supabase.co';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

class ArmoryTerminal extends Phaser.Scene {
    constructor() {
        super({ key: 'ArmoryTerminal' });
        this.playerCredits = 0;
        this.currentUserId = null;
        this.menuGroup = null;
        this.shopGroup = null;
    }

    async create() {
        // 1. Authenticate and Fetch Player Data
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            console.error("No active session. Redirecting to login...");
            // window.location.href = 'auth.html'; // Uncomment when auth is fully enforced
            this.currentUserId = "REPLACE_WITH_LOGGED_IN_USER_ID"; // Fallback for testing
        } else {
            this.currentUserId = session.user.id;
        }

        // Fetch actual credits from database
        await this.fetchPlayerCredits();

        // 2. Build the UI Foundation
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x111111).setOrigin(0, 0);
        
        this.add.text(this.cameras.main.centerX, 80, 'VANGUARD TERMINAL', {
            fontSize: '32px', fill: '#00ff00', fontFamily: 'Courier', fontStyle: 'bold'
        }).setOrigin(0.5);

        // Display Real-Time Credit Balance
        this.creditDisplay = this.add.text(this.cameras.main.centerX, 120, `AVAILABLE CREDITS: ${this.playerCredits}`, {
            fontSize: '24px', fill: '#ffaa00', fontFamily: 'Courier', fontStyle: 'bold'
        }).setOrigin(0.5);

        // 3. Create Groups for Menu Toggling
        this.menuGroup = this.add.group();
        this.shopGroup = this.add.group();

        this.buildDeploymentMenu();
        this.buildShopMenu();

        // Start with Shop hidden
        this.shopGroup.setVisible(false);

        // Global Exit Button
        this.add.text(50, 50, '< SYSTEM LOGOUT', { fontSize: '18px', fill: '#ff0000', fontFamily: 'Courier' })
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                console.log("Logging out...");
                // supabase.auth.signOut();
                // window.location.href = 'index.html';
            });
    }

    async fetchPlayerCredits() {
        // Query the public.players table for the current user's credits
        const { data, error } = await supabase
            .from('players')
            .select('credits')
            .eq('id', this.currentUserId)
            .single();

        if (data) {
            this.playerCredits = data.credits;
        }
    }

    buildDeploymentMenu() {
        const header = this.add.text(this.cameras.main.centerX, 180, '--- SELECT DEPLOYMENT MODE ---', { fontSize: '20px', fill: '#aaaaaa', fontFamily: 'Courier' }).setOrigin(0.5);
        this.menuGroup.add(header);

        // Armory Shop Toggle
        const shopBtn = this.createInteractiveButton(this.cameras.main.centerX, 260, '[ ACCESS QUARTERMASTER ]', 'Spend credits to unlock permanent gear', '#00ffff');
        shopBtn.btn.on('pointerdown', () => this.toggleView('shop'));
        this.menuGroup.addMultiple([shopBtn.btn, shopBtn.desc]);

        // Endless Survival
        const endlessBtn = this.createInteractiveButton(this.cameras.main.centerX, 360, '[ ENDLESS SURVIVAL ]', 'Horde Mode: Infinite Grunts', '#ffffff');
        endlessBtn.btn.on('pointerdown', () => window.location.href = 'arena.html?mode=endless');
        this.menuGroup.addMultiple([endlessBtn.btn, endlessBtn.desc]);

        // Proving Grounds (PvP)
        const pvpBtn = this.createInteractiveButton(this.cameras.main.centerX, 460, '[ PROVING GROUNDS ]', 'Local PvP: Head-to-Head', '#ffffff');
        pvpBtn.btn.on('pointerdown', () => window.location.href = 'arena.html?mode=pvp');
        this.menuGroup.addMultiple([pvpBtn.btn, pvpBtn.desc]);
    }

    buildShopMenu() {
        const header = this.add.text(this.cameras.main.centerX, 180, '--- QUARTERMASTER ARMORY ---', { fontSize: '20px', fill: '#aaaaaa', fontFamily: 'Courier' }).setOrigin(0.5);
        this.shopGroup.add(header);

        // Example Weapon Purchase: Heavy Sniper
        const weaponCost = 1500;
        const sniperBtn = this.createInteractiveButton(this.cameras.main.centerX, 280, `[ BUY HEAVY SNIPER - ${weaponCost} CR ]`, 'High damage, slow fire rate, pierces armor', '#ff00ff');
        
        sniperBtn.btn.on('pointerdown', () => this.purchaseWeapon('Heavy Sniper', 'unlock_sniper', weaponCost));
        this.shopGroup.addMultiple([sniperBtn.btn, sniperBtn.desc]);

        // Back to Menu Button
        const backBtn = this.createInteractiveButton(this.cameras.main.centerX, 500, '[ RETURN TO DEPLOYMENT ]', '', '#ff0000');
        backBtn.btn.on('pointerdown', () => this.toggleView('menu'));
        this.shopGroup.addMultiple([backBtn.btn, backBtn.desc]);
    }

    async purchaseWeapon(weaponName, dbColumn, cost) {
        if (this.playerCredits < cost) {
            this.flashMessage('INSUFFICIENT CREDITS', '#ff0000');
            return;
        }

        this.flashMessage('PROCESSING TRANSACTION...', '#ffff00');

        // 1. Deduct credits and update unlock status in Supabase
        const { data, error } = await supabase
            .from('players')
            .update({ 
                credits: this.playerCredits - cost,
                [dbColumn]: true // Assuming you have boolean columns for unlocks like 'unlock_sniper'
            })
            .eq('id', this.currentUserId);

        if (error) {
            console.error("Purchase failed:", error);
            this.flashMessage('TRANSACTION FAILED', '#ff0000');
            return;
        }

        // 2. Update local state and UI
        this.playerCredits -= cost;
        this.creditDisplay.setText(`AVAILABLE CREDITS: ${this.playerCredits}`);
        this.flashMessage(`${weaponName.toUpperCase()} UNLOCKED!`, '#00ff00');
    }

    toggleView(view) {
        if (view === 'shop') {
            this.menuGroup.setVisible(false);
            this.shopGroup.setVisible(true);
        } else {
            this.shopGroup.setVisible(false);
            this.menuGroup.setVisible(true);
        }
    }

    createInteractiveButton(x, y, text, desc, hoverColor) {
        const btn = this.add.text(x, y, text, { fontSize: '26px', fill: '#ffffff', fontFamily: 'Courier' })
            .setOrigin(0.5).setInteractive({ useHandCursor: true });

        const descText = this.add.text(x, y + 30, desc, { fontSize: '16px', fill: '#aaaaaa', fontFamily: 'Courier', alpha: 0 })
            .setOrigin(0.5);

        btn.on('pointerover', () => { btn.setFill(hoverColor); descText.setAlpha(1); });
        btn.on('pointerout', () => { btn.setFill('#ffffff'); descText.setAlpha(0); });

        return { btn, descText }; // Fixed variable return name
    }

    flashMessage(text, color) {
        const msg = this.add.text(this.cameras.main.centerX, 600, text, {
            fontSize: '24px', fill: color, fontFamily: 'Courier', fontStyle: 'bold'
        }).setOrigin(0.5);
        
        this.tweens.add({ targets: msg, alpha: 0, delay: 2000, duration: 1000, onComplete: () => msg.destroy() });
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
