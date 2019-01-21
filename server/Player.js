/**
 * Created by Jerome on 20-09-17.
 */

var Utils = require('../shared/Utils.js').Utils;
var PersonalUpdatePacket = require('./PersonalUpdatePacket.js').PersonalUpdatePacket;
var MovingEntity = require('./MovingEntity.js').MovingEntity;
var GameServer = require('./GameServer.js').GameServer;
var Inventory = require('../shared/Inventory.js').Inventory;
var Stats = require('../shared/Stats.js').Stats;
var StatsContainer = require('../shared/Stats.js').StatsContainer;
var Equipment = require('../shared/Equipment.js').Equipment;
var EquipmentManager = require('../shared/Equipment.js').EquipmentManager;
var Formulas = require('../shared/Formulas.js').Formulas;
var Prism = require('./Prism.js').Prism;

function Player(){
    this.updatePacket = new PersonalUpdatePacket();
    this.isPlayer = true;
    this.battleTeam = 'Player';
    this.entityCategory = 'Player';
    this.updateCategory = 'players';
    this.schemaModel = GameServer.PlayerModel;
    this.battlePriority = 1;


    this.newAOIs = []; //list of AOIs about which the player hasn't checked for updates yet
    this.oldAOIs = [];
    this.action = null;
    this.inventory = new Inventory();
    this.sid = 0;
    this.settlement = null;
    this.gold = 0;
    this.inBuilding = -1;
    this.commitSlots = this.getCommitSlotsShell();
    this.civiclvl = 0;
    this.civicxp = 0;
    this.classxp = {
        0: 0,
        1: 0,
        2: 0,
        3: 0
    };
    this.classlvl = {
        0: 0,
        1: 0,
        2: 0,
        3: 0
    };
    this.ap = {
        0: 0,
        1: 0,
        2: 0,
        3: 0,
        4: 0 // civic AP
    };
    this.baseBldrecipes = [11,6,2,3,4]; //TODO: conf
    this.bldRecipes = [];

    this.cellsWidth = 1;
    this.cellsHeight = 1;

    this.setUpStats();
    this.equipment = new EquipmentManager();
    this.fieldOfVision = [];
    this.visitedAOIs = new Set(); // List of AOIs visitted since last fort debrief
    MovingEntity.call(this);
}

Player.prototype = Object.create(MovingEntity.prototype);
Player.prototype.constructor = Player;

Player.prototype.getCommitSlotsShell = function(){
    return {
        slots: [],
        max: GameServer.characterParameters.variables.commitSlots
    }
};

Player.prototype.setIDs = function(dbID,socketID){
    //this.id = GameServer.lastPlayerID++;
    this.dbID = dbID;
    this.socketID = socketID;
};

Player.prototype.setAppearance = function(appearance){
    this.setProperty('appearance',appearance);
};

// Called by finalizePlayer
Player.prototype.updateBldRecipes = function(){
    this.bldRecipes = [];
    this.baseBldrecipes.forEach(function(b){
        if(this.countOwnedBuildings(b) < 1) this.bldRecipes.push(b);
    },this);
    if(this.bldRecipes.length == 0) this.bldRecipes = [-1];
    console.log('Bld recipes list:',this.bldRecipes);
    this.updatePacket.bldRecipes = this.bldRecipes;
};

Player.prototype.listBuildings = function(){
    this.buildings = [];
    for(var bid in GameServer.buildings){
        var building = GameServer.buildings[bid];
        if(building.owner == this.id) this.buildings.push(building);
    }
    console.log('Player owns',this.buildings.length,'buildings');
    this.updateBldRecipes();
};

Player.prototype.countOwnedBuildings = function(type){
    if(type == -1) return this.buildings.length;
    var count = 0;
    this.buildings.forEach(function(b){
        if(b.type == type) count++;
    });
    return count;
};

Player.prototype.isExplorer = function(){
    return this.class == GameServer.classes.explorer;
};

Player.prototype.isCraftsman = function(){
    return this.class == GameServer.classes.craftsman;
};

Player.prototype.isMerchant = function(){
    return this.class == GameServer.classes.merchant;
};

Player.prototype.setName = function(name){
    this.name = name;
};

