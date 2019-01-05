function Chunk(data){
    this.id = data.id;
    this.x = parseInt(data.x);
    this.y = parseInt(data.y);
    this.defaultTile = data.default;
    this.layers = data.layers;
    this.decor = data.decor;
    this.ground = new SpaceMap();
    this.ground.fromList(this.layers[0],true); // true = compact list
    this.tiles = [];
    this.tilesMap = new SpaceMap();
    this.images = [];
    this.displayed = false;
    this.draw();
}

Chunk.prototype.draw = function(){
    // Ground
    for(var x_ = 0; x_ < World.chunkWidth; x_++){
        for(var y_ = 0; y_ < World.chunkHeight; y_++) {
            var tx = this.x + x_;
            var ty = this.y + y_;
            if(this.hasWater(tx,ty)) continue;
            if(this.defaultTile == 'grass') {
                var gs = tilesetData.config.grassSize;
                var t = (tx % gs) + (ty % gs) * gs;
                this.drawTile(tx,ty,tilesetData.config.grassPrefix+'_'+t);
            }
        }
    }
    // Layers
    this.layers.forEach(function(layer){
        layer.forEach(function(data){
            var tile = data[2];
            if(tile === undefined) return;
            var x = this.x + parseInt(data[0]);
            var y = this.y + parseInt(data[1]);
            var name = tilesetData.shorthands[tile];
            if(!(tile in tilesetData.shorthands)) return;
            if(name && name.indexOf('water') != -1) name = tilesetData.config.waterPrefix+name;
            this.drawTile(x, y, name);
        },this);
    },this);
    if(this.tiles.length > 700) console.warn(this.tiles.length); // TODO: remove eventually

    this.decor.forEach(function (data) {
        var x = this.x + parseInt(data[0]);
        var y = this.y + parseInt(data[1]);
        this.drawImage(x, y, data[2]);
    }, this);

    this.displayed = true;
};

Chunk.prototype.has = function(x,y,v){
    var cx = x - this.x;
    var cy = y - this.y;
    return (this.ground.get(cx,cy) == v);
};

Chunk.prototype.hasWater = function(x,y){
    return this.has(x,y,'w');
};

Chunk.prototype.drawTile = function(x,y,tile){
    /*if(BLIT){ // TODO: remove?
        Editor.ground.create(x * World.tileWidth, y * World.tileHeight, tile);
        return;
    }*/
    var sprite = Engine.scene.add.image(x*World.tileWidth,y*World.tileHeight,'tileset',tile);
    sprite.setDisplayOrigin(0,0);
    sprite.tileID = tile;
    this.tiles.push(sprite);
    this.postDrawTile(x,y,tile,sprite);
};

Chunk.prototype.getAtlasData = function(image,data,longname){
    if(longname){
        return tilesetData.atlas[image][data];
    }else {
        if (!(image in tilesetData.shorthands)) return false;
        return tilesetData.atlas[tilesetData.shorthands[image]][data];
    }
};

Chunk.prototype.drawImage = function(x,y,image){
    var img = Engine.scene.add.image(x*World.tileWidth,y*World.tileHeight,'tileset',tilesetData.shorthands[image]);
    img.setDepth(y);
    var anchor = this.getAtlasData(image,'anchor');
    img.setOrigin(anchor.x,anchor.y);
    var collisions = this.getAtlasData(image,'collisions');
    if(collisions) {
        collisions.forEach(function(coll){
            this.addCollision(x+coll[0],y+coll[1]);
        },this);
    }
    this.images.push(img);
};

Chunk.prototype.addCollision = function(cx,cy){
    Engine.collisions.add(cx, cy, 1);
};

Chunk.prototype.erase = function(){
    this.tiles.forEach(function(tile){
        tile.destroy();
    });
    this.images.forEach(function(image){
        image.destroy();
    });
};

Chunk.prototype.postDrawTile = function(){}; // Used in editor