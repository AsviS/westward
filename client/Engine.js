/**
 * Created by Jerome on 26-06-17.
 */
var Engine = {
    baseViewWidth: 32,
    baseViewHeight: 18,
    tileWidth: 32,
    tileHeight: 32
};

Engine.camera = {
    x: 0,
    y: 0,
    getPixelX: function(){
        return Engine.camera.x*Engine.tileWidth;
    },
    getPixelY: function(){
        return Engine.camera.y*Engine.tileHeight;
    }
};

Engine.boot = function(){
    /*TODO:
    * Procedural world:
    - Fix zoom and zoomed movement
    - Water
    - Write to chunks
    - Forests
    - Coronae
    - Dirt
    * Network
    - Two repositories, for production and development, with node scripts taking care
    of copying what is needed from one to the other (+ uglifying and compressing etc.)
    -> Possible to programmatically push?  http://radek.io/2015/10/27/nodegit/
    - Somehow remove/disable debug components automatically
    - Desktop app a simple terminal that gets everything from server (= exact same
    appearance and behaviour, reduced code visibility, and possibly *no* node-modules)
    - Scripts to group what is needed for the app, ugligy/compress and build
    - In any case, migrate Geometry to server to hide it
    * History & design document
    -----
    * Tools:
    - Load more chunks upon zoom
    - Top-down visibility optimization (create a lookup table of transparency)
    - Prune map files more
    - Testing (make part of the pipeline)
    */

    Engine.renderer = PIXI.autoDetectRenderer(
        Engine.baseViewWidth*Engine.tileWidth,
        Engine.baseViewHeight*Engine.tileHeight,
        {
            antialias: false,
            view: document.getElementById('game'),
            preserveDrawingBuffer: true // to allow image captures from canvas
        }
    );
    Engine.viewWidth = Engine.baseViewWidth;
    Engine.viewHeight = Engine.baseViewHeight;

    Engine.setAction('move');
    Engine.showGrid = Utils.getPreference('showGrid',false);
    Engine.showHero = Utils.getPreference('showHero',true);
    Engine.showHulls = Utils.getPreference('showHulls',false);
    Engine.selectionEnabled = Utils.getPreference('selectionEnabled',false);
    Engine.debug = true;
    Engine.zoomScale = 1;

    Engine.chunks = {}; // holds references to the Containers containing the chunks
    Engine.displayedChunks = [];
    Engine.mapDataCache = {};

    Engine.computeStageLocation();

    Engine.stage = new PIXI.Container();
    Engine.blackBoard = new PIXI.Container(); // Stores all the graphics objects used for debugging (hulls, points...)
    Engine.blackBoard.z = 999;
    Engine.blackBoard.visible = Engine.showHulls;
    Engine.stage.addChild(Engine.blackBoard);
    Engine.editHistory = [];

    Engine.drawSelection();
    Engine.renderer.view.addEventListener('mousedown', Engine.handleClick, false);
    if(Engine.debug) {
        Engine.renderer.view.addEventListener('mouseup', Engine.handleMouseUp, false);
        Engine.renderer.view.addEventListener('mousemove', Engine.trackPosition, false);
    }

    Engine.mapDataLocation = 'assets/maps/chunks';
    Engine.loadJSON(Engine.mapDataLocation+'/master.json',Engine.readMaster);
};

Engine.drawSelection = function(){
    Engine.selection = new PIXI.Graphics();
    Engine.selection.lineStyle(2, 0xffffff, 1);
    Engine.selection.drawRect(0,0,0,0);
    Engine.selection.z = 999;
    Engine.selection.visible = false;
    Engine.stage.addChild(Engine.selection);
};

