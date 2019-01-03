var express = require('express');
var app = express();
var server = require('http').Server(app);
var bodyParser = require("body-parser");
var io = require('socket.io').listen(server);
var fs = require('fs');
var path = require('path');

var quickselect = require('quickselect'); // Used to compute the median for latency
var mongo = require('mongodb').MongoClient;
var mongoose = require('mongoose');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var myArgs = require('optimist').argv;

// TODO: move to separate file
var userSchema = mongoose.Schema({
    name: {type: String, required: true},
    hash: {type: String, required: true},
    salt: {type: String, required: true}
});

userSchema.methods.setPassword = function(password){
    this.salt = crypto.randomBytes(16).toString('hex');
    this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
};

userSchema.methods.validatePassword = function(password) {
    var hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
    return this.hash === hash;
};

userSchema.methods.generateJWT = function() {
    var today = new Date();
    var expirationDate = new Date(today);
    expirationDate.setDate(today.getDate() + 60);

    return jwt.sign({
        name: this.name,
        id: this._id,
        exp: parseInt(expirationDate.getTime() / 1000, 10)
    }, 'secret');
};

userSchema.methods.toAuthJSON = function() {
    return {
        _id: this._id,
        name: this.name,
        token: this.generateJWT()
    };
};

mongoose.model('User', userSchema);
require('./config/passport');

var gs = require('./server/GameServer.js').GameServer;
gs.server = server;

