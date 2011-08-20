var sys = require('sys');
var events = require('events');

Dreamer.Binding = function(queue, feed) {
  this.queue           = queue;
  this.feed            = feed;
  this.lastReadMessage = null;
  //sys.debug("queue.messageReceived: "+sys.inspect(queue.messageReceived));

  this.feed.emitter.addListener('message', this.listener = function(message) {
    queue.messageReceived(message);
  });
};

Dreamer.Binding.prototype = {
  remove: function() {
    this.feed.emitter.removeListener('message', this.listener);
  }
}