Engine.computeStageLocation = function(){
    Engine.location = {};
    Engine.location.offsetX = 0;
    Engine.location.offsetY = 0;
    var element = Engine.renderer.view;
    if (element.offsetParent !== undefined) {
        do {
            Engine.location.offsetX += element.offsetLeft;
            Engine.location.offsetY += element.offsetTop;
        } while ((element = element.offsetParent));
    }
    var stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(Engine.renderer.view, null)['paddingLeft'], 10)      || 0;
    var stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(Engine.renderer.view, null)['paddingTop'], 10)       || 0;
    var styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(Engine.renderer.view, null)['borderLeftWidth'], 10)  || 0;
    var styleBorderTop   = parseInt(document.defaultView.getComputedStyle(Engine.renderer.view, null)['borderTopWidth'], 10)   || 0;
    var html = document.body.parentNode;
    Engine.location.offsetX += stylePaddingLeft +  styleBorderLeft + html.offsetLeft;
    Engine.location.offsetY += stylePaddingTop +  styleBorderTop + html.offsetTop;
};

Engine.readMaster = function(masterData){
    Engine.tileWidth = masterData.tilesets[0].tilewidth;
    Engine.tileHeight = masterData.tilesets[0].tileheight;
    Engine.chunkWidth = masterData.chunkWidth;
    Engine.chunkHeight = masterData.chunkHeight;
    Engine.nbChunksHorizontal = masterData.nbChunksHoriz;
    Engine.nbChunksVertical = masterData.nbChunksVert;
    /*Engine.minChunkX = masterData.minX;
    Engine.minChunkY = masterData.minY;
    Engine.maxChunkX = masterData.maxX;
    Engine.maxChunkY = masterData.maxY;*/
    Engine.worldWidth = Engine.nbChunksHorizontal*Engine.chunkWidth;
    Engine.worldHeight = Engine.nbChunksVertical*Engine.chunkHeight;
    Engine.lastChunkID = (Engine.nbChunksHorizontal*Engine.nbChunksVertical)-1;
    console.log('Master file read, setting up world of size '+Engine.worldWidth+' x '+Engine.worldHeight);
    Engine.tilesets = masterData.tilesets;

    PIXI.loader.add('hero','assets/sprites/hero.png');

    for(var i = 0; i < masterData.tilesets.length; i++){
        var tileset = masterData.tilesets[i];
        var path = 'assets/'+tileset.image.slice(2);// The paths in the master file are relative to the assets/maps directory
        PIXI.loader.add(tileset.name,path);
    }

    Engine.tilesetMap = {}; // maps tiles to tilesets;

    PIXI.loader.load(Engine.start);
};

Engine.loadJSON = function(path,callback,info){
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', path, true);
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(JSON.parse(xobj.responseText),info);
        }
    };
    xobj.send(null);
};

Engine.start = function(loader, resources){
    Engine.resources = resources;
    Engine.addHero();
    requestAnimationFrame(Engine.update);
};

Engine.addHero = function(){
    /*for(var i = 0; i <= Engine.lastChunkID; i++){
        Utils.listAdjacentChunks(i);
    }*/
    startx = 12; //35
    starty = 12;//30;
    Engine.player = Engine.addSprite('hero',startx,starty);
    Engine.player.visible = Engine.showHero;
    Engine.player.chunk = Utils.tileToAOI({x:startx,y:starty});
    Engine.updateEnvironment();
    Engine.updateCamera();
};

Engine.addSprite = function(key,x,y){
    var sprite = new PIXI.Sprite(Engine.resources[key].texture);
    Engine.setPosition(sprite,x,y);
    sprite.z = 2;
    Engine.addToStage(sprite);
    return sprite;
};

Engine.addToStage = function(sprite){
    Engine.stage.addChild(sprite);
    Engine.orderStage();
};

Engine.orderStage = function(){
    Engine.stage.children.sort(function(a,b){
        return a.z > b.z;
    });
};

