var util = require('util');
var helpers = require('./helpers');
var compact = helpers.compact;
var map = helpers.map;

var EventEmitter = require('events').EventEmitter;
var ActionEmitter = function () {
	this.getExitMessage = function (){
		return compact(map(this.listeners('exit'), function (listener) {
			return listener()
		})).join(', ') || undefined;
	}
	return this;
};

util.inherits(ActionEmitter, EventEmitter);

module.exports = ActionEmitter;
