/**
 * Created by Jerome Renaux (jerome.renaux@gmail.com) on 11-02-18.
 */

function Settlement(name,pop){
    this.name = name;
    this.pop = pop;
    this.fort = null;
    this.buildings = [];
}

Settlement.prototype.addBuilding = function(building){
    this.buildings.push(building);
};

Settlement.prototype.getBuildings = function(){
    return this.buildings;
};

Settlement.prototype.setFort = function(fort){
    this.fort = fort;
    this.fort.setProperty('population',this.pop);
    this.fort.setProperty('danger',[
        [453,717],
        [428,703],
        [469,593]
    ])
};

Settlement.prototype.getFort = function(){
    return this.fort;
};

Settlement.prototype.update = function(){
    console.log(this.name+' updating');

    var foodAmount = this.fort.getItemNb(1);
    var foodPerCitizen = 20;
    var required = foodPerCitizen*this.pop;
    var delta = foodAmount - required;
    var pct = delta/required;
    this.fort.setProperty('foodsurplus',pct);

    this.buildings.forEach(function(b){
        b.update();
    });
};

module.exports.Settlement = Settlement;