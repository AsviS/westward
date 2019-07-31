/**
 * Created by Jerome on 27-10-17.
 */
var GameServer = require('./GameServer.js').GameServer;
var Utils = require('../shared/Utils.js').Utils;
var GameObject = require('./GameObject.js').GameObject;
var Pathfinder = require('../shared/Pathfinder.js').Pathfinder;
var SpaceMap = require('../shared/SpaceMap.js').SpaceMap;

var TICK_RATE;

function Battle() {
    TICK_RATE = GameServer.battleParameters.tickRate; // milliseconds
    this.id = GameServer.lastBattleID++;
    this.fighters = []; // the fighter at position 0 is the one currently in turn
    this.teams = { // number of fighters of each 'team' involved in the fight
        'Animal': 0,
        'Civ': 0,
        'Player': 0
    };
    this.casualties = 0;
    //this.positions = new SpaceMap(); // positions occupied by fighters (obsolete?)
    this.cells = new SpaceMap(); // all the BattleCell objects, used for battle pathfinding

    this.pathFinder = new Pathfinder(this.cells, 99, false, false, true);

    this.ended = false;
    this.reset();
}

Battle.prototype.setCenter = function(x,y){
    this.center = {
        x: x,
        y:y
    };
};

Battle.prototype.start = function () {
    this.loop = setInterval(this.update.bind(this), TICK_RATE);
    this.newTurn();
};

Battle.prototype.update = function () {
    this.countdown -= TICK_RATE;
    if (this.countdown <= this.endTime) {
        this.endOfTurn();
        this.newTurn();
    }
};

Battle.prototype.endOfTurn = function () {
};

Battle.prototype.getFighterIndex = function (f) {
    for (var i = 0; i < this.fighters.length; i++) {
        if (this.fighters[i].getShortID() == f.getShortID()) return i;
    }
    return -1;
};

// Called by addFighter
/*Battle.prototype.checkConflict = function(f){
    var busy = this.positions.get(f.x,f.y);
    if(busy){
        console.log('busy cell for ',f.getShortID(),' with ',busy.getShortID(),' at ',f.x,f.y);
        if(!f.isPlayer){
            f.queueAction('move');
        }else if(!busy.isPlayer){
            busy.queueAction('move');
        }
    }
    this.addAtPosition(f);
};

Battle.prototype.addAtPosition = function(f){
    for(var i = 0; i < f.cellsWidth; i++){
        for(var j = 0; j < f.cellsHeight; j++){
            this.positions.add(f.x+i,f.y+j,f);
        }
    }
};

Battle.prototype.removeFromPosition = function(f){
    for(var i = 0; i < f.cellsWidth; i++){
        for(var j = 0; j < f.cellsHeight; j++){
            this.positions.delete(f.x+i,f.y+j);
        }
    }
};*/

Battle.prototype.addFighter = function (f) {
    //console.warn('Adding fighter ',f.getShortID());
    this.fighters.push(f);
    this.updateTimeline();
    //if(f.isMovingEntity) this.checkConflict(f);
    this.updateTeams(f.battleTeam, 1);
    f.xpPool = 0; // running total of XP that the fighter will receive at the end of the fight
    f.inFight = true;
    if (f.isMovingEntity) f.stopWalk();
    f.battle = this;
    if (f.isPlayer) f.notifyFight(true);
};

Battle.prototype.updateTimeline = function () {
    var order = this.getFightersOrder();
    var activeFighter = this.getActiveFighter();

    var data = {
        'order': order,
        'active': activeFighter.getShortID(),
        'countdown': this.countdown / 1000
    };

    this.fighters.forEach(function (f) {
        if (f.isPlayer) f.setOwnProperty('battleData', data);
    }, this);
};

Battle.prototype.getFightersOrder = function () {
    return this.fighters.map(function (f) {
        return f.getShortID();
    });
};

// Remove a fighter from the fight following his death
Battle.prototype.removeFighter = function (f) {
    var idx = this.getFighterIndex(f);
    if (idx == -1) return;
    var isTurnOf = this.isTurnOf(f);
    f.endFight(false); // false for not alive
    f.die();
    this.fighters.splice(idx, 1);
    this.updateTimeline();
    //if(f.isPlayer) this.removeFromPosition(f); // if NPC, leave busy for his body
    if (isTurnOf) this.setEndOfTurn(0);
    if (f.isPlayer){
        this.casualties++;
        f.notifyFight(false);
    }
    this.updateTeams(f.battleTeam, -1);
    this.checkSentience();
};

