/**
 * Created by Jerome on 20-09-17.
 */
var fs = require('fs');
var pathmodule = require('path');
var clone = require('clone'); // used to clone objects, essentially used for clonick update packets
var ObjectId = require('mongodb').ObjectID;

var GameServer = {
    lastPlayerID: 0,
    lastBuildingID: 0,
    lastAnimalID: 0,
    lastBattleID: 0,
    lastCellID: 0,
    players: {}, // player.id -> player
    animals: {}, // animal.id -> animal
    buildings: {}, // building.id -> building
    socketMap: {}, // socket.id -> player.id
    nbConnectedChanged: false,
    initializationTicks: 0,
    requiredTicks: 2, // required number of initialization ticks
    initialized: false
};

module.exports.GameServer = GameServer;

var World = require('../shared/World.js').World;
var Utils = require('../shared/Utils.js').Utils;
var SpaceMap = require('../shared/SpaceMap.js').SpaceMap;
//var ListMap = require('../shared/ListMap.js').ListMap;
var AOI = require('./AOI.js').AOI;
var Player = require('./Player.js').Player;
var Settlement = require('./Settlement').Settlement;
var Building = require('./Building.js').Building;
var Animal = require('./Animal.js').Animal;
var Battle = require('./Battle.js').Battle;
var BattleCell = require('./Battle.js').BattleCell;
var PF = require('../shared/pathfinding.js');
var PFUtils = require('../shared/PFUtils.js').PFUtils;

GameServer.updateStatus = function(){
    GameServer.initializationTicks++;
    if(GameServer.initializationTicks == GameServer.requiredTicks) GameServer.initialized = true;
};

GameServer.readMap = function(mapsPath){
    GameServer.mapsPath = mapsPath; // TODO remove, useless, debug
    console.log('Loading map data from '+mapsPath);
    var masterData = JSON.parse(fs.readFileSync(mapsPath+'/master.json').toString());
    World.readMasterData(masterData);

    GameServer.AOIs = []; // Maps AOI id to AOI object
    GameServer.dirtyAOIs = new Set(); // Set of AOI's whose update package have changes since last update; used to avoid iterating through all AOIs when clearing them

    for(var i = 0; i <= World.lastChunkID; i++){
        GameServer.AOIs.push(new AOI(i));
    }

    PFUtils.setup(GameServer);
    GameServer.collisions.fromList(JSON.parse(fs.readFileSync(pathmodule.join(mapsPath,'collisions.json')).toString()));

    GameServer.startArea = {
        minx: 523, //537,
        maxx: 537, //543,
        miny: 655, //690,
        maxy: 661 //694
    };

    GameServer.battleCells = new SpaceMap();
    GameServer.itemsData = JSON.parse(fs.readFileSync('./assets/data/items.json').toString());
    GameServer.animalsData = JSON.parse(fs.readFileSync('./assets/data/animals.json').toString());

    // Settlements
    GameServer.settlements = {};
    GameServer.settlements[0] = new Settlement(0,'New Beginning',12);

    // Read buildings
    GameServer.buildingsData = JSON.parse(fs.readFileSync('./assets/data/buildings.json').toString());
  GameServer.server.db.collection('buildings').find({}).toArray(function(err,buildings){
        if(err) throw err;
        for(var i = 0; i < buildings.length; i++){
            var data = buildings[i];
            var building = new Building(data);
            GameServer.buildings[building.id] = building;
        }
        GameServer.updateStatus();
        GameServer.updateSettlements();
    });

    // Spawn animals
    var animals = JSON.parse(fs.readFileSync('./assets/maps/animals.json').toString());
    for(var i = 0; i < 10; i++){ // animals.list.length
        //var data = animals.list[i];
        var x = Utils.randomInt(GameServer.startArea.minx,GameServer.startArea.maxx);
        var y = Utils.randomInt(GameServer.startArea.miny,GameServer.startArea.maxy);
        if(PFUtils.checkCollision(x,y)) continue;
        //var animal = new Animal(data.x,data.y,data.type);
        GameServer.addAnimal(x,y,0);
    }

    GameServer.updateStatus();
    console.log('[Master data read, '+GameServer.AOIs.length+' aois created]');

    // For debugging purposes:
    var dummySocket = {
        id: 0,
        emit: function(){}
    };
    var player = GameServer.addNewPlayer(dummySocket,531,660);

    var animal = GameServer.addAnimal(536,660,0);
    animal.idle = false;
    animal = GameServer.addAnimal(536,660,0);
    animal.idle = false;

    setTimeout(function(){
        GameServer.handleBattle(player,animal);
    },1000);
};

