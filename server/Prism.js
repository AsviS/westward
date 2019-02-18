/**
 * Created by Jerome Renaux (jerome.renaux@gmail.com) on 21-03-18.
 */

var GameServer = require('./GameServer.js').GameServer;
var mongoose = require('mongoose');

// All events correspond to *actions* performed by *players*
// Frequency tables and means don't need logging

var eventSchema = new mongoose.Schema({
    pid: {type: Number, min: 0},
    pname: String,
    time: { type: Date, default: Date.now },
    action: {type: String} // Also used in admin
});
var Event = mongoose.model('Event', eventSchema);

/*Event.prototype.toLog = function(){
    return this.__t;
};*/
var TradeEvent = Event.discriminator(
    'TradeEvent',
    new mongoose.Schema({
        price: Number,
        item: Number,
        nb: Number,
        building: Number
    }),
    {discriminatorKey: 'kind'}
);

var UseEvent = Event.discriminator(
    'UseEvent',
    new mongoose.Schema({
        item: Number
    }),
    {discriminatorKey: 'kind'}
);

var PickUpEvent = Event.discriminator(
    'PickUpEvent',
    new mongoose.Schema({
        item: Number
    }),
    {discriminatorKey: 'kind'}
);

var LootEvent = Event.discriminator(
    'LootEvent',
    new mongoose.Schema({
        name: String
    }),
    {discriminatorKey: 'kind'}
);

var ExploreEvent = Event.discriminator(
    'ExploreEvent',
    new mongoose.Schema({
        aoi: Number
    }),
    {discriminatorKey: 'kind'}
);

var BuildingEvent = Event.discriminator(
    'BuildingEvent',
    new mongoose.Schema({
        building: Number
    }),
    {discriminatorKey: 'kind'}
);

var NewBuildingEvent = Event.discriminator(
    'NewBuildingEvent',
    new mongoose.Schema({
        building: Number,
        x: Number,
        y: Number
    }),
    {discriminatorKey: 'kind'}
);

var BattleEvent = Event.discriminator(
    'BattleEvent',
    new mongoose.Schema({
        category: String,
        type: Number
    }),
    {discriminatorKey: 'kind'}
);

var ChatEvent = Event.discriminator(
    'ChatEvent',
    new mongoose.Schema({
        txt: String
    }),
    {discriminatorKey: 'kind'}
);

var ConnectEvent = Event.discriminator(
    'ConnectEvent',
    new mongoose.Schema({
        stl: Number,
        name: String
    }),
    {discriminatorKey: 'kind'}
);

var DisconnectEvent = Event.discriminator(
    'DisconnectEvent',
    new mongoose.Schema(),
    {discriminatorKey: 'kind'}
);

var ServerStartEvent = Event.discriminator(
    'ServerStartEvent',
    new mongoose.Schema(),
    {discriminatorKey: 'kind'}
);

var Prism = {};

Prism.logEvent = function(player,action,data){
    data = data || {};
    data.action = action;
    data.pid = (player ? player.id : null);
    data.pname = (player ? player.name : null);

    var map = {
        'battle': BattleEvent,
        'building': BuildingEvent,
        'buy': TradeEvent,
        'chat': ChatEvent,
        'connect': ConnectEvent,
        'disconnect': DisconnectEvent,
        'explore': ExploreEvent,
        'loot': LootEvent,
        'newbuilding': NewBuildingEvent,
        'pickup': PickUpEvent,
        'sell': TradeEvent,
        'server-start': ServerStartEvent,
        'use': UseEvent
    };
    if(!(action in map)){
        console.warn('PRISM: Unrecognized event');
        return;
    }
    var event = new map[action](data);
    console.log('event : ',event);
    event.save(function(err){
        if(err) throw err;
        console.log('Event logged');
    });
};

/*function getItemData(data){
    var fields = Object.keys(TradeEvent.schema.paths).filter(function(k){
        return k[0] != '_';
    });
    fields.forEach(function(field){
        data[field] = (data[field] !== undefined ? data[field] : GameServer.itemsData[data.item][field]);
    });
    return data;
}*/

module.exports.Prism = Prism;