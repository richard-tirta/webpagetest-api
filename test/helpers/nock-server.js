/**
 * Copyright (c) 2013, Twitter Inc.
 * Copyright (c) 2013, Marcel Duran and other contributors
 * Released under the MIT License
 */

var path = require('path'),
    nock = require('nock');

var PATH_RESPONSES = path.join(__dirname, '../fixtures/responses');

var reqResMap = {
  '/testStatus.php?test=120816_V2_2': 'testStatus.json',
  '/xmlResult.php?test=120816_V2_2': 'testResults.xml',
  '/getLocations.php': 'locations.xml',
  '/getTesters.php': 'testers.xml',
  '/runtest.php?url=http%3A%2F%2Ftwitter.com%2Fmarcelduran&f=json': 'runTest.json',
  '/runtest.php?url=http%3A%2F%2Ftwitter.com%2Fmarcelduran&location=Local_Firefox_Chrome%3AChrome&runs=3&fvonly=1&label=test%20123&pngss=1&timeline=1&netlog=1&f=json': 'runTest.json',
  '/runtest.php?script=logData%090%0Anavigate%09http%3A%2F%2Ffoo.com%2Flogin%0A%2F%2F%20log%20some%20data%0AlogData%091%0AsetValue%09name%3Dusername%09johndoe%0AsetValue%09name%3Dpassword%0912345%0AsubmitForm%09action%3Dhttp%3A%2F%2Ffoo.com%2Fmain%0AwaitForComplete&f=json': 'runTest.json',
  '/getgzip.php?test=120816_V2_2&file=1_pagespeed.txt': 'pageSpeed.json',
  '/export.php?test=120816_V2_2': 'har.json',
  '/getgzip.php?test=120816_V2_2&file=1_progress.csv': 'utilization.csv',
  '/getgzip.php?test=120816_V2_2&file=1_IEWTR.txt': 'request.txt',
  '/getgzip.php?test=120816_V2_2&file=1_timeline.json': 'timeline.json',
  '/getgzip.php?test=120816_V2_2&file=1_netlog.txt': 'netLog.txt',
  '/getgzip.php?test=120816_V2_2&file=1_console_log.json': 'consoleLog.json',
  '/getgzip.php?test=120816_V2_2&file=testinfo.json': 'testInfo.json',
  '/testlog.php?all=on&f=csv&days=2': 'history.csv',
  '/waterfall.php?test=120816_V2_2&run=1&cached=0': 'waterfall.png',
  '/thumbnail.php?test=120816_V2_2&run=1&cached=0&file=1_waterfall.png': 'waterfallThumbnail.png',
  '/getgzip.php?test=120816_V2_2&file=1_screen.jpg': 'screenshot.jpg',
  '/thumbnail.php?test=120816_V2_2&file=1_screen.jpg&run=1&cached=0': 'screenshotThumbnail.jpg',
  '/getgzip.php?test=120816_V2_2&file=1_screen.png': 'screenshotFullResolution.png',
  '/cancelTest.php?test=120816_V2_2': 'cancel.html',
  '/cancelTest.php?test=120816_V2_3': 'cancelNotCancelled.html',
  '/video/create.php?tests=130416_YS_KD4-r%3A3-c%3A1%2C130416_W6_KEE-r%3A8-c%3A1&f=json&end=visual': 'createVideo.json',
  '/video/view.php?embed=1&id=130416_36ed6e37013655a14b2b857cdccec99db72adcaa': 'embeddedVideoPlayer.html',

  // test results for multi runs with/without custom median metric
  '/xmlResult.php?test=130619_KK_6A2': 'testResultsMultiRunsDefaultMedianMetric.xml',
  '/xmlResult.php?test=130619_KK_6A2&medianMetric=TTFB': 'testResultsMultiRunsTTFBMedianMetric.xml',

  // test results with extra data
  '/xmlResult.php?test=130724_YD_8JX&breakdown=1&domains=1&pagespeed=1&requests=1': 'testResultsExtraData.xml',

  // sync
  '/runtest.php?url=http%3A%2F%2Ftwitter.com%2Fmarcelduran&f=json&pingback=http%3A%2F%2F127.0.0.1%3A8000%2Ftestdone': 'runTest.json',
  '/runtest.php?url=http%3A%2F%2Ftwitter.com%2Fmarcelduran&runs=3&fvonly=1&f=json&pingback=http%3A%2F%2F127.0.0.1%3A8000%2Ftestdone': 'runTestMultiRuns.json',

  // not found / invalid
  '/testStatus.php?test=120816_V2_3': 'testStatusNotFound.json',
  '/xmlResult.php?test=120816_V2_3': 'testResultsNotFound.xml',
  '/runtest.php?url=&f=json': 'runTestInvalid.json',
  '/runtest.php?script=&f=json': 'runTestInvalid.json',
  '/getgzip.php?test=120816_V2_3&file=1_pagespeed.txt': '',
  '/export.php?test=120816_V2_3': 'harNotFound.json',
  '/waterfall.php?test=120816_V2_3&run=1&cached=0': 'waterfallNotFound.png',
  '/thumbnail.php?test=120816_V2_3&run=1&cached=0&file=1_waterfall.png': 'waterfallThumbnailNotFound.png',
  '/thumbnail.php?test=120816_V2_3&file=1_screen.jpg&run=1&cached=0': '',
  '/cancelTest.php?test=120816_V2_4': '',
  '/runtest.php?url=http%3A%2F%2Fapikey.com&f=json': 'runTestNoAPIKey.json',
  '/runtest.php?url=http%3A%2F%2Fapikey.com&k=12345&f=json': 'runTestInvalidAPIKey.json'
};

var typeMap = {
  'json': 'application/json',
  'xml': 'text/xml',
  'txt': 'text/plain',
  'csv': 'text/plain',
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'html': 'text/html'
};

function WebPageTestMockServer(host) {
  var server;

  if (!(this instanceof WebPageTestMockServer)) {
    return new WebPageTestMockServer(host);
  }

  server = nock(host || 'http://www.webpagetest.org');

  // request/response mapping
  Object.keys(reqResMap).forEach(function (source) {
    var filename = reqResMap[source],
        pathname = path.join(PATH_RESPONSES, filename),
        ext = (path.extname(pathname) || '').slice(1),
        type = typeMap[ext];

    if (filename) {
      server
        .persist()
        .get(source)
        .replyWithFile(200, pathname, {'Content-Type': type});
    } else {
      server.get(source).reply(404);
    }
  });
}

module.exports = WebPageTestMockServer;