GameServer.addAnimal = function(x,y,type){
    var animal = new Animal(x,y,type);
    GameServer.animals[animal.id] = animal;
    return animal;
};

GameServer.setUpdateLoops = function(){
    var clientUpdateRate = 1000/5; // Rate at which update packets are sent
    var walkUpdateRate = 1000/20; // Rate at which positions are updated
    GameServer.npcUpdateRate = 1000/5;
    var settlementUpdateRate = 60*1000;
    var playerUpdateRate = 60*1000;

    setInterval(GameServer.updateNPC,GameServer.npcUpdateRate);
    setInterval(GameServer.updateWalks,walkUpdateRate);
    setInterval(GameServer.updateClients,clientUpdateRate);
    setInterval(GameServer.updateSettlements,settlementUpdateRate);
    setInterval(GameServer.updatePlayers,playerUpdateRate);
};

GameServer.getPlayer = function(socketID){
    return GameServer.socketMap.hasOwnProperty(socketID) ? GameServer.players[GameServer.socketMap[socketID]] : null;
};

/*GameServer.checkSocketID = function(id){ // check if no other player is using same socket ID
    return (GameServer.getPlayerID(id) === undefined);
};

GameServer.checkPlayerID = function(id){ // check if no other player is using same player ID
    return (GameServer.players[id] === undefined);
};*/

GameServer.addNewPlayer = function(socket,x,y){ // todo: remove x and y (debug)
    var player = new Player();
    if(x){ // todo: remove (debug)
        player.x = x;
        player.y = y;
    }else {
        player.setStartingPosition();
    }
    player.setStartingInventory();
    var document = player.dbTrim();
    GameServer.server.db.collection('players').insertOne(document,function(err){
        if(err) throw err;
        var mongoID = document._id.toString(); // The Mongo driver for NodeJS appends the _id field to the original object reference
        player.setIDs(mongoID,socket.id);
        GameServer.finalizePlayer(socket,player);
        GameServer.server.sendID(socket,mongoID);
    });
    return player;
};

GameServer.loadPlayer = function(socket,id){
    GameServer.server.db.collection('players').findOne({_id: new ObjectId(id)},function(err,doc){
        if(err) throw err;
        if(!doc) {
            //GameServer.server.sendError(socket);
            console.log('ERROR : no matching document');
            GameServer.addNewPlayer(socket);
            return;
        }
        var player = new Player();
        var mongoID = doc._id.toString();
        player.setIDs(mongoID,socket.id);
        player.getDataFromDb(doc);
        GameServer.finalizePlayer(socket,player);
    });
};

GameServer.finalizePlayer = function(socket,player){
    GameServer.players[player.id] = player;
    GameServer.socketMap[socket.id] = player.id;
    GameServer.server.sendInitializationPacket(socket,GameServer.createInitializationPacket(player.id));
    GameServer.nbConnectedChanged = true;
    player.setOrUpdateAOI(); // takes care of adding to the world as well
    player.registerPlayer();
    console.log(GameServer.server.getNbConnected()+' connected');
};

GameServer.createInitializationPacket = function(playerID){
    // Create the packet that the client will receive from the server in order to initialize the game
    return {
        player: GameServer.players[playerID].initTrim(), // info about the player
        nbconnected: GameServer.server.getNbConnected()
    };
    // No need to send list of existing players, GameServer.handleAOItransition() will look for players in adjacent AOIs
    // and add them to the "newplayers" array of the next update packet
};

