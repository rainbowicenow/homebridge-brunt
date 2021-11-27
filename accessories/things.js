var inherits = require("util").inherits;

var Accessory, Service, Characteristic, uuid;

var stateTimeToLive = 60000; // Interval to refresh data from Brunt server (not too often)
var stateRefreshRate = 2000; // Interval for internal status update refresh


/*
 *   Plug Accessory
 */

module.exports = function (oAccessory, oService, oCharacteristic, ouuid) {
	if (oAccessory) {
		Accessory = oAccessory;
		Service = oService;
		Characteristic = oCharacteristic;
		uuid = ouuid;

		inherits(BruntPlugAccessory, Accessory);
		BruntPlugAccessory.prototype.deviceGroup = "plugs";
		BruntPlugAccessory.prototype.loadData = loadData;
		BruntPlugAccessory.prototype.getServices = getServices;
		BruntPlugAccessory.prototype.refreshState = refreshState;
		BruntPlugAccessory.prototype.identify = identify;
	
	}
	return BruntPlugAccessory;
};
module.exports.BruntPlugAccessory = BruntPlugAccessory;

function BruntPlugAccessory(platform, device) {
	
	this.deviceid = device.uri;
	this.name = device.name;
	this.platform = platform;
	this.deviceUri = device.uri;
	this.sessionId = device.session;
	this.log = platform.log;
	this.debug = platform.debug;
	this.state = {};
	
	var idKey = "hbdev:brunt:thing:" + this.deviceid;
	var id = uuid.generate(idKey);
	
	Accessory.call(this, this.name, id);
	var that = this;
	
	// HomeKit does really strange things since we have to wait on the data to get populated
	// This is just intro information. It will be corrected in a couple of seconds.
	that.state.refreshCycle = stateRefreshRate;

	this.loadData();
	this.loadData.bind(this);

	var refreshInterval = setInterval(this.loadData.bind(this), that.state.refreshCycle);

	// AccessoryInformation characteristic
	// Manufacturer characteristic
	this.getService(Service.AccessoryInformation)
		.setCharacteristic(Characteristic.Manufacturer, "brunt.co");
	
	// Model characteristic	
	this.getService(Service.AccessoryInformation)
		.setCharacteristic(Characteristic.Model, "Brunt Plug");
	
	// SerialNumber characteristic
	this.getService(Service.AccessoryInformation)
		.setCharacteristic(Characteristic.SerialNumber, that.deviceid);
	
	// Add plug device
	this.addService(Service.Outlet);	

	// Current state
	this.getService(Service.Outlet)
		.getCharacteristic(Characteristic.On)
}


function refreshState(callback) {
	// This prevents this from running more often
	var that=this;
	var rightnow = new Date();
	//that.log(that.deviceid,":refreshState - timelapse:",(that.state.updatetime) ?(rightnow.getTime() - that.state.updatetime.getTime()) : 0, " - State:\n",that.state);

	// If last update was less than stateTimeToLive return callback
	if ((that.state.updatetime && (rightnow.getTime()-that.state.updatetime.getTime())<stateTimeToLive)) { 
		if (callback !== undefined) callback();
		return
	}

	if (!that.state.updatetime) that.state.updatetime = rightnow;

	// Update the State
	that.platform.api.getState(that.sessionId ,that.deviceid);		
}

function loadData() {
	var that = this;
	this.refreshState(function() { 
	// Refresh the status on home App
		for (var i = 0; i < that.services.length; i++) {
			for (var j = 0; j < that.services[i].characteristics.length; j++) {
				that.services[i].characteristics[j].getValue();
			}
		}
	});		
}


function getServices() {
	return this.services;
}

function identify() {
	this.log("Identify! (name: %s)", this.name);
}
