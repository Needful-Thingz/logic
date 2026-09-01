// --- SUPABASE INITIALIZATION ---
const supabaseUrl = 'https://zndgwxlnwftschvwwvob.supabase.co';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

class ArmoryTerminal extends Phaser.Scene {
    constructor() {
        super({ key: 'ArmoryTerminal' });
        this.playerCredits = 0;
        this.activePrimary = 'assault_rifle';
        this.activeMelee = 'combat_knife';
        this.unlocked = {}; 
        this.currentUserId = null;
        this.menuGroup = null;
        this.shopGroup = null;

        // MASTER WEAPON CATALOG
        this.weaponCatalog = [
            { id: 'shotgun', name: 'Tactical Shotgun', dbColumn: 'unlock_shotgun', cost: 800, desc: 'Devastating at close range, wide spread', slot: 'primary' },
            { id: 'katana', name: 'Cyber Katana', dbColumn: 'unlock_katana', cost: 1200, desc: 'Faster swing rate, deflects small projectiles', slot: 'melee' },
            { id: 'sniper', name: 'Heavy Sniper', dbColumn: 'unlock_sniper', cost: 1500, desc: 'High damage, slow fire rate, pierces armor', slot: 'primary' },
            { id: 'plasma', name: 'Plasma Rifle', dbColumn: 'unlock_plasma', cost: 3000, desc: 'Melts shields, rapid fire energy projectiles', slot: 'primary' },
            { id: 'rpg', name: 'Rocket Launcher', dbColumn: 'unlock_rpg', cost: 5000, desc: 'Massive AoE explosive damage', slot: 'primary' }
        ];
    }