GameServer.handleDisconnect = function(socketID){
    console.log('disconnect');
    var player = GameServer.getPlayer(socketID);
    if(!player) return;
    GameServer.removeEntity(player);
    delete GameServer.socketMap[socketID];
    GameServer.nbConnectedChanged = true;
};

GameServer.removeEntity = function(entity){
    GameServer.removeFromLocation(entity);
    var AOIs = Utils.listAdjacentAOIs(entity.aoi);
    AOIs.forEach(function(aoi){
        GameServer.removeObjectFromAOI(aoi,entity);
    });

    var arr;
    switch(entity.constructor.name){
        case 'Player':
            arr = GameServer.players;
            break;
        case 'Animal':
            arr = GameServer.animals;
            break;
    }
    if(arr) delete arr[entity.id];
    if(entity.canFight() && entity.battle) entity.battle.removeFighter(entity);
};

GameServer.getAOIAt = function(x,y){
    return GameServer.AOIs[Utils.tileToAOI({x:x,y:y})];
};

GameServer.addAtLocation = function(entity){
    // Add some entity to all the data structures related to position (e.g. the AOI)
    GameServer.AOIs[entity.aoi].addEntity(entity,null);
    // the "entities" of an AOI list what entities are present in it; it's distinct from adding and object to an AOI
    // using GameServer.addObjectToAOI(), which actually adds the object to the update packages so that it can be created by
    // the clients (addObjectToAOI is called by GameServer.handleAOItransition)
    // Entities are needed when moving and new AOIs are added to neighborhood
};

GameServer.removeFromLocation = function(entity){
    // Remove an entity from all data structures related to position (spaceMap and AOI)
    GameServer.AOIs[entity.aoi].deleteEntity(entity);
};

GameServer.handleChat = function(data,socketID){
    var player = GameServer.getPlayer(socketID);
    player.setChat(data);
};

GameServer.findPath = function(from,to,grid){
    if(PFUtils.checkCollision(to.x,to.y)) return null;
    grid = grid || GameServer.PFgrid;
    //console.log('pathfinding from ',from.x,from.y,' to ',to.x,to.y);
    var path = GameServer.PFfinder.findPath(from.x, from.y, to.x, to.y, grid);
    PF.reset();
    return path;
};

GameServer.handleAnimalClick = function(animalID,socketID){
    var player = GameServer.getPlayer(socketID);
    var animal = GameServer.animals[animalID];
    if(animal.isDead()){
        console.log('skinning');
    }else if(!animal.isInFight()){
        GameServer.handleBattle(player,animal);
    }
};

GameServer.handleBattle = function(player,animal){
    if(player.isInFight()) return;
    if(animal.isMoving()) return;
    if(animal.isDead()) return;
    // TODO: check for proximity
    var area = GameServer.computeBattleArea(player,animal);
    if(!GameServer.checkAreaIntegrity(area)){
        console.log('#!');
        player.addMsg('There is an obstacle in the way!');
        return;
    }
    var battle = GameServer.checkBattleOverlap(area);
    if(!battle) battle = new Battle();
    battle.addFighter(player);
    battle.addFighter(animal);
    battle.addArea(area);
    battle.start();
};

GameServer.checkAreaIntegrity = function(area){
    var cells = new SpaceMap();
    for(var x = area.x; x <= area.x+area.w; x++){
        for(var y = area.y; y <= area.y+area.h; y++){
            if(!PFUtils.checkCollision(x,y)) cells.add(y,x,0); // y then x
        }
    }
    var grid = new PF.Grid(0,0);
    PFUtils.setGridUp(grid,cells,true);
    var path = GameServer.findPath(area,{x:area.x+area.w,y:area.y+area.h},grid);
    return (path && path.length > 0);
};

