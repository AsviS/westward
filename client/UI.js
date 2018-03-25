/**
 * Created by Jerome Renaux (jerome.renaux@gmail.com) on 14-03-18.
 */

var UI = {
    key: 'UI',
    tooltipDepth: 20,
    cursor: 'url(/assets/sprites/cursor.png), auto', // image of the mouse cursor in normal circumstances
    bowCursor: 'url(/assets/sprites/bowcursor32.png), auto',
    swordCursor: 'url(/assets/sprites/swordcursor32.png), auto',
    buildingCursor: 'url(/assets/sprites/buildingcursor.png), auto',

    preload: function () {
        UI.scene = this;
        this.input.setGlobalTopOnly(true); // Prevent clicks to bubble down to game scene
        console.log('preloading UI');
        this.load.atlas('UI', 'assets/sprites/ui.png', 'assets/sprites/ui.json');
        this.load.spritesheet('icons2', 'assets/sprites/icons.png',{frameWidth:25,frameHeight:24});
        this.load.json('texts', 'assets/data/texts.json');
        this.load.json('classes', 'assets/data/classes.json');

        if(Client.isNewPlayer()) {
            this.load.image('bigbg', 'assets/sprites/bigbg.png');
            this.load.image('worldmap', 'assets/sprites/worldmap.png');
            this.load.image('compass', 'assets/sprites/compass.png');
            this.load.image('dangersetl', 'assets/sprites/dangersetl.png');
            this.load.image('setlicon', 'assets/sprites/setlicon.png');
            this.load.image('wood', 'assets/sprites/wood.jpg');
        }
    },

    create: function () {
        this.scene.bringToTop();

        this.textures.addSpriteSheetFromAtlas(
            'tooltip',
            {
                atlas: 'UI',
                frame: 'tooltip',
                frameWidth: 13,
                frameHeight: 13,
                endFrame: 8
            }
        );

        UI.tooltip = new Tooltip();
        UI.camera = UI.scene.cameras.main;
        UI.notifications = [];
        UI.textsData = this.cache.json.get('texts');
        UI.classesData = this.cache.json.get('classes');
        UI.setCursor();

        this.input.setTopOnly(false);
        this.input.on('pointermove',function(event){
            if(UI.tooltip) UI.tooltip.updatePosition(event.x,event.y);
        });
        /*this.input.on('gameobjectdown', function (pointer, gameObject) {
            console.warn(gameObject);
        });*/
        if(Client.isNewPlayer()) UI.classMenu = UI.makeClassMenu();

        this.scene.get('boot').updateReadyTick();
    },

    handleNotifications: function(msgs){
        // TODO: add to localstorage for display in character panel
        var i = 0;
        msgs.forEach(function(msg){
            UI.showNotification(msg,i,msgs.length);
            i++;
        });
        // TODO: keep list of displayed notifications
    },

    showNotification: function(msg,i,nb){
        var notif = new Bubble(0,0,true); // TODO: use pool
        notif.update(msg);
        var x = (UI.getGameWidth()-notif.getWidth())/2 - notif.getOrigin();
        var deltay = 10;
        UI.notifications.forEach(function(n){
            deltay += n.getHeight()+10;
        });
        var y = UI.getGameHeight() + deltay;
        notif.updatePosition(x,y);
        notif.setDuration(nb);

        var endy = y - 2*deltay - 30 - 5;
        var tween = UI.scene.tweens.addCounter({
            from: y,
            to: endy,
            duration: 300,
            paused: true,
            ease: 'Quad.easeOut',
            onStart: function(){
                notif.display();
            },
            onUpdate: function(tween){
                notif.updatePosition(x,tween.getValue());
            }
        });

        var delay = i*50;
        setTimeout(function(){
            tween.play();
        },delay);
        UI.notifications.push(notif);
    },

    makeBattleTutorialPanel: function(){
        var h = 200;
        var w = 200;
        var y = UI.getGameHeight()-h;
        var panel = new InfoPanel(0,y,w,h,'Battle tutorial');
        panel.addText(UI.textsData['battle_help']);
        panel.addBigButton('Got it');
        return panel;
    }
};

UI.getConfig = function(){
    return this.scene.sys.game.config;
};

UI.getGameWidth = function(){
    return UI.getConfig().width;
};

UI.getGameHeight = function(){
    return UI.getConfig().height;
};

UI.setCursor = function(cursor){
    UI.scene.sys.game.canvas.style.cursor = (cursor || UI.cursor);
};

UI.makeClassMenu = function() {
    var title = new UIHolder(512,10,'center');
    title.setText(UI.textsData['class_selection_title']);

    var menu = new Menu();
    var desch = 60;
    var classw = 400;
    var classh = 195;
    var padding = 20;
    var tlx = 1024 / 2 - classw - padding;
    var y = 80;
    var x = tlx;
    menu.addPanel('title',title);
    var infow = (2*classw)+padding;
    var info = menu.addPanel('info',new InfoPanel(x, y, infow, desch));
    info.addText(10,10,UI.textsData['class_selection'],Utils.colors.white,14,Utils.fonts.normal);
    y += desch + padding;

    var i = 0;
    for(var classID in UI.classesData){
        this.makeClassPanel(menu,classID,x,y,classw,classh);
        x += classw+padding;
        if(++i == 2){
            i = 0;
            x = tlx;
            y += classh+padding;
        }
    }

    return menu;
};

UI.makeClassPanel = function(menu,classID,x,y,classw,classh){
    var classData = UI.classesData[classID];
    var panel = menu.addPanel('class_'+classID,new ClassPanel(x, y, classw, classh, classData.name));
    panel.setClass(classID);
};

UI.leaveTitleScreen = function(){
    Boot.button.hide();
    UI.scene.tweens.add({
        targets: Boot.title,
        alpha: 0,
        duration: 1000,
        onComplete: function(){
            if(Client.isNewPlayer()){
                UI.displayClassMenu();
            }else {
                UI.launchGame(true);
            }
        }
    });
};

UI.displayClassMenu = function(){
    UI.classMenu.display();
};

UI.selectClass = function(id){
    UI.selectedClass = id;
    var fadeDuration = 500;
    UI.camera.fade(fadeDuration);
    setTimeout(function(){
        UI.classMenu.hide();
        Boot.background.setVisible(false);
        UI.displaySettlementSelectionMenu();
        UI.camera._fadeAlpha = 0;
    },fadeDuration);
};

UI.displaySettlementSelectionMenu =  function(){
    var content = [];
    content.push(UI.scene.add.image(0,0,'wood').setOrigin(0));
    var scroll = UI.scene.add.image(UI.getGameWidth()/2,UI.getGameHeight()/2,'bigbg');
    content.push(scroll);
    scroll.setScale(1.3);
    /*var scrollMask = UI.scene.add.image(UI.getGameWidth()/2,UI.getGameHeight()/2,'bigbg');
    scrollMask.setVisible(false);
    scrollMask.setScale(0.98);*/
    var map = UI.scene.add.image(UI.getGameWidth()/2,UI.getGameHeight()/2,'worldmap');
    content.push(map);
    content.push(UI.scene.add.image(10,0,'compass').setOrigin(0).setScale(0.5));
    //map.setScale(0.75);
    map.x += 50;
    map.y += 150;
    map.mask = new Phaser.Display.Masks.BitmapMask(UI.scene,scroll);

    /*var w = 300;
    var h = 100;
    var panel = new InfoPanel(UI.getGameWidth()-w,UI.getGameHeight()-h,w,h,'Choose a settlement');
    panel.addText(10,15,'Click on one of the green blinking icons for more information about the corresponding settlement.');
    panel.display();*/

    UI.SSmap = map;
    UI.SScontent = content;
    Client.requestSettlementData();

    UI.displatEnemySettlement(480,456);
    UI.displatEnemySettlement(180,36);
    UI.displatEnemySettlement(660,45);
    UI.displatEnemySettlement(120,548);

    var w = 400;
    var h = 220;
    var panel = new InfoPanel((UI.getGameWidth()-w)/2,(UI.getGameHeight()-h)/2,w,h,'Settlement selection');
    panel.addText(10,15,UI.textsData['settlement_intro'],null,14,Utils.fonts.normal);
    panel.addBigButton('Got it');
    panel.display();
    UI.SSpanel = panel;

};

UI.displaySettlements = function(list){
    list.forEach(function(e){
        UI.displaySettlement(e);
    });
};

UI.displatEnemySettlement = function(x,y){
    var icon = UI.scene.add.image(x,y,'dangersetl').setAlpha(0.6);
    icon.setInteractive();
    icon.on('pointerover',function(){
        UI.tooltip.updateInfo('Enemy camp');
        UI.tooltip.display();
    });
    icon.on('pointerout',function(){
        UI.tooltip.hide();
    });
    UI.SScontent.push(icon);
};

UI.displaySettlement = function(data){
    var x = data.x*UI.SSmap.width;
    var y = data.y*UI.SSmap.height;
    var icon = UI.scene.add.image(x,y,'setlicon');
    icon.setInteractive();
    UI.SScontent.push(icon);

    UI.scene.tweens.add({
        targets: icon,
        alpha: 0.2,
        duration: 750,
        yoyo: true,
        delay: 1000,
        loopDelay: 1000,
        loop: -1
    });

    var w = 350;
    var h = 300;
    var panel = new SettlementPanel(UI.getGameWidth()-w,UI.getGameHeight()-h,w,h,data.name);
    panel.setUp(data);

    icon.on('pointerdown',function(){
        if(UI.SSpanel) UI.SSpanel.hide();
        panel.display();
        UI.SSpanel = panel;
    });
    icon.on('pointerover',function(){
        UI.tooltip.updateInfo(data.name);
        UI.tooltip.display();
    });
    icon.on('pointerout',function(){
        UI.tooltip.hide();
    });
};

UI.selectSettlement = function(id){
    UI.selectedSettlement = id;
    var fadeDuration = 500;
    UI.camera.fade(fadeDuration);
    setTimeout(function(){
        UI.SScontent.forEach(function(c){
            c.setVisible(false);
        });
        UI.SSpanel.hide();
        UI.launchGame(false);
    },fadeDuration);
};

UI.launchGame = function(fade){
    var fadeDuration = (fade ? 500: 0);
    if(fade) UI.camera.fade(fadeDuration);
    setTimeout(function(){
        UI.scene.scene.shutdown('boot');
        UI.scene.scene.launch('main');
    },fadeDuration);
};