Battle.prototype.checkSentience = function () {
    var nbSentient = 0;
    this.fighters.forEach(function (f) {
        if (f.sentient) nbSentient++;
    });
    if (nbSentient == 0) this.end();
};

Battle.prototype.updateTeams = function (team, increment) {
    this.teams[team] += increment;
    if (this.teams[team] <= 0) {
        var nbAlive = 0;
        for (team in this.teams) {
            if (this.teams[team] > 0) nbAlive++;
        }
        if (nbAlive == 1) this.end();
    }
};

Battle.prototype.reset = function () {
    this.countdown = GameServer.battleParameters.turnDuration * 1000;
    this.endTime = 0;
    this.actionTaken = false;
};

Battle.prototype.newTurn = function () {
    if (this.ended) return;
    this.fighters.push(this.fighters.shift());
    this.updateTimeline();
    this.reset();
    console.log('[B' + this.id + '] New turn');

    var activeFighter = this.getActiveFighter();
    this.fighters.forEach(this.updateTimeline, this);

    console.log(activeFighter.getShortID() + '\'s turn');
    if (activeFighter.skipBattleTurn) {
        this.newTurn();
        return;
    }

    if (!activeFighter.isPlayer || activeFighter.isDummy) setTimeout(activeFighter.decideBattleAction.bind(activeFighter), 500);
};

Battle.prototype.getActiveFighter = function () {
    return this.fighters[0];
};

Battle.prototype.getFighterByID = function (id) {
    var map;
    switch (id[0]) {
        case 'P':
            map = GameServer.players;
            break;
        case 'A':
            map = GameServer.animals;
            break;
        case 'B':
            map = GameServer.buildings;
            break;
        case 'C':
            map = GameServer.civs;
            break;
    }
    return map[id.slice(1)];
};

Battle.prototype.getFighterByType = function (type) {
    for (var i = 0; i < this.fighters.length; i++) {
        if (this.fighters[i].getShortID()[0] == type) return this.fighters[i];
    }
    return null;
};

Battle.prototype.isTurnOf = function (f) {
    return (f.getShortID() == this.getActiveFighter().getShortID());
};

//TODO: What is f?  - Fighter ?

Battle.prototype.processAction = function (f, data) {
    if (!this.isTurnOf(f) || this.actionTaken) return;
    var result; // small object with result and delay fields, to indicat success and time to wait (for animations etc.)
    switch (data.action) {
        case 'attack':
            var target = this.getFighterByID(data.id);
            result = this.processAttack(f, target);
            break;
        case 'bomb':
            result = this.processAoE(f, data.x, data.y);
            break;
        case 'move':
            result = this.processMove(f);
            break;
        case 'pass':
            result = {delay: 100};
            break;
    }

    result = result || {};
    if (f.isPlayer && result.vigor) f.updateVigor(-result.vigor);
    this.setEndOfTurn(result.delay || 0);
};

Battle.prototype.setEndOfTurn = function (delay) {
    this.actionTaken = true;
    this.endTime = this.countdown - delay;
};

Battle.prototype.processMove = function (f) {
    return {delay: f.getPathDuration()};
};

Battle.prototype.isPosition = function (x, y) {
    return this.cells.has(x, y);
};

Battle.prototype.computeDamage = function (type, a, b) {
    var def = b.getStat('def').getValue();
    var dmg;
    switch (type) {
        case 'bomb':
            dmg = 100; // TODO: refine
            break;
        case 'melee':
            var atk = a.getStat('dmg').getValue();
            dmg = this.computeMeleeDamage(atk, def);
            break;
        case 'ranged':
            var atk = a.getStat('dmg').getValue();
            dmg = this.computeRangedDamage(atk, def);
            break;
    }
    return Utils.clamp(Math.ceil(dmg), GameServer.battleParameters.minDamage, GameServer.battleParameters.maxDamage);
};

// TODO: merge both
Battle.prototype.computeMeleeDamage = function (dmg, def) {
    var dmgRnd = dmg / 5;
    var defRnd = def / 5;
    dmg += Utils.randomInt(dmg - dmgRnd, dmg + dmgRnd);
    def += Utils.randomInt(def - defRnd, def + defRnd);
    return (10 * Math.pow(dmg, 0.5)) - (5 * Math.pow(def, 0.5));
};

