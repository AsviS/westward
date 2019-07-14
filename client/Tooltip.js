/**
 * Created by Jerome on 29-11-17.
 */

var Tooltip = new Phaser.Class({

    Extends: Phaser.GameObjects. DOMElement,

    initialize: function Tooltip(){
        Phaser.GameObjects.DOMElement.call(this, UI.scene, 100, 100);
        UI.scene.add.displayList.add(this);

        this.createFromCache('tooltip');
        this.title = this.getChildByID('tooltip_title');
        this.body = this.getChildByID('tooltip_body');
        this.stat_table = this.getChildByID('stat');
        this.base_stat = this.getChildByID('base');
        this.fatigue_modifier = this.getChildByID('fatigue_modifier');
        this.equipment_modifier = this.getChildByID('equipment_modifier');

        this.setOrigin(0);
        this.setScrollFactor(0);
        this.hide();
    },

    updatePosition: function(x,y){
        this.setPosition(x + 10,y + 10);
        if(this.x + this.computeWidth() > UI.getGameWidth()) this.x -= this.computeWidth();
    },

    updateInfo: function(type,data){
        this.clear();
        switch(type){
            case 'building':
                var bld = Engine.buildings[data.id];
                var owner = bld.isOwned() ? 'Your' : bld.ownerName+'\'s';
                this.setTitle(owner+' '+bld.name);
                break;
            case 'free':
                if(data.title) this.setTitle(data.title);
                if(data.body) this.setBody(data.body);
                break;
            case 'item':
                if(data.id == -1) break;
                var item = Engine.itemsData[data.id];
                this.setTitle(item.name ? item.name : '');
                this.setBody(item.desc ? item.desc : '');
                break;
            case 'NPC':
                var npc = data.entityType == 'civ' ? Engine.civs[data.id] : Engine.animals[data.id];
                var name = (npc.dead ? 'Dead ' : '')+npc.name;
                this.setTitle(name);
                break;
            case 'slot':
                var slot = Equipment.slots[data.slot];
                this.setTitle(slot.name);
                this.setBody(slot.desc);
                break;
            case 'stat':
                var stat = Stats[data.stat];
                this.setTitle(stat.name);
                this.setBody(stat.desc);
                this.setStat(data.stat);
                break;
            default:
                break;
        }
    },

    clear: function(){
        this.setTitle('');
        this.setBody('');
        this.stat_table.style.display = 'none';
    },

    setTitle: function(text){
        this.title.innerText = text;
    },

    setBody: function(text){
        this.body.innerText = text;
    },

    setStat: function(stat){
        var statData = Engine.player.getStat(stat);
        this.base_stat.innerText = '= '+statData.getBaseValue(stat);
        var eq = statData.absoluteModifiers[0];
        var fatigue = statData.relativeModifiers[0];
        if(eq || fatigue) {
            this.stat_table.style.display = 'inline';
            if (eq) this.equipment_modifier.innerText = '+' + eq + ' (equipment)';
            if (fatigue) this.fatigue_modifier.innerText = fatigue + '% (vigor)';
            this.equipment_modifier.style.display = (eq ? 'inline' : 'none');
            this.fatigue_modifier.style.display = (fatigue ? 'inline' : 'none');
        }
    },

    getBodyText: function(){
        return this.body.innerText;
    },

    getTitleText: function(){
        return this.title.innerText;
    },

    computeWidth: function(){
        return Math.max(
            Math.min(this.getBodyText().length,40) * 6.5,
            this.getTitleText().length * 8
        );
    },

    display: function(){
        this.setVisible(true);
        this.displayed = true;
    },

    hide: function(){
        this.setVisible(false);
        this.displayed = false;
    }
});

// function Tooltip(){
//     this.x = 100;
//     this.y = 100;
//     this.xOffset = 20;
//     this.yOffset = 10;
//     this.width = 50;
//     this.height = 10;
//     this.MIN_WIDTH = 65;
//     this.container = [];
//     this.icons = [];
//     this.iconsTexts = [];
//     this.modifierTexts = [];
//     this.modifierCounter = 0;
//     this.displayed = false;
//     this.titleText = UI.scene.add.text(this.x+13,this.y+4, '',
//         { font: '14px belwe', fill: '#ffffff', stroke: '#000000', strokeThickness: 3,
//             wordWrap: {width: 250, useAdvancedWrap: true}
//         }
//     );
//     this.descText = UI.scene.add.text(this.x+13,0, '',
//         { font: '13px '+Utils.fonts.normal, fill: '#ffffff', stroke: '#000000', strokeThickness: 3,
//             wordWrap: {width: 250, useAdvancedWrap: true}
//         }
//     );
//     this.makeBody();
//     this.makeStatsIcons();
//     this.container.push(this.titleText);
//     this.container.push(this.descText);
//     this.finalize();
// }