GameServer.computeBattleArea = function(f1,f2){
    var pos1 = f1.getEndOfPath();
    var pos2 = f2.getEndOfPath();

    var tl = {x: null, y: null};
    if (pos1.x <= pos2.x && pos1.y <= pos2.y) {
        tl.x = pos1.x;
        tl.y = pos1.y;
    } else if (pos1.x <= pos2.x && pos1.y > pos2.y) {
        tl.x = pos1.x;
        tl.y = pos2.y;
    }else if(pos1.x > pos2.x && pos1.y <= pos2.y){
        tl.x = pos2.x;
        tl.y = pos1.y;
    }else if(pos1.x > pos2.x && pos1.y > pos2.y){
        tl.x = pos2.x;
        tl.y = pos2.y;
    }

    if(pos1.x == pos2.x) tl.x -= 1;
    if(pos1.y == pos2.y) tl.y -= 1;

    tl.x -= 1;
    tl.y -= 1;

    var w = Math.max(Math.abs(pos1.x - pos2.x)+3,3);
    var h = Math.max(Math.abs(pos1.y - pos2.y)+3,3);

    return {
        x: tl.x,
        y: tl.y,
        w: w,
        h: h
    };
};

GameServer.checkBattleOverlap = function(area){
    for(var x = area.x; x < area.x+area.w; x++){
        for(var y = area.y; y < area.y+area.h; y++){
            var cell = GameServer.battleCells.get(x,y);
            if(cell) return cell.battle;
        }
    }
    return null;
};

GameServer.checkForFighter = function(AOIs){
    AOIs.forEach(function(id){
        var aoi = GameServer.AOIs[id];
        aoi.entities.forEach(function(e){
            GameServer.checkForBattle(e);
        });
    });
};

GameServer.checkForBattle = function(entity){
    if(!entity.canFight() || entity.isInFight() || entity.isMoving() || entity.isDead() || entity.isInBuilding()) return;
    var cell = GameServer.battleCells.get(entity.x,entity.y);
    if(cell) {
        var area = {
            x: entity.x-1,
            y: entity.y-1,
            w: 2,
            h: 2
        };
        cell.battle.addFighter(entity);
        cell.battle.addArea(area);
    }
};

GameServer.addBattleCell = function(battle,x,y){
    if(GameServer.battleCells.get(x,y)) return;
    var cell = new BattleCell(x,y,battle);
    GameServer.battleCells.add(x,y,cell);
    battle.cells.add(x,y,cell);
    battle.PFcells.add(y,x,0); // y, then x!
    GameServer.addAtLocation(cell);
    GameServer.handleAOItransition(cell);
};

GameServer.removeBattleCell = function(battle,x,y){
    var cell = battle.cells.get(x,y);
    GameServer.removeEntity(cell);
    GameServer.battleCells.delete(x,y);
    // No need to remove from battle.cells, since the battle object will disappear soon
};

GameServer.handleBattleAction = function(data,socketID){
    var player = GameServer.getPlayer(socketID);
    player.battle.processAction(player,data);
};

GameServer.handleShop = function(data,socketID) {
    var player = GameServer.getPlayer(socketID);
    var item = data.id;
    var nb = data.nb;
    var action = data.action;
    if(!player.isInBuilding()) return;
    var building = GameServer.buildings[player.inBuilding];
    if(action == 'buy'){
        if(!building.canSell(item,nb)) return;
        var price = building.getPrice(item,nb,'buy');
        if(!player.canBuy(price)) return;
        player.takeGold(price);is
        player.giveItem(item,nb);
        building.takeItem(item,nb);
        building.giveGold(price);
    }else{
        if(!player.hasItem(item,nb)) return;
        if(!building.canBuy(item,nb)) return;
        var price = building.getPrice(item,nb,'sell');
        player.giveGold(price);
        player.takeItem(item,nb);
        building.takeGold(price);
        building.giveItem(item,nb);
    }
};

GameServer.handleCraft = function(data,socketID){
    var player = GameServer.getPlayer(socketID);
    var targetItem = data.id;
    var nb = data.nb;
    var building = GameServer.itemsData[targetItem].building;
    if(building) return;
    var recipe = GameServer.itemsData[targetItem].recipe;
    if(!GameServer.allIngredientsOwned(player,recipe,nb)) return;
    GameServer.operateCraft(player, recipe, targetItem, nb);
};

