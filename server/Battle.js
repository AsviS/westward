/**
 * Created by Jerome on 27-10-17.
 */
var GameServer = require('./GameServer.js').GameServer;
var Utils = require('../shared/Utils.js').Utils;
var PFUtils = require('../shared/PFUtils.js').PFUtils;

var TURN_DURATION = 5; // 30

function Battle(f1,f2){
    this.id = GameServer.lastBattleID++;
    this.fighters = [f2,f1]; // the fighter at position 0 is the one currently in turn
    this.area = []; // array of rectangular areas
    this.countdown = null;
    this.flagNextTurn = false;
    this.start();
}

Battle.prototype.start = function(){
    console.log('battle start');
    this.computeArea();
    var _battle = this;
    this.fighters.forEach(function(f){
        f.setProperty('inFight',true);
        f.stopWalk();
        f.battle = _battle;
    });
    this.loop = setInterval(this.update.bind(this),1000);
    this.newTurn();
};

Battle.prototype.newTurn = function(){
    this.fighters.push(this.fighters.shift());
    this.countdown = TURN_DURATION;
    this.flagNextTurn = false;
    //console.log('[B'+this.id+'] It is now '+(this.fighters[0].constructor.name)+'\'s turn');

    for(var i = 0; i < this.fighters.length; i++){
        var f = this.fighters[i];
        if(f.constructor.name == 'Player') {
            if(i == 0) f.updatePacket.remainingTime = this.countdown;
            f.updatePacket.activeID = this.getActiveFighter().getShortID();
        }
    }
};

Battle.prototype.update = function(){
    //console.log('[B'+this.id+'] Updating');
    this.countdown--;
    if(this.flagNextTurn || this.countdown == 0) this.newTurn();
};

Battle.prototype.getActiveFighter = function(){
    return this.fighters[0];
};

Battle.prototype.getFighterByID = function(id){
    var map;
    switch(id[0]){
        case 'P':
            map = GameServer.players;
            break;
        case 'A':
            map = GameServer.animals;
            break;
    }
    return map[id.slice(1)];
};

Battle.prototype.isTurnOf = function(f){
    return (f.getShortID() == this.getActiveFighter().getShortID());
};

Battle.prototype.processAction = function(player,data){
    if(this.flagNextTurn || !this.isTurnOf(player)) return;
    var success;
    switch(data.action){
        case 'move':
            success = this.processMove(player,data.x,data.y);
            break;
        case 'attack':
            var target = this.getFighterByID(data.id);
            success = this.processAttack(player,target);
            break;
    }
    if(success) this.flagNextTurn = true;
};

Battle.prototype.processMove = function(f,x,y){
    var dist = Utils.euclidean({
        x: f.x,
        y: f.y
    },{
        x: x,
        y: y
    });
    if(dist <= PFUtils.battleRange) {
        f.setPath(GameServer.findPath({x:f.x,y:f.y},{x:x,y:y}));
        return true;
    }
    return false;
};

Battle.prototype.nextTo = function(a,b){
    var dx = Math.abs(a.x - b.x);
    var dy = Math.abs(a.y - b.y);
    return (dx <= 1 && dy <= 1);
};

Battle.prototype.processAttack = function(a,b){
    if(this.nextTo(a,b)){
        console.log('melee attack');
        b.setProperty('meleeHit',true);
    }else{
        console.log('ranged attack');
    }
};

Battle.prototype.end = function(){
    clearInterval(this.loop);
    this.fighters.forEach(function(f){
        f.setProperty('inFight',false);
        f.setProperty('battlezone',[]);
        f.battle = null;
    });
    console.log('[B'+this.id+'] Ended');
    // TODO: respawn if quitting battle by disconnecting
};

Battle.prototype.computeArea = function(){
    var f1 = this.fighters[1];
    var f2 = this.fighters[0]; // TODO: generalize to more fighters

    var tl = {x: null, y: null};
    if (f1.x <= f2.x && f1.y <= f2.y) {
        tl.x = f1.x;
        tl.y = f1.y;
    } else if (f1.x <= f2.x && f1.y > f2.y) {
        tl.x = f1.x;
        tl.y = f2.y;
    }else if(f1.x > f2.x && f1.y <= f2.y){
        tl.x = f2.x;
        tl.y = f1.y;
    }else if(f1.x > f2.x && f1.y > f2.y){
        tl.x = f2.x;
        tl.y = f2.y;
    }

    if(f1.x == f2.x) tl.x -= 1;
    if(f1.y == f2.y) tl.y -= 1;

    tl.x -= 1;
    tl.y -= 1;

    var w = Math.max(Math.abs(f1.x - f2.x)+3,3);
    var h = Math.max(Math.abs(f1.y - f2.y)+3,3);

    this.area.push({
        x: tl.x,
        y: tl.y,
        w: w,
        h: h
    });

    var area = this.area;
    this.fighters.forEach(function(f){
        f.setProperty('battlezone',area);
    });
};

module.exports.Battle = Battle;