Battle.prototype.computeRangedDamage = function (dmg, def) {
    var dmgRnd = dmg / 5;
    var defRnd = def / 5;
    dmg += Utils.randomInt(dmg - dmgRnd, dmg + dmgRnd);
    def += Utils.randomInt(def - defRnd, def + defRnd);
    return (10 * Math.pow(dmg, 0.5)) - (3 * Math.pow(def, 0.5));
};

Battle.prototype.computeRangedHit = function (a, b) {
    var dist = Utils.euclidean({
        x: a.x,
        y: a.y
    }, {
        x: b.x,
        y: b.y
    });
    var chance = Math.ceil(a.getStat('acc').getValue() - (dist * GameServer.battleParameters.rangePenalty));
    var rand = Utils.randomInt(0, 100);
    console.warn('computeRangedHit: ', a.getShortID(), a.getStat('acc').getValue(), dist, GameServer.battleParameters.rangePenalty);
    console.log('ranged hit : ', rand, chance);
    return rand < chance;
};

Battle.prototype.computeTOF = function (a, b, type) {
    var speeds = {
        'throwable': GameServer.battleParameters.arrowSpeed,
        'arrow': GameServer.battleParameters.arrowSpeed,
        'bomb': GameServer.battleParameters.bombSpeed
    };
    var shootingPoint = a.getShootingPoint(); // Expected unit: tiles
    return (Utils.euclidean(shootingPoint, b) / speeds[type]) * 1000;
};

Battle.prototype.applyDamage = function (f, dmg) {
    f.applyDamage(-dmg);
    if (f.getHealth() == 0) {
        if (f.xpReward) this.rewardXP(f.xpReward);
        this.removeFighter(f);
        return true;
    }
    return false;
};

Battle.prototype.processAoE = function (f, tx, ty) {
    // TODO: integrate to processAttack?
    if (!f.hasItem(4, 1)) return false;
    f.takeItem(4, 1);
    var launchDelay = 100;
    var tof = this.computeTOF(f, {x: tx, y: ty}, 'bomb');
    var delay = launchDelay + tof;
    f.setProperty('animation', {
        name: 'explosion',
        sound: 'bomb',
        x: tx,
        y: ty,
        delay: delay
    });
    f.setProperty('bomb_atk',
        {
            x: tx,
            y: ty,
            delay: launchDelay,
            duration: tof
        });
    var rect = {
        x: tx - 1,
        y: ty - 1,
        w: 3,
        h: 3
    };
    var damages = [];
    this.fighters.forEach(function (f) {
        if (Utils.overlap(rect, f.getRect())) {
            var dmg = this.computeDamage('bomb', null, f);
            damages.push([f, dmg]);
            f.setProperty('hit', {
                dmg: dmg,
                delay: delay
            }); // for the flash and hp display
        }
    }, this);
    delay += 100;
    setTimeout(function () {
        damages.forEach(function (d) {
            var f = d[0];
            var killed = this.applyDamage(f, d[1]);
            if (killed && f.isPlayer) f.addNotif(f.name + ' killed');
        }, this);
    }.bind(this), delay);
    return {
        delay: delay,
        vigor: 1 // TODO: conf + vary
    };
};

