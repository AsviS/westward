/**
 * Created by Jerome on 26-12-16.
 */

function PersonalUpdatePacket(){
    this.items = [];
    this.stats = [];
    this.equipment = [];
    this.ammo = [];
    this.msgs = [];
}

PersonalUpdatePacket.prototype.isEmpty = function(){
    for(var field in this){
        if(!this.hasOwnProperty(field)) continue;
        if(this[field] && this[field].constructor.name == 'Array'){
            if(this[field].length > 0) return false;
        }else if(this[field] !== undefined){
            return false;
        }
    }
    return true;
};

PersonalUpdatePacket.prototype.clean = function() { // Remove empty arrays from the package
    for(var field in this){
        if(!this.hasOwnProperty(field)) continue;
        if(this[field] && this[field].constructor.name == 'Array'){
            if(this[field].length == 0) this[field] = undefined;
        }
    }
    return this;
};

PersonalUpdatePacket.prototype.updatePosition = function(x,y) {
    this.x = x;
    this.y = y;
};

PersonalUpdatePacket.prototype.updateGold = function(nb) {
    this.gold = nb;
};

PersonalUpdatePacket.prototype.addItem = function(item,nb){
    this.items.push([item,nb]);
};

PersonalUpdatePacket.prototype.addStat = function(stat){
    //this.stats.push({k:key,v:value});
    this.stats.push(stat);
};

PersonalUpdatePacket.prototype.addEquip = function(slot,subSlot,item){
    this.equipment.push({slot:slot,subSlot:subSlot,item:item});
};

PersonalUpdatePacket.prototype.addAmmo = function(slot,nb){
    this.ammo.push({slot:slot,nb:nb});
};

PersonalUpdatePacket.prototype.addMsg = function(msg){
    this.msgs.push(msg);
};

PersonalUpdatePacket.prototype.fightNotification = function(flag){
    this.fightStatus = flag;
};

module.exports.PersonalUpdatePacket = PersonalUpdatePacket;
