/**
 * Created by Jerome on 26-06-17.
 */
var Engine = {
    baseViewWidth: 32,
    baseViewHeight: 18,
    tileWidth: 32,
    tileHeight: 32,
    key: 'main', // key of the scene, for Phaser
    playerIsInitialized: false
};

Engine.preload = function() {
    this.load.image('hero', 'assets/sprites/hero.png');

    this.load.image('scroll', 'assets/sprites/scroll.png');
    this.load.image('tome', 'assets/sprites/tome.png');
    this.load.image('tools', 'assets/sprites/tools.png');
    this.load.image('backpack', 'assets/sprites/backpack.png');

    this.load.image('fort', 'assets/sprites/buildings/fort.png');
    this.load.atlas('megaset', 'assets/sprites/megaset-0.png', 'assets/sprites/megaset-0.json');
    this.load.atlas('UI', 'assets/sprites/ui.png', 'assets/sprites/ui.json');
    this.load.spritesheet('marker', 'assets/sprites/marker.png',{frameWidth:32,frameHeight:32});

    Engine.collidingTiles = [];
    for(var i = 0, firstgid = 1; i < Boot.tilesets.length; i++){
        var tileset = Boot.tilesets[i];
        var path = 'assets/'+tileset.image.slice(2);// The paths in the master file are relative to the assets/maps directory
        this.load.spritesheet(tileset.name, path,{frameWidth:tileset.tilewidth,frameHeight:tileset.tileheight});

        var columns = Math.floor(tileset.imagewidth/Engine.tileWidth);
        var tilecount = columns * Math.floor(tileset.imageheight/Engine.tileHeight);
        Engine.collidingTiles = Engine.collidingTiles.concat(tileset.collisions.map(function(tile){
            return tile+firstgid;
        }));
        firstgid += tilecount;
    }
    console.log('Loading '+i+' tileset'+(i > 1 ? 's' : ''));
};

Engine.create = function(masterData){
    Engine.tileWidth = masterData.tilesets[0].tilewidth;
    Engine.tileHeight = masterData.tilesets[0].tileheight;
    Engine.chunkWidth = masterData.chunkWidth;
    Engine.chunkHeight = masterData.chunkHeight;
    Utils.chunkWidth = Engine.chunkWidth;
    Utils.chunkHeight = Engine.chunkHeight;
    Utils.nbChunksHorizontal = masterData.nbChunksHoriz;
    Utils.nbChunksVertical = masterData.nbChunksVert;
    Engine.worldWidth = Utils.nbChunksHorizontal*Engine.chunkWidth;
    Engine.worldHeight = Utils.nbChunksVertical*Engine.chunkHeight;
    Utils.lastChunkID = (Utils.nbChunksHorizontal*Utils.nbChunksVertical)-1;
    Engine.nbLayers = masterData.nbLayers;
    if(!Engine.nbLayers) console.log('WARNING : falsy number of layers : '+console.log(Engine.nbLayers));
    Engine.mapDataLocation = Boot.mapDataLocation;
    console.log('Master file read, setting up world of size '+Engine.worldWidth+' x '+Engine.worldHeight+' with '+Engine.nbLayers+' layers');

    Engine.tilesets = masterData.tilesets;
    Engine.tilesetMap = {}; // maps tiles to tilesets;

    Engine.chunks = {}; // holds references to the Containers containing the chunks
    Engine.displayedChunks = [];
    Engine.mapDataCache = {};

    Engine.players = {}; // player.id -> player
    Engine.buildings = {}; // building.id -> building
    Engine.displayedPlayers = new Set();
    Engine.displayedBuildings = new Set();

    Engine.debug = true;
    Engine.showHero = Engine.debug ? Utils.getPreference('showHero',true) : true;
    Engine.showGrid = false;

    Engine.scene = this.scene.scene;
    Engine.camera = Engine.scene.cameras.main;
    Engine.camera.setBounds(0,0,Engine.worldWidth*Engine.tileWidth,Engine.worldHeight*Engine.tileHeight);
    Engine.camera.roundPixels = true; // Very important for the camera to scroll smoothly accross the map

    Engine.createMarker();

    Engine.scene.input.events.on('POINTER_DOWN_EVENT', Engine.handleClick);
    Engine.scene.input.events.on('POINTER_MOVE_EVENT', Engine.trackMouse);

    Engine.collisions = new SpaceMap(); // contains 1 for the coordinates that are non-walkables
    Engine.PFgrid = new PF.Grid(0,0); // grid placeholder for the pathfinding
    Engine.PFfinder = PFUtils.getFInder();
    // Replaces the isWalkableAt method of the PF library
    PF.Grid.prototype.isWalkableAt = PFUtils.isWalkable;

    Engine.created = true;
    Client.requestData();
};