    async create() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            console.error("No active session. Redirecting to login...");
            this.currentUserId = "REPLACE_WITH_LOGGED_IN_USER_ID"; 
        } else {
            this.currentUserId = session.user.id;
        }

        await this.fetchPlayerData();

        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x111111).setOrigin(0, 0);
        
        this.add.text(this.cameras.main.centerX, 50, 'VANGUARD TERMINAL', {
            fontSize: '32px', fill: '#00ff00', fontFamily: 'Courier', fontStyle: 'bold'
        }).setOrigin(0.5);

        this.creditDisplay = this.add.text(this.cameras.main.centerX, 90, `AVAILABLE CREDITS: ${this.playerCredits}`, {
            fontSize: '24px', fill: '#ffaa00', fontFamily: 'Courier', fontStyle: 'bold'
        }).setOrigin(0.5);

        this.menuGroup = this.add.group();
        this.shopGroup = this.add.group();

        this.buildDeploymentMenu();
        this.buildShopMenu();

        this.shopGroup.setVisible(false);

        this.add.text(50, 40, '< SYSTEM LOGOUT', { fontSize: '18px', fill: '#ff0000', fontFamily: 'Courier' })
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                console.log("Logging out...");
            });
    }

    async fetchPlayerData() {
        const { data, error } = await supabase
            .from('players')
            .select('credits, active_primary, active_melee, unlock_sniper, unlock_shotgun, unlock_katana, unlock_plasma, unlock_rpg')
            .eq('id', this.currentUserId)
            .single();

        if (data) {
            this.playerCredits = data.credits;
            this.activePrimary = data.active_primary || 'assault_rifle';
            this.activeMelee = data.active_melee || 'combat_knife';
            
            // Map db data to our unlocked state
            this.unlocked.sniper = data.unlock_sniper || false;
            this.unlocked.shotgun = data.unlock_shotgun || false;
            this.unlocked.katana = data.unlock_katana || false;
            this.unlocked.plasma = data.unlock_plasma || false;
            this.unlocked.rpg = data.unlock_rpg || false;
        }
    }

    buildDeploymentMenu() {
        const header = this.add.text(this.cameras.main.centerX, 180, '--- SELECT DEPLOYMENT MODE ---', { fontSize: '20px', fill: '#aaaaaa', fontFamily: 'Courier' }).setOrigin(0.5);
        this.menuGroup.add(header);

        const shopBtn = this.createInteractiveButton(this.cameras.main.centerX, 280, '[ ACCESS QUARTERMASTER ]', 'Spend credits to unlock permanent gear', '#00ffff');
        shopBtn.btn.on('pointerdown', () => this.toggleView('shop'));
        this.menuGroup.addMultiple([shopBtn.btn, shopBtn.descText]);

        const endlessBtn = this.createInteractiveButton(this.cameras.main.centerX, 380, '[ ENDLESS SURVIVAL ]', 'Horde Mode: Infinite Grunts', '#ffffff');
        endlessBtn.btn.on('pointerdown', () => window.location.href = 'arena.html?mode=endless');
        this.menuGroup.addMultiple([endlessBtn.btn, endlessBtn.descText]);

        const pvpBtn = this.createInteractiveButton(this.cameras.main.centerX, 480, '[ PROVING GROUNDS ]', 'Local PvP: Head-to-Head', '#ffffff');
        pvpBtn.btn.on('pointerdown', () => window.location.href = 'arena.html?mode=pvp');
        this.menuGroup.addMultiple([pvpBtn.btn, pvpBtn.descText]);
    }

    buildShopMenu() {
        this.shopGroup.clear(true, true);

        const header = this.add.text(this.cameras.main.centerX, 150, '--- QUARTERMASTER ARMORY ---', { fontSize: '20px', fill: '#aaaaaa', fontFamily: 'Courier' }).setOrigin(0.5);
        this.shopGroup.add(header);

        let startY = 230; 
        const spacingY = 80;

        // Loop through catalog and dynamically generate buttons
        this.weaponCatalog.forEach((weapon, index) => {
            let btnText, btnAction, btnColor;
            let currentY = startY + (index * spacingY);

            // Determine if active in the specific slot (primary or melee)
            const isActive = (weapon.slot === 'primary' && this.activePrimary === weapon.id) || 
                             (weapon.slot === 'melee' && this.activeMelee === weapon.id);

            if (!this.unlocked[weapon.id]) {
                btnText = `[ BUY ${weapon.name.toUpperCase()} - ${weapon.cost} CR ]`;
                btnColor = '#ff00ff';
                btnAction = () => this.purchaseWeapon(weapon.name, weapon.dbColumn, weapon.cost, weapon.id);
            } else if (isActive) {
                btnText = `[ ${weapon.name.toUpperCase()} - EQUIPPED ]`;
                btnColor = '#00ff00';
                btnAction = () => this.flashMessage('ALREADY EQUIPPED', '#00ff00');
            } else {
                btnText = `[ EQUIP ${weapon.name.toUpperCase()} ]`;
                btnColor = '#00ffff';
                btnAction = () => this.equipWeapon(weapon.slot, weapon.id);
            }

            const wpnBtn = this.createInteractiveButton(this.cameras.main.centerX, currentY, btnText, weapon.desc, btnColor);
            wpnBtn.btn.on('pointerdown', btnAction);
            this.shopGroup.addMultiple([wpnBtn.btn, wpnBtn.descText]);
        });

        const backBtn = this.createInteractiveButton(this.cameras.main.centerX, 650, '[ RETURN TO DEPLOYMENT ]', '', '#ff0000');
        backBtn.btn.on('pointerdown', () => this.toggleView('menu'));
        this.shopGroup.addMultiple([backBtn.btn, backBtn.descText]);
    }

    async purchaseWeapon(weaponName, dbColumn, cost, weaponId) {
        if (this.playerCredits < cost) {
            this.flashMessage('INSUFFICIENT CREDITS', '#ff0000');
            return;
        }
        this.flashMessage('PROCESSING TRANSACTION...', '#ffff00');

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

        this.playerCredits -= cost;
        this.unlocked[weaponId] = true;
        this.creditDisplay.setText(`AVAILABLE CREDITS: ${this.playerCredits}`);
        this.flashMessage(`${weaponName.toUpperCase()} UNLOCKED!`, '#00ff00');
        
        this.buildShopMenu();
    }

    async equipWeapon(slot, weaponId) {
        this.flashMessage('EQUIPPING...', '#ffff00');

        try {
            const { data, error } = await supabase.rpc('equip_item', {
                p_slot: slot,
                p_weapon_id: weaponId
            });

            if (error) throw error;

            if (slot === 'primary') this.activePrimary = weaponId;
            if (slot === 'melee') this.activeMelee = weaponId;

            this.flashMessage('EQUIPPED SUCCESSFULLY', '#00ff00');
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
        const btn = this.add.text(x, y, text, { fontSize: '24px', fill: '#ffffff', fontFamily: 'Courier' })
            .setOrigin(0.5).setInteractive({ useHandCursor: true });
        const descText = this.add.text(x, y + 26, desc, { fontSize: '15px', fill: '#aaaaaa', fontFamily: 'Courier', alpha: 0 })
            .setOrigin(0.5);

        btn.on('pointerover', () => { btn.setFill(hoverColor); descText.setAlpha(1); });
        btn.on('pointerout', () => { btn.setFill('#ffffff'); descText.setAlpha(0); });
        return { btn, descText }; 
    }

    flashMessage(text, color) {
        const msg = this.add.text(this.cameras.main.centerX, 700, text, {
            fontSize: '24px', fill: color, fontFamily: 'Courier', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.tweens.add({ targets: msg, alpha: 0, delay: 2000, duration: 1000, onComplete: () => msg.destroy() });
    }
}

const config = {
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
    backgroundColor: '#000000',
    scene: [ArmoryTerminal]
};
const game = new Phaser.Game(config);
