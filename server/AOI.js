/**
 * Created by Jerome on 24-02-17.
 */

var UpdatePacket = require('./UpdatePacket.js').UpdatePacket;
var Utils = require('../shared/Utils.js').Utils;

function AOI(id){
    this.id = id;
    var origin = Utils.AOItoTile(this.id);
    this.x = origin.x;
    this.y = origin.y;
    this.entities = []; // list of entities situated within the area corresponding to this AOI; useful for synchronizing with new AOIs and as a form of quad-tree
    this.updatePacket = new UpdatePacket();
}

AOI.prototype.getUpdatePacket = function(){
    return (this.updatePacket ? this.updatePacket : null);
};

AOI.prototype.clear = function(){
    this.updatePacket = new UpdatePacket();
};

AOI.prototype.addEntity = function(entity){
    this.entities.push(entity);
};

AOI.prototype.deleteEntity = function(entity) {
    var idx = this.entities.indexOf(entity);
    if (idx >= 0) this.entities.splice( idx, 1 );
};

AOI.prototype.hasPlayer = function(){
    for(var i = 0; i < this.entities.length; i++){
        if(this.entities[i].isPlayer) return true;
    }
    return false;
};

AOI.prototype.hasBuilding = function(){
    for(var i = 0; i < this.entities.length; i++){
        if(this.entities[i].isBuilding) return true;
    }
    return false;
};

module.exports.AOI = AOI;