Engine.createMarker = function(){
    Engine.marker = Engine.scene.add.sprite(0,0,'marker',0);
    Engine.marker.alpha = 0.8;
    Engine.marker.depth = 1;
    Engine.marker.setDisplayOrigin(0,0);
    Engine.marker.previousTile = {x:0,y:0};
};

Engine.initWorld = function(data){
    Engine.makeUI();
    Engine.addHero(data.id,data.x,data.y);
    Engine.playerIsInitialized = true;
    Client.emptyQueue(); // Process the queue of packets from the server that had to wait while the client was initializing
    // TODO: when all chunks loaded, fade-out Boot scene
};

Engine.makeUI = function(){
    var UIelements = [];
    UIelements.push(Engine.scene.add.sprite(800,550,'backpack'));
    UIelements.push(Engine.scene.add.sprite(850,550,'tools'));
    UIelements.push(Engine.scene.add.sprite(900,550,'tome'));
    UIelements.push(Engine.scene.add.sprite(950,550,'scroll'));
    UIelements.forEach(function(e){
        e.depth = 1;
        e.setScrollFactor(0);
    });
};

Engine.addHero = function(id,x,y){
    Engine.player = Engine.addPlayer(id,x,y);
    Engine.player.visible = Engine.showHero;
    Engine.camera.startFollow(Engine.player);
    Engine.updateEnvironment();
};

Engine.addPlayer = function(id,x,y){
    if(Engine.playerIsInitialized && id == Engine.player.id) return;
    var sprite = new Player(x,y,'hero',id);
    Engine.players[id] = sprite;
    Engine.displayedPlayers.add(id);
    return sprite;
};

Engine.removePlayer = function(id){
    console.log('removing player '+id);
    var sprite = Engine.players[id];
    sprite.destroy();
    Engine.displayedPlayers.delete(id);
    delete Engine.players[id];
};

Engine.updateEnvironment = function(){
    var chunks = Utils.listAdjacentAOIs(Engine.player.chunk);
    var newChunks = chunks.diff(Engine.displayedChunks);
    var oldChunks = Engine.displayedChunks.diff(chunks);

    for (var i = 0; i < oldChunks.length; i++) {
        Engine.removeChunk(oldChunks[i]);
    }

    for(var j = 0; j < newChunks.length; j++){
        Engine.displayChunk(newChunks[j]);
    }

    Engine.updateDisplayedEntities();
};

Engine.updateDisplayedEntities = function(){
    // Whenever the player moves to a different AOI, for each player displayed in the game, check if it will still be
    // visible from the new AOI; if not, remove it
    if(!Engine.created) return;
    var adjacent = Utils.listAdjacentAOIs(Engine.player.chunk);
    Engine.updateDisplay(Engine.displayedPlayers,Engine.players,adjacent,Engine.removePlayer);
    Engine.updateDisplay(Engine.displayedBuildings,Engine.buildings,adjacent,Engine.removeBuilding);
};