// Tooltip.prototype.makeBody = function(){
//     var sideWidth = 11;
//     var x = this.x;
//     var y = this.y;
//     var w = this.width;
//     var h = this.height;
//     /*this.container.push(UI.scene.add.sprite(x,y,'tooltip',0));
//     x += sideWidth;
//     this.container.push(UI.scene.add.tileSprite(x,y,w,sideWidth,'tooltip',1));
//     x += w;
//     this.container.push(UI.scene.add.sprite(x,y,'tooltip',2));
//     x = this.x;
//     y += sideWidth;
//     this.container.push(UI.scene.add.tileSprite(x,y,sideWidth,h,'tooltip',3));
//     x += sideWidth;
//     this.container.push(UI.scene.add.tileSprite(x,y,w,h,'tooltip',4));
//     x += w;
//     this.container.push(UI.scene.add.tileSprite(x,y,sideWidth,h,'tooltip',5));
//     x = this.x;
//     y += h;
//     this.container.push(UI.scene.add.sprite(x,y,'tooltip',6));
//     x += sideWidth;
//     this.container.push(UI.scene.add.tileSprite(x,y,w,sideWidth,'tooltip',7));
//     x += w;
//     this.container.push(UI.scene.add.sprite(x,y,'tooltip',8));*/
//     this.container.push(UI.scene.add.sprite(x,y,'UI','tooltip_tl'));
//     x += sideWidth;
//     this.container.push(UI.scene.add.tileSprite(x,y,w,sideWidth,'UI','tooltip_top'));
//     x += w;
//     this.container.push(UI.scene.add.sprite(x,y,'UI','tooltip_tr'));
//     x = this.x;
//     y += sideWidth;
//     this.container.push(UI.scene.add.tileSprite(x,y,sideWidth,h,'UI','tooltip_left'));
//     x += sideWidth;
//     this.container.push(UI.scene.add.tileSprite(x,y,w,h,'UI','tooltip_middle'));
//     x += w + 1;
//     this.container.push(UI.scene.add.tileSprite(x,y,sideWidth,h,'UI','tooltip_right'));
//     x = this.x;
//     y += h;
//     this.container.push(UI.scene.add.sprite(x,y,'UI','tooltip_bl'));
//     x += sideWidth;
//     this.container.push(UI.scene.add.tileSprite(x,y+1,w,sideWidth,'UI','tooltip_bottom'));
//     x += w;
//     this.container.push(UI.scene.add.sprite(x,y,'UI','tooltip_br'));
// };

// Tooltip.prototype.makeStatsIcons = function(){
//     var i = 0;
//     for(var stat in Stats) {
//         if (!Stats.hasOwnProperty(stat)) continue;
//         var statData = Stats[stat];
//         if(!statData) {
//             i++;
//             continue;
//         }
//         var x = this.x+15;
//         var y = this.y+(30*(i + 1));
//         var icon = UI.scene.add.sprite(x+3,y,'UI', statData.frame);
//         icon.setOrigin(0.5);
//         var text = UI.scene.add.text(x+20,y+2, '100',
//             { font: '12px belwe', fill: '#ffffff', stroke: '#000000', strokeThickness: 3 }
//         );
//         text.setOrigin(0,0.5);
//         icon.dontDisplay = true;
//         text.dontDisplay = true;
//         this.icons.push(icon);
//         this.iconsTexts.push(text);
//         this.container.push(icon);
//         this.container.push(text);
//         i++;
//     }
// };

// Tooltip.prototype.updateInfo = function(title, text, itemID, stat){
//     if(title) this.titleText.setText(title);
//     text = text || '';
//     var descY = this.y + 4;
//     if(title) descY += 21;
//     if(stat) descY += 25;
//     this.descText.y = descY;
//     this.descText.setText(text);
//     var nbLines = 0;
//     var nbEffects = 0;
//     if(itemID > -1){
//         if(Engine.itemsData[itemID].name == title) { // quick hack to avoid displaying 'stat' when items are in fact buildings
//             var effects = Engine.itemsData[itemID].effects || {};
//             nbEffects = Object.keys(effects).length;
//             this.displayStats(effects, nbEffects);
//             nbLines += nbEffects;
//         }
//     }
//     if(stat) {
//         this.displayModifiers(stat);
//         nbLines++;
//     }
//     this.updateSize(nbLines);
// };

// Tooltip.prototype.getNextText = function() {
//     if (this.modifierCounter >= this.modifierTexts.length) {
//         var t = UI.scene.add.text(0, 0, '', {
//             font: '14px ' + Utils.fonts.fancy,
//             fill: '#ffffff',
//             stroke: '#000000',
//             strokeThickness: 3
//         });
//         t.setDisplayOrigin(0, 0);
//         t.setScrollFactor(0);
//         t.setDepth(UI.tooltipDepth + 2);
//         t.dontDisplay = true;
//         this.container.push(t);
//         this.modifierTexts.push(t);
//     }
//     return this.modifierTexts[this.modifierCounter++];
// };

