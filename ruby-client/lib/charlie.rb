require 'socket'

class Charlie

  Message = Struct.new(:payload)

  class Queue
    attr_reader :name
    def initialize(base, name)
      @base, @name = base, name
    end
    
  end

  class Feed
    attr_reader :name
    def initialize(base, name)
      @base, @name = base, name
    end

    def bind(queue)
      @base.bind(name, queue.name)
    end
  end

  def initialize
    @socket = TCPSocket.open('localhost', 7000)
    line = @socket.gets
    raise unless line == "200 READY\r\n"
  end

  def create_queue(name)
    @socket.print "post q/#{name}\r\n"
    line = @socket.gets.chop
    case line
    when /^200/
      Queue.new(self, name)
    when /^(4..) (.*)/
      raise "Something went wrong #{$2} - #{$1}"
    else
      raise "Something unexpected happened #{line.inspect}"
    end
  end

  def create_feed(name)
    @socket.print "post f/#{name}\r\n"
    line = @socket.gets.chop
    case line
    when /^200/
      true
    when /CLIENT ERROR - (.*)/
      raise "Something went wrong - #{$1}"
    else
      raise "Something unexpected happened #{line.inspect}"
    end
  end

  def bind(feed, queue)
    @socket.print "bind f/#{feed} q/#{queue}\r\n"
    line = @socket.gets.chop
    case line
    when /^200/
      true
    when /CLIENT ERROR - (.*)/
      raise "Something went wrong - #{$1}"
    else
      raise "Something unexpected happened #{line.inspect}"
    end
  end

  def pop(queue)
    @socket.print "get q/#{queue}\r\n"
    body = ''
    until (line = @socket.gets).match(/BODY (\d+)\r\n/i)
      #puts "on line #{line}"
      # do something
    end
    
    size = $1.to_i
    
    until body.size >= size
      body << @socket.gets
    end
    
    body.slice!(size, body.size - size)
    Message.new(body)
    
  end

  def select(queue)
    @socket.print "select q/#{queue}\r\n"
    body = ''
    until (line = @socket.gets).match(/BODY (\d+)\r\n/i)
      #puts "on line #{line}"
      # do something
    end
    
    size = $1.to_i
    
    until body.size >= size
      body << @socket.gets
    end
    
    body.slice!(size, body.size - size)
    Message.new(body)
    
  end

  def put_message(name, payload)
    @socket.print "put f/#{name}\r\n"
    @socket.print "body #{payload.size}\r\n"
    @socket.print payload
    @socket.print "\r\n"
    line = @socket.gets.chop
    case line
    when /^200/
      true
    when /CLIENT ERROR - (.*)/
      raise "Something went wrong - #{$1}"
    else
      raise "Something unexpected happened #{line.inspect}"
    end
  end

  def listen
    begin
      while line = @socket.gets
        yield line
      end
    ensure
      @socket.print "STOP\r\n"
    end
  end

end