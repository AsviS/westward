/**
 * Created by Jerome Renaux (jerome.renaux@gmail.com) on 15-09-19.
 */

import Engine from './Engine'
import Panel from './Panel'
import ShopInventoryPanel from './ShopInventoryPanel'
import Utils from "../shared/Utils";
import UI from "./UI";
import Frame from "./Frame";

import abilitiesData from '../assets/data/abilities.json'

function AbilitiesPanel(x,y,width,height,title,invisible){
    ShopInventoryPanel.call(this,x,y,width,height,title,invisible);
    this.addPagination();
    this.nextPage.depth += 4;
    this.previousPage.depth += 4;

    this.AP = this.addText(10,this.y - 30,'',Utils.colors.white,16);
}

AbilitiesPanel.prototype = Object.create(ShopInventoryPanel.prototype);
AbilitiesPanel.prototype.constructor = AbilitiesPanel;

AbilitiesPanel.prototype.getNextSlot = function(x,y){
    if(this.slotsCounter >= this.slots.length){
        this.slots.push(new AbilitySlot(x,y,285,80));
    }

    return this.slots[this.slotsCounter++];
};

AbilitiesPanel.prototype.refreshPagination = function(){
    var py = this.y + 20;
    this.pagetxts.forEach(function(t){
        t.setVisible(true);
        t.y = py + 10;
    },this);
    this.pagetxts[3].setText(this.nbpages);
    this.pagetxts[1].setText(this.currentPage+1);
    this.nextPage.y = py + 12;
    this.previousPage.y = py + 12;
    if(this.currentPage+1 < this.nbpages) this.nextPage.setVisible(true);
    if(this.currentPage > 0) this.previousPage.setVisible(true);
    this.nothingTxt.y = py + 35;
};

AbilitiesPanel.prototype.updateContent = function(classID){
    if(classID >= 0) this.classID = classID;
    this.capsules['title'].setText(UI.classesData[this.classID].name+' abilities');
    this.hideContent();
    var NB_PER_PAGE = 6;
    
    var abilities = []
    for(var aid in abilitiesData){
        if(abilitiesData[aid].class == classID) abilities.push(aid);
    }

    this.nbpages = Math.max(1,Math.ceil(abilities.length/NB_PER_PAGE));
    this.currentPage = Utils.clamp(this.currentPage,0,this.nbpages-1);
    this.refreshPagination();
    var sloty = this.y + 60;

    var yOffset = 0;
    var xOffset = 0;

    abilities.forEach(function(aid, i){
        if ((i < this.currentPage * NB_PER_PAGE) || (i >= (this.currentPage + 1) * NB_PER_PAGE)) {
            return;
        }
        var slot = this.getNextSlot(this.x + 20 + xOffset, sloty + yOffset);
        slot.display();
        slot.setUp(aid);
        slot.moveUp(5);
        xOffset += 290;
        if((i)%2){
            xOffset = 0;
            yOffset += 90;
        }
    }, this);

    this.AP.setText(Engine.player.ap[this.classID]);
};

AbilitiesPanel.prototype.hideContent = function(){
    this.slots.forEach(function(slot){
        slot.hide();
    });
    this.slotsCounter = 0;
    this.pagetxts.forEach(function(t){
        t.setVisible(false);
    });
    this.nextPage.setVisible(false);
    this.previousPage.setVisible(false);
};

AbilitiesPanel.prototype.display = function(){
    Panel.prototype.display.call(this);
};

// -------------------------------------

function AbilitySlot(x,y,width,height){
    Frame.call(this,x,y,width,height);

    this.name = UI.scene.add.text(this.x + 60, this.y + 10, '', { font: '16px '+Utils.fonts.fancy, fill: '#ffffff', stroke: '#000000', strokeThickness: 3 });

    this.zone = UI.scene.add.zone(this.x,this.y,width,height);
    this.zone.setInteractive();
    this.zone.setOrigin(0);
    this.zone.on('pointerover',function(){
        UI.tooltip.updateInfo('ability',this.aid);
        UI.tooltip.display();
    }.bind(this));
    this.zone.on('pointerout',function(){
        UI.tooltip.hide();
        UI.setCursor();
    }.bind(this));

    this.content = [this.name, this.zone];

    this.addItem();
    this.addCount();
}

AbilitySlot.prototype = Object.create(Frame.prototype);
AbilitySlot.prototype.constructor = AbilitySlot;


AbilitySlot.prototype.addItem = function(){
    this.slot = UI.scene.add.sprite(this.x + 30,this.y+this.height/2,'UI','equipment-slot');
    this.icon = UI.scene.add.sprite(this.x + 30, this.y + this.height/2);
    this.content.push(this.slot);
    this.content.push(this.icon);
};

AbilitySlot.prototype.addCount = function(){
    this.count = UI.scene.add.text(this.x + this.width - 10, this.y + this.height - 25, '0/4', { font: '16px '+Utils.fonts.fancy, fill: '#ffffff', stroke: '#000000', strokeThickness: 3 });
    this.count.setOrigin(1,0);
    this.content.push(this.count);
};

AbilitySlot.prototype.setUp = function(aid){
    var data = abilitiesData[aid];
    // this.icon.setTexture(data.atlas,data.frame);
    var text = data.name;
    this.name.setText(text);
    this.aid = aid;
    this.count.setText(data.cost+' AP');
    this.count.setFill(data.cost <= Engine.player.ap[data.class] ? Utils.colors.green : Utils.colors.red);
};

AbilitySlot.prototype.display = function(){
    Frame.prototype.display.call(this);
    this.content.forEach(function(c){
        c.setVisible(true);
    });
};

AbilitySlot.prototype.hide = function(){
    Frame.prototype.hide.call(this);
    this.content.forEach(function(c){
        c.setVisible(false);
    });
};

export default AbilitiesPanel