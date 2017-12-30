/**
 * Created by Jerome on 07-10-17.
 */

function Menu(title){
    this.container = [];
    this.panels = {};
    this.displayed = false;
    if(title) this.makeTitle(title);
}

Menu.prototype.makeTitle = function(title){
    var textx = 945;
    var texty = 15;

    var text = Engine.scene.add.text(textx, texty, title,
        { font: '32px belwe', fill: '#ffffff', stroke: '#000000', strokeThickness: 3 }
    );
    this.container.push(text);

    var titlex = textx - text.width - 32;
    var titley = 10;
    var x = titlex;
    this.container.push(Engine.scene.add.sprite(x,titley,'UI','title-left'));
    x += 32;
    this.container.push(Engine.scene.add.tileSprite(x,titley,text.width,64,'UI','title-center'));
    x = x+text.width;
    var closeBtn = new UIElement(x,titley,'UI','title-close',this);
    closeBtn.setDownFrame('title-close-pressed');
    this.container.push(closeBtn);

    this.container.forEach(function(e){
        e.setDepth(Engine.UIDepth);
        e.setScrollFactor(0);
        e.setDisplayOrigin(0,0);
        e.setInteractive();
        e.setVisible(false);
    });

    text.setDepth(Engine.UIDepth+1);
    text.setOrigin(1,0);
};

Menu.prototype.addPanel = function(name,panel){
    this.panels[name] = panel;
};

Menu.prototype.display = function(){
    if(Engine.inMenu) Engine.currentMenu.hide();
    if(Engine.inPanel) Engine.currentPanel.hide();

    this.container.forEach(function(e) {
        e.setVisible(true);
    });

    for(var p in this.panels){
        if(!this.panels.hasOwnProperty(p)) continue;
        var panel = this.panels[p];
        panel.display();
    }

    Engine.inMenu = true;
    Engine.currentMenu = this;
    Engine.hideMarker();
    this.displayed = true;
};

Menu.prototype.hide = function(){
    this.container.forEach(function(e) {
        e.setVisible(false);
    });

    for(var panel in this.panels){
        if(!this.panels.hasOwnProperty(panel)) continue;
        this.panels[panel].hide();
    }

    Engine.inMenu = false;
    Engine.currentMenu = null;
    Engine.showMarker();
    this.displayed = false;
};



/*Menu.prototype.refreshPanels = function(){
    for(var i = 0; i < this.panels.length; i++){
        this.panels[i].refreshInventory();
    }
};*/