/*GameServer.handleBuild = function(data,socketID){
    var bid = data.id;
    var tile = data.tile;
    var player = GameServer.getPlayer(socketID);
    console.log('builing request',bid,tile);
    if(GameServer.canBuild(bid,tile)){
        GameServer.build(bid,tile,player.settlement);
        GameServer.server.sendMsg(player,'okbuild');
    }else{
        GameServer.server.sendMsg(player,'nobuild');
    }
};

GameServer.canBuild = function(bid,tile){
    var data = GameServer.buildingsData[bid];
    // TODO: store somewhere
    var shape = [];
    for(var i = 0; i < data.shape.length; i+=2){
        shape.push({
            x: data.shape[i],
            y: data.shape[i+1]
        });
    }
    return PFUtils.collisionsFromShape(shape,tile.x,tile.y,data.width,data.height,GameServer.collisions,true);
};

GameServer.build = function(bid,tile,settlement){
    var data = {
        x: tile.x,
        y: tile.y,
        type: bid,
        settlement: settlement,
        built: false
    };
    var building = new Building(data);
    GameServer.buildings[building.id] = building;
    GameServer.server.db.collection('buildings').insertOne(building.dbTrim(),function(err){
        if(err) throw err;
        console.log('build successfull');
    });
    GameServer.server.sendAll('addBuildingPin',building.superTrim());
};*/

GameServer.handleRespawn = function(socketID){
    var player = GameServer.getPlayer(socketID);
    if(!player.dead) return;
    player.respawn();
};

GameServer.handleCommit = function(socketID){
    var player = GameServer.getPlayer(socketID);
    if(!player.isInBuilding()) return;
    if(!player.hasFreeCommitSlot()) return;
    var buildingID = player.inBuilding;
    player.takeCommitmentSlot(buildingID);
    GameServer.buildings[buildingID].updateCommit(1);
    player.gainCivicXP(20);
    // TODO: increment change based on civic level?
    // TODO: xp reward change based on building?
};

GameServer.allIngredientsOwned = function(player,recipe,nb){
    for(var item in recipe){
        if(!recipe.hasOwnProperty(item)) continue;
        if(!player.hasItem(item,recipe[item]*nb)) return false;
    }
    return true;
};

GameServer.operateCraft = function(player,recipe,targetItem,nb){
    for(var item in recipe) {
        if (!recipe.hasOwnProperty(item)) continue;
        player.takeItem(item,recipe[item]*nb);
    }
    player.giveItem(targetItem,nb);
};

GameServer.handlePath = function(data,socketID){
    var player = GameServer.getPlayer(socketID);
    player.setAction(data.action);
    player.setPath(data.path);
    if(player.inFight){
        // TODO: if(player.inBattleRange(x,y)) ...
        player.battle.processAction(player,{
            action: 'move'
        });
    }
};

GameServer.handleUse = function(data,socketID){
    var player = GameServer.getPlayer(socketID);
    var item = data.item;
    if(!player.hasItem(item,1)) return false;
    if(player.inFight){
        if(!player.battle.isTurnOf(player)) return false;
        player.battle.setEndOfTurn(500);
    }
    var itemData = GameServer.itemsData[item];
    if(itemData.equipment) {
        player.equip(itemData.equipment, item, false); // false: not from DB
    }else  if(itemData.effects){
        player.applyEffects(item);
        player.takeItem(item,1);
    }
};

GameServer.handleUnequip = function(data,socketID) {
    var player = GameServer.getPlayer(socketID);
    var slot = data.slot;
    var subSlot = data.subslot;
    if(player.equipment[slot][subSlot] == -1) return;
    player.unequip(slot,subSlot);
};

GameServer.handleExit = function(socketID){
    var player = GameServer.getPlayer(socketID);
    player.exitBuilding();
};

