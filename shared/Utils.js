/**
 * Created by Jerome on 11-08-17.
 */

var onServer = (typeof window === 'undefined');

var Utils = {
    separator : '_'
};

var W = { // maps position to numerical ID
    topRightOut: 0,
    top: 1,
    topLeftOut: 2,
    left: 3,
    right: 4,
    bottomRightIn: 5,
    bottomLeftOut: 6,
    bottomLeftIn: 7,
    bottom: 8,
    bottomRightOut: 9,
    topRightIn: 10,
    topLeftIn: 11
};

var Shore = { // indexes of tiles in tilesets for shores
    topRight: 249,
    top: 248,
    topLeft: 247,
    left: 268,
    bottomLeft: 289,
    bottom: 290,
    bottomRight: 291,
    right: 270,
    bottomRightOut: 250,
    bottomLeftOut: 251,
    topRightOut: 271,
    topLeftOut: 272,
    water: 292
};

var Cliff = { // indexes of tiles in tilesets for shores
    topRightOut: 21,
    topRightOut_right: 22,
    topRightOut_top: 6,
    topRightOut_btmright: 37,
    topLeftOut: 18,
    topLeftOut_top: 3,
    topLeftOut_left: 17,
    bottomLeftIn: 77,
    bottomLeftIn_right: 78,
    bottomLeftIn_up: 62,
    bottomLeftIn_upright: 63,
    bottomLeftIn_btm: 92,
    bottomLeftIn_btmright: 93,
    bottomRightIn: 82,
    bottomRIghtIn_left: 81,
    bottomRightIn_top: 67,
    bottomRightIn_topLeft: 66,
    bottomRightIn_btmleft: 96,
    top1: 4,
    top2: 5,
    right: 52,
    bottom1: 79,
    bottom2: 80,
    left1: 32,
    left2: 47,
    topRightIn: 69,
    topRightIn_btm: 84,
    topLeftIn_top: 24,
    topLeftIn: 39,
    topLeftIn_btm: 54,
    topLeftIn_alt: 68,
    topLeftIn_altbtm: 83
};

Utils.getPreference = function(parameter,defaultValue){ // Retrieve sorting preferences for localStorage or return a default value
    var pref = localStorage.getItem(parameter);
    if(pref === null) return defaultValue;
    // The following is needed because localStorage stores as text
    if(pref == 'true') return true;
    if(pref == 'false') return false;
    return parseInt(pref);
};

Utils.tileToAOI = function(tile){ // input coords in Tiles
    if(tile.x < 0 || tile.y < 0) console.log('ALERT: negative coordinates');
    var top = Math.floor(tile.y/Utils.chunkHeight);
    var left = Math.floor(tile.x/Utils.chunkWidth);
    return (top*Utils.nbChunksHorizontal)+left;
};

Utils.AOItoTile = function(aoi){
    return {
        x : (aoi%Utils.nbChunksHorizontal)*Utils.chunkWidth,
        y : Math.floor(aoi/Utils.nbChunksHorizontal)*Utils.chunkHeight
    };
};

Utils.gridToLine = function(x,y,w){
    return (y*w)+x;
};

// Returns the x and y offets of a chunk, in chunks, from the top left
Utils.getMacroCoordinates = function(chunk){
    return {
        x: chunk%Engine.nbChunksHorizontal,
        y: Math.floor(chunk/Engine.nbChunksHorizontal)
    }
};

Utils.listVisibleAOIs = function(start){ // List the visible chunks around the player based on zoom level
    var limit;
    switch(Engine.zoomScale){
        case 0.25:
            limit = 3;
            break;
        case 0.1:
            limit = 9;
            break;
        default:
            limit = 0;
            break;
    }
    var current = start;
    var AOIs= [start];
    for(var i = 0; i < AOIs.length; i++){
        var current = AOIs[i];
        if(Geometry.manhattan(Utils.getMacroCoordinates(start),Utils.getMacroCoordinates(current)) > limit) continue;
        var adjacent = Utils.listAdjacentAOIs(current);
        var n = adjacent.diff(AOIs);
        AOIs = AOIs.concat(n);
    }
    return AOIs;
};

Utils.listAdjacentAOIs = function(current){
    if(!Utils.nbChunksHorizontal){
        console.log('ERROR : Chunk data not initialized');
        return [];
    }

    var AOIs = [];
    var isAtTop = (current < Utils.nbChunksHorizontal);
    var isAtBottom = (current > Utils.lastChunkID - Utils.nbChunksHorizontal);
    var isAtLeft = (current%Utils.nbChunksHorizontal == 0);
    var isAtRight = (current%Utils.nbChunksHorizontal == Utils.nbChunksHorizontal-1);
    AOIs.push(current);
    if(!isAtTop) AOIs.push(current - Utils.nbChunksHorizontal);
    if(!isAtBottom) AOIs.push(current + Utils.nbChunksHorizontal);
    if(!isAtLeft) AOIs.push(current-1);
    if(!isAtRight) AOIs.push(current+1);
    if(!isAtTop && !isAtLeft) AOIs.push(current-1-Utils.nbChunksHorizontal);
    if(!isAtTop && !isAtRight) AOIs.push(current+1-Utils.nbChunksHorizontal);
    if(!isAtBottom && !isAtLeft) AOIs.push(current-1+Utils.nbChunksHorizontal);
    if(!isAtBottom && !isAtRight) AOIs.push(current+1+Utils.nbChunksHorizontal);
    return AOIs;
};

Utils.randomInt = function(low, high) { // [low, high[
    return Math.floor(Math.random() * (high - low) + low);
};

function randomNorm(mean,std){
    return randomZ()*std+mean;
}

function randomZ() { // Box-Muller transform to return a random value from a reduced normal
    var u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}

function randomElement(arr){
    return arr[Math.floor(Math.random()*arr.length)];
}
function swapElements(arr,b,c){
    var tmp = arr[b];
    arr[b] = arr[c];
    arr[c] = tmp;
}

function removeElement(v,arr){
    var idx = arr.indexOf(v);
    if(idx > -1) arr.splice(idx,1);
}

function insert(a1,a2,pos){
    a1.splice.apply(a1, [pos, 0].concat(a2));
}

function clamp(x,min,max){ // restricts a value to a given interval (return the value unchanged if within the interval
    return Math.max(min, Math.min(x, max));
}

function coordinatesPairToTile(coords){
    return {
        x: Math.floor(coords.x/Engine.tileWidth),
        y: Math.floor(coords.y/Engine.tileHeight)
    }
}

function coordinatesToCell(v,grid){
    return Math.floor(v/grid);
}

Array.prototype.diff = function(a) { // returns the elements in the array that are not in array a
    return this.filter(function(i) {return a.indexOf(i) < 0;});
};

function printArray(arr){
    console.log(JSON.stringify(arr));
}

if (onServer) module.exports.Utils = Utils;