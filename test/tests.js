/**
 * Created by Jerome Renaux (jerome.renaux@gmail.com) on 06-12-18.
 */
var expect = require('chai').expect;
var request = require('request');
var io = require('socket.io-client');
var path = require('path');
var sinon = require('sinon');
var mongoose = require('mongoose');

var mapsDir = path.join(__dirname,'..','maps');
var gs = require('../server/GameServer.js').GameServer;

var PORT = 8081; //TODO: read from conf file?

describe('test', function(){
    /*The stub essentially suppresses the call to a method, while allowing to check if it was called
    * and with what arguments. It doesn't provide a mock return value!*/
    it('stub-test',function() {
        var methodB = sinon.stub(gs, 'testMethodB');
        var input = 5;
        var output = gs.testMethodA(input);
        expect(output).to.equal(input);
        methodB.restore();
        sinon.assert.calledWith(methodB, input);
    });
});

describe('GameServer',function(){
    var stubs = [];
    before(function(done) {
        this.timeout(5000);
        mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/westward', { useNewUrlParser: true });
        var db = mongoose.connection;
        db.on('error', console.error.bind(console, 'connection error:'));
        db.once('open', function() {
            console.log('Connection to db established');
            // TODO: read from config
            gs.readMap(mapsDir,false,done); 
            gs.server = {
                getNbConnected: function(){},
                sendError: function(){},
                sendInitializationPacket: function(){},
                sendUpdate: function(){}
            };
        });
    });

    var player;
    it('addNewPlayer',function(){
        var errInputs = [{},{new:true}];
        errInputs.forEach(function(input){
            var result = gs.addNewPlayer(null,input);
            expect(result).to.equal(null);
        });

        var name = 'Test';
        var dummySocket = {id:'socket123',dummy: true};
        player = gs.addNewPlayer(dummySocket,{characterName:name});
        player.setIDs('',dummySocket.id);
        player.spawn(20,20);
        expect(gs.getPlayer(dummySocket.id).id).to.equal(player.id);
        expect(player.socketID).to.equal(dummySocket.id);
        expect(player.name).to.equal(name);
    });

    var animal;
    var animalFarAway;
    it('addAnimal', function(){
        var x = player.x + 3;
        var y = player.y + 3;
        var type = 0;
        animal = gs.addAnimal(x,y,type);
        animalFarAway = gs.addAnimal(0,0,0);
        expect(animal.x).to.equal(x);
        expect(animal.y).to.equal(y);
        expect(animal.type).to.equal(type);
    });

    it('handleBattle_faraway',function(){
        var result = gs.handleBattle(player,animalFarAway);
        expect(result).to.equal(false);
    });

    it('handleBattle_alive',function(){
        var result = gs.handleBattle(player,animal);
        expect(result).to.equal(true);
    });

    it('lootNPC_alive',function(){
        var result = gs.lootNPC(player,'animal',animal.id);
        expect(result).to.equal(false);
    });

    it('animalDie',function(){
       animal.die();
        expect(animal.idle).to.equal(false);
        expect(animal.dead).to.equal(true);
    });

    it('handleBattle_dead',function(){
        var result = gs.handleBattle(player,animal);
        expect(result).to.equal(false);
    });

    it('lootNPC_dead',function(){
        var lootTable = gs.animalsData[animal.type].loot;
        var itemID = Object.keys(lootTable)[0];
        var nb = lootTable[itemID];
        var initNb = player.getItemNb(itemID);
        gs.lootNPC(player,'animal',animal.id);
        expect(player.getItemNb(itemID)).to.equal(initNb+nb);
    });

    var item;
    it('addItem', function(){
        var x = player.x + 3;
        var y = player.y - 3;
        var type = 1;
        item = gs.addItem(x,y,type);
        expect(item.x).to.equal(x);
        expect(item.y).to.equal(y);
        expect(item.type).to.equal(type);
    });

    it('pickUpItem', function(){
        var initNb = player.getItemNb(item.type);
        gs.pickUpItem(player,item.id);
        expect(player.getItemNb(item.type)).to.equal(initNb+1);
    });

    var building;
    it('addBuilding', function(){
        var data = {
            x: player.x - 10,
            y: player.y - 10,
            type: 4
        };
        building = gs.addBuilding(data);
        expect(building.x).to.equal(data.x);
        expect(building.y).to.equal(data.y);
        expect(building.type).to.equal(data.type);
    });

    it('handleShop_out', function(){
        // Should fail because the player is not in the building
        var result = gs.handleShop({},player.socketID);
        expect(result).to.equal(false);
    });

    it('enterBuilding',function(){
        var result = player.enterBuilding(building.id);
        expect(result).to.equal(true);
    });

    it('building_giveItem',function(){
        var itemID = 1;
        var nb = 3;
        var initNb = building.getItemNb(itemID);
        building.giveItem(itemID,nb);
        expect(building.getItemNb(itemID)).to.equal(initNb+nb);
    });

    it('setBuildingPrices',function(){
        building.owner = player.id;
        var itemID = 1;
        var buy = 10;
        var sell = 20;
        gs.setBuildingPrice({item:itemID,buy:buy,sell:sell},player.socketID);
        expect(building.getPrice(itemID,1,'buy')).to.equal(buy);
        expect(building.getPrice(itemID,1,'sell')).to.equal(sell);
    });

    it('handleShop_owner', function(){
        player.inventory.clear();
        building.inventory.clear();
        var nonstoredID = 1;
        var storedID = 5;
        var nonownedID = 3;
        var ownedID = 4;
        building.giveItem(storedID,1);
        player.giveItem(ownedID,1);
        var playerGoldBefore = player.getGold();
        var buildingGoldBefore = building.getGold();
        var testCases = [
            {in: {action:'buy',id:nonstoredID,nb:1},out:false},
            {in: {action:'buy',id:storedID,nb:1},out:true},
            {in: {action:'sell',id:nonownedID,nb:1},out:false},
            {in: {action:'sell',id:ownedID,nb:1},out:true},
        ];
        testCases.forEach(function(testcase){
            var result = gs.handleShop(testcase.in,player.socketID);
            expect(result).to.equal(testcase.out);
        });
        expect(player.getItemNb(storedID)).to.equal(1);
        expect(player.getItemNb(ownedID)).to.equal(0);
        expect(building.getItemNb(storedID)).to.equal(0);
        expect(building.getItemNb(ownedID)).to.equal(1);
        expect(player.getGold()).to.equal(playerGoldBefore);
        expect(building.getGold()).to.equal(buildingGoldBefore);
    });

    it('handleShop_nonowner', function(){
        player.inventory.clear();
        building.inventory.clear();
        building.owner = -1;
        var ownedID = 1;
        var storedID = 2;
        var buyPrice = 10;
        var sellPrice = 15;
        building.giveItem(storedID,1);
        player.giveItem(ownedID,1);
        building.setPrices(storedID,0,sellPrice);
        building.setPrices(ownedID,buyPrice,0);
        var playerGoldBefore = player.getGold();
        var buildingGoldBefore = building.getGold();
        var testCases = [
            {in: {action:'buy',id:storedID,nb:1},out:true},
            {in: {action:'sell',id:ownedID,nb:1},out:true},
        ];
        testCases.forEach(function(testcase){
            var result = gs.handleShop(testcase.in,player.socketID);
            expect(result).to.equal(testcase.out);
        });
        expect(player.getItemNb(storedID)).to.equal(1);
        expect(player.getItemNb(ownedID)).to.equal(0);
        expect(building.getItemNb(storedID)).to.equal(0);
        expect(building.getItemNb(ownedID)).to.equal(1);
        expect(player.getGold()).to.equal(playerGoldBefore-sellPrice+buyPrice);
        expect(building.getGold()).to.equal(buildingGoldBefore-buyPrice+sellPrice);
    });

    it('handleUse_equip', function(){
        player.inventory.clear();
        var type = 28; // stone hatchet
        var typeNotOwned = 2; // bow
        var slot = gs.itemsData[type].equipment;
        var slotNotOwned = gs.itemsData[typeNotOwned].equipment;
        player.giveItem(type,1);
        gs.handleUse({item:type},player.socketID);
        gs.handleUse({item:typeNotOwned},player.socketID);
        expect(player.isEquipped(slot)).to.equal(true);
        expect(player.getEquipped(slot)).to.equal(type);
        expect(player.isEquipped(slotNotOwned)).to.equal(false);
        expect(player.getEquipped(slotNotOwned)).to.equal(-1);
    });

    // TODO: expand test cases + test results with gs methods for all tests

    it('handleGold_owner', function(){
        building.owner = player.id;
        player.gold = 150;
        var playerGoldBefore = player.getGold();
        var buildingGoldBefore = building.getGold();
        var giveAmount = 10;
        var takeAmount = -5;
        gs.handleGold({nb:giveAmount},player.socketID);
        expect(player.getGold()).to.equal(playerGoldBefore - giveAmount);
        expect(building.getGold()).to.equal(buildingGoldBefore + giveAmount);
        gs.handleGold({nb:takeAmount},player.socketID);
        expect(player.getGold()).to.equal(playerGoldBefore - giveAmount - takeAmount);
        expect(building.getGold()).to.equal(buildingGoldBefore + giveAmount + takeAmount);
    });

   /* it('handleGold_nonowner', function(){
           building.owner = -1;
    });*/

    afterEach(function(){
        stubs.forEach(function(stub){
            stub.restore();
        })
    });
});

/*
describe('Server', function () {
    return;
    /!*var client;
    before('socket-client',function(){
        client = io('http://localhost:'+PORT); // https://github.com/agconti/socket.io.tests/blob/master/test/test.js
    });*!/

    it('Run', function (done) {
        request('http://localhost:'+PORT, function(error, response, body) {
            expect(response.statusCode).to.equal(200);
            done();
        });
    });

    var client;
    it('io-connection',function(done){
        client = io('http://localhost:'+PORT); // https://github.com/agconti/socket.io.tests/blob/master/test/test.js
        client.on('ack',function(){
            expect(true).to.equal(true);
            done();
        });
    });

    it('io-init-world-errs',function(done) {
        var errInputs = [{},{new:true}];
        var nbEvts = 0;
        var nbErrs = 0;
        var onevent = client.onevent;
        client.onevent = function (packet) {
            nbEvts++;
            if (packet.data[0] == 'serv-error') nbErrs++;
            if (nbEvts == errInputs.length) {
                expect(nbErrs).to.equal(nbEvts);
                done();
            }
            //onevent.call(this, packet);    // original call
        };
        errInputs.forEach(function(input){
            client.emit('init-world',input);
        });
    });
});*/
