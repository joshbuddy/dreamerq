require 'benchmark'
require 'lib/charlie'

c = Charlie.new
c.create_feed('testqueue')
c.create_queue('testqueue')
c.bind('testqueue', 'testqueue')

10001.times do
  c.put_message('testqueue', "message1")
end



10.times {
  puts Benchmark.measure {
    1000.times do
      c.select('testqueue')
    end
  }
}