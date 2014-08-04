/* global mocha:true, alert:true, window:true */

(function () {
  'use strict';

  // Send messages to the parent phantom.js process via alert! Good times!!
  function sendMessage() {
    var args = [].slice.call(arguments);
    alert(JSON.stringify(args));
  }

  // Create a listener who'll bubble events from Phantomjs to Grunt
  function createGruntListener(ev, runner) {
    runner.on(ev, function (test, err) {
      var data = {
        err: err
      };

      if (test) {
        data.title = test.title;
        data.fullTitle = test.fullTitle();
        data.state = test.state;
        data.duration = test.duration;
        data.slow = test.slow;
      }

      // if we are done with the tests, see if we are also doing coverage data
      if (ev === 'end' && window.jscoverage_report && document.body.dataset.coverage) {
        sendMessage('debug', 'Attempting to save coverage report data');

        // save coverage data to server, on complete, let phantom know the tests are over
        window.jscoverage_report(function () {
          sendMessage('mocha.' + ev, data);
        });
        return;
      }

      sendMessage('mocha.' + ev, data);
    });
  }

  // 1.4.2 moved reporters to Mocha instead of mocha
  var mochaInstance = window.Mocha || window.mocha;

  var GruntReporter = function (runner) {
    if (!mochaInstance) {
      throw new Error('Mocha was not found, make sure you include Mocha in your HTML spec file.');
    }

    // Setup HTML reporter to output data on the screen
    mochaInstance.reporters.HTML.call(this, runner);

    // Create a Grunt listener for each Mocha events
    var events = [
      'start',
      'test',
      'test end',
      'suite',
      'suite end',
      'fail',
      'pass',
      'pending',
      'end'
    ];

    for (var i = 0; i < events.length; i++) {
      createGruntListener(events[i], runner);
    }
  };

  var Klass = function () {};
  Klass.prototype = mochaInstance.reporters.HTML.prototype;
  GruntReporter.prototype = new Klass();

  var options = window.PHANTOMJS;
  // Default mocha options
  var config = {
      ui: 'bdd',
      ignoreLeaks: true,
      reporter: GruntReporter
    },
    // run = options.run || false,
    key;

  if (options) {
    // If options is a string, assume it is to set the UI (bdd/tdd etc)
    if (typeof options === 'string') {
      config.ui = options;
    } else {
      // Extend defaults with passed options
      for (key in options.mocha) {
        if (options.mocha[key]) {
          config[key] = options.mocha[key];
        }
      }
    }
  }

  mocha.setup(config);

  // task option `run`, automatically runs mocha for grunt only
  //if (run) {
  //  mocha.run();
  //}
}());
