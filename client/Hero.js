/**
 * Created by Jerome Renaux (jerome.renaux@gmail.com) on 23-04-18.
 */

var Hero = new Phaser.Class({
    Extends: Player,

    initialize: function Hero(){
        Player.call(this);
        this.isHero = true;
    },

    setUp: function(data){
        // data comes from Player.initTrim() server-side
        Player.prototype.setUp.call(this,data);

        this.settlement = data.settlement;
        this.markers = data.markers;
        this.unread = 1;
        this.inventory = new Inventory();
        this.stats = new StatsContainer();
        this.equipment = new EquipmentManager();
        this.setCommitSlots(data.commitSlots);

        this.gold = data.gold;
        this.civiclvl = data.civiclvl;
        this.civicxp = data.civicxp;
        this.classxp = data.classxp;
        this.classlvl = data.classlvl;
        this.ap = data.ap;
    },

    updateData: function(data){ // don't call this 'update' or else conflict with Player.update() for other player updates
        var callbacks = {
            'ammo': this.updateAmmo,
            'ap': this.updateAP,
            'civiclvl': this.updateCivicLvl,
            'classlvl': this.updateClassLvl,
            'classxp': this.updateClassXP,
            'commitSlots': this.updateCommitSlots,
            'dead': this.handleDeath,
            'equipment': this.updateEquipment,
            'foodSurplus': this.updateFoodSurplus,
            'gold': this.updateGold,
            'items': this.updateInventory,
            'msgs': this.handleMsgs,
            'notifs': this.handleNotifs,
            'resetTurn': BattleManager.resetTurn,
            'stats': this.updateStats
        };

        this.updateEvents = new Set();

        for(var field in callbacks){
            if(!callbacks.hasOwnProperty(field)) continue;
            if(field in data) callbacks[field].call(this,data[field]);
        }

        this.updateEvents.forEach(function (e) {
            Engine.updateMenus(e);
        }, this);

        if(data.fightStatus !== undefined) BattleManager.handleFightStatus(data.fightStatus);
        if(data.remainingTime) BattleManager.setCounter(data.remainingTime);
        if(data.activeID) BattleManager.manageTurn(data.activeID);
        if(data.x >= 0 && data.y >= 0) this.teleport(data.x,data.y);

        Engine.firstSelfUpdate = false;
    },

    setCommitSlots: function(commitSlots){
        // Data structures are cleared in updateCommitSlots
        if(!this.commitTypes) this.commitTypes = new Inventory(commitSlots.max);
        if(!this.commitIDs) this.commitIDs = [];
        this.maxCommitSlots = commitSlots.max;

        commitSlots.slots.forEach(function(s){
            this.commitTypes.add(s.type,1);
            this.commitIDs.push(s.id);
        },this);
    },

    canCommit: function(){
        if(!this.hasFreeCommitSlot()) return;
        return !this.commitIDs.includes(Engine.currentBuiling.id);
    },

    hasFreeCommitSlot: function(){
        return (this.commitIDs.length != this.maxCommitSlots);
    },


// ### GETTERS ###

    getEquipped: function(slot){
        return this.equipment.get(slot); // Returns the ID of the item equipped at the given slot
    },

    getMaxAmmo: function(slot){
        var container = this.equipment.get(this.equipment.getContainer(slot));
        return Engine.itemsData[container].capacity;
    },

    getNbAmmo: function(slot){
        return this.equipment.getNbAmmo(slot);
    },

    getRangedCursor: function(){
        var rangedw = this.getEquipped('rangedw');
        if(rangedw == -1) return 'bow';
        return (Engine.itemsData[rangedw].ammo == 'quiver' ? 'bow' : 'gun');
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

    isAmmoEquipped: function(slot){
        return this.equipment.hasAnyAmmo(slot);
    },

    // ### UPDATES #####

    handleDeath: function(dead){
        if(dead == true) Engine.manageDeath();
        if(dead == false) Engine.manageRespawn();
    },

    handleMsgs: function(msgs){
        for(var i = 0; i < msgs.length; i++){
            this.talk(msgs[i]);
        }
    },

    handleNotifs: function(notifs){
        UI.handleNotifications(notifs);
    },

    updateAmmo: function(ammo){
        for(var i = 0; i < ammo.length; i++){
            var am = ammo[i];
            this.equipment.setAmmo(am.slot,am.nb);
        }
        this.updateEvents.add('equip');
    },

    updateAP: function(ap){
        this.ap = ap;
        this.updateEvents.add('character');
        this.updateEvents.add('citizen');
        //TODO: add sound effect
    },

    updateCivicLvl: function(civiclvl){
        this.civiclvl = civiclvl;
        this.updateEvents.add('citizen');
        // TODO: add sound effect
    },

    updateCivicXP: function(civicxp){
        this.civicxp = civicxp;
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

    updateCommitSlots: function(commitSlots){
        //this.commitSlots.clear();
        this.commitTypes.clear();
        this.commitIDs = [];
        this.setCommitSlots(commitSlots);
        this.updateEvents.add('commit');
        // TODO: add sound effect
    },

    updateEquipment: function(equipment){
        for(var i = 0; i < equipment.length; i++){
            var eq = equipment[i];
            this.equipment.set(eq.slot,eq.item);
        }
        this.updateEvents.add('equip');
    },

    updateFoodSurplus: function(foodSurplus){
        this.foodSurplus = foodSurplus;
        this.updateEvents.add('character');
    },

    updateGold: function(gold){
        this.gold = gold;
        this.updateEvents.add('gold');
        // TODO: move sound effect
    },

    updateInventory: function(items){
        this.inventory.updateItems(items);
        this.updateEvents.add('inv');

        if(!Engine.firstSelfUpdate) {
            items.forEach(function (item) {
                var sound = Engine.itemsData[item[0]].sound;
                if(sound) Engine.scene.sound.add(sound).play();
            });
        }
    },

    updateStats: function(stats){
        for(var i = 0; i < stats.length; i++){
            this.updateStat(stats[i].k,stats[i]);
        }
        this.updateEvents.add('stats');
        // TODO: add sound effect
    },

    updateStat: function(key,data){
        var statObj = this.getStat(key);
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
    }
});