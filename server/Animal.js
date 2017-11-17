/**
 * Created by Jerome on 09-10-17.
 */

var Utils = require('../shared/Utils.js').Utils;
var MovingEntity = require('./MovingEntity.js').MovingEntity;
var GameServer = require('./GameServer.js').GameServer;

function Animal(x,y,type){
    this.id = GameServer.lastAnimalID++;
    //this.setStartingPosition();
    this.x = x;
    this.y = y;
    this.type = type;
    this.idle = true;
    this.idleTime = 200;
    this.setOrUpdateAOI();
}

Animal.prototype = Object.create(MovingEntity.prototype);
Animal.prototype.constructor = Animal;

/*Animal.prototype.setStartingPosition = function(){
    this.x = Utils.randomInt(23,44);
    this.y = Utils.randomInt(1,16);
    console.log('Grrrr at ('+this.x+', '+this.y+')');
};*/

Animal.prototype.trim = function(){
    // Return a smaller object, containing a subset of the initial properties, to be sent to the client
    var trimmed = {};
    var broadcastProperties = ['id','path','type']; // list of properties relevant for the client
    for(var p = 0; p < broadcastProperties.length; p++){
        trimmed[broadcastProperties[p]] = this[broadcastProperties[p]];
    }
    trimmed.x = parseInt(this.x);
    trimmed.y = parseInt(this.y);
    return trimmed;
};

Animal.prototype.startIdle = function(){
    //console.log('['+this.constructor.name+' '+this.id+'] arrived at destination');
    this.idle = true;
    this.idleTime = Utils.randomInt(500,2999); //ms
};

Animal.prototype.updateIdle = function(){
    this.idleTime -= GameServer.server.npcUpdateRate;
    //console.log('['+this.constructor.name+' '+this.id+']',this.idleTime);
    if(this.idleTime <= 0){
        //console.log('['+this.constructor.name+' '+this.id+'] ready to move');
        var dest = this.findRandomDestination();
        var path = GameServer.findPath({x:this.x,y:this.y},dest);
        if(!path || path.length == 0){
            //console.log('['+this.constructor.name+' '+this.id+'] no path');
            this.idleTime = 200;
            return;
        }
        this.idle = false;
        this.setPath(path);
    }
};

Animal.prototype.findRandomDestination = function(){
    return {
        x: this.x + Utils.randomInt(-10,10),
        y: this.y + Utils.randomInt(-10,10)
    };
};

module.exports.Animal = Animal;