var sys = require('sys');
var events = require('events');

Dreamer.Server = function(dreamerInstance, port) {
  this.dreamerInstance = dreamerInstance;
  this.port = port || 7000;
  this.logger = this.dreamerInstance.logger;
};

Dreamer.Server.prototype = {
  start: function() {
    var dreamer = this.dreamerInstance;
    dreamer.logger.info("Dreamer Started...");
    var server = this;
    var net = require('net');
    this.server = net.createServer(function (stream) {
      var bufferedData = undefined;
      var state = 0; // 0 is normal, 1 is listening, 2 is message sending
      var listeners = [];
      var feedListeners = {};
      stream.setEncoding('utf8');
      
      stream.addListener('connect', function () {
        // add listener stoppers.
        stream.write("200 READY\r\n");
      });

      stream.addListener('data', function (data) {
        if (bufferedData) data = bufferedData + data;

        if (matchData = data.match(/^QUIT\r\n/i)) {                                            // QUIT
          stream.end();
          return;
        }

        if (state == 0) {
          if (matchData = data.match(/^get q\r\n/i)) {         // CREATE QUEUE
            stream.write("200 OK");
            stream.write("COUNT "+dreamer.queueCount+"\r\n");
            for(var queueName in dreamer.queues) {
              stream.write(queueName);
              stream.write("\r\n");
            }
          } else if (matchData = data.match(/^get f\r\n/i)) {         // CREATE QUEUE
            stream.write("200 OK");
            stream.write("COUNT "+dreamer.feedCount+"\r\n");
            for(var feedName in dreamer.feeds) {
              stream.write(feedName);
              stream.write("\r\n");
            }
          } else if (matchData = data.match(/^post q\/([a-zA-Z0-9_-]{1,250})\r\n/i)) {         // CREATE QUEUE
            var queueName = matchData[1];
            if (dreamer.queues[queueName]) {
              stream.write("409 QUEUE EXISTS\r\n");
            } else {
              dreamer.createQueue(matchData[1]);
              stream.write("200 OK\r\n");
            }
          } else if (matchData = data.match(/^post f\/([a-zA-Z0-9_-]{1,250})\r\n/i)) {                 // CREATE FEED
            var feedName = matchData[1];
            if (dreamer.feeds[feedName]) {
              stream.write("409 FEED EXISTS\r\n");
            } else {
              dreamer.createFeed(feedName);
              stream.write("200 OK\r\n");
            }
          } else if (matchData = data.match(/^info q\/([a-zA-Z0-9_-]{1,250})\r\n/i)) {         // CREATE QUEUE
            var queueName = matchData[1];
            if (dreamer.queues[queueName]) {
              stream.write("200 OK\r\n");
              var info = dreamer.queues[queueName].info();
              stream.write(JSON.stringify(info));
              stream.write("\r\n");
            } else {
              stream.write("404 QUEUE NOT FOUND\r\n");
            }
          } else if (matchData = data.match(/^info f\/([a-zA-Z0-9_-]{1,250})\r\n/i)) {                 // CREATE FEED
            var feedName = matchData[1];
            if (dreamer.feeds[feedName]) {
              stream.write("200 OK\r\n");
              var info = dreamer.feeds[feedName].info();
              stream.write(JSON.stringify(info));
              stream.write("\r\n");
            } else {
              stream.write("404 FEED NOT FOUND\r\n");
            }
          } else if (matchData = data.match(/^bind f\/([a-zA-Z0-9_-]{1,250}) q\/([a-zA-Z0-9_-]{1,250})\r\n/i)) {                 // JOIN QUEUE
            var feedName = matchData[1];
            var queueName = matchData[2];
            if (!dreamer.queues[queueName]) {
              stream.write("404 QUEUE NOT FOUND\r\n");
            } else if (!dreamer.feeds[feedName]) {
              stream.write("404 FEED NOT FOUND\r\n");
            } else {
              dreamer.queues[queueName].grantPermission(dreamer.feeds[feedName]);
              stream.write("200 OK\r\n");
            }
          } else if (matchData = data.match(/^put f\/([a-zA-Z0-9_-]{1,250})(| \d+)\r\n/i)) {            // PUT MESSAGE
            var feedName = matchData[1];
            if (!dreamer.feeds[feedName]) {
              stream.write("404 FEED NOT FOUND\r\n");
            } else {
              var delay = matchData[2] == '' ? undefined : parseInt(matchData[2]);
              bufferedData = server.parseMessage(feedName, data, stream, delay);
            }
          } else if (matchData = data.match(/^stream f\/([a-zA-Z0-9_-]{1,250})\r\n/i)) {            // LISTEN
            var feedName = matchData[1];
            if (!dreamer.feeds[feedName]) {
              stream.write("404 FEED NOT FOUND\r\n");
            } else if (feedListeners[feedName]) {
              stream.write("409 FEED ALREADY STREAMED\r\n");
            } else {
              stream.write("200 OK\r\n");
              var listener = null;
              dreamer.feeds[feedName].emitter.addListener('message', listener = function(message, queue) {
                server.writeMessage(stream, message);
                queue.seenMessage(message);
              });
              var listenerArray = [dreamer.feeds[feedName].emitter, 'message', listener];
              feedListeners[feedName] = listenerArray;
              listeners.push(listenerArray);
            }
          } else if (matchData = data.match(/^stop f\/([a-zA-Z0-9_-]{1,250})\r\n/i)) {            // LISTEN
            var feedName = matchData[1];
            if (feedListeners[feedName]) {
              var listener = feedListeners[feedName];
              listener[0].removeListener(listener[1], listener[2]);
              stream.write("200 OK\r\n");
            } else {
              stream.write("404 FEED NOT STREAMED\r\n")
            }
          } else if (matchData = data.match(/^get q\/([a-zA-Z0-9_-]{1,250})\r\n/i)) {            // POP
            var queueName = matchData[1];
            if (!dreamer.queues[queueName]) {
              stream.write("404 QUEUE NOT FOUND\r\n");
            } else {
              dreamer.queues[queueName].popMessage(function(message) {
                if (message) {
                  stream.write("200 OK\r\n");
                  server.writeMessage(stream, message, queueName);
                  return true;
                } else {
                  stream.write("404 NO MESSAGE\r\n");
                }
              });
            }
          } else if (matchData = data.match(/^select q\/([a-zA-Z0-9_-]{1,250})\r\n/i)) {            // blocking POP
            var queueName = matchData[1];
            var message = dreamer.queues[queueName].messages.length > 0 ? dreamer.queues[queueName].messages[0] : null;
            if (!dreamer.queues[queueName]) {
              stream.write("404 QUEUE NOT FOUND\r\n");
            } else if (message) {
              stream.write("200 OK\r\n");
              server.writeMessage(stream, message, queueName);
              dreamer.queues[queueName].seenMessage(message);
            } else {
              stream.write("200 OK\r\n");
              var listener = null;
              dreamer.queues[queueName].emitter.addListener('selectMessage', listener = function(message, queue) {
                server.writeMessage(stream, message, queueName);
                queue.seenMessage(message);
              });
              listeners.push([dreamer.queues[queueName].emitter, 'selectMessage', listener]);
            }
          } else if (matchData = data.match(/^PEEK f\/([a-zA-Z0-9_-]{1,250})\r\n/i)) {            // PEEK
            var queueName = matchData[1];
            var message = dreamer.queues[queueName].messages.length > 0 ? dreamer.queues[queueName].messages[0] : null;
            if (message) {
              stream.write("200 OK\r\n");
              server.writeMessage(stream, message);
            } else {
              stream.write("404 NO MESSAGE\n");
            }
          } else {
            stream.write("409 UNRECOGNIZED COMMAND\n" + data);
            dreamer.logger.error(sys.inspect(data));
          }
        }
      });
      stream.addListener('end', function () {
        // add listener stoppers
        for (var listenerIndex in listeners) {
          listeners[listenerIndex][0].removeListener(listeners[listenerIndex][1], listeners[listenerIndex][2]);
        }
        stream.end();
      });
    });
    this.server.listen(this.port, 'localhost');
    dreamer.logger.info("Native Dreamer Server started on "+this.port);
  },
  parseMessage: function(feedName, data, stream, delay) {
    this.logger.debug("get a put message for feedname "+sys.inspect(feedName));
    
    if (bodyMatchData = data.match(/BODY (\d+)\r\n/i)) {
      var expectedPayloadSize = parseInt(bodyMatchData[1]);
      var currentPayloadSize = data.length - bodyMatchData.index - bodyMatchData[0].length - 2;

      this.logger.debug("body is matched .. expectedPayloadSize "+sys.inspect(expectedPayloadSize)+" and currentPayloadSize "+sys.inspect(currentPayloadSize));

      if (currentPayloadSize >= expectedPayloadSize) {
        this.logger.debug("parsing message...");
        var startPayloadIndex = bodyMatchData.index + bodyMatchData[0].length;
        var headerSection = data.substring(matchData[0].length, bodyMatchData.index);
        if (headerSection.match(/(HEADER [a-zA-Z0-9_-]{1,250} .*?\r\n)*/i)) {
          var message = new Dreamer.Message(feedName, data.substring(startPayloadIndex, startPayloadIndex + expectedPayloadSize));
          var headerArray = headerSection.split(/\r\n/);
          if (headerArray.length > 1) {
            for(var i = 0; i < headerArray.length - 1; i++) {
              var match = headerArray[i].match(/HEADER ([a-zA-Z0-9_-]{1,250}) (.*)/i);
              this.logger.debug("parsing header:"+sys.inspect(headerArray[i]));
              this.logger.debug("got back:"+sys.inspect(match));
              message.headers[match[1]] = match[2];
            }
          }
          if (delay) {
            var dreamer = this.dreamerInstance;
            setTimeout(function() {dreamer.feeds[feedName].pushMessage(message);}, delay);
          } else {
            this.dreamerInstance.feeds[feedName].pushMessage(message);
          }
          
          this.logger.debug(sys.inspect(message));
          stream.write("200 OK\r\n");
          return undefined;
        } else {
          stream.write("409 HEADERS MALFORMED\r\n");
          return undefined;
        }
      } else {
        this.logger.debug("body is not long enough yet matched");
        return data;
      }
    } else {
      this.logger.debug("body is not matched");
      return data;
    }
  },
  writeMessage: function(stream, message, queueName) {
    stream.write("MESSAGE f/"+message.feedName);
    if (queueName) {
      stream.write(" q/");
      stream.write(queueName);
    }
    stream.write("\r\n");
    for(var headerName in message.headers) {
      stream.write("HEADER ");
      stream.write(headerName);
      stream.write(" ");
      stream.write(message.headers[headerName]);
      stream.write("\r\n");
    }
    stream.write("BODY ");
    stream.write(message.payload.length.toString());
    stream.write("\r\n");
    stream.write(message.payload);
    stream.write("\r\n");
  }
};


