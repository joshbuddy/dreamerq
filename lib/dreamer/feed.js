var sys = require('sys');
var events = require('events');

Dreamer.Feed = function(maximumQueueLength) {
  require('events').EventEmitter;
  this.queueLength = 0;
  this.maximumQueueLength = maximumQueueLength;
  this.earliestMessage = null;
  this.latestMessage = null;
  this.emitter = new events.EventEmitter();
};

Dreamer.Feed.prototype = {
  pushMessage: function(message) {
    if (this.latestMessage) {
      this.latestMessage.nextMessage = message;
    } else {
      this.earliestMessage = message;
    }
    this.latestMessage = message;
    this.queueLength++;
    this.cleanUpFeed();
    this.emitter.emit('message', message);
  },
  info: function() {
    return {
      queueLength: this.queueLength,
      maximumQueueLength: this.maximumQueueLength,
      listenerCount: this.emitter.listeners('message').length,
      latestMessage: this.latestMessage ? this.latestMessage.payload : null,
      expiresAt: this.expiresAt
    };
  },
  cleanUpFeed: function() {
    while (this.queueLength > this.maximumQueueLength) {
      this.earliestMessage = this.earliestMessage.nextMessage;
      this.queueLength--;
    }
  }
};

