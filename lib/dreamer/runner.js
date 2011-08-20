var daemon = require("daemon"),
    fs     = require("fs");

Dreamer.Runner = function(args) {
  if (args === undefined) args = process.argv.slice(2, process.argv.length);
  var mode = args[0];

  var banner = "Dreamerq (start|stop) [-v] [-lLOGFILE] [-pPORT] [-d]\n"+
    "  -v   Verbose\n"+
    "  -l   Log file (default /tmp/dreamerq.log)\n" +
    "  -p   Port (default 7000)\n" +
    "  -s   Queue max size (default 50000)\n";

  var opts = {daemonize: false, verbose: false, logFile: '/tmp/dreamerq.log', pidFile: '/tmp/dreamerq.pid', queueSize: 50000};
  for (var i = 1; i < args.length; i++) {
    if (args[i] == '-d') {
      opts.daemonize = true;
    } else if (args[i] == '-v') {
      opts.verbose = true;
    } else if (args[i] == '-?' || args[i] == '--help' || args[i] == '-h') {
      console.log(banner);
      process.exit(0);
    } else if (args[i].slice(0, 2) == '-s') {
      opts.queueSize = args[i].slice(2, args[i].length - 2);
    } else if (args[i].slice(0, 2) == '-l') {
      opts.logFile = args[i].slice(2, args[i].length - 2);
    } else if (args[i].slice(0, 2) == '-p') {
      opts.pidFile = args[i].slice(2, args[i].length - 2);
    } else {
      throw("I don't understand " +args[i]);
    }
  }

  switch(mode) {
    case "start":
      if (opts.daemonize) {
        daemon.start(process.stdout);
        daemon.lock(opts.pidFile);
      }
      var dreamer = new Dreamer(50000);
      new Dreamer.Server(dreamer, opts.port).start();
      break;
    case "stop":
      var pid = fs.readFileSync(opts.pidFile);
      console.log("Stopping dreamerq")
      process.kill(pid);
      fs.unlink(opts.pidFile);
      process.exit(0);
    default:
      console.log(banner);
      console.log("Unknown mode "+mode+", must be start or stop");
      process.exit(1);
    
  }
}
