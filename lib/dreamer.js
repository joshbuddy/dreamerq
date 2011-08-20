var events = require('events');
var sys = require('sys');
var fs = require('fs');

require.paths.push(__dirname);

Dreamer = function(timeout) {
  var log4js = require('log4js/lib/log4js.js');
  log4js.addAppender(log4js.fileAppender(__dirname + '/../logs/dreamer.log'), 'Dreamer');
  this.logger = log4js.getLogger('dreamer');
  this.logger.setLevel('DEBUG');

  this.timeout      = timeout;
  this.feeds        = {};
  this.queues       = {};
  this.queueCount   = 0;
  this.feedCount    = 0;
  this.oldestQueue  = null;
  this.newestQueue  = null;
  this.queueCleaner = null;
};

Dreamer.prototype = {
  Server: require('./dreamer/server'),
  Message: require('./dreamer/message'),
  Binding: require('./dreamer/binding'),
  Feed: require('./dreamer/feed'),
  Queue: require('./dreamer/queue'),
  Runner: require('./dreamer/runner'),
  createQueue: function(key) {
    if (this.queues[key]) {
      return this.queues[key];
    } else {
      var dreamer = this;
      var newQueue = new Dreamer.Queue(key, dreamer.timeout);                  
      this.queues[key] = newQueue;                       // add in the queue
      if (this.newestQueue) {                              // append to end of queue list if queue exists
        this.newestQueue.nextQueue = newQueue;
      }
      if (!this.oldestQueue) {                              // append to end of queue list if queue exists
        this.oldestQueue = newQueue;
      }

      this.newestQueue = newQueue;

      newQueue.emitter.addListener('message', function() {
        newQueue.touch();
        var previousQueue = newQueue.previousQueue;
        var nextQueue = newQueue.nextQueue;
        if (dreamer.oldestQueue == newQueue) {
          dreamer.oldestQueue = nextQueue || newQueue;
          dreamer.resetQueueCleaner();
        }

        if (previousQueue) previousQueue.nextQueue = nextQueue;           // relink Queues
        if (nextQueue) nextQueue.previousQueue = previousQueue;
        newQueue.previousQueue = dreamer.newestQueue;  // the previous queue is the prvious tip
        newQueue.nextQueue = null;                       // and there is nothing after it.
        dreamer.newestQueue = newQueue;                  // and now lets set the new tip
      });
      this.resetQueueCleaner()
      this.queueCount++;
      return newQueue;
    }
  },
  resetQueueCleaner: function() {
    if (this.oldestQueue && (this.oldestQueue.expiresAt < new Date().getTime())) {
      var queueToRemove = this.oldestQueue;
      this.oldestQueue = queueToRemove.nextQueue;
      queueToRemove.remove();
      this.queueCount--;
      delete this.queues[queueToRemove.key];
    }
    
    if (this.oldestQueue) {
      var dreamer = this;
      if (this.queueCleaner) clearTimeout(this.queueCleaner);
      var nextCleanupAt = this.oldestQueue.expiresAt - new Date().getTime() + 100;
      this.queueCleaner = setTimeout(function() {dreamer.resetQueueCleaner()}, nextCleanupAt < 0 ? 0 : nextCleanupAt);
    }
  },
  createFeed: function(name, maxFeedSize) {
    var feed = new Dreamer.Feed(maxFeedSize);
    this.feeds[name] = feed;
    this.feedCount++;
    return feed;
  }
};


exports.DreamerQ = Dreamer;

//if (process.argv[2] == 'start') {
//
//  var fd = fs.createWriteStream('server.pid', {flags: 'w'});
//  fd.write(process.getgid());
//  new Dreamer.Server().start();
//} else {
//  //process.kill();
//}
//
//
//var dreamer = new Dreamer(50000);
//
//new Dreamer.Server(dreamer, 7000).start();
//
//var http = require('http');
//server = http.createServer(function(req, res){
//	// your normal server code
//	res.writeHeader(200, {'Content-Type': 'text/html'});
//	res.writeBody('<h1>Hello world</h1>');
//	res.finish();
//});
//server.listen(8080);
//
//new Dreamer.SocketIOServer(dreamer, server, 'test').start();

