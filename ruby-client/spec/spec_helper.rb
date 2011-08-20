libdir = File.expand_path("lib")
$:.unshift(libdir) unless $:.include?(libdir)

require 'charlie'

def stop_server
  `killall node`
end

def start_server
  $pid = fork {
    `node ../lib/dreamer.js`
    exit
  }
  sleep(0.5)
end