Engine.updateDisplay = function(list,map,adjacent,removalCallback){
    list.forEach(function(id){
        var p = map[id];
        if(p.chunk === undefined)console.log('WARNING: no chunk defined for ',p);
        // check if the AOI of entity p is in the list of the AOI's adjacent to the main player
        if(p) if(adjacent.indexOf(p.chunk) == -1) removalCallback(p.id);
    });
};

Engine.displayChunk = function(id){
    if(Engine.mapDataCache[id]){
        // Chunks are deleted and redrawn rather than having their visibility toggled on/off, to avoid accumulating in memory
        Engine.drawChunk(Engine.mapDataCache[id],id);
    }else {
        Engine.loadJSON(Engine.mapDataLocation+'/chunk' + id + '.json', Engine.drawChunk, id);
    }
};

Engine.loadJSON = function(path,callback,data){
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', path, true);
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(JSON.parse(xobj.responseText),data);
        }
    };
    xobj.send(null);
};

Engine.drawChunk = function(mapData,id){
    var chunk = new Chunk(mapData,id,1);
    Engine.chunks[chunk.id] = chunk;
    if(!Engine.mapDataCache[chunk.id]) Engine.mapDataCache[chunk.id] = mapData;
    chunk.drawLayers();
    Engine.displayedChunks.push(chunk.id);
};

Engine.removeChunk = function(id){
    Engine.chunks[id].removeLayers();
    Engine.displayedChunks.splice(Engine.displayedChunks.indexOf(id),1);
};

Engine.addCollision = function(x,y,tile){
    if(Engine.isColliding(tile)) Engine.collisions.add(y,x,1);
};

Engine.isColliding = function(tile){ // tile is the index of the tile in the tileset
    for(var i = 0; i < Engine.collidingTiles.length; i++){
        if(Engine.collidingTiles[i] > tile) return false;
        if(Engine.collidingTiles[i] == tile) return true;
    }
    return false;
};

Engine.handleClick = function(event){
    if(event.gameObject){

    }else{
        Engine.computePath(Engine.getMouseCoordinates(event));
    }
};

Engine.computePath = function(position){
    if(Engine.collisions.get(position.tile.y,position.tile.x) == 1) return; // y, then x!

    //console.log('path from '+Engine.player.tileX+', '+Engine.player.tileY+' to '+position.tile.x+', '+position.tile.y);
    Engine.PFgrid.nodes = new Proxy(JSON.parse(JSON.stringify(Engine.collisions)),PFUtils.firstDimensionHandler); // Recreates a new grid each time
    var path = Engine.PFfinder.findPath(Engine.player.tileX, Engine.player.tileY, position.tile.x, position.tile.y, Engine.PFgrid);
    Client.sendPath(path);
    Engine.player.move(path);
};

Engine.updatePosition = function(player){
    if(player.x > player.previousPosition.x){ // right
        player.orientation = 'right';
    }else if(player.x < player.previousPosition.x) { // left
        player.orientation = 'left';
    }else if(player.y > player.previousPosition.y) { // down
        player.orientation = 'down';
    }else if(player.y < player.previousPosition.y) { // up
        player.orientation = 'up';
    }
    player.previousPosition = {
        x: player.x,
        y: player.y
    };
    player.tileX = Math.floor(player.x/Engine.tileWidth);
    player.tileY = Math.floor(player.y/Engine.tileHeight);
    if(player.id == Engine.player.id) {
        player.chunk = Utils.tileToAOI({x: player.tileX, y: player.tileY});
        if (player.chunk != player.previousChunk) Engine.updateEnvironment();
        player.previousChunk = player.chunk;
    }
};

Engine.getMouseCoordinates = function(event){
    var pxX = Engine.camera.scrollX + event.x;
    var pxY = Engine.camera.scrollY + event.y;
    var tileX = Math.floor(pxX/Engine.tileWidth);
    var tileY = Math.floor(pxY/Engine.tileHeight);
    return {
        tile:{x:tileX,y:tileY},
        pixel:{x:pxX,y:pxY}
    };
};

