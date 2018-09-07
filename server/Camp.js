/**
 * Created by Jerome Renaux (jerome.renaux@gmail.com) on 03-09-18.
 */

var GameServer = require('./GameServer.js').GameServer;
var Utils = require('../shared/Utils.js').Utils;


function Camp(buildings,target){
    this.buildings = [];
    this.people = [];
    this.targetSettlement = target;

    buildings.forEach(function(hut){
        this.buildings.push(GameServer.addBuilding({
            x: hut.x,
            y: hut.y,
            sid: -1,
            type: 4,
            built: true
        }));
    },this);
}

Camp.prototype.update = function(){
    if(!GameServer.isTimeToUpdate('camps')) return;

    if(this.people.length < 10){ // TODO: variable camp parameter (size)
        var hut = Utils.randomElement(this.buildings);
        var pos = hut.getCenter();
        pos.y += 2;
        var civ = GameServer.addCiv(pos.x,pos.y);
        this.people.push(civ);
    }

    if(this.readyToRaid()) this.findTargets();
};

Camp.prototype.readyToRaid = function(){
    return this.people.length >= GameServer.civsParameters.raidMinimum;
};

Camp.prototype.findTargets = function(){
    var player = Utils.randomElement(GameServer.settlements[this.targetSettlement].players);
    if(!player) return;
    this.raid(player);
};

Camp.prototype.raid = function(player){
    for(var i = 0; i < 3; i++){ // TODO: config
        var civ = Utils.randomElementRemoved(this.people);
        if(!civ) break;
        civ.setTrackedTarget(player);
    }
};

Camp.prototype.remove = function(civ){
    for(var i = 0; i < this.people.length; i++){
        if(civ.id == this.people[i].id){
            this.people.splice(i,1);
            break;
        }
    }
};

Camp.prototype.getBuildingMarkers = function(){
    return this.buildings.map(function(b){
        return {
            marker:'building',
            x: b.x,
            y: b.y,
            type: b.type
        }
    });
};

module.exports.Camp = Camp;