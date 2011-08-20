var vows = require('vows');
var assert = require('assert');

var dreamerq = require(__dirname + '/../lib/dreamer');

vows.describe('DreamerQ').addBatch({
  'A dreamer queue': {
    topic: function() { return new dreamerq.DreamerQ(); },
    "should not have any feeds": function(topic)  { assert.isEmpty(topic.feeds);  },
    "should not have any queues": function(topic) { assert.isEmpty(topic.queues); },
    "with a feed": {
      topic: function(topic) { topic.createFeed("FEED"); return topic; },
      "should have a feed": function(topic) { assert.isObject(topic.feeds['FEED']); },
      "should have a queue length of 0": function(topic) { assert.equal(0, topic.feeds['FEED'].info().queueLength); },
      "with a message": {
        topic: function(topic) { topic.feeds['FEED'].pushMessage("This is my message"); return topic },
        "should have a queue length of 1": function(topic) { assert.equal(1, topic.feeds['FEED'].info().queueLength); },
        "with a bound queue": {
          topic: function(topic) { 
            topic.createQueue('QUEUE');
            topic.queues['QUEUE'].grantPermission(topic.feeds['FEED']);
            topic.feeds['FEED'].pushMessage("This is another message");
            return topic;
          },
          "should receive a message": function(topic) { assert.equal(1, topic.queues['QUEUE'].info().messagesSize); },
          "should pop a message": function(topic) { topic.queues['QUEUE'].popMessage(function(message) { 
            assert.equal("This is another message", message);
          })},
          "with a popped message": {
            topic: function(topic) { topic.queues['QUEUE'].popMessage(function(message) { return true}); return topic; },
            "should be empty": function(topic) { assert.equal(0, topic.queues['QUEUE'].info().messagesSize); }
          }
        }
      }
    }
  }
}).export(module);;
