/**
 * Created by Jerome on 04-10-17.
 */
var Player = new Phaser.Class({

    Extends: Moving,

    initialize: function Player (x, y, texture, id) {
        // Using call(), the called method will be executed while having 'this' pointing to the first argumentof call()
        Moving.call(this,x,y,texture,id);
        this.setFrame(33);
        this.displayOriginX = 16;

        this.bubbleOffsetX = 55;
        this.bubbleOffsetY = 75;
        //this.bubble = new Bubble(this.x-this.bubbleOffsetX,this.y-this.bubbleOffsetY);

        this.animsKeys = {
            move_down: 'player_move_down',
            move_up: 'player_move_up',
            move_right: 'player_move_right',
            move_left: 'player_move_left'
        };

        this.restingFrames = {
            up: 20,
            down: 33,
            left: 52,
            right: 7
        };

        this.destinationAction = null;
    },

    setDestinationAction: function(type,id){
        if(type == 0){
            this.destinationAction = null;
            return;
        }
        this.destinationAction = {
            type: type,
            id: id
        }
    },

    move: function(path){
        if(this.isHero && !this.inFight) Client.sendPath(path,this.destinationAction);
        Moving.prototype.move.call(this,path);
    },

    endMovement: function() {
        Moving.prototype.endMovement.call(this);
        if (this.inFight) Engine.updateGrid();
    },

    getEquipped: function(slot,subSlot){
        return this.equipment[slot][subSlot];
    },

    isAmmoEquipped: function(slot){
        return this.equipment[slot][0] > -1;
    },

    getContainerID: function(slot){
        return this.equipment[slot][0];
    },

    getNbInContainer: function(slot){
        return this.equipment.containers[slot];
    },

    getStat: function(stat){
        return this.stats[stat];
    }

    /*onArrival: function(){
        console.log('arrived');
        if(!this.destinationAction) return;
        if(this.destinationAction.type == 1){
            console.log('Entering building ',this.destinationAction.id);
        }
    }*/
});