Player.prototype.setSettlement = function(sid){
    this.sid = sid;
    this.settlement = GameServer.settlements[this.sid];
};

Player.prototype.setStartingInventory = function(){
    // TODO: move to some config file
    /*this.giveItem(2,1);
    this.giveItem(19,1);
    this.giveItem(20,5);
    this.giveItem(6,2);
    this.giveItem(28,1);
    this.giveItem(4,2);*/
    //this.giveItem(4,3);
    this.giveItem(28,1);

    this.giveGold(300);
};

Player.prototype.setUpStats = function(){
    this.stats = new StatsContainer();
    var v = GameServer.characterParameters.variables;
    var list = ['hpmax','dmg','def'];
    list.forEach(function(s){
        this.setStat(s,v[s]);
    },this);
    this.maxStat('hp');
    this.foodModifier = null;
};

Player.prototype.maxStat = function(key){
    var s = this.getStat(key);
    s.setBaseValue(s.maxStat.getValue());
    this.refreshStat(key);
};

Player.prototype.setStat = function(key,value){
    this.getStat(key).setBaseValue(value);
    this.refreshStat(key);
};

Player.prototype.refreshStat = function(key){
    this.updatePacket.addStat(this.getStat(key).trim());
};

Player.prototype.applyDamage = function(dmg){
    MovingEntity.prototype.applyDamage.call(this,dmg);
    this.refreshStat('hp');
};

Player.prototype.die = function(){
    MovingEntity.prototype.die.call(this);
    this.updatePacket.dead = true;
};

Player.prototype.spawn = function(x,y){ // todo: remove args
    var respawnLocation = this.settlement.respawnLocation;
    x = x || respawnLocation.x;
    y = y || respawnLocation.y;
    this.setProperty('x', x);
    this.setProperty('y', y);
    this.updatePacket.x = x;
    this.updatePacket.y = y;
    this.onAddAtLocation();
    console.log('spawning at ',this.x,this.y);
};

Player.prototype.respawn = function(){
    this.setProperty('dead',false);
    this.updatePacket.dead = false;
    this.setStat('hp',10); // TODO: adapt remaining health
    this.onRemoveAtLocation();
    this.spawn();
    this.setOrUpdateAOI();
    this.save();
    // TODO: loose loot
};

Player.prototype.applyFoodModifier = function(foodSurplus){ // %
    if(isNaN(foodSurplus)) return; // Could happen if no fort
    var foodModifier = Formulas.decimalToPct(Formulas.computePlayerFoodModifier(Formulas.pctToDecimal(foodSurplus)));
    if(foodModifier == this.foodModifier) return;
    this.getStats().forEach(function(stat){
        if(Stats[stat].noModifier) return;
        var statObj = this.getStat(stat);
        if(this.foodModifier !== null) statObj.removeRelativeModifier(this.foodModifier);
        statObj.addRelativeModifier(foodModifier);
        this.refreshStat(stat);
    },this);
    this.foodModifier = foodModifier;
    this.updatePacket.foodSurplus = foodSurplus;
};

Player.prototype.hasFreeCommitSlot = function(){
    return this.getSlots().length < this.commitSlots.max;
};

Player.prototype.takeCommitmentSlot = function(buildingID,notify){
    this.addToSlots({
        id: buildingID,
        type: GameServer.buildings[buildingID].type,
        stamp: 1
    });
    this.syncCommitSlots();
    if(notify) this.addNotif('Committed to '+GameServer.buildings[buildingID].name);
};

Player.prototype.updateCommitment = function(){
    if(!GameServer.isTimeToUpdate('commitment')) return false;

    var slots = this.getSlots();
    if(slots.length = 0) return;
    slots.forEach(function(slot){ // Assumes a duration of 1 turn for now
        this.addNotif('Commitment to '+GameServer.buildings[slot.building].name+' ended');
    },this);

    this.commitSlots.slots = [];
    this.syncCommitSlots();
};

Player.prototype.trimCommitSlots = function(){
    var slots = [];
    this.getSlots().forEach(function(slot){
        //slots.push(GameServer.buildings[slot.building].type);
        slots.push({
            type: slot.type,
            id: slot.id
        });
    });
    var trimmed = this.getCommitSlotsShell();
    trimmed.slots = slots;
    return trimmed;
};

