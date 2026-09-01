// --- SUPABASE INITIALIZATION ---
// Ensure this matches your actual Supabase URL and Anon Key
const supabaseUrl = 'https://zndgwxlnwftschvwwvob.supabase.co';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

class ArmoryTerminal extends Phaser.Scene {
    constructor() {
        super({ key: 'ArmoryTerminal' });
        this.playerCredits = 0;
        this.activePrimary = 'assault_rifle';
        this.activeMelee = 'combat_knife';
        this.unlocked = { sniper: false }; // Track unlock states
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

        // Fetch actual credits and loadout from database
        await this.fetchPlayerData();

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

    async fetchPlayerData() {
        // Query the public.players table for credits, active loadout, and unlocks
        const { data, error } = await supabase
            .from('players')
            .select('credits, active_primary, active_melee, unlock_sniper')
            .eq('id', this.currentUserId)
            .single();

        if (data) {
            this.playerCredits = data.credits;
            this.activePrimary = data.active_primary || 'assault_rifle';
            this.activeMelee = data.active_melee || 'combat_knife';
            this.unlocked.sniper = data.unlock_sniper || false;
        }
    }

    buildDeploymentMenu() {
        const header = this.add.text(this.cameras.main.centerX, 180, '--- SELECT DEPLOYMENT MODE ---', { fontSize: '20px', fill: '#aaaaaa', fontFamily: 'Courier' }).setOrigin(0.5);
        this.menuGroup.add(header);

        // Armory Shop Toggle
        const shopBtn = this.createInteractiveButton(this.cameras.main.centerX, 260, '[ ACCESS QUARTERMASTER ]', 'Spend credits to unlock permanent gear', '#00ffff');
        shopBtn.btn.on('pointerdown', () => this.toggleView('shop'));
        this.menuGroup.addMultiple([shopBtn.btn, shopBtn.descText]);

        // Endless Survival
        const endlessBtn = this.createInteractiveButton(this.cameras.main.centerX, 360, '[ ENDLESS SURVIVAL ]', 'Horde Mode: Infinite Grunts', '#ffffff');
        endlessBtn.btn.on('pointerdown', () => window.location.href = 'arena.html?mode=endless');
        this.menuGroup.addMultiple([endlessBtn.btn, endlessBtn.descText]);

        // Proving Grounds (PvP)
        const pvpBtn = this.createInteractiveButton(this.cameras.main.centerX, 460, '[ PROVING GROUNDS ]', 'Local PvP: Head-to-Head', '#ffffff');
        pvpBtn.btn.on('pointerdown', () => window.location.href = 'arena.html?mode=pvp');
        this.menuGroup.addMultiple([pvpBtn.btn, pvpBtn.descText]);
    }

    buildShopMenu() {
        // Clear the group so we can dynamically rebuild it when states change
        this.shopGroup.clear(true, true);

        const header = this.add.text(this.cameras.main.centerX, 180, '--- QUARTERMASTER ARMORY ---', { fontSize: '20px', fill: '#aaaaaa', fontFamily: 'Courier' }).setOrigin(0.5);
        this.shopGroup.add(header);

        // Dynamic Weapon Display: Heavy Sniper
        const weaponCost = 1500;
        let sniperText, sniperAction, sniperColor;

        if (!this.unlocked.sniper) {
            sniperText = `[ BUY HEAVY SNIPER - ${weaponCost} CR ]`;
            sniperColor = '#ff00ff';
            sniperAction = () => this.purchaseWeapon('Heavy Sniper', 'unlock_sniper', weaponCost, 'sniper');
        } else if (this.activePrimary === 'sniper') {
            sniperText = `[ HEAVY SNIPER - EQUIPPED ]`;
            sniperColor = '#00ff00';
            sniperAction = () => this.flashMessage('ALREADY EQUIPPED', '#00ff00');
        } else {
            sniperText = `[ EQUIP HEAVY SNIPER ]`;
            sniperColor = '#00ffff';
            sniperAction = () => this.equipWeapon('primary', 'sniper');
        }

        const sniperBtn = this.createInteractiveButton(this.cameras.main.centerX, 280, sniperText, 'High damage, slow fire rate, pierces armor', sniperColor);
        sniperBtn.btn.on('pointerdown', sniperAction);
        this.shopGroup.addMultiple([sniperBtn.btn, sniperBtn.descText]);

        // Back to Menu Button
        const backBtn = this.createInteractiveButton(this.cameras.main.centerX, 500, '[ RETURN TO DEPLOYMENT ]', '', '#ff0000');
        backBtn.btn.on('pointerdown', () => this.toggleView('menu'));
        this.shopGroup.addMultiple([backBtn.btn, backBtn.descText]);
    }

    async purchaseWeapon(weaponName, dbColumn, cost, weaponId) {
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
                [dbColumn]: true 
            })
            .eq('id', this.currentUserId);

        if (error) {
            console.error("Purchase failed:", error);
            this.flashMessage('TRANSACTION FAILED', '#ff0000');
            return;
        }

        // 2. Update local state and UI
        this.playerCredits -= cost;
        this.unlocked[weaponId] = true;
        this.creditDisplay.setText(`AVAILABLE CREDITS: ${this.playerCredits}`);
        this.flashMessage(`${weaponName.toUpperCase()} UNLOCKED!`, '#00ff00');
        
        // Rebuild the shop menu to turn the Buy button into an Equip button
        this.buildShopMenu();
    }

    async equipWeapon(slot, weaponId) {
        this.flashMessage('EQUIPPING...', '#ffff00');

        try {
            // Trigger the secure Supabase Stored Procedure
            const { data, error } = await supabase.rpc('equip_item', {
                p_slot: slot,
                p_weapon_id: weaponId
            });

            if (error) {
                throw error;
            }

            console.log(`Success! ${weaponId} equipped to ${slot} slot.`);
            
            // Update local state
            if (slot === 'primary') this.activePrimary = weaponId;
            if (slot === 'melee') this.activeMelee = weaponId;

            this.flashMessage('EQUIPPED SUCCESSFULLY', '#00ff00');

            // Rebuild shop to show the EQUIPPED tag
            this.buildShopMenu();

        } catch (err) {
            console.error("Equip sequence failed:", err.message);
            this.flashMessage('EQUIP FAILED: ' + err.message.toUpperCase(), '#ff0000');
        }
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

        return { btn, descText }; 
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
