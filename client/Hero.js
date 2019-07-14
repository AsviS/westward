/**
 * Created by Jerome Renaux (jerome.renaux@gmail.com) on 23-04-18.
 */

function ClassDataShell(){
    for(let i = 0; i < 4; i++){
        this[i] = 0;
    }
}

let Hero = new Phaser.Class({
    Extends: Player,

    initialize: function Hero(){
        Player.call(this);
        this.isHero = true;

        this.buildRecipes = new Inventory(7);
        this.craftRecipes = new Inventory(100);

        this.battleBoxData = {
            'atlas':'orientation',
            'frame':'animal_icon'
        }
    },

    setUp: function(data){
        // data comes from Player.initTrim() server-side
        Player.prototype.setUp.call(this,data);

        this.settlement = data.settlement || 0;
        this.buildingMarkers = data.buildingMarkers || [];
        this.resourceMarkers = data.resourceMarkers || [];
        this.FoW = [];
        this.inventory = new Inventory();
        this.belt = new Inventory(3); //TODO: conf
        this.stats = new StatsContainer();
        this.equipment = new EquipmentManager();

        this.gold = data.gold || 0;
        this.civiclvl = data.civiclvl;
        this.civicxp = data.civicxp;
        this.classxp = data.classxp || new ClassDataShell();
        this.classlvl = data.classlvl || new ClassDataShell();
        this.ap = data.ap || new ClassDataShell();
        this.name = data.name;

        this.updateRarity(data.rarity || []);
        this.updateHistory(data.history);
        this.updateFoW(data.fow);

        this.buildRecipes.fromList(Engine.config.defaultBuildRecipes);

        for(let item_id in Engine.itemsData){
            let item = Engine.itemsData[item_id];
            if(item.basicRecipe) this.craftRecipes.add(item_id,1);
        }
    },

    updateData: function(data){ // don't call this 'update' or else conflict with Player.update() for other player updates
        let callbacks = {
            'ammo': this.updateAmmo,
            'ap': this.updateAP,
            'belt': this.updateBelt,
            'bldRecipes': this.updateBuildRecipes,
            'buildingMarkers': this.updateMarkers,
            'civiclvl': this.updateCivicLvl,
            'classlvl': this.updateClassLvl,
            'classxp': this.updateClassXP,
            'dead': this.handleDeath,
            'equipment': this.updateEquipment,
            'fow': this.updateFoW,
            'gold': this.updateGold,
            'inBuilding': this.updateBuilding,
            'items': this.updateInventory,
            'msgs': this.handleMsgs,
            'notifs': this.handleNotifs,
            'resetTurn': BattleManager.resetTurn,
            'stats': this.updateStats
        };

        this.updateEvents = new Set();

        for(let field in callbacks){
            if(!callbacks.hasOwnProperty(field)) continue;
            if(field in data) callbacks[field].call(this,data[field]);
        }

        this.updateEvents.forEach(function (e) {
            Engine.updateMenus(e);
        }, this);

        let battleCallbacks = {
            'battleData': BattleManager.updateBattle
        };

        if('fightStatus' in data) BattleManager.handleFightStatus(data['fightStatus']); // Do first before any other battle update
        for(let field in battleCallbacks){
            if(!battleCallbacks.hasOwnProperty(field)) continue;
            if(field in data) battleCallbacks[field].call(this,data[field]);
        }

        if(data.x >= 0 && data.y >= 0) this.teleport(data.x,data.y);

        Engine.updateAllOrientationPins();

        Engine.firstSelfUpdate = false;
    },

    needsToCraft: function(item){
        let required = 0;
        let owned = 0;
        let recipe = Engine.itemsData[item].recipe;
        for(let itm in recipe){
            required++;
            if(this.hasItem(itm,recipe[itm])) owned++;
        }
        return [owned,required];
    },

    canCraft: function(item, nb){
        let recipe = Engine.itemsData[item].recipe;
        for(let itm in recipe){
            if(!this.hasItem(itm,recipe[itm]*nb)) return false;
        }
        return true;
    },


// ### GETTERS ###

    getEquippedItemID: function(slot){
        return this.equipment.get(slot); // Returns the ID of the item equipped at the given slot
    },

    getEquippedItem: function(slot){
        const item_id = this.equipment.get(slot);
        return Engine.itemsData[item_id]; // Returns the ID of the item equipped at the given slot
    },

    getMaxAmmo: function(){
        let container_id = this.equipment.get('range_container');
        console.warn('container_id = ',container_id);
        return Engine.itemsData[container_id].capacity;
    },

    getNbAmmo: function(){
        return this.equipment.getNbAmmo();
    },

    getNbAnyAmmo: function(){
        return this.getNbAmmo();
    },

    getRangedCursor: function(){
        let rangedw = this.getEquippedItemID('rangedw');
        if(rangedw === -1) return 'bow';
        return (Engine.itemsData[rangedw].ammo === 'quiver' ? 'bow' : 'gun');
    },

    getStat: function(stat){
        return this.stats[stat];
    },

    getStatValue: function(stat){
        return this.getStat(stat).getValue();
    },

    hasItem: function(item,nb){
        return (this.inventory.getNb(item) >= nb);
    },

    getItemNb: function (item) {
        return this.inventory.getNb(item);
    },

    isAmmoEquipped: function(slot){
        return this.equipment.hasAnyAmmo(slot);
    },

    // ### UPDATES #####

    handleDeath: function(dead){
        if(dead === true) Engine.manageDeath();
        if(dead === false) Engine.manageRespawn();
    },

    handleMsgs: function(msgs){
        for(let i = 0; i < msgs.length; i++){
            this.talk(msgs[i]);
        }
    },

    handleNotifs: function(notifs){
        UI.handleNotifications(notifs);
        notifs.forEach(function(notif){
            this.history.unshift([Date.now(),notif]);
        },this);
        this.updateEvents.add('history');
    },

    updateAmmo: function(ammo){
        for(let i = 0; i < ammo.length; i++){
            let am = ammo[i];
            this.equipment.setAmmo(am.nb);
        }
        this.updateEvents.add('equip');
    },

    updateAP: function(ap){
        this.ap = ap;
        this.updateEvents.add('character');
        this.updateEvents.add('citizen');
        //TODO: add sound effect
    },

    updateBelt: function(items){
        this.belt.updateItems(items);
        this.updateEvents.add('belt');
        // if(Client.tutorial) TutorialManager.checkHook();

        if(!Engine.firstSelfUpdate) {
            items.forEach(function (item) {
                let sound = Engine.itemsData[item[0]].sound;
                if(sound) Engine.scene.sound.add(sound).play();
            });
        }
    },

    updateBuildRecipes: function(bldRecipes){
        this.buildRecipes.clear();
        if(bldRecipes.length === 1 && bldRecipes[0] === -1) return;
        bldRecipes.forEach(function(w){
            this.buildRecipes.add(w,1);
        },this);
        this.updateEvents.add('bldrecipes');
    },

    postChunkUpdate: function(){
        if(this.chunk !== this.previousChunk) Engine.updateEnvironment();
        this.previousChunk = this.chunk;
    },

    updateCivicLvl: function(civiclvl){
        this.civiclvl = civiclvl;
        this.updateEvents.add('citizen');
        // TODO: add sound effect
    },

    updateClassLvl: function(classlvl){
        this.classlvl = classlvl;
        this.updateEvents.add('character');
        // TODO: add sound effect
    },

    updateClassXP: function(classxp){
        this.classxp = classxp;
        this.updateEvents.add('character');
        // TODO: add sound effect
    },

    updateEquipment: function(equipment){
        for(let i = 0; i < equipment.length; i++){
            let eq = equipment[i];
            this.equipment.set(eq.slot,eq.item);
        }
        this.updateEvents.add('equip');
    },

    updateFood: function(food){
        this.food = food;
        this.updateEvents.add('food');
    },

    updateFoW: function(aois){
        this.FoW = [];
        if(!aois) aois = [Engine.player.chunk];
        aois.forEach(function(aoi){
            let origin = Utils.AOItoTile(aoi);
            this.FoW.push(
                new Phaser.Geom.Rectangle(
                    origin.x,
                    origin.y,
                    World.chunkWidth,
                    World.chunkHeight)
            );
        },this);
    },

    updateGold: function(gold){
        this.gold = gold;
        this.updateEvents.add('gold');
        // TODO: move sound effect
    },

    updateBuilding: function(buildingID){
        this.inBuilding = buildingID;
    },

    updateHistory: function(history){
        this.history = history || [];
        for(let i = 0; i < this.history.length; i++){
            this.history[i][0] -= Client.serverTimeDelta;
        }
        this.history.reverse();
    },

    updateInventory: function(items){
        this.inventory.updateItems(items);
        this.updateEvents.add('inv');
        if(Client.tutorial) TutorialManager.checkHook();

        if(!Engine.firstSelfUpdate) {
            items.forEach(function (item) {
                let sound = Engine.itemsData[item[0]].sound;
                if(sound) Engine.scene.sound.add(sound).play();
            });
        }
    },

    updateMarkers: function(markers){
        this.buildingMarkers = markers;
        if(Engine.miniMap) Engine.miniMap.map.updatePins();
    },

    updateRarity: function(rarity){
        Engine.rarity = {};
        rarity.forEach(function(itm){
            Engine.rarity[itm[0]] = itm[1];
        });
    },

    updateStats: function(stats){
        for(let i = 0; i < stats.length; i++){
            this.updateStat(stats[i].k,stats[i]);
        }
        this.updateEvents.add('stats');
        // TODO: add sound effect
    },

    updateStat: function(key,data){
        let statObj = this.getStat(key);
        statObj.setBaseValue(data.v);
        statObj.relativeModifiers = [];
        statObj.absoluteModifiers = [];
        if(data.r){
            data.r.forEach(function(m){
                statObj.relativeModifiers.push(m);
            })
        }
        if(data.a){
            data.a.forEach(function(m){
                statObj.absoluteModifiers.push(m);
            })
        }
    },

    updateVigor: function(vigor){
        this.vigor = vigor;
        this.updateEvents.add('vigor');
    }
});