Player.prototype.syncCommitSlots = function(){
    this.updatePacket.commitSlots = this.trimCommitSlots();
};

Player.prototype.addToSlots = function(data){
    this.commitSlots.slots.push(data);
};

Player.prototype.removeSlot = function(){
    return this.commitSlots.slots.shift();
};

Player.prototype.getSlots = function(){
    return this.commitSlots.slots;
};

Player.prototype.gainCivicXP = function(inc,notify){
    if(notify) this.addNotif('+'+inc+' Civic XP');
    var max = Formulas.computeMaxCivicXP(this.civiclvl);
    this.civicxp = Utils.clamp(this.civicxp+inc,0,GameServer.characterParameters.maxCivicXP);
    if(this.civicxp >= max){
        if(this.civiclvl == GameServer.characterParameters.maxCivicLvl){
            this.civicxp = max;
        }else{
            this.civicxp -= max;
            this.civiclvl++;
            var nb = 3;
            this.ap[4] += nb; // TODO: vary number
            this.updatePacket.ap = this.ap;
            this.updatePacket.civiclvl = this.civiclvl;
            if(notify) {
                this.addNotif('Reached Civic level '+this.civiclvl+'!');
                this.addNotif('Earned '+nb+' AP!');
            }

        }
    }
    this.updatePacket.civicxp = this.civicxp;
};

Player.prototype.gainClassXP = function(classID,inc,notify){
    if(notify) this.addNotif('+'+inc+' '+GameServer.classData[classID].name+' XP');
    var max = Formulas.computeMaxClassXP(this.classlvl[classID]);
    this.classxp[classID] = Utils.clamp(this.classxp[classID]+inc,0,GameServer.characterParameters.maxClassXP);
    if(this.classxp[classID] >= max){
        if(this.classlvl[classID] == GameServer.characterParameters.maxClassLvl){
            this.classxp[classID] = max;
        }else{
            this.classxp[classID] -= max;
            this.classLvlUp(classID,notify);
        }
    }
    this.updatePacket.classxp = this.classxp;
};

Player.prototype.classLvlUp = function(classID, notify){
    this.classlvl[classID]++;
    var nb = 3; // TODO: vary number
    this.ap[classID] += nb;
    this.updatePacket.classlvl = this.classlvl;
    this.updatePacket.ap = this.ap;
    if(notify) {
        this.addNotif('Reached '+GameServer.classData[classID].name+' level '+this.classlvl[classID]+'!');
        this.addNotif('Earned '+nb+' AP!');
    }
};

Player.prototype.giveGold = function(nb,notify){
    this.gold = Utils.clamp(this.gold+nb,0,GameServer.characterParameters.maxGold);
    this.updatePacket.updateGold(this.gold);
    if(notify){
        this.addNotif('+'+nb+' '+Utils.formatMoney(nb));
        this.save();
    }
};

Player.prototype.takeGold = function(nb,notify){
    this.gold = Utils.clamp(this.gold-nb,0,GameServer.characterParameters.maxGold);
    this.updatePacket.updateGold(this.gold);
    if(notify){
        this.addNotif('-'+nb+' '+Utils.formatMoney(nb));
        this.save();
    }
};

Player.prototype.canBuy = function(price){ // check if building has gold and room
    if(this.inventory.isFull()) {
        console.log('Error: player inventory full');
        return false;
    }
    if(price > this.gold){
        console.log('Error: not enough gold for player');
        return false;
    }
    return true;
};

Player.prototype.hasItem = function(item,nb){
    return (this.inventory.getNb(item) >= nb);
};

Player.prototype.giveItem = function(item,nb,notify){
    this.inventory.add(item,nb);
    this.updatePacket.addItem(item,this.inventory.getNb(item));
    if(notify){
        this.addNotif('+'+nb+' '+GameServer.itemsData[item].name);
        this.save();
    }
};

Player.prototype.takeItem = function(item,nb,notify){
    this.inventory.take(item,nb);
    this.updatePacket.addItem(item,this.inventory.getNb(item));
    if(notify){
        this.addNotif('-'+nb+' '+GameServer.itemsData[item].name);
        this.save();
    }
};