Engine.displayChunk = function(id){
    //var coords = id.split(Utils.separator);
    //if(coords[0] < Engine.minChunkX || coords[1] < Engine.minChunkY || coords[0] > Engine.maxChunkX || coords[1] > Engine.maxChunkY) return;
    if(Engine.mapDataCache[id]){
        // Chunks are deleted and redrawn rather than having their visibility toggled on/off, to avoid accumulating in memory
        Engine.drawChunk(Engine.mapDataCache[id]);
    }else {
        Engine.loadJSON(Engine.mapDataLocation+'/chunk' + id + '.json', Engine.drawChunk);
    }
};

Engine.displayMap = function(path){
    Engine.loadJSON(path,Engine.makeMap);
};

Engine.drawChunk = function(mapData){
    var chunk = new Chunk(mapData);
    Engine.chunks[chunk.id] = chunk;
    if(!Engine.mapDataCache[chunk.id]) Engine.mapDataCache[chunk.id] = mapData;
    for(var i = 0; i < mapData.layers.length; i++){
        Engine.drawLayer(mapData.layers[i].data,mapData.width,mapData.height,chunk.id,chunk);
    }
    chunk.z = 1;
    Engine.displayedChunks.push(chunk.id);
    if(Engine.showGrid) Engine.drawGrid(chunk);
    Engine.addToStage(chunk);
};

Engine.toggleSelection = function(){
    Engine.selectionEnabled = !Engine.selectionEnabled;
    if(Engine.selectionEnabled){
        Engine.renderer.view.style.cursor = 'crosshair';
    }else{
        Engine.renderer.view.style.cursor = 'default';
    }
};

Engine.toggleHulls= function(){
    Engine.showHulls = !Engine.showHulls;
    Engine.blackBoard.visible = Engine.showHulls;
    localStorage.setItem('showHulls',Engine.showHulls);
};

Engine.toggleGrid = function(){
    Engine.showGrid = !Engine.showGrid;
    localStorage.setItem('showGrid',Engine.showGrid);
    for(var i = 0; i < Engine.displayedChunks.length; i++){
        var chunk = Engine.chunks[Engine.displayedChunks[i]];
        if(Engine.showGrid){
            Engine.drawGrid(chunk);
        }else{
            Engine.removeGrid(chunk);
        }
    }
};

Engine.toggleHero = function() {
    Engine.showHero = !Engine.showHero;
    localStorage.setItem('showHero',Engine.showHero);
    Engine.player.visible = Engine.showHero;
};

Engine.drawGrid = function(chunk){
    if(chunk.grid === undefined) {
        var gr = new PIXI.Graphics();
        var origin = Utils.AOItoTile(chunk.id);
        gr.lineStyle(10, 0xffffff, 1);
        gr.drawRect(origin.x * Engine.tileWidth, origin.y * Engine.tileHeight, Engine.chunkWidth * Engine.tileWidth, Engine.chunkHeight * Engine.tileHeight);
        gr.z = 999;
        chunk.addChild(gr);
        chunk.grid = gr;
    }else{
        chunk.grid.visible = true;
    }
};

Engine.removeGrid = function(chunk){
    chunk.grid.visible = false;
};

