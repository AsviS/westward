/**
 * Created by Jerome Renaux (jerome.renaux@gmail.com) on 14-02-18.
 */

function BigButton(x,y,text,callback){
    this.slices = [];
    var textX = x + 20;
    this.slices.push(Engine.scene.add.sprite(x,y,'UI','bigbutton_left'));
    x += 41;
    this.slices.push(Engine.scene.add.tileSprite(x,y,4,28,'UI','bigbutton_middle'));
    x += 4;
    this.slices.push(Engine.scene.add.sprite(x,y,'UI','bigbutton_right'));
    this.text = Engine.scene.add.text(textX, y+2, '', { font: '14px belwe', fill: '#ffffff', stroke: '#000000', strokeThickness: 3 });

    this.callback = callback;
    this.text.handleDown = this.handleDown.bind(this);
    this.text.handleClick = this.handleClick.bind(this);
    this.enabled = true;
    this.setText(text);

    var _parent = this;
    this.slices.forEach(function(e){
        e.setDepth(Engine.UIDepth+1);
        e.setScrollFactor(0);
        e.setDisplayOrigin(0,0);
        e.setVisible(false);
        e.setInteractive();
        e.handleDown = _parent.handleDown.bind(_parent);
        e.handleClick = _parent.handleClick.bind(_parent);
        e.handleOver = _parent.handleOver.bind(_parent);
        e.handleOut = _parent.handleOut.bind(_parent);
    });
    this.text.setDepth(Engine.UIDepth+2);
    this.text.setScrollFactor(0);
    this.text.setDisplayOrigin(0,0);
    this.text.setVisible(false);
    this.text.setInteractive();
    this.text.handleOver = _parent.handleOver.bind(_parent);
    this.text.handleOut = _parent.handleOut.bind(_parent);

    this.lastClick = Date.now();
}

BigButton.prototype.setText = function(text){
    var currentWidth = this.text.width;
    this.text.setText(text);
    var newWidth = this.text.width - 45;
    var dw = newWidth - currentWidth;
    this.slices[2].x += dw;
    var body = this.slices[1];
    body.width += dw;
    body.setInteractive();
    body.refWidth = body.width;
    body.refHeight = body.height;
};

BigButton.prototype.handleDown = function(){
    this.slices[0].setFrame('bigbutton_left_pressed');
    this.slices[1].setFrame('bigbutton_middle_pressed');
    this.slices[2].setFrame('bigbutton_right_pressed');
    this.resetSize();
};

BigButton.prototype.handleClick = function(){
    if(Date.now() - this.lastClick > 500){
        this.callback();
        this.lastClick = Date.now();
    }
    this.handleOver();
    Engine.interrupt = true;
};

BigButton.prototype.handleOver = function(){
    this.slices[0].setFrame('bigbutton_left_lit');
    this.slices[1].setFrame('bigbutton_middle_lit');
    this.slices[2].setFrame('bigbutton_right_lit');
    this.resetSize();
};

BigButton.prototype.handleOut = function(){
    this.slices[0].setFrame('bigbutton_left');
    this.slices[1].setFrame('bigbutton_middle');
    this.slices[2].setFrame('bigbutton_right');
    this.resetSize();
};

BigButton.prototype.resetSize = function(){
    var body = this.slices[1];
    body.setSize(body.refWidth,body.refHeight);
    //body.setInteractive();
};

BigButton.prototype.display = function(){
    this.slices.forEach(function(e){
        e.setVisible(true);
    });
    this.text.setVisible(true);
};

BigButton.prototype.hide = function(){
    this.slices.forEach(function(e){
        e.setVisible(false);
    });
    this.text.setVisible(false);
};