Player.prototype.isEquipped = function(slot){
    return this.equipment.get(slot) > 1;
};

Player.prototype.getEquipped = function(slot){
    return this.equipment.get(slot);
};

Player.prototype.canEquip = function(slot,item){
    if(!this.hasItem(item, 1)) return false;
    // If it's ammo, check that the proper container is equipped
    if(slot in Equipment.ammo){
        var container = this.equipment.getContainer(slot);
        if(this.equipment.get(container) == -1) return false;
    }
    return true;
};

Player.prototype.equip = function(slot,item,fromDB){
    if(!fromDB && !this.canEquip(slot,item)) return;
    var slotData = Equipment.getData(slot);
    var itemData = GameServer.itemsData[item];

    if(this.isEquipped(slot)) this.unequip(slot);

    var conflictSlot = slotData.conflict; // Name of the slot with which the new object could conflict
    if(conflictSlot && this.isEquipped(conflictSlot)) this.unequip(conflictSlot,true);

    // equip item
    this.equipment.set(slot,item);
    this.updatePacket.addEquip(slot,item);

    this.applyAbsoluteModifiers(item);
    var nb = 1;

    // Manage ammo
    if(slot in Equipment.ammo){
        var container = this.equipment.get(this.equipment.getContainer(slot));
        nb = this.computeLoad(slot,container,item); // compute how much will be added to the container
        this.load(slot, nb);
    }

    if(!fromDB){
        this.addNotif('Equipped '+nb+' '+itemData.name+(nb > 1 ? 's' : ''));
        this.takeItem(item, nb);
        this.save();
    }
};

Player.prototype.unequip = function(slot,notify){
    var item = this.equipment.get(slot);
    if(item == -1) return;

    var nb = 1;
    if(slot in Equipment.ammo) nb = this.unload(slot);
    if(slot in Equipment.containers){
        var ammo = this.equipment.getAmmoType(slot);
        this.unequip(ammo,true);
    }

    this.giveItem(item,nb);

    this.equipment.set(slot,-1);
    this.updatePacket.addEquip(slot,-1);
    this.applyAbsoluteModifiers(item,-1);

    if(notify){
        this.addNotif('Unequipped '+nb+' '+GameServer.itemsData[item].name+(nb > 1 ? 's' : ''));
        this.save();
    }
};

Player.prototype.applyAbsoluteModifiers = function(item,change){
    var change = change || 1;
    var itemData = GameServer.itemsData[item];
    if(!itemData.effects) return;
    for (var stat in itemData.effects) {
        if (!itemData.effects.hasOwnProperty(stat)) continue;
        if(change == 1){
            this.applyAbsoluteModifier(stat, itemData.effects[stat]);
        }else if(change == -1) {
            this.removeAbsoluteModifier(stat, itemData.effects[stat]);
        }
    }
};

Player.prototype.applyAbsoluteModifier = function(stat,modifier){
    this.getStat(stat).addAbsoluteModifier(modifier);
    this.refreshStat(stat);
};

Player.prototype.removeAbsoluteModifier = function(stat,modifier){
    this.getStat(stat).removeAbsoluteModifier(modifier);
    this.refreshStat(stat);
};

// Compute how much of item `item` can be added to container `containerSlot`
Player.prototype.computeLoad = function(slot,container,ammoType){
    var currentNb = this.equipment.getNbAmmo(slot);
    var capacity = GameServer.itemsData[container].capacity;
    return Math.min(this.inventory.getNb(ammoType), capacity - currentNb);
};

Player.prototype.load = function(ammo,nb){
    this.equipment.load(ammo,nb);
    this.updatePacket.addAmmo(ammo,this.equipment.getNbAmmo(ammo));
};

Player.prototype.unload = function(ammo,notify){
    var nb = this.equipment.getNbAmmo(ammo);
    var item = this.equipment.get(ammo);
    this.equipment.setAmmo(ammo,0);
    this.updatePacket.addAmmo(ammo,0);
    if(notify) this.addNotif('Unloaded '+GameServer.itemsData[item].name);
    return nb;
};

