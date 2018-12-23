/**
 * Created by Jerome on 14-10-17.
 */

var onServer = (typeof window === 'undefined');

var World = {};

World.setUp = function(nbHoriz,nbVert,chunkW,chunkH,tileW,tileH){
    World.nbChunksHorizontal = nbHoriz;
    World.nbChunksVertical = nbVert;
    World.chunkWidth = chunkW;
    World.chunkHeight = chunkH;
    World.tileWidth = tileW || 32;
    World.tileHeight = tileH || 32;
    World.computeProperties();
};

World.readMasterData = function(data){
    World.setUp(
        data.nbChunksHoriz,data.nbChunksVert,
        data.chunkWidth,data.chunkHeight,
        //data.tilesets[0].tilewidth, data.tilesets[0].tileheight
    );
};

World.computeProperties = function(){
    World.worldWidth = World.chunkWidth*World.nbChunksHorizontal;
    World.worldHeight = World.chunkHeight*World.nbChunksVertical;
    World.lastChunkID = World.nbChunksHorizontal*World.nbChunksVertical - 1;
    console.log('Set up world of size '+World.worldWidth+' x '+World.worldHeight);
};

if (onServer) module.exports.World = World;