Engine.drawLayer = function(data,width,height,chunkID,chunk){
    var origin = Utils.AOItoTile(chunkID);
    for(var i = 0; i < data.length; i++){
        var tile = data[i];
        if(tile == 0) continue;
        var x = origin.x + i%width;
        var y = origin.y + Math.floor(i/width);
        Engine.addTile(x,y,tile,chunk);
    }
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

Engine.addTile = function(x,y,tile,chunk){
    if(x < 0 || y < 0) return;
    var chunk = chunk || Engine.chunks[Utils.tileToAOI({x:x,y:y})];
    var tilesetID = Engine.getTilesetFromTile(tile);
    var tileset = Engine.tilesets[tilesetID];
    tile -= tileset.firstgid;
    var wdth = Math.floor(tileset.imagewidth/Engine.tileWidth);
    var tx = tile%wdth;
    var ty = Math.floor(tile/wdth);
    var texture = new PIXI.Texture(Engine.resources[tileset.name].texture, new PIXI.Rectangle(tx*Engine.tileWidth, ty*Engine.tileHeight, Engine.tileWidth, Engine.tileHeight));
    var sprite = new PIXI.Sprite(texture);
    sprite.position.set(x*Engine.tileWidth,y*Engine.tileHeight);
    chunk.addChild(sprite);
};

Engine.removeChunk = function(id){
    Engine.stage.removeChild(Engine.chunks[id]);
    Engine.displayedChunks.splice(Engine.displayedChunks.indexOf(id),1);
};

Engine.update = function(){
    Engine.renderer.render(Engine.stage);
    requestAnimationFrame(Engine.update);
    document.getElementById('visible').innerHTML = Engine.displayedChunks.length;
    //console.log(Engine.stage.children.length+' children');
};

Engine.zoom = function(coef){
    var increment;
    if(coef == -1){
        if(Engine.zoomScale > 0.25) {
            increment = 0.25;
        }else{
            increment = 0.15;
        }
    }else if (coef == 1){
        if(Engine.zoomScale >= 0.25) {
            increment = 0.25;
        }else{
            increment = 0.15;
        }
    }

    Engine.zoomScale += increment * coef;
    Engine.stage.scale.x = Engine.zoomScale;
    Engine.stage.scale.y = Engine.zoomScale;
    Engine.viewWidth = Math.floor(Engine.baseViewWidth*(1/Engine.zoomScale));
    Engine.viewHeight = Math.floor(Engine.baseViewHeight*(1/Engine.zoomScale));
    Engine.updateCamera();
    Engine.updateEnvironment();
    document.getElementById('zx').innerHTML = Engine.stage.scale.x;
    document.getElementById('zy').innerHTML = Engine.stage.scale.y;
};

Engine.updateSelection = function(x,y,wx,hy){
    if(x !== null) Engine.selection.graphicsData[0].shape.x = x;
    if(y!== null) Engine.selection.graphicsData[0].shape.y = y;
    if(wx !== null) Engine.selection.graphicsData[0].shape.width = wx - Engine.selection.graphicsData[0].shape.x;
    if(hy !== null) Engine.selection.graphicsData[0].shape.height = hy - Engine.selection.graphicsData[0].shape.y;
    Engine.selection.dirty++;
    Engine.selection.clearDirty++;
};

Engine.resetSelection = function(){
    Engine.capture(
        Engine.selection.graphicsData[0].shape.x*Engine.zoomScale,
        Engine.selection.graphicsData[0].shape.y*Engine.zoomScale,
        Engine.selection.graphicsData[0].shape.width*Engine.zoomScale,
        Engine.selection.graphicsData[0].shape.height*Engine.zoomScale
    );
    Engine.selection.graphicsData[0].shape.width = 0;
    Engine.selection.graphicsData[0].shape.height = 0;
    Engine.selection.visible = false;
};

Engine.capture = function(x,y,w,h){
    x -= Engine.camera.getPixelX();
    y -= Engine.camera.getPixelY();
    var patternCanvas=document.createElement("canvas");
    patternCanvas.width = w;
    patternCanvas.height = h;
    var patternCtx = patternCanvas.getContext("2d");
    patternCtx.drawImage(Engine.renderer.view,x,y,w,h,0,0,w,h);

    var capture = document.createElement("img");
    capture.src = patternCanvas.toDataURL("image/png");
    document.getElementById("captures").appendChild(capture);
};

Engine.updateCamera = function(){
    Engine.camera.x = Engine.player.tilePosition.x - Math.floor(Engine.viewWidth*0.5);
    Engine.camera.y = Engine.player.tilePosition.y - Math.floor(Engine.viewHeight*0.5);
    // Clamp in tile units
    Engine.camera.x = clamp(Engine.camera.x,0,Engine.worldWidth-Engine.viewWidth);
    Engine.camera.y = clamp(Engine.camera.y,0,Engine.worldHeight-Engine.viewHeight);
    Engine.stage.pivot.set(Engine.camera.x*Engine.tileWidth,Engine.camera.y*Engine.tileHeight);
    document.getElementById('cx').innerHTML = Engine.camera.x;
    document.getElementById('cy').innerHTML = Engine.camera.y;
};

Engine.updateEnvironment = function(){
    var chunks = Utils.listVisibleAOIs(Engine.player.chunk);
    var newChunks = chunks.diff(Engine.displayedChunks);
    var oldChunks = Engine.displayedChunks.diff(chunks);

    for(var i = 0; i < oldChunks.length; i++){
        //console.log('removing '+oldChunks[i]);
        Engine.removeChunk(oldChunks[i]);
    }

    for(var j = 0; j < newChunks.length; j++){
        //console.log('adding '+newChunks[j]);
        Engine.displayChunk(newChunks[j]);
    }
};

Engine.move = function(x,y){
    Engine.setPosition(Engine.player,x,y);
    Engine.player.chunk = Utils.tileToAOI(Engine.player.tilePosition);
    if(Engine.player.chunk != Engine.player.previousChunk) Engine.updateEnvironment();
    Engine.player.previousChunk = Engine.player.chunk;
    Engine.updateCamera();
};

Engine.setPosition = function(sprite,x,y){
    sprite.position.set(x*Engine.tileWidth,y*Engine.tileHeight);
    if(sprite.tilePosition){
        sprite.tilePosition.set(x,y);
    }else {
        sprite.tilePosition = new PIXI.Point(x, y);
    }
};

Engine.setAction = function(action){
    if(Engine.selectionEnabled) Engine.toggleSelection();
    Engine.clickAction = action;
    document.getElementById('action').innerHTML = action;
};

Engine.getCanvasCoordinates = function(e){
    var x = e.pageX - Engine.location.offsetX;
    var y = e.pageY - Engine.location.offsetY;
    return {x:x,y:y};
};

Engine.getMouseCoordinates = function(e){
    var canvasPxCoord = Engine.getCanvasCoordinates(e);
    var gamePxCoord = {
        x: Math.round(canvasPxCoord.x*(1/Engine.zoomScale) + Engine.camera.getPixelX()),
        y: Math.round(canvasPxCoord.y*(1/Engine.zoomScale) + Engine.camera.getPixelY())
    };
    var gameTileCoord = {
        x: coordinatesToCell(gamePxCoord.x,Engine.tileWidth),
        y: coordinatesToCell(gamePxCoord.y,Engine.tileHeight)
    };
    return {
        px: gamePxCoord,
        tile: gameTileCoord
    }
};

Engine.trackPosition = function(e){
    if(!Engine.debug && !Engine.selectionEnabled) return;
    var c = Engine.getMouseCoordinates(e);
    var gamePxCoord = c.px;
    var gameTileCoord = c.tile;
    if(Engine.debug) {
        document.getElementById('pxx').innerHTML = gamePxCoord.x;
        document.getElementById('pxy').innerHTML = gamePxCoord.y;
        document.getElementById('tx').innerHTML = gameTileCoord.x;
        document.getElementById('ty').innerHTML = gameTileCoord.y;
        document.getElementById('aoi').innerHTML = Utils.tileToAOI(gameTileCoord);
    }
    if(Engine.selectionEnabled && Engine.selection.visible) Engine.updateSelection(null,null,gamePxCoord.x,gamePxCoord.y);
};

Engine.handleMouseUp = function(e) {
    if(Engine.selectionEnabled) Engine.resetSelection();
};

Engine.handleClick = function(e){
    //var coordinates = Engine.getCanvasCoordinates(e);
    var c = Engine.getMouseCoordinates(e);
    if(Engine.selectionEnabled){
        Engine.updateSelection(
            //Engine.camera.x*Engine.tileWidth + coordinates.x,
            //Engine.camera.y*Engine.tileHeight + coordinates.y,
            c.px.x,
            c.px.y,
            null,null);
        Engine.selection.visible = true;
        return;
    }
    if(!Engine.clickAction) return;
    var c = Engine.getMouseCoordinates(e);
    var worldx = c.tile.x;
    var worldy = c.tile.y;
    worldx = clamp(worldx,0,Engine.worldWidth);
    worldy = clamp(worldy,0,Engine.worldHeight);
    Engine[Engine.clickAction](worldx,worldy);
    Engine.lastWorldX = worldx;
    Engine.lastWorldY = worldy;
};

Engine.undo = function(){
    if(Engine.editHistory.length == 0) return;
    var last = Engine.editHistory.pop();
    if(last.hull) last.hull.destroy();
    last.destroy();
};

Engine.redo = function(){
    Engine.undo();
    Engine[Engine.clickAction](Engine.lastWorldX,Engine.lastWorldY);
};

Engine.addMound = function(worldx,worldy){
    var cliff = Engine.drawCliff(Geometry.interpolatePoints(Geometry.makePolyrect(worldx,worldy)));
    //Engine.stage.addChild(cliff);
    Engine.addToStage(cliff);
    Engine.editHistory.push(cliff);

};

Engine.drawHull = function(hull){
    var g = new PIXI.Graphics();
    g.lineStyle(5,0xffffff);
    g.moveTo(hull[0].x,hull[0].y);
    for(var i = 1; i < hull.length; i++){
        g.lineTo(hull[i].x,hull[i].y);
    }
    g.lineTo(hull[0].x,hull[0].y);
    Engine.blackBoard.addChild(g);
    return g;
};

Engine.drawCircle = function(x,y,radius,color){
    var g = new PIXI.Graphics();
    g.lineStyle(2,color);
    g.drawCircle(x,y,radius);
    Engine.blackBoard.addChild(g);
};

Engine.drawCliff = function(pts){
    var cliff = new PIXI.Container();
    cliff.z = 3;
    var last = null;
    for(var i = 0; i < pts.length; i++){
        var next = (i == pts.length-1 ? 0 : i+1);
        var prev = (i == 0 ? pts.length-1 : i-1);
        var id = findTileID(pts[prev],pts[i],pts[next]);
        var tile = ptToTile(pts[i]);
        var previousTile = ptToTile(pts[prev]);

        // Prevent issues with double corners
        if((id == 1 && last == 3) && (previousTile.x - tile.x == 1)) id = 9; // top left after bottom right
        if((id == 3 && last == 1) && (previousTile.y - tile.y == -1)){
            id = 6;
            tile.x--;
        }
        if((id == 0 && last == 2) && (previousTile.y - tile.y == 1)){ // top right after bottom left
            id = 6;
            tile.x--;
        }

        var ref = {
            x: tile.x,
            y: tile.y
        };
        switch(id){
            case 0: // top right outer
                /*var ref = {
                    x: tile.x-1,
                    y: tile.y
                };*/
                ref.x -= 1;
                Engine.addTile(ref.x,ref.y-1,6,cliff);
                Engine.addTile(ref.x,ref.y,21,cliff);
                Engine.addTile(ref.x+1,ref.y,22,cliff);
                if(last != 2 || (previousTile.y - tile.y > 2)) Engine.addTile(ref.x+1,ref.y+1,37,cliff);  // Prevent issues with double corners
                break;
            case 1: // top left outer
                /*var ref = {
                    x: tile.x,
                    y: tile.y
                };*/
                Engine.addTile(ref.x,ref.y-1,3,cliff);
                Engine.addTile(ref.x-1,ref.y,17,cliff);
                Engine.addTile(ref.x,ref.y,18,cliff);
                break;
            case 2: // bottom left outer
                Engine.addTile(ref.x,ref.y-2,6,cliff);
                Engine.addTile(ref.x,ref.y-1,21,cliff);
                break;
            case 3: // bottom right outer
                Engine.addTile(ref.x-2,ref.y-1,17,cliff);
                Engine.addTile(ref.x-1,ref.y-1,18,cliff);
                break;
            case 4: // bottom left inner
                /*var ref = {
                    x: tile.x-1,
                    y: tile.y
                };*/
                ref.x -= 1;
                Engine.addTile(ref.x,ref.y-1,62,cliff);
                Engine.addTile(ref.x+1,ref.y-1,63,cliff);
                Engine.addTile(ref.x,ref.y,77,cliff);
                Engine.addTile(ref.x+1,ref.y,78,cliff);
                Engine.addTile(ref.x,ref.y+1,92,cliff);
                Engine.addTile(ref.x+1,ref.y+1,93,cliff);
                break;
            case 5: // bottom right inner
                Engine.addTile(ref.x-1,ref.y-1,66,cliff);
                Engine.addTile(ref.x,ref.y-1,67,cliff);
                Engine.addTile(ref.x-1,ref.y,81,cliff);
                Engine.addTile(ref.x,ref.y,82,cliff);
                Engine.addTile(ref.x-1,ref.y+1,96,cliff);
                break;
            case 6: // top
                Engine.addTile(ref.x,ref.y-1,randomInt(4,6),cliff);
                break;
            case 7: // right
                Engine.addTile(ref.x,ref.y,52,cliff);
                break;
            case 8: // bottom
                var actualID = randomInt(79,81,cliff);
                Engine.addTile(tile.x,tile.y-1,actualID-15,cliff);
                Engine.addTile(tile.x,tile.y,actualID,cliff);
                Engine.addTile(tile.x,tile.y+1,actualID+15,cliff);
                break;
            case 9: // left
                Engine.addTile(tile.x-1,tile.y,randomElement([32,47]),cliff);
                break;
            case 10: // top right inner
                Engine.addTile(tile.x-1,tile.y,69,cliff);
                Engine.addTile(tile.x-1,tile.y+1,84,cliff);
                break;
            case 11: // top left inner
                ref.y += 1;
                Engine.addTile(ref.x,ref.y,39,cliff);
                Engine.addTile(ref.x,ref.y-1,24,cliff);
                Engine.addTile(ref.x,ref.y+1,54,cliff);
        }
        last = id;
    }

    cliff.hull = Engine.drawHull(pts);
    return cliff;
};

function ptToTile(pt){
    return {
        x: pt.x/Engine.tileWidth,
        y: pt.y/Engine.tileHeight
    };
}

function findTileID(prev,pt,next){
    var inAngle = Geometry.computeAngle(prev,pt,true);
    var outAngle = Geometry.computeAngle(pt,next,true);
    if(inAngle == 90 && outAngle == 180){
        //console.log('top right outer');
        return 0;
    }else if(inAngle == 180 && outAngle == 90){
        //console.log('bottom left outer');
        return 2;
    }else if(inAngle == -90 && outAngle == 0){
        //console.log('bottom left inner');
        return 4;
    }else if(inAngle == 180 && outAngle == -90){
        //console.log('top left outer');
        return 1;
    }else if(inAngle == -90 && outAngle == 180){
        return 3;
    }else if(inAngle == 0 && outAngle == 90){
        //console.log('bottom right inner');
        return 5;
    }else if(inAngle == 180 && outAngle == 180){
        //console.log('top');
        return 6;
    }else if(inAngle == 90 && outAngle == 90){
        //console.log('right');
        return 7;
    }else if(inAngle == 0 && outAngle == 0){
        //console.log('bottom');
        return 8;
    }else if(inAngle == -90 && outAngle == -90){
        //console.log('left');
        return 9;
    }else if(inAngle == 0 && outAngle == -90) {
        //console.log('top right inner');
        return 10;
    }else if(inAngle == 90 && outAngle == 0){
        //console.log('top left inner');
        return 11;
    }
}

Engine.boot();