# Dreamer Queue

This is a queue for rapid prototyping queue ideas. Because it's written in node, it's easy to peel in and try things out!

The protocol spec is in SPEC.txt. Check that out if you want to see the full specification.

## Usage

The protocol is heavily inspired by REST, memcached and beanstalkd. You basically define feeds, queues and push messages.

Here is some obligatory ascii-art.

~~~~~~~~~~~

                        +--------------------+
    Message +---------> | Feed               |            +------------+
                        |--------------------+----------->| Queue      |
                        |                    |            +------------+
                        | Holds on to        |            +------------+
                        | messages           +----------->| Queue      |
                        |                    |            +------------+
                        |                    |            +------------+
                        |                    +----------->| Queue      |
                        +----------+---------+            +------------+
                                   |
                                   |
                                   v

                              Listeners

~~~~~~~~~~~

Each message coming into the feed gets fanned out to each queue. Each queue is named and bound to a feed. Queues are independent of each other.

There is a Ruby client in the `ruby-client` folder. Way more stuff coming soon.