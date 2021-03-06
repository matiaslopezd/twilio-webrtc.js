/* eslint-disable no-undefined */
/* eslint no-process-env:0 */
'use strict';

const isDocker = require('is-docker')();
const { basename } = require('path');

let testRun = 0;
function generateReportName(files) {
  const strTestRun = (testRun++).toString();

  // generate reportname like: BROWSER-chrome-BVER-beta
  let strReportName = '';
  ['BROWSER', 'BVER'].forEach(dim => {
    if (process.env[dim]) {
      const dimArr = dim.substr(0, 2);
      strReportName += `-${dimArr}-${process.env[dim]}`;
    }
  });

  if (files.length === 1) {
    // when testing single files include its name in the report.
    strReportName += '-FILE-' + basename(files[0], '.js');
  } else {
    // otherwise include uniq test run number.
    strReportName += '-' + strTestRun;
  }

  return strReportName;
}


function makeConf(defaultFile, browserNoActivityTimeout, requires) {
  browserNoActivityTimeout = browserNoActivityTimeout || 30000;
  return function conf(config) {
    let files = [];
    if (process.env.FILE) {
      files = [process.env.FILE];
    } else if (config.files && config.files.length) {
      files = config.files;
    } else if (defaultFile) {
      files = [defaultFile];
    }

    const preprocessors = files.reduce((preprocessors, file) => {
      return Object.assign({ [file]: 'browserify' });
    }, {});

    let browsers = {
      chrome: [isDocker ? 'ChromeInDocker' : 'ChromeWebRTC'],
      edge: ['EdgeWebRTC'],
      electron: ['ElectronWebRTC'],
      firefox: [isDocker ? 'FirefoxInDocker' : 'FirefoxWebRTC'],
      safari: ['Safari']
    };

    if (process.env.BROWSER) {
      browsers = browsers[process.env.BROWSER];
      if (!browsers) {
        throw new Error('Unknown browser');
      }
    } else if (process.platform === 'darwin') {
      browsers = ['ChromeWebRTC', 'ElectronWebRTC', 'FirefoxWebRTC', 'Safari'];
    } else {
      browsers = ['ChromeWebRTC', 'FirefoxWebRTC'];
    }

    const strReportName = generateReportName(files);
    const htmlReport = `../logs/${strReportName}.html`;

    config.set({
      basePath: '',
      frameworks: ['browserify', 'mocha'],
      client: {
        mocha: {
          require: requires
        }
      },
      files,
      preprocessors,
      browserify: {
        debug: !!process.env.DEBUG,
        transform: [
          'envify'
        ]
      },
      reporters: ['spec', 'junit', 'html'],
      htmlReporter: { // configuration for karma-htmlfile-reporter
        outputFile: htmlReport,
        pageTitle: 'twilio-webrtc.js Integration Tests',
        subPageTitle: strReportName,
        groupSuites: true,
        useCompactStyle: true,
        useLegacyStyle: true,
        showOnlyFailed: false, // switch this to true to only collect failures in the report files.
      },
      junitReporter: {
        outputDir: '../logs', // results will be saved as $outputDir/$browserName.xml
        outputFile: strReportName + '.xml', // if included, results will be saved as $outputDir/$browserName/$outputFile
        suite: '', // suite will become the package name attribute in xml testsuite element
        useBrowserName: true, // add browser name to report and classes names
        nameFormatter: undefined, // function (browser, result) to customize the name attribute in xml testcase element
        classNameFormatter: undefined, // function (browser, result) to customize the classname attribute in xml testcase element
        properties: {}, // key value pair of properties to add to the <properties> section of the report
        xmlVersion: null // use '1' if reporting to be per SonarQube 6.2 XML format
      },
      port: 9876,
      colors: true,
      logLevel: config.LOG_DEBUG,
      autoWatch: true,
      browsers,
      singleRun: !process.env.DEBUG,
      concurrency: 1,
      browserNoActivityTimeout,
      customLaunchers: {
        ChromeInDocker: {
          base: 'ChromeHeadless',
          flags: [
            '--no-sandbox',
            '--autoplay-policy=no-user-gesture-required',
            '--use-fake-device-for-media-stream',
            '--use-fake-ui-for-media-stream'
          ]
        },
        ChromeWebRTC: {
          base: 'Chrome',
          flags: [
            '--no-sandbox',
            '--use-fake-device-for-media-stream',
            '--use-fake-ui-for-media-stream',
            '--js-flags="--expose-gc"'
          ]
        },
        EdgeWebRTC: {
          base: 'Edge',
          flags: [
            '--autoplay-policy=no-user-gesture-required',
            '--use-fake-device-for-media-stream',
            '--use-fake-ui-for-media-stream'
          ]
        },
        ElectronWebRTC: {
          base: 'Electron',
          flags: ['--default-user-agent'],
        },
        FirefoxInDocker: {
          base: 'Firefox',
          flags: [
            '-headless',
          ],
          prefs: {
            'media.gstreamer.enabled': false,
            'media.navigator.permission.disabled': true,
            'media.navigator.streams.fake': true,
            'media.autoplay.enabled.user-gestures-needed': false,
            'media.block-autoplay-until-in-foreground': false,
            'media.getusermedia.insecure.enabled': true,
            'media.devices.insecure.enabled': true
          }
        },
        FirefoxWebRTC: {
          base: 'Firefox',
          prefs: {
            'media.gstreamer.enabled': false,
            'media.navigator.permission.disabled': true,
            'media.navigator.streams.fake': true,
            'media.autoplay.enabled.user-gestures-needed': false,
            'media.block-autoplay-until-in-foreground': false
          }
        }
      }
    });
  };
}

module.exports = makeConf;