app.use('/assets',express.static(__dirname + '/assets'));
app.use('/client',express.static(__dirname + '/client'));
app.use('/lib',express.static(__dirname + '/lib'));
app.use('/server',express.static(__dirname + '/server'));
app.use('/shared',express.static(__dirname + '/shared'));
app.use('/maps',express.static(myArgs.maps || path.join(__dirname,'/maps')));
app.use('/admin',express.static(path.join(__dirname,'admin')));
app.use('/editor',express.static(path.join(__dirname,'editor')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
if(process.env.DEV == 1) app.use('/studio',express.static(__dirname + '/studio'));

app.get('/',function(req,res){
    res.sendFile(path.join(__dirname,'index.html'));
});

app.get('/admin',function(req,res){
    res.sendFile(path.join(__dirname,'admin','admin.html'));
});

app.get('/editor',function(req,res){
    res.sendFile(path.join(__dirname,'editor','index.html'));
});

var GEThandlers = {
    //'buildings': gs.getBuildings,
    'events': gs.getEvents,
    'screenshots': gs.getScreenshots
};
var categories = Object.keys(GEThandlers);

categories.forEach(function(cat){
    app.get('/admin/' + cat, function (req, res) {
        console.log('[ADMIN] requesting ' + cat);
        if(!(cat in GEThandlers)) return;
        GEThandlers[cat](function(data){
            if (data.length == 0) {
                res.status(204).end();
            } else {
                res.setHeader('Content-Type', 'application/json');
                res.status(200).send(data).end();
            }
        });
    });
});

var POSThandlers = {
    'deletebuilding': gs.deleteBuilding,
    'dump': gs.dump,
    'newbuilding': gs.insertNewBuilding,
    'setgold': gs.setBuildingGold,
    'setitem': gs.setBuildingItem,
    'setprice': gs.setBuildingPrice,
    'togglebuild': gs.toggleBuild
};
var events = Object.keys(POSThandlers);

events.forEach(function(e){
    app.post('/admin/' + e, function (req, res) {
        console.log('[ADMIN] posting ' + e);
        var data = req.body;
        if(!data){
            res.status(400).end();
            return;
        }
        var result = POSThandlers[e](data);
        if (!result) {
            res.status(500).end();
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.status(201).send().end();
        }
    });
});

if(process.env.DEV == 1) {
    app.get('/studio', function (req, res) {
        res.sendFile(__dirname + '/studio/studio.html');
    });
    app.get('/map', function (req, res) {
        res.sendFile(__dirname + '/studio/gmaps/map.html');
    });
    app.get('/bezier', function (req, res) {
        res.sendFile(__dirname + '/studio/bezier/bezier.html');
    });
}

server.listen(process.env.PORT || 8081,function(){
    console.log('Listening on '+server.address().port);
    mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/westward');
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function() {
        server.db = db;
        console.log('Connection to db established');
        gs.readMap(myArgs.maps || path.join(__dirname,'/maps'),myArgs.test);
    });
});


server.resetStamp = 1519130567967; // ignore returning players with stamps older than this and treat them as new

io.on('connection',function(socket){
    console.log('connect');

    socket.emit('ack');

    socket.on('boot-params',function(data){
        gs.getBootParams(socket,data);
    });

    socket.on('init-world',function(data){ // Sent by client.requestData()
        if(!gs.initialized){
            socket.emit('wait');
            return;
        }
        console.log('['+socket.id+'] Initialized');
        if(!data.stamp || data.stamp < server.resetStamp) data.new = true; // TODO Remove eventually

        console.log(data);
        if(data.new){
            gs.addNewPlayer(socket,data);
        }else{
            gs.loadPlayer(socket,data.id);
        }

        var callbacksMap = {
            'battleAction': gs.handleBattleAction,
            'buildingClick': gs.handleBuildingClick,
            'build': gs.handleBuild,
            'chat': gs.handleChat,
            'commit': gs.handleCommit,
            'craft': gs.handleCraft,
            'exit': gs.handleExit,
            'NPCClick': gs.handleNPCClick,
            'path': gs.handlePath,
            'respawn': gs.handleRespawn,
            'screenshot': gs.handleScreenshot,
            'shop': gs.handleShop,
            'unequip': gs.handleUnequip,
            'use': gs.handleUse,

            'ss': gs.startScript
        };

        var handler = socket.onevent;
        socket.onevent = function(pkt){
            var event = pkt.data[0];
            var data = pkt.data[1];
            console.log(event,data);
            if(callbacksMap.hasOwnProperty(event)) callbacksMap[event](data,socket.id);
            handler.call(this,pkt); // just in case
        };

        /*socket.pings = [];

       socket.on('ponq',function(sentStamp){
           // Compute a running estimate of the latency of a client each time an interaction takes place between client and server
           // The running estimate is the median of the last 20 sampled values
           var ss = server.getShortStamp();
           var delta = (ss - sentStamp)/2;
           if(delta < 0) delta = 0;
           socket.pings.push(delta); // socket.pings is the list of the 20 last latencies
           if(socket.pings.length > 20) socket.pings.shift(); // keep the size down to 20
           socket.latency = server.quickMedian(socket.pings.slice(0)); // quickMedian used the quickselect algorithm to compute the median of a list of values
       });*/
    });

    socket.on('settlement-data',function(){
        socket.emit('settlement-data',gs.listSettlements('selectionTrim'));
    });

    socket.on('camps-data',function(){
        socket.emit('camps-data',gs.listCamps());
    });

    socket.on('disconnect',function(){
        gs.handleDisconnect(socket.id);
    });

    // #########################


    // #########################
    /*if(process.env.DEV == 1) {
        socket.on('mapdata',function(data){
            console.log('Saving changes to chunk '+data.id+'...');
            var dir = __dirname+'/assets/maps/chunks/'; // Replace by env variable
            fs.writeFile(dir+'chunk'+data.id+'.json',JSON.stringify(data.data),function(err){
                if(err) throw err;
                console.log('done'); // replace by counter
            });
        });
    }*/
});

server.sendInitializationPacket = function(socket,packet){
    packet = server.addStamp(packet);
    //if(server.enableBinary) packet = Encoder.encode(packet,CoDec.initializationSchema);
    socket.emit('init',packet);
};

server.sendUpdate = function(socketID,pkg){
    var socket = server.getSocket(socketID);
    pkg = server.addStamp(pkg);
    if(socket) pkg.latency = Math.floor(socket.latency);
    //if(server.enableBinary) pkg = Encoder.encode(pkg,CoDec.finalUpdateSchema);
    if(pkg) io.in(socketID).emit('update',pkg);
};

server.addStamp = function(pkg){
    pkg.stamp = server.getShortStamp();
    return pkg;
};

server.getShortStamp = function(){
    return parseInt(Date.now().toString().substr(-9));
};

server.getSocket = function(id){
    return io.sockets.connected[id]; // won't work if the socket is subscribed to a namespace, because the namsepace will be part of the id
};

server.getNbConnected =function(){
    return Object.keys(gs.players).length;
};

server.quickMedian = function(arr){ // Compute the median of an array using the quickselect algorithm
    var  l = arr.length;
    var n = (l%2 == 0 ? (l/2)-1 : (l-1)/2);
    quickselect(arr,n);
    return arr[n];
};

server.sendID = function(socket,playerID){
    socket.emit('pid',playerID);
};

server.sendError = function(socket){
    socket.emit('serv-error'); // "error" only is a reserved socket.io event name
};

