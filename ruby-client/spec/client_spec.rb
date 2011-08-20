require 'spec/spec_helper'

describe 'Charlie' do
  
  before(:each) do
    start_server
  end
  
  after(:each) do
    stop_server
  end
  
  it "should connect" do
    c = Charlie.new
  end

  it "should put and retrieve a job" do
    c = Charlie.new
    c.create_feed('test')
    c.create_queue('test')
    c.bind('test', 'test')
    c.put_message('test', 'this is a job')
    c.pop('test').payload.should == 'this is a job'
  end
  
  it "should put and block on a job" do
    c = Charlie.new
    c.create_feed('test')
    c.create_queue('test')

    t = Thread.new do
      c2 = Charlie.new
      job = c2.select('test')
      job.payload.should == 'this is a selected job'
    end

    c.bind('test', 'test')
    c.put_message('test', 'this is a selected job')
    t.join
  end
end