Player.prototype.decreaseAmmo = function(){
    var ammoType = this.equipment.getAmmoType(this.getRangedContainer(this.getRangedWeapon()));
    var ammoID = this.equipment.get(ammoType);
    this.equipment.load(ammoType,-1);
    var nb = this.equipment.getNbAmmo(ammoType);
    if(nb == 0) this.unequip(ammoType);
    this.updatePacket.addAmmo(ammoType,nb);
    return ammoID;
};

Player.prototype.getRangedWeapon = function(){
    return this.getEquipped('rangedw');
};

Player.prototype.getRangedContainer = function(rangedWeapon){
    return GameServer.itemsData[rangedWeapon].ammo;
};

Player.prototype.getAmmo = function(container){
    var ammoType = this.equipment.getAmmoType(container);
    return this.equipment.getNbAmmo(ammoType);
};

Player.prototype.canRange = function(){
    var weapon = this.getRangedWeapon();
    if(weapon == -1) {
        this.addMsg('I don\'t have a ranged weapon equipped!');
        this.updatePacket.resetTurn = true;
        return false;
    }
    if(this.getAmmo(this.getRangedContainer(weapon)) > 0){
        return true;
    }else{
        this.addMsg('I\'m out of ammo!');
        this.updatePacket.resetTurn = true;
        return false;
    }
};

Player.prototype.applyEffects = function(item,coef,notify){
    var coef = coef || 1;
    var itemData = GameServer.itemsData[item];
    if(!itemData.effects) return;
    for (var stat in itemData.effects) {
        if (!itemData.effects.hasOwnProperty(stat)) continue;
        this.applyEffect(stat, coef*itemData.effects[stat],notify);
    }
};

// Apply effect of consumable object
Player.prototype.applyEffect = function(stat,delta,notify){
    this.getStat(stat).increment(delta);
    this.refreshStat(stat);
    if(notify) {
        var change = delta;
        if(change >= 0) change = '+'+change;
        this.addNotif(Stats[stat].name+' '+change);
    }
};

Player.prototype.initTrim = function(){
    // Return a smaller object, containing a subset of the initial properties, to be sent to the client
    var trimmed = {};
    var broadcastProperties = ['id','gold','civicxp','civiclvl','classxp','classlvl','ap','name']; // list of properties relevant for the client
    for(var p = 0; p < broadcastProperties.length; p++){
        trimmed[broadcastProperties[p]] = this[broadcastProperties[p]];
    }
    trimmed.settlement = this.sid;
    trimmed.x = parseInt(this.x);
    trimmed.y = parseInt(this.y);
    //trimmed.commitSlots = this.trimCommitSlots();
    trimmed.settlements = GameServer.listSettlements('mapTrim'); // to have data to display toponyms on map

    var markers = [];
    Object.keys(GameServer.settlements).forEach(function(key){
       markers = markers.concat(GameServer.settlements[key].getBuildingMarkers());
    });
    Object.keys(GameServer.camps).forEach(function(key){
        markers = markers.concat(GameServer.camps[key].getBuildingMarkers());
    });
    trimmed.markers = markers;
    return trimmed;
};

Player.prototype.trim = function(){
    // Return a smaller object, containing a subset of the initial properties, to be sent to the client
    var trimmed = {};
    var broadcastProperties = ['id','path','inFight','inBuilding','chat',
        'battlezone','dead','appearance']; // list of properties relevant for the client
    for(var p = 0; p < broadcastProperties.length; p++){
        trimmed[broadcastProperties[p]] = this[broadcastProperties[p]];
    }
    trimmed.settlement = this.sid;
    trimmed.x = parseInt(this.x);
    trimmed.y = parseInt(this.y);
    trimmed.quickSlots = this.equipment.quickslots.nb;
    return trimmed;
};