// Tooltip.prototype.displayStats = function(effects,nbEffects){
//     var i = 0;
//     var descH = this.descText.text ? this.descText.height : 0;
//     for(var stat in Stats) {
//         if (!Stats.hasOwnProperty(stat)) continue;
//         this.icons[i].setVisible((i < nbEffects));
//         this.iconsTexts[i].setVisible((i < nbEffects));
//         if(i < nbEffects){
//             var key = Object.keys(effects)[i];
//             var val = effects[key];
//             var statData = Stats[key];
//             if(!statData) {
//                 console.warn('key not in statData, have stats names changed recently?');
//                 i++;
//                 continue;
//             }
//             if(val > 0) val = "+"+val;
//             // if(statData.suffix) val = val+statData.suffix;
//             var icon = this.icons[i];
//             var text = this.iconsTexts[i];
//             icon.setFrame(statData.frame);
//             text.setText(val);
//             var y = this.y + descH + (32*(i + 1));
//             icon.y = y+2;
//             text.y = y;
//         }
//         i++;
//     }
// };

// // When hovering stats in StatsPanel
// Tooltip.prototype.displayModifiers = function(stat){
//     var statObj = Engine.player.getStat(stat);
//     var y = this.y + 5;
//     var x = this.x + 13;
//     if(this.titleText.text) y += this.titleText.height;
//     statObj.absoluteModifiers.forEach(function(m){
//         var txt = this.makeModifierText(x,y,m,'absolute');
//         x += 40;
//     },this);
//     statObj.relativeModifiers.forEach(function(m){
//         var txt = this.makeModifierText(x,y,m,'relative');
//         x += 20;
//     },this);
// };

// Tooltip.prototype.makeModifierText = function(x,y,value,type){
//     var txt = this.getNextText();
//     var number = value;
//     if(type == 'relative') value = value+'%';
//     if(number >= 0) value = '+'+value;
//     if(number > 0) txt.setFill(Utils.colors.green);
//     if(number == 0) txt.setFill(Utils.colors.white);
//     if(number < 0) txt.setFill(Utils.colors.red);

//     txt.setPosition(x,y);
//     txt.setText(value);
//     txt.setVisible(true);
//     return txt;
// };

// // Called from Engine.trackMouse()
// Tooltip.prototype.updatePosition = function(x,y){
//     x += this.xOffset;
//     y += this.yOffset;
//     if(x > UI.getGameWidth() - this.width - 20) {
//         x -= (this.width+20);
//         y += 20;
//     }
//     if(y > UI.getGameHeight() - this.height - 20){
//         y -= (this.height+20);
//     }
//     var dx = x - this.x;
//     var dy = y - this.y;
//     if(dx == 0 && dy == 0) return;
//     this.container.forEach(function(e){
//         e.x += dx;
//         e.y += dy;
//     });

//     this.x += dx;
//     this.y += dy;
// };

// Tooltip.prototype.updateSize = function(nbLines){
//     var titleW = (this.titleText.text ? this.titleText.width : 0);
//     var titleH = (this.titleText.text ? this.titleText.height : 0);
//     var descW = (this.descText.text ? this.descText.width : 0);
//     var descH = (this.descText.text ? this.descText.height : 0);
//     var w = Math.max(titleW,descW,this.MIN_WIDTH);
//     var h = titleH + descH - 15 + (nbLines*30);
//     var dw = this.width - w;
//     var dh = this.height - h;
//     this.width = w;
//     this.height = h;

//     this.container[1].width = w;
//     this.container[2].x -= dw;

//     this.container[3].height = h;
//     this.container[4].width = w;
//     this.container[4].height = h;
//     this.container[5].x -= dw;
//     this.container[5].height = h;

//     this.container[6].y -= dh;
//     this.container[7].y -= dh;
//     this.container[7].width = w;
//     this.container[8].x -= dw;
//     this.container[8].y -= dh;
// };

// Tooltip.prototype.display = function(){
//     this.container.forEach(function(e){
//         if(!e.dontDisplay) e.visible = true;
//     });
//     this.displayed = true;
// };

// Tooltip.prototype.hide = function(){
//     if(!this.displayed) return;
//     this.titleText.setText("");
//     this.descText.setText("");
//     this.container.forEach(function(e){
//         e.setVisible(false);
//     });
//     this.icons.forEach(function(e){
//         e.setVisible(false);
//     });
//     this.modifierCounter = 0;
//     this.displayed = false;
// };

// Tooltip.prototype.finalize = function(){
//     this.container.forEach(function(e){
//         var isText = (e.constructor.name == 'Text');
//         if(e.depth == 1 || !e.depth) e.setDepth(UI.tooltipDepth);
//         if(isText) e.depth++;
//         e.setScrollFactor(0);
//         if(!e.centered) e.setDisplayOrigin(0,0);
//         e.setVisible(false);
//     });
// };

