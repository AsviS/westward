/**
 * Created by Jerome on 28-11-17.
 */

function EquipmentPanel(x,y,width,height,title,battleMenu){
    Panel.call(this,x,y,width,height,title);
    this.slots = {};
    this.battleMenu = battleMenu;
    this.addEquipment();
}

EquipmentPanel.prototype = Object.create(Panel.prototype);
EquipmentPanel.prototype.constructor = EquipmentPanel;

EquipmentPanel.prototype.addEquipment = function(){
    /*var xoffset = (this.battleMenu ? 10 : -40);
    var yoffset = (this.battleMenu? 10 : 0);
    for(var equip in Equipment.dict){
        if(!Equipment.dict.hasOwnProperty(equip)) continue;
        var eq = Equipment.dict[equip];
        if(this.battleMenu && !eq.showInBattle) continue;
        this.slots[equip] = [];
        for(var i = 0; i < eq.nb; i++) {
            var xinc = eq.xincrement || 0;
            var xpos = (this.battleMenu ? eq.battlex : eq.x);
            var x = xpos+(i*xinc)+xoffset;
            var y = (this.battleMenu ? eq.battley : eq.y) + yoffset;
            var displayName = eq.nb > 1 ? eq.name+' '+(i+1) : eq.name;
            this.slots[equip].push(this.addEquipSlot(x,y,displayName,eq.desc,eq.shade,eq.containedIn,equip,i));
        }
    }*/
    for(var slot in Equipment.slots){
        this.makeSlots(Equipment.slots[slot]);
    }
    for(var container in Equipment.containers){
        this.makeSlots(Equipment.containers[container]);
    }
    for(var ammo in Equipment.ammo){
        this.makeSlots(Equipment.ammo[ammo],true);
    }
    this.updateEquipment();
};

EquipmentPanel.prototype.makeSlots = function(label,data,displayNumber){
    if(this.battleMenu && !data.showInBattle) return;
    var xoffset = (this.battleMenu ? 10 : -40);
    var yoffset = (this.battleMenu? 10 : 0);
    var x = (this.battleMenu ? data.battlex : data.x) + xoffset;
    var y = (this.battleMenu ? data.battley : data.y) + yoffset;
    this.slots[label].push(this.addEquipSlot(x,y,data.name,data.desc,data.shade,displayNumber,label));
};

EquipmentPanel.prototype.addEquipSlot = function(x,y,name,desc,shade,displayNumber,slotName){
    var slotObj = {};
    var slot = UI.scene.add.sprite(this.x+x,this.y+y,'UI','equipment-slot');
    var item = new ItemSprite(this.x+x+20,this.y+y+20);
    slot.setInteractive();
    slot.on('pointerover',UI.tooltip.display.bind(UI.tooltip));
    slot.on('pointerout',UI.tooltip.hide.bind(UI.tooltip));
    slot.on('pointerup',Engine.unequipClick.bind(slotObj));
    slot.setDepth(1);
    slot.setScrollFactor(0);
    slot.setDisplayOrigin(0,0);
    slot.setVisible(false);

    if(displayNumber){
        var text = UI.scene.add.text(this.x+x+38, this.y+y+19, '0',{font: '14px belwe', fill: '#ffffff', stroke: '#000000', strokeThickness: 3});
        text.setOrigin(1,0);
        text.setScrollFactor(0);
        text.setVisible(false);
        text.setDepth(3);
        slotObj.text = text;
        this.content.push(text);
    }

    slotObj.id = -1; // id of the item
    slotObj.slot = slot; // slot sprite
    slotObj.item = item; // item sprite
    slotObj.shade = shade; // name of the shade frame
    slotObj.name = name; // name for the tooltip
    slotObj.desc = desc;
    slotObj.slotName = slotName; // name of the slot
    this.content.push(slot);
    this.content.push(item);
    return slotObj;
};

EquipmentPanel.prototype.updateEquipment = function(){
    this.slots.forEach(function(slot){
        var newItem = Engine.player.getEquipped(slot.slotName);
        var currentItem = slot.id;
        if(newItem == currentItem) return;
        var data;
        if(newItem == -1){
            data = {
                id: -1,
                atlas: 'UI',
                frame: slot.shade+'-shade',
                name: slot.name,
                desc: slot.desc
            };
        }else{
            data = Engine.itemsData[newItem];
        }
        slot.item.setUp(newItem,data);
        slot.id = newItem;

        if(slot.text){
            if(newItem > -1) {
                slot.text.setText(Engine.player.getNbAmmo(slot.slotName));
                if(this.displayed){
                    var capacity = Engine.player.getMaxAmmo(slot.slotName);
                    //this.displayCountText(slot.text,Engine.player.getContainerID(eq.containedIn),equip);
                }
            }else{
                slot.text.setVisible(false);
            }
        }
    },this);
    /*for(var equip in Equipment.dict) {
        if (!Equipment.dict.hasOwnProperty(equip)) continue;
        var eq = Equipment.dict[equip];
        if(this.battleMenu && !eq.showInBattle) continue;
        for(var i = 0; i < eq.nb; i++) {
            var newItem = Engine.player.getEquipped(equip,i);
            var currentItem = this.slots[equip][i];
            if(newItem != currentItem.id){
                var data;
                if(newItem == -1){
                    data = {
                        id: -1,
                        atlas: 'UI',
                        frame: currentItem.shade+'-shade',
                        name: currentItem.name,
                        desc: currentItem.desc
                    };
                }else{
                    data = Engine.itemsData[newItem];
                }
                currentItem.item.setUp(newItem,data);
                currentItem.id = newItem;
            }
            if(eq.containedIn ) {
                if(newItem > -1) {
                    currentItem.text.setText(Engine.player.getNbInContainer(eq.containedIn));
                    if(this.displayed) this.displayCountText(currentItem.text,Engine.player.getContainerID(eq.containedIn),equip);
                }else{
                    currentItem.text.setVisible(false);
                }
            }
        }
    }*/
};

EquipmentPanel.prototype.displayCountText = function(text,item,slot){
    var nb = Engine.player.getNbInContainer(slot);
    var capacity = Engine.itemsData[item].capacity;
    text.setVisible(true);
    var color = (nb == capacity ? '#ffd700' : '#ffffff');
    text.setFill(color);
};

EquipmentPanel.prototype.displaySlots = function(){
    // Each entry of the map is a list of slotObj for the corresponding equipment slot
    for(var equip in Equipment.dict){
        if(!Equipment.dict.hasOwnProperty(equip)) continue;
        var eq = Equipment.dict[equip];
        if(this.battleMenu && !eq.showInBattle) continue;
        for(var i = 0; i < this.slots[equip].length; i++){
            var s = this.slots[equip][i];
            s.item.setVisible(true);
            s.slot.setVisible(true);
            if(s.text && Engine.player.isAmmoEquipped(equip)) this.displayCountText(s.text,Engine.player.getContainerID(eq.containedIn),equip);
        }
    }
};

EquipmentPanel.prototype.display = function(){
    Panel.prototype.display.call(this);
    this.displaySlots();
};