Player.prototype.getDataFromDb = function(data){
    // TODO: think about how to handle references to other entities
    // eg. inBuilding (how to retrieve proper building if server went down since), commitment...
    this.id = data.id;
    this.name = data.name;
    this.x = Utils.clamp(data.x,0,World.worldWidth-1);
    this.y = Utils.clamp(data.y,0,World.worldHeight-1);
    this.civiclvl = data.civiclvl;
    this.civicxp = data.civicxp;
    this.classxp = data.classxp;
    this.classlvl = data.classlvl;
    // stats are not saved, see schema

    for(var slot in data.equipment.slots){
        var item = data.equipment.slots[slot];
        if(item == -1) continue;
        this.equip(slot,item,true);
    }
    for(var slot in data.equipment.containers){
        var item = data.equipment.containers[slot].id;
        if(item == -1) continue;
        this.equip(slot,item,true);
    }
    for(var slot in data.equipment.ammo){
        var item = data.equipment.ammo[slot].id;
        var nb = data.equipment.ammo[slot].nb;
        if(item == -1 || nb == 0) continue;
        this.equip(slot,item,true);
        this.load(slot,nb);
    }
    data.inventory.forEach(function(i){
         this.giveItem(i[0],i[1]);
    },this);
    this.setSettlement(data.sid);
    //this.commitSlots = data.commitSlots;
    this.giveGold(data.gold);
};

Player.prototype.setAction = function(action){
    this.action = action;
};

Player.prototype.onAOItransition = function(newAOI,previousAOI){
    if(!this.visitedAOIs.has(newAOI)) {
        this.visitedAOIs.add(newAOI);
        if(previousAOI){ // if previousAOI: don't grant XP for spawning in fort
            Prism.logEvent(this,'explore',{aoi:newAOI});

            /*var A = Utils.lineToGrid(this.settlement.fort.aoi,World.nbChunksHorizontal);
            var B = Utils.lineToGrid(newAOI,World.nbChunksHorizontal);
            var dist = Math.max(Math.abs(A.x-B.x),Math.abs(A.y-B.y));
            if(dist > 2) { // todo: make depend on dev level
                this.addNotif('New area visited');
                this.gainClassXP(GameServer.classes.explorer,dist * 5, true); // TODO: facotr in class level
            }*/

            this.save();
        }
    }
};

Player.prototype.onEndOfPath = function(){
    //console.log('['+this.constructor.name+' '+this.id+'] arrived at destination');
    MovingEntity.prototype.onEndOfPath.call(this);
    if(this.inFight) return;
    if(!this.action) return;
    if(this.action.type == 1) this.enterBuilding(this.action.id);
    if(this.action.type == 2) GameServer.lootNPC(this,'animal',this.action.id);
    if(this.action.type == 3) GameServer.pickUpItem(this,this.action.id);
    if(this.action.type == 4) GameServer.lootNPC(this,'civ',this.action.id);
};


Player.prototype.enterBuilding = function(id){
    // TODO: check for proximity
    // TODO: add to a list of people in the building object
    this.setProperty('inBuilding', id);

    /*if(this.settlement.fort.id == id){
        console.log('Came back to fort');
        this.visitedAOIs.clear();
    }*/
    Prism.logEvent(this,'building',{building:GameServer.buildings[id].type});
};

Player.prototype.exitBuilding = function(){
    // TODO: check if in building first
    this.setProperty('inBuilding', -1);
};

Player.prototype.endFight = function(alive){
    MovingEntity.prototype.endFight.call(this);
    if(this.xpPool && alive) this.gainClassXP(0,this.xpPool,true);
};

Player.prototype.isAvailableForFight = function(){
    return (!this.isInBuilding() && !this.isDead() && !this.inFight);
};

Player.prototype.isInBuilding = function(){
    return this.inBuilding > -1;
};

Player.prototype.notifyFight = function(flag){
    this.updatePacket.fightNotification(flag);
};

Player.prototype.addMsg = function(msg){
    this.updatePacket.addMsg(msg);
};

Player.prototype.addNotif = function(msg){
    this.updatePacket.addNotif(msg);
};

Player.prototype.getIndividualUpdatePackage = function(){
    if(this.updatePacket.isEmpty()) return null;
    var pkg = this.updatePacket;
    this.updatePacket = new PersonalUpdatePacket();
    return pkg;
};

Player.prototype.update = function() {
    this.updateCommitment();
};

Player.prototype.remove = function(){
    console.log('removing player');
    if(this.battle) this.battle.removeFighter(this);
    this.settlement.removePlayer(this);
    this.onRemoveAtLocation();
    delete GameServer.players[this.id];
    GameServer.updateVision();
};

Player.prototype.getShootingPoint = function(){
    return {
        x: this.x+1,
        y: this.y+1
    };
};

module.exports.Player = Player;