Engine.trackMouse = function(event){
    var position = Engine.getMouseCoordinates(event);
    Engine.updateMarker(position.tile);
    if(Engine.debug){
        document.getElementById('pxx').innerHTML = position.pixel.x;
        document.getElementById('pxy').innerHTML = position.pixel.y;
        document.getElementById('tx').innerHTML = position.tile.x;
        document.getElementById('ty').innerHTML = position.tile.y;
        document.getElementById('aoi').innerHTML = Utils.tileToAOI(position.tile);
    }
};

Engine.updateMarker = function(tile){
    Engine.marker.x = (tile.x*Engine.tileWidth);
    Engine.marker.y = (tile.y*Engine.tileHeight);
    if(tile.x != Engine.marker.previousTile.x || tile.y != Engine.marker.previousTile.y){
        Engine.marker.previousTile = tile;
        if(Engine.checkCollision(tile)){
            Engine.marker.setFrame(1);
        }else{
            Engine.marker.setFrame(0);
        }
    }
};

Engine.checkCollision = function(tile){ // tile is x, y pair
    if(Engine.displayedChunks.length < 4) return; // If less than 4, it means that wherever you are the chunks haven't finished displaying
    if(!Engine.collisions[tile.y]) return false;
    return !!Engine.collisions[tile.y][tile.x];
};

Engine.addBuilding = function(id,x,y,sprite){
    var building = Engine.scene.add.sprite(x*Engine.tileWidth,y*Engine.tileHeight,sprite);
    building.id = id;
    building.depth = 1;
    building.chunk = Utils.tileToAOI({x:x,y:y});
    building.setInteractive();
    Engine.buildings[id] = building;
    Engine.displayedBuildings.add(id);
    return building;
};

Engine.removeBuilding = function(id){
    var sprite = Engine.buildings[id];
    sprite.destroy();
    Engine.displayedBuildings.delete(id);
    delete Engine.buildings[id];
};

/*
* #### UPDATE CODE #####
* */

// Processes the global update packages received from the server
Engine.updateWorld = function(data){  // data is the update package from the server
    if(data.newplayers) {
        for (var n = 0; n < data.newplayers.length; n++) {
            var p = data.newplayers[n];
            Engine.addPlayer(p.id, p.x, p.y);
        }
        //if (data.newplayers.length > 0) Game.sortEntities(); // Sort entitites according to y coordinate to make them render properly above each other
    }

    if(data.newbuildings) {
        for (var n = 0; n < data.newbuildings.length; n++) {
            var b = data.newbuildings[n];
            Engine.addBuilding(b.id, b.x, b.y, b.sprite);
        }
    }

    if(data.disconnected) { // data.disconnected is an array of disconnected players
        for (var i = 0; i < data.disconnected.length; i++) {
            Engine.removePlayer(data.disconnected[i]);
        }
    }

    // data.players is an associative array mapping the id's of the entities
    // to small object indicating which properties need to be updated. The following code iterate over
    // these objects and call the relevant update functions.
    if(data.players) Engine.traverseUpdateObject(data.players,Engine.players,Engine.updatePlayer);
};

// For each element in obj, call callback on it
Engine.traverseUpdateObject = function(obj,table,callback){
    Object.keys(obj).forEach(function (key) {
        if(table[key]) callback(table[key],obj[key]);
    });
};

Engine.updatePlayer = function(player,data){ // data contains the updated data from the server
    if(player.id == Engine.player.id) return;
    if(data.path) player.move(data.path);
};

Engine.update = function(){

};

Engine.getTilesetFromTile = function(tile){
    if(Engine.tilesetMap.hasOwnProperty(tile)) return Engine.tilesetMap[tile];
    for(var i = 0; i < Engine.tilesets.length; i++){
        if(tile < Engine.tilesets[i].firstgid){
            Engine.tilesetMap[tile] = i-1;
            return i-1;
        }
    }
    return Engine.tilesets.length-1;
};