GameServer.handleAOItransition = function(entity,previous){
    // When something moves from one AOI to another (or appears inside an AOI), identify which AOIs should be notified and update them
    // Miodel: update many, fetch one
    var AOIs = Utils.listAdjacentAOIs(entity.aoi);
    if(previous){
        var previousAOIs = Utils.listAdjacentAOIs(previous);
        // Array_A.diff(Array_B) returns the elements in A that are not in B
        // This is used because only the AOIs that are now adjacent, but were not before, need an update. Those who where already adjacent are up-to-date
        AOIs = AOIs.diff(previousAOIs);
    }
    AOIs.forEach(function(aoi){
        if(entity.constructor.name == 'Player') entity.newAOIs.push(aoi); // list the new AOIs in the neighborhood, from which to pull updates
        GameServer.addObjectToAOI(aoi,entity);
    });
};

GameServer.updateClients = function(){ //Function responsible for setting up and sending update packets to clients
    Object.keys(GameServer.players).forEach(function(key) {
        var player = GameServer.players[key];
        var localPkg = player.getIndividualUpdatePackage(); // the local pkg is player-specific
        var globalPkg = GameServer.AOIs[player.aoi].getUpdatePacket(); // the global pkg is AOI-specific
        var individualGlobalPkg = clone(globalPkg,false); // clone the global pkg to be able to modify it without affecting the original
        // player.newAOIs is the list of AOIs about which the player hasn't checked for updates yet
        for(var i = 0; i < player.newAOIs.length; i++){
         individualGlobalPkg.synchronize(GameServer.AOIs[player.newAOIs[i]]); // fetch entities from the new AOIs
        }
        individualGlobalPkg.removeEcho(player.id); // remove redundant information from multiple update sources
        if(individualGlobalPkg.isEmpty()) individualGlobalPkg = null;
        if(individualGlobalPkg === null && localPkg === null && !GameServer.nbConnectedChanged) return;
        var finalPackage = {};
        if(individualGlobalPkg) finalPackage.global = individualGlobalPkg.clean();
        if(localPkg) finalPackage.local = localPkg.clean();
        if(GameServer.nbConnectedChanged) finalPackage.nbconnected = GameServer.server.getNbConnected();
        GameServer.server.sendUpdate(player.socketID,finalPackage);
        player.newAOIs = [];
    });
    GameServer.nbConnectedChanged = false;
    GameServer.clearAOIs(); // erase the update content of all AOIs that had any
};

GameServer.clearAOIs = function(){
    GameServer.dirtyAOIs.forEach(function(aoi){
        GameServer.AOIs[aoi].clear();
    });
    GameServer.dirtyAOIs.clear();
};

GameServer.addObjectToAOI = function(aoi,entity){
    GameServer.AOIs[aoi].updatePacket.addObject(entity);
    GameServer.dirtyAOIs.add(aoi);
};

GameServer.removeObjectFromAOI = function(aoi,entity) {
    GameServer.AOIs[aoi].updatePacket.removeObject(entity);
    GameServer.dirtyAOIs.add(aoi);
};

GameServer.updateAOIproperty = function(aoi,category,id,property,value) {
    GameServer.AOIs[aoi].updatePacket.updateProperty(category, id, property, value);
    GameServer.dirtyAOIs.add(aoi);
};

GameServer.updateWalks = function(){
    Object.keys(GameServer.players).forEach(function(key) {
        var p = GameServer.players[key];
        if(p.moving) p.updateWalk();
    });
    Object.keys(GameServer.animals).forEach(function(key) {
        var a = GameServer.animals[key];
        if(a.moving) a.updateWalk();
    });
};

GameServer.updateNPC = function(){
    Object.keys(GameServer.animals).forEach(function(key) {
        var a = GameServer.animals[key];
        if(a.idle && !a.dead) a.updateIdle();
    });
};

GameServer.updateSettlements = function(){
    Object.keys(GameServer.settlements).forEach(function(key){
        GameServer.settlements[key].update();
    });
};

GameServer.updatePlayers = function(){
    Object.keys(GameServer.players).forEach(function(key){
        GameServer.players[key].update();
    });
};