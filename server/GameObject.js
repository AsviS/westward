/**
 * Created by Jerome on 26-12-16.
 */

var Utils = require('../shared/Utils.js').Utils;
var GameServer = require('./GameServer.js').GameServer;

// Parent class of all game objects : players, monsters and items (not NPC because they are not processed server-side)
function GameObject(){
    this.instance = -1;
}

GameObject.prototype.getShortID = function(){
    return this.entityCategory[0]+this.id;
};

GameObject.prototype.setOrUpdateAOI = function(){
    var previousAOI = (this.aoi !== undefined ? this.aoi : null);
    var newAOI = Utils.tileToAOI({x:this.x,y:this.y});
    if(!GameServer.AOIs.hasOwnProperty(newAOI)) console.warn('Wrong AOI',newAOI,'for coordinates',this.x,',',this.y);
    if(newAOI != previousAOI) {
        if(previousAOI !== null) GameServer.removeFromLocation(this);
        this.aoi = newAOI; // has to come after previous line
        GameServer.addAtLocation(this);
        GameServer.handleAOItransition(this, previousAOI);
        if(this.isPlayer) this.onAOItransition(newAOI,previousAOI);
    }
};

GameObject.prototype.isInVision = function(){
    return GameServer.vision.has(this.aoi);
};

GameObject.prototype.setProperty = function(property,value){
    // Updates a property of the object and update the AOI's around it
    //console.log(this.id+' sets '+property+' to '+value);
    this[property] = value;
    //if(this.id !== undefined) this.updateAOIs(property,value);
    this.updateAOIs(property,value);
};

GameObject.prototype.updateAOIs = function(property,value){
    // When something changes, all the AOI around the affected entity are updated
    var AOIs = Utils.listAdjacentAOIs(this.aoi);
    AOIs.forEach(function(aoi){
        GameServer.updateAOIproperty(aoi,this.updateCategory,this.id,this.instance,property,value);
    },this);
};

GameObject.prototype.isOfInstance = function(instance){
    return this.instance == instance;
};

GameObject.prototype.getAOI = function(){
    return this.aoi;
};

GameObject.prototype.save = function(){
    // if(!this.model) return;
    if(this.dblocked){
        console.log('db locked');
        return;
    }
    if(!this.isOfInstance(-1)) return;
    this.dblocked = true;
    var _document = this;
    this.schemaModel.findById(this.mongoID, function (err, doc) { // this.model._id
        if (err) throw err;
        if(doc === null){
            console.warn('Cannot save game object');
            return;
        }

        doc.set(_document);
        doc.save(function (err) {
            _document.dblocked = false;
            if(err) throw err;
            console.log(_document.entityCategory+' saved');
        });
    });
};

GameObject.prototype.trim = function(trimmed){
    trimmed.instance = this.instance;
    return trimmed;
};


module.exports.GameObject = GameObject;