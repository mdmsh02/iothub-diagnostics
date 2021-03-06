// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict'

const logger = require('../lib').logger;
const iotClient = require('./iotClient');
const deviceManager = require('./deviceManager');
const testService = require('./testService');
const async  = require('async');

var deviceId = 'device' + require('uuid').v4();

function runTest(deviceConnectionString, protocol, label, done) {
  logger.info('');
  logger.info('Starting ' + label + ' Test...');
  iotClient.runTest(deviceConnectionString, protocol, deviceId, function(err) {
    if(err) {
      logger.crit('--> Failed to run ' + label + ' test, error: ' + err);
    } else {
      logger.info('--> Successfully ran ' + label + ' test.');
    }

    // Don't pass out error (if the test completed, it will just state it failed, but still run the next test)
    return done(null, deviceConnectionString);
  });
}

function amqpTest(deviceConnectionString, done) {
  runTest(deviceConnectionString, require('azure-iot-device-amqp').Amqp, 'AMQP', done);
};

function amqpWsTest(deviceConnectionString, done) {
  runTest(deviceConnectionString, require('azure-iot-device-amqp').AmqpWs, 'AMQP-WS', done);
}

function httpTest(deviceConnectionString, done) {
  runTest(deviceConnectionString, require('azure-iot-device-http').Http, 'HTTPS', done);
}

function mqttTest(deviceConnectionString, done) {
  runTest(deviceConnectionString, require('azure-iot-device-mqtt').Mqtt, 'Mqtt', done);
};

function run(iotHubConnectionString, done) {
  async.waterfall([
      // Step 1, start event hub reader
      function(callback) {
        logger.trace('Starting test service.');
        testService.open(iotHubConnectionString, callback);
      },
      // Step 2, create the device
      function(callback) { 
        logger.trace('Registering temporary device');
        deviceManager.createDevice(iotHubConnectionString, deviceId, callback);
      },
      // Step 3, run the tests
      amqpTest,
      amqpWsTest,
      httpTest,
      mqttTest,
      // Step 4, cleanup
      function(deviceConnectionString, callback) {
        logger.trace('Removing temporary device');
        testService.close();
        deviceManager.deleteDevice(iotHubConnectionString, deviceId, callback);
      }
    ],
    done);
};

module.exports = {
  run: run
};
