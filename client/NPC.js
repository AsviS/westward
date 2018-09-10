/**
 * Created by Jerome Renaux (jerome.renaux@gmail.com) on 01-08-18.
 */

var NPC = new Phaser.Class({

    Extends: Moving,

    initialize: function NPC() {
        Moving.call(this,0,0);
    },

    update: function(data){
        console.warn('updatin');
        Moving.prototype.update.call(this,data);

        var callbacks = {
            'dead': this.die,
            'path': this.queuePath
        };

        for(var field in callbacks){
            if(!callbacks.hasOwnProperty(field)) continue;
            if(field in data) callbacks[field].call(this,data[field]);
        }
    },


    // ### INPUT ###

    handleClick: function(){
        if(BattleManager.inBattle){
            if(Engine.dead) return;
            BattleManager.processEntityClick(this);
        }else{
            Engine.processNPCClick(this);
        }
    },

    setCursor: function(){
        if(!BattleManager.inBattle && Engine.inMenu) return;
        var cursor;
        if(BattleManager.inBattle) {
            if(this.dead){
                cursor = 'cursor';
            }else{
                /*console.warn(this.getRect());
                console.warn(Engine.player.getRect());
                console.warn(Utils.nextTo(Engine.player,this));*/
                cursor = (Utils.nextTo(Engine.player,this) ? 'melee' : Engine.player.getRangedCursor());
            }
        }else{
            cursor = (this.dead ? 'item' : 'combat');
        }
        UI.setCursor(cursor);
        UI.tooltip.updateInfo((this.dead ? 'Dead ' : '')+this.name);
        UI.tooltip.display();
    },

    handleOver: function(){
        UI.manageCursor(1,'npc',this);
    },

    handleOut: function(){
        UI.manageCursor(0,'npc');
        UI.tooltip.hide();
    }
});