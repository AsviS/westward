/**
 * Created by Jerome on 30-06-17.
 */

Client = {
    initEventName: 'init', // name of the event that triggers the call to initWorld() and the initialization of the game
    eventsQueue : [] // when events arrive before the flag playerIsInitialized is set to true, they are not processed
};

Client.socket = io.connect();

// The following checks if the game is initialized or not, and based on this either queues the events or process them
// The original socket.onevent function is copied to onevent. That way, onevent can be used to call the origianl function,
// whereas socket.onevent can be modified for our purpose!
var onevent = Client.socket.onevent;
Client.socket.onevent = function (packet) {
    if(!Engine.playerIsInitialized && packet.data[0] != Client.initEventName && packet.data[0] != 'dbError'){
        Client.eventsQueue.push(packet);
    }else{
        onevent.call(this, packet);    // original call
    }
};

Client.emptyQueue = function(){ // Process the events that have been queued during initialization
    for(var e = 0; e < Client.eventsQueue.length; e++){
        onevent.call(Client.socket,Client.eventsQueue[e]);
    }
};

Client.getInitRequest = function(){ // Returns the data object to send to request the initialization data
    // In case of a new player, set new to true and send the name of the player
    // Else, set new to false and send it's id instead to fetch the corresponding data in the database
    /*if(Client.isNewPlayer()) return {new:true,name:Client.getName(),clientTime:Date.now()};
    var id = Client.getPlayerID();
    return {new:false,id:id,clientTime:Date.now()};*/
    return {};
};

Client.isNewPlayer = function(){
    var id = Client.getPlayerID();
    var name = Client.getName();
    var armor = Client.getArmor();
    var weapon = Client.getWeapon();
    return !(id !== undefined && name && armor && weapon);
};


// #### RECEIVERS ####

Client.socket.on(Client.initEventName,function(data){ // This event triggers when receiving the initialization packet from the server, to use in Game.initWorld()
    //if(data instanceof ArrayBuffer) data = Decoder.decode(data,CoDec.initializationSchema); // if in binary format, decode first
    //Client.socket.emit('ponq',data.stamp); // send back a pong stamp to compute latency
    Engine.initWorld(data.player);
    //Game.updateNbConnected(data.nbconnected);
});

Client.socket.on('update',function(data){ // This event triggers uppon receiving an update packet (data)
    //if(data instanceof ArrayBuffer) data = Decoder.decode(data,CoDec.finalUpdateSchema); // if in binary format, decode first
    //Client.socket.emit('ponq',data.stamp);  // send back a pong stamp to compute latency
    //if(data.nbconnected !== undefined) Game.updateNbConnected(data.nbconnected);
    //if(data.latency) Game.setLatency(data.latency);
    console.log(data.local);
    console.log(data.global);
    if(data.global) Engine.updateWorld(data.global);
    //if(data.local) Game.updateSelf(data.local);
});

Client.socket.on('move',function(data){
    Engine.moveSprite(data.id,data.x,data.y);
});


/// ##### SENDERS ######

Client.requestData = function(){ // request the data to be used for initWorld()
    Client.socket.emit('init-world',Client.getInitRequest());
};


Client.sendMove = function(x,y){
    Client.socket.emit('move',{x:x,y:y});
};

// ####################"

Client.sendMapData = function(id,data){
    Client.socket.emit('mapdata',{id:id,data:data});
};