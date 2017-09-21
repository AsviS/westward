/**
 * Created by Jerome on 20-09-17.
 */
var fs = require('fs');
var clone = require('clone'); // used to clone objects, essentially used for clonick update packets

var Utils = require('../shared/Utils.js').Utils;
//var SpaceMap = require('../shared/SpaceMap.js').SpaceMap;
var AOI = require('./AOI.js').AOI;
var Player = require('./Player.js').Player;

var GameServer = {
    lastPlayerID: 0,
    players: {}, // player.id -> player
    socketMap: {}, // socket.id -> player.id
    nbConnectedChanged: false
};

GameServer.readMap = function(mapsPath){
    var masterData = JSON.parse(fs.readFileSync(mapsPath+'/master.json').toString());

    Utils.chunkWidth = masterData.chunkWidth;
    Utils.chunkHeight = masterData.chunkHeight;
    Utils.nbChunksHorizontal = masterData.nbChunksHoriz;
    Utils.nbChunksVertical = masterData.nbChunksVert;
    Utils.lastChunkID = (Utils.nbChunksHorizontal*Utils.nbChunksVertical)-1;

    GameServer.AOIs = []; // Maps AOI id to AOI object
    GameServer.dirtyAOIs = new Set(); // Set of AOI's whose update package have changes since last update

    for(var i = 0; i <= Utils.lastChunkID; i++){
        GameServer.AOIs.push(new AOI(i));
    }

    console.log('[Master data read]');
};

GameServer.getPlayer = function(socketID){
    return GameServer.players[GameServer.socketMap[socketID]];
};

GameServer.addPlayer = function(socket){
    var player = new Player(socket.id,GameServer.lastPlayerID++);
    GameServer.players[player.id] = player;
    GameServer.socketMap[socket.id] = player.id;
    GameServer.server.sendMsg(socket,'init',player);
    GameServer.server.emitMsg('newplayer',player);
    GameServer.nbConnectedChanged = true;
    console.log(GameServer.server.getNbConnected()+' connected');
};

GameServer.removePlayer = function(socketID){
    var playerID = GameServer.socketMap[socketID];
    delete GameServer.socketMap[socketID];
    delete GameServer.players[playerID];
    GameServer.server.emitMsg('removeplayer',playerID);
    GameServer.nbConnectedChanged = true;
    console.log(GameServer.server.getNbConnected()+' connected');
};

GameServer.move = function(socketID,x,y){
    var player = GameServer.getPlayer(socketID);
    player.x = x;
    player.y = y;
    GameServer.server.emitMsg('move',player);
};

GameServer.updatePlayers = function(){ //Function responsible for setting up and sending update packets to clients
    Object.keys(GameServer.players).forEach(function(key) {
        var player = GameServer.players[key];
        var localPkg = player.getIndividualUpdatePackage(); // the local pkg is player-specific
        var globalPkg = GameServer.AOIs[player.aoi].getUpdatePacket(); // the global pkg is AOI-specific
        var individualGlobalPkg = clone(globalPkg,false); // clone the global pkg to be able to modify it without affecting the original
        // player.newAOIs is the list of AOIs about which the player hasn't checked for updates yet
        for(var i = 0; i < player.newAOIs.length; i++){
            individualGlobalPkg.synchronize(GameServer.AOIs[player.newAOIs[i]]); // fetch updates from the new AOIs
        }
        //individualGlobalPkg.removeEcho(player.id); // remove redundant information from multiple update sources
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

module.exports.GameServer = GameServer;