Battle.prototype.processAttack = function (attacker, target) {
    console.log('Processing attack');
    var delay = 0;
    var damage = 0;
    var killed = false;
    if (!target || target.isDead()) return false;
    if (Utils.nextTo(attacker, target)) {
        delay = GameServer.battleParameters.meleeAtkDelay;
        attacker.setProperty('melee_atk', {x: target.x, y: target.y}); // for the attack animation of attacker
        damage = this.computeDamage('melee', attacker, target);
        var pos = Utils.relativePosition(attacker, target);
        attacker.setProperty('animation', {
            name: 'sword',
            x: attacker.x + (pos.x * 0.5) + (pos.x > 0 ? attacker.cellsWidth : 0),
            y: attacker.y + (pos.y * 0.5) + (pos.y > 0 ? attacker.cellsHeight : 0)
        });
        target.setProperty('hit', {
            dmg: damage,
            delay: 0
        }); // for the flash and hp display
    } else {
        if (!attacker.canRange()) return false;
        var fireDelay = GameServer.battleParameters.rangedAtkDelay; // duration of character firing animation
        var tof = this.computeTOF(attacker, target, 'arrow');
        delay = fireDelay + tof;
        var c = target.getTargetCenter();
        attacker.setProperty('ranged_atk',
            {
                x: c.x,
                y: c.y,
                delay: fireDelay,
                duration: tof
            }); // Character aimation + arrow; coordinates are to determine which direction to face
        var ammoID = attacker.decreaseAmmo();
        var hit = this.computeRangedHit(attacker, target);
        console.log('hit:', hit);
        if (hit) {
            if (target.isNPC && ammoID > -1) target.addToLoot(ammoID, 1);
            damage = this.computeDamage('ranged', attacker, target);
            attacker.setProperty('animation', {
                name: 'sword',
                x: c.x,
                y: c.y,
                delay: delay
            });
            target.setProperty('hit', {
                dmg: damage,
                delay: delay
            });
        } else { // miss
            target.setProperty('rangedMiss', {delay: delay});
        }
    }
    setTimeout(function () {
        // console.log('computing outcome');
        killed = this.applyDamage(target, damage);
        if (killed && attacker.isPlayer) attacker.addNotif(target.name + ' ' + (target.isBuilding ? 'destroyed' : 'killed'));
        if (killed && attacker.isCiv && target.isPlayer) attacker.talk('killed_foe');
        if (target.isCiv && attacker.isPlayer) {
            if (killed) {
                target.talk('self_falls');
                var comrade = this.getFighterByType('C');
                if (comrade) comrade.talk('comrade_falls');
            } else {
                target.talk('hit');
            }
        }
        // console.log('done with outcome');
    }.bind(this), delay);
    return {
        delay: delay,
        vigor: 1 // TODO: conf + vary
    };
};

Battle.prototype.findPath = function (from, to) {
    return this.pathFinder.findPath(from, to);
};

// Called each time a fighter dies, add its XP to the running total
Battle.prototype.rewardXP = function (xp) {
    this.fighters.forEach(function (f) {
        if (f.isPlayer) f.xpPool += xp;
    })
};

// Entites are only removed when the battle is over ; battlezones are only cleared at that time
Battle.prototype.end = function () {
    this.ended = true;
    clearInterval(this.loop);
    this.fighters.forEach(function (f) {
        f.endFight(true); // true for alive
        if (f.isPlayer) f.notifyFight(false);
    });
    this.cleanUp();
    GameServer.addMarker((this.casualties ? 'death' : 'conflict'),this.center.x,this.center.y);
    console.log('[B' + this.id + '] Ended');
};

Battle.prototype.cleanUp = function () {
    this.getCells().forEach(function (cell) {
        GameServer.removeBattleCell(cell.v);
    }, this);
};

Battle.prototype.getCells = function () {
    return this.cells.toList();
};

module.exports.Battle = Battle;

function BattleCell(x, y, battle) {
    this.instance = -1;
    this.updateCategory = 'cells';
    this.entityCategory = 'Cell';
    this.id = GameServer.lastCellID++;
    this.x = x;
    this.y = y;
    this.cellsWidth = 1;
    this.cellsHeight = 1;
    this.battle = battle;
    this.setOrUpdateAOI();
}

BattleCell.prototype = Object.create(GameObject.prototype);
BattleCell.prototype.constructor = BattleCell;

BattleCell.prototype.getRect = function () {
    return {
        x: this.x,
        y: this.y,
        w: 1,
        h: 1
    }
};

BattleCell.prototype.getShortID = function () {
    return 'btl' + this.id;
};

BattleCell.prototype.trim = function () {
    return {
        id: this.id,
        x: this.x,
        y: this.y,
        instance: this.instance
    };
};

BattleCell.prototype.getBattleAreaAround = function (cells) {
    cells = cells || new SpaceMap();
    for (var x = this.x - 1; x <= this.x + this.w; x++) {
        for (var y = this.y - 1; y <= this.y + this.h; y++) {
            if (!GameServer.checkCollision(x, y)) cells.add(x, y);
        }
    }
    return cells;
};

BattleCell.prototype.getLocationCenter = function () {
    return {
        x: this.x,
        y: this.y
    };
};

BattleCell.prototype.remove = function () {};

BattleCell.prototype.canFight = function () {
    return false;
};
BattleCell.prototype.isAvailableForFight = function () {
    return false;
};

module.exports.BattleCell = BattleCell;
