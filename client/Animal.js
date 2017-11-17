/**
 * Created by Jerome on 04-10-17.
 */
var Animal = new Phaser.Class({

    Extends: Moving,

    initialize: function Animal (x, y, type, id) {
        var data = Engine.animalsData[type];
        Moving.call(this,x,y,data.sprite,id);
        this.setFrame(data.frame);
        this.setDisplayOrigin(0);

        // TODO: move to the .json storing animal properties
        this.animsKeys = {
            move_down: 'wolf_move_down',
            move_up: 'wolf_move_up',
            move_right: 'wolf_move_right',
            move_left: 'wolf_move_left'
        };
        this.restingFrames = {
            up: 37,
            down: 1,
            left: 13,
            right: 25
        };
    },

    handleClick: function(){
        Client.startBattle(this.id);
    }
});