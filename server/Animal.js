/**
 * Created by Jerome on 09-10-17.
 */

var Utils = require('../shared/Utils.js').Utils;
var PFUtils = require('../shared/PFUtils.js').PFUtils;
var MovingEntity = require('./MovingEntity.js').MovingEntity;
var GameServer = require('./GameServer.js').GameServer;
var World = require('../shared/World.js').World;
var Stats = require('../shared/Stats.js').Stats;

var debug = false;

function Animal(x,y,type){
    this.id = GameServer.lastAnimalID++;
    this.isPlayer = false;
    this.isAnimal = true;
    //this.setStartingPosition();
    this.x = x;
    this.y = y;
    this.inFight = false;
    this.actionQueue = [];
    this.type = type;
    this.idle = true;
    this.idleTime = 200;
    this.stats = Stats.getSkeleton();
    this.setAggressive();
    this.setStartingStats();
    this.setOrUpdateAOI();
}

Animal.prototype = Object.create(MovingEntity.prototype);
Animal.prototype.constructor = Animal;

Animal.prototype.setStartingStats = function(){
    var stats = GameServer.animalsData[this.type].stats;
    for(var s in stats){
        if(!stats.hasOwnProperty(s)) return;
        this.setStat(s,stats[s]);
    }
};

Animal.prototype.setStat = function(key,value){
    this.getStat(key).setBaseValue(value);
};

Animal.prototype.setAggressive = function(){
    this.aggressive =  GameServer.animalsData[this.type].aggro;
};

Animal.prototype.isAggressive = function(){
    return this.aggressive;
};

Animal.prototype.setSpawnZone = function(zone){
    this.spawnZone = zone;
};

Animal.prototype.trim = function(){
    // Return a smaller object, containing a subset of the initial properties, to be sent to the client
    var trimmed = {};
    var broadcastProperties = ['id','path','type','inFight','battlezone','dead']; // list of properties relevant for the client
    for(var p = 0; p < broadcastProperties.length; p++){
        trimmed[broadcastProperties[p]] = this[broadcastProperties[p]];
    }
    trimmed.x = parseInt(this.x);
    trimmed.y = parseInt(this.y);
    return trimmed;
};

Animal.prototype.endFight = function(){
    MovingEntity.prototype.endFight.call(this);
    this.setIdle();
};

Animal.prototype.onEndOfPath = function(){
    //console.log('['+this.constructor.name+' '+this.id+'] arrived at destination');
    MovingEntity.prototype.onEndOfPath.call(this);
    if(this.inFight) return;
    this.setIdle();
};

Animal.prototype.setIdle = function(){
    this.idle = true;
    this.idleTime = Utils.randomInt(1000,3500); //ms
};

Animal.prototype.updateIdle = function(){
    if(this.inFight) return;
    this.idleTime -= GameServer.npcUpdateRate;
    if(this.idleTime <= 0){
        var success = this.goToDestination(this.findRandomDestination());
        if(!success) this.idleTime = 200;
    }
};

Animal.prototype.canRange = function(){
    return true;
};

Animal.prototype.isInBuilding = function(){
    return false;
};

Animal.prototype.findRandomDestination = function(){
    return {
        x: Utils.clamp(this.x + Utils.randomInt(-5,5),0,World.worldWidth),
        y: Utils.clamp(this.y + Utils.randomInt(-5,5),0,World.worldHeight)
    };
};

Animal.prototype.goToDestination = function(dest){
    var path = GameServer.findPath({x:this.x,y:this.y},dest);
    if(!path || path.length <= 1) return false;
    var trim = PFUtils.trimPath(path,GameServer.battleCells);
    //console.log('trimmed:',trim.trimmed);
    path = trim.path;
    if(debug) console.log('['+this.constructor.name+' '+this.id+'] Found path of length '+path.length);
    this.idle = false;
    this.setPath(path);
    return true;
};

Animal.prototype.queueAction = function(action){
    this.actionQueue.push(action);
};

Animal.prototype.decideBattleAction = function(){
    if(!this.inFight) return;
    var action = this.actionQueue.shift();
    if(!action) action = 'attack';
    var target = this.selectTarget(); // TODO: keep current target
    // TODO: if target kept or assigned, check for existence
    var data;
    switch(action){
        case 'attack':
            data = this.attackTarget(target);
            break;
        case 'move':
            data = this.findFreeCell();
            if(data.action == 'pass') this.queueAction('move');
            break;
    }
    this.battle.processAction(this,data);
};

Animal.prototype.findFreeCell = function(){
    var pos = {x:this.x,y:this.y};
    var list = this.battle.getCells(); //{x,y,v} objects
    list.sort(function(a,b){
        if(Utils.manhattan(a,pos) < Utils.manhattan(b,pos)) return -1;
        return 1;
    });
    for(var i = 0; i < list.length; i++){
        var cell = list[i];
        if(this.battle.isPositionFree(cell.x,cell.y)) return this.findBattlePath(cell);
    }
    return {
        action: 'pass'
    };
};

Animal.prototype.findBattlePath = function(dest){
    var data = {};
    var path = GameServer.findPath({x: this.x, y: this.y}, dest,this.battle.PFgrid);
    if(path.length > 0){
        this.setPath(path);
        data.action = 'move';
    }else{
        console.log('Combat path of length 0');
        data.action = 'pass';
    }
    return data;
};

Animal.prototype.attackTarget = function(target){
    var data = {};
    if(this.battle.nextTo(this,target)){
        data.action = 'attack';
        data.id = target.getShortID();
    }else{
        var dest = this.computeBattleDestination(target);
        if(dest) {
            data = this.findBattlePath(dest);
        }else{
            data.action = 'pass';
        }
    }
    return data;
};

Animal.prototype.selectTarget = function(){
    var fighters = this.battle.fighters;
    var minHP = 9999;
    var currentTarget = null;
    for(var i = 0; i < fighters.length; i++){
        var f = fighters[i];
        if(!f.isPlayer) continue;
        if(f.getHealth() < minHP){
            minHP = f.getHealth();
            currentTarget = f;
        }
    }
    //console.log('Selected target ',currentTarget.getShortID());
    return currentTarget;
};

Animal.prototype.computeBattleDestination = function(target){
    var dest = target.getEndOfPath();
    var closest = null;
    var minDist = 9999;
    //console.log('target : ',dest.x,dest.y);
    for(var x = Math.min(this.x,dest.x-1); x <= Math.max(this.x,dest.x+1); x++){
        for(var y = Math.min(this.y,dest.y-1); y <= Math.max(this.y,dest.y+1); y++) {
            if(x == dest.x && y == dest.y) continue;
            if(!this.battle.isPosition(x,y)) continue;
            if(!this.battle.isPositionFree(x,y)) continue;
            if(PFUtils.checkCollision(x,y)) continue;
            if(!this.inBattleRange(x,y)) continue;

            if(this.battle.nextTo({x:x,y:y},dest)) return {x:x,y:y};

            var dist = Utils.euclidean({x:x,y:y},{x:dest.x,y:dest.y});
            if(dist < minDist){
                minDist = dist;
                closest = {x:x,y:y};
            }
        }
    }
    if(closest == null) console.log('not found');
    return closest;
};

Animal.prototype.checkForHostiles = function(){
    if(!this.isAggressive()) return;
    if(this.isInFight()) return;
    var AOIs = Utils.listAdjacentAOIs(this.aoi);
    for(var i = 0; i < AOIs.length; i++){
        var aoi = GameServer.AOIs[AOIs[i]];
        for(var j = 0; j < aoi.entities.length; j++) {
            var entity = aoi.entities[j];
            if(!entity.isPlayer) continue;
            if(!entity.isAvailableForFight()) continue;
            if(Utils.euclidean(this,entity) < 10){
                console.log(this.getShortID(),'spots',entity.getShortID());
                if(entity.isInFight()){
                    this.goToDestination(entity);
                }else {
                    GameServer.handleBattle(entity, this, true);
                }
                break;
            }
        }
    }
};

Animal.prototype.isAvailableForFight = function(){
    //return (!this.isDead() && !this.isMoving());
    return (!this.isDead());
};

Animal.prototype.die = function(){
    MovingEntity.prototype.die.call(this);
    this.spawnZone.decrement(this.type);
};

Animal.prototype.remove = function(){
    if(this.battle) this.battle.removeFighter(this);
    delete GameServer.animals[this.id];
};

module.exports.Animal = Animal;