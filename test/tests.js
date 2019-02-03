/**
 * Created by Jerome Renaux (jerome.renaux@gmail.com) on 06-12-18.
 */
var expect = require('chai').expect;
var request = require('request');
var io = require('socket.io-client');
var path = require('path');
var sinon = require('sinon');

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

    /*it('mock-test',function() {

    });*/
});

describe('GameServer',function(){
    var stubs = [];
    beforeEach(function() {
        // TODO: stub the async calls in initialization sequence?
         gs.readMap(mapsDir); // TODO: read from config
         gs.server = {
             sendError: function(){}
         };
    });

    it('addNewPlayer',function(){
        var errInputs = [{},{new:true}];
        errInputs.forEach(function(input){
            var result = gs.addNewPlayer(null,input);
            expect(result).to.equal(null);
        });

        var result = gs.addNewPlayer(null,{characterName:'Test'});
        expect(result.sid).to.equal(0);
        expect(result.name).to.equal('Test');
        expect(result.id).to.equal(0);
    });

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
