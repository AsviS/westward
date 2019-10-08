/**
 * Created by jeren on 10-01-18.
 */
import Panel from './Panel'
import UI from './UI'
import WorldMap from './WorldMap'

function MapPanel(x,y,width,height,title,invisible){
    Panel.call(this,x,y,width,height,title,invisible);
    this.mapx = this.x + this.width/2; // Position of map sprite on screen
    this.mapy = this.y + this.height/2;
}

MapPanel.prototype = Object.create(Panel.prototype);
MapPanel.prototype.constructor = MapPanel;

MapPanel.prototype.addBackground = function(texture){
    this.bg = UI.scene.add.sprite(this.mapx,this.mapy,texture);
    this.bg.setDepth(1);
    this.bg.setScrollFactor(0);
    this.bg.setVisible(false);
    this.content.push(this.bg);
    // this.backdrop = UI.scene.add.rectangle(this.mapx, this.mapy, 1024, 576, 0x000000).setDepth(2);
    // UI.backdrop = this.backdrop;
};

MapPanel.prototype.addMap = function(texture,w,h,dragX,dragY){
    this.map = new WorldMap(this.mapx,this.mapy,w,h,dragX,dragY,false);
    this.map.panel = this;
    this.map.addMask(texture);
    this.content.push(this.map);
    return this.map;
};

MapPanel.prototype.addLegend = function(){
    var w = 450;
    var h = 80;
    this.legend = new LegendPanel(0, UI.getGameHeight()-h, w, h, 'Legend');
    this.legend.addButton(w-16,-8,'red','close',this.legend.hide.bind(this.legend),'Close');
    this.legend.moveUp(4);
};

MapPanel.prototype.displayInterface = function(){
    if(this.bg) this.bg.setVisible(true);
    this.map.display();
    if(this.legend) this.legend.display();
};

MapPanel.prototype.display = function(){
    Panel.prototype.display.call(this);
    this.displayInterface();
    // UI.scene.input.topOnly = true;
};

MapPanel.prototype.hide = function(){
    Panel.prototype.hide.call(this);
    this.map.hide();
    if(this.legend) this.legend.hide();
    // UI.scene.input.topOnly = false;
};

// -------------------------------------

function LegendPanel(x,y,width,height,title){
    Panel.call(this,x,y,width,height,title);

    var legend = [
        {icon:'bld2',text:'Buildings'},
        {icon:'bld2own',text:'Your buildings'},
        {icon:'herb',text:'Plants'},
        {icon:'wolf',text:'Animal spots'},
        {icon:'swords',text:'Civ encounters'},
        {icon:'skull',text:'Deaths'},
    ];

    var x = 20;
    var y = 30;
    legend.forEach(function(l,i){
        if(i > 0 && i%2 == 0){
            y = 30;
            x += 140;
        }
        var icon = UI.scene.add.sprite(this.x+x,this.y+y,'mapicons',l.icon);
        icon.setScrollFactor(0);
        icon.setVisible(false);
        this.content.push(icon);

        this.addText(x+15, y-10, l.text);

        y += 25;
    },this);
}

LegendPanel.prototype = Object.create(Panel.prototype);
LegendPanel.prototype.constructor = LegendPanel;

LegendPanel.prototype.display = function(){
    Panel.prototype.display.call(this);
    this.content.forEach(function(c){
        c.setVisible(true);
    });
};

LegendPanel.prototype.hide = function(){
    Panel.prototype.hide.call(this);
    this.content.forEach(function(c){
        c.setVisible(false);
    });
};

export default MapPanel