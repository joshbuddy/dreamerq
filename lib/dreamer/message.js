var sys = require('sys');
var events = require('events');

Dreamer.Message = function(feedName, payload) {
  this.feedName = feedName;
  this.payload = payload;
  this.nextMessage = null;
  this.headers = {};
}

