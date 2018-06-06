/**
 * Created by Jerome Renaux (jerome.renaux@gmail.com) on 11-02-18.
 */

var GameServer = require('./GameServer.js').GameServer;
var Formulas = require('../shared/Formulas.js').Formulas;
var World = require('../shared/World.js').World;

function Settlement(data){
    this.id = data.id;
    this.name = data.name;
    this.desc = data.description;
    this.level = data.level;
    this.pop = data.population;
    this.lastCycle = data.lastCycle;

    this.fort = null;
    this.buildings = [];
    this.players = [];

    GameServer.settlements[this.id] = this;
}

Settlement.prototype.setModel = function(model) {
    this.model = model;
};

Settlement.prototype.registerPlayer = function(player){
    this.players.push(player.id);
    player.applyFoodModifier(this.surplus);
};

Settlement.prototype.removePlayer = function(player){
    var idx= this.players.indexOf(player.id);
    if(idx > -1) this.players.splice(idx,1);
};

Settlement.prototype.registerBuilding = function(building){
    this.buildings.push(building);
    if(this.fort) this.fort.addBuilding(building);
    this.refreshListing();
};

Settlement.prototype.removeBuilding = function(building){
    for(var i = 0; i < this.buildings.length; i++){
        if(this.buildings[i].id == building.id) this.buildings.splice(i,1);
    }
    if(this.fort.id == building.id) this.fort = null;
};

Settlement.prototype.getBuildings = function(){
    return this.buildings.map(function(b){
        return b.listingTrim();
    });
};

Settlement.prototype.getBuildingMarkers = function(){
    return this.buildings.map(function(b){
        return {marker:'building',x:b.x,y:b.y,type:b.type};
    });
};

Settlement.prototype.registerFort = function(fort){
    this.fort = fort;
    // TODO: update fort when these values change
    this.fort.setProperty('population',this.pop);
    this.fort.setProperty('devlevel',this.level);
    this.fort.setProperty('danger',this.danger);
    this.respawnLocation = {
        x: GameServer.buildingsData[0].entry.x + this.fort.x,
        y: GameServer.buildingsData[0].entry.y + this.fort.y
    };
};

Settlement.prototype.getAOI = function(){
    return this.fort.getAOI();
};

Settlement.prototype.getFortGold = function(){
    return this.fort.getGold();
};

Settlement.prototype.takeFortGold = function(nb){
    this.fort.takeGold(nb);
};

Settlement.prototype.addToFort = function(item,nb){
    this.fort.giveItem(item,nb);
};
Settlement.prototype.takeFromFort = function(item,nb){
    this.fort.takeItem(item,nb);
};

Settlement.prototype.refreshListing = function(){
    if(!this.fort) return;
    this.fort.refreshListing();
};

Settlement.prototype.consumeFood = function(){
    if(!GameServer.isTimeToUpdate('foodConsumption')) return false;
    var consumption = Formulas.foodConsumption(this.pop);
    console.log(this.name, 'consuming', consumption, 'food');
    if (consumption) this.takeFromFort(GameServer.miscParameters.foodID, consumption);
    // No need to save, surplus will be recomputed upon loading settlement
    return (consumption > 0);
};

// Called whenever food amount changes and directly after all buildings are read
Settlement.prototype.computeFoodSurplus = function(){
    console.log('Computing food surplus...');
    var foodAmount = this.fort.getItemNb(GameServer.miscParameters.foodID);
    if(this.pop === undefined){
        console.warn('Undefined population for settlement',this.name);
        this.pop = 0;
    }
    var required = Formulas.computeRequiredFood(this.pop);
    var delta = foodAmount - required;
    console.log('delta = ',delta,'required=',required);
    this.surplus = Formulas.decimalToPct(delta/required);
    if(isNaN(this.surplus)){
        console.warn('NaN surplus for settlement',this.name);
        this.surplus = 0;
    }
    console.log('Surplus for ',this.name,':',this.surplus,'%');
    this.buildings.forEach(function(building){
        building.setProperty('foodsurplus',this.surplus);
    },this);
};

Settlement.prototype.computeFoodModifier = function(){
    // Not converted to % since not broadcast
    return Formulas.computeSettlementFoodModifier(Formulas.pctToDecimal(this.surplus));
};

Settlement.prototype.update = function(){
    if(!this.fort) return;

    var consumed = this.consumeFood();

    if(consumed) {
        this.computeFoodSurplus();

        this.players.forEach(function (p) {
            GameServer.players[p].applyFoodModifier(this.surplus);
        }, this);

        this.buildings.forEach(function (building) {
            building.computeProductivity();
        });
        this.refreshListing();
    }
};

Settlement.prototype.save = function(){
    if(!this.model) return;
    var _settlement = this;
    GameServer.SettlementModel.findById(this.model._id, function (err, doc) {
        if (err) throw err;

        doc.set(_settlement);
        doc.save(function (err) {
            if (err) throw err;
        });
    });
};

Settlement.prototype.trim = function(){
    var trimmed = {};
    var broadcastProperties = ['id','name','pop','surplus'];
    for(var p = 0; p < broadcastProperties.length; p++){
        trimmed[broadcastProperties[p]] = this[broadcastProperties[p]];
    }
    trimmed.buildings = this.buildings.map(function(building){
        return building.trim();
    });
    return trimmed;
};

// Trimming for the purpose of settlement selection
Settlement.prototype.selectionTrim = function(){
    var trimmed = {};
    var broadcastProperties = ['id','name','pop','surplus','desc','level'];
    for(var p = 0; p < broadcastProperties.length; p++){
        trimmed[broadcastProperties[p]] = this[broadcastProperties[p]];
    }
    trimmed.x = (this.fort.x-30)/World.worldWidth; // quick fix
    trimmed.y = (this.fort.y-10)/World.worldHeight;
    trimmed.buildings = this.buildings.length;
    return trimmed;
};

// Trimming for the purpose of fort map display
Settlement.prototype.mapTrim = function(){
    var trimmed = {};
    var broadcastProperties = ['name'];
    for(var p = 0; p < broadcastProperties.length; p++){
        trimmed[broadcastProperties[p]] = this[broadcastProperties[p]];
    }
    trimmed.x = this.fort.x;
    trimmed.y = this.fort.y;
    return trimmed;
};

module.exports.Settlement = Settlement;