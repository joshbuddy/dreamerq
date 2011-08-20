var sys = require('sys');
var events = require('events');

Dreamer.Queue = function(key, timeout) {
  require('events').EventEmitter;
  
  this.timeout         = timeout;
  this.key             = key;
  this.previousQueue   = null;
  this.nextQueue       = null;
  this.queueMatch      = null;
  this.bindings        = {};
  this.messages        = [];
  this.emitter         = new events.EventEmitter();
  this.touch();
};

Dreamer.Queue.prototype = {
  authorized: function(queue) {
    return (this.queueMatch && this.queueMatch.indexOf(queue.name) != -1) || this.permissions[queue.name];
  },
  grantPermission: function(queue) {
    this.bindings[queue.name] = new Dreamer.Binding(this, queue);
  },
  popMessage: function(callback) {
    var message = this.messages.length > 0 ? this.messages[0] : null;
    if (message) {
      if (callback(message)) this.seenMessage(message);
    } else {
      callback(false);
    }
  },
  info: function(message) {
    return {
      timeout: this.timeout,
      key: this.key,
      bindings: this.bindings.length,
      messagesSize: this.messages.length,
      expiresAt: this.expiresAt
    };
  },
  messageReceived: function(message) {
    this.messages.push(message);
    this.emitter.emit('message', message, this);

    //sys.debug("message received --> "+sys.inspect(message));

    var selectMessageListeners = this.emitter.listeners('selectMessage');
    //sys.debug(sys.inspect(selectMessageListeners));
    if (selectMessageListeners && selectMessageListeners.length > 0) {
      var selectMessage = selectMessageListeners.pop();
      //sys.debug(sys.inspect(selectMessage));
      selectMessage(message, this);
    }
  },
  seenMessage: function(message) {
    while (this.messages.length > 0 && this.messages.shift() != message) { }
  },
  touch: function() {
    this.expiresAt = this.timeout + new Date().getTime();
  },
  remove: function() {
    for (var permissionsIdx in this.permissions) {
      var permission = this.permissions[permissionsIdx];
      permission.remove();
    }
    this.emitter.removeAllListeners('message');
  }
};

