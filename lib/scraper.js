var async = require('async');
var cheerio = require('cheerio');
var crypto = require('crypto');
var execTime = require('exec-time')
var fs = require('fs');
var request = require('request');

var protocol = 'http://';
var sites = [
    'bukk.it',
    'wil.to/_',
    'misatkes.com',
    'meyerweb.com/bkkt'
];

var profiler = new execTime('processing sites');

var compareItems = exports.compareItems = function compareItems(a, b) {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
};

var formatResults = exports.formatResults = function formatResults(results) {
    var sortedList, i = 1, len = results.length, args = [];
    for (; i < len; i++) {
        args.push(results[i]);
    }
    sortedList = Array.prototype.concat.apply(results[0], args).sort(compareItems);
    return sortedList;
};

var outputFile = exports.outputFile = function outputFile(images) {
    var serializedStr = JSON.stringify(images);
    fs.writeFile('images.json', serializedStr);
    profiler.step('done');
    return serializedStr;
};

var parallelDone = exports.parallelDone = function parallelDone(err, results) {
    if (err || !results || !results.length) return console.log('async.parallel: %s - %s', err, results);
    var images;
    images = formatResults(results);
    console.log('Processed ' + images.length + ' images');
    return outputFile(images);
};

var mapDone = exports.mapDone = function mapDone(err, results) {
    if (err || !results || !results.length) return console.log('async.map: %s - %s', err, results);
    return async.parallel(results, parallelDone);
};

var createLink = exports.createLink = function createLink(origin, name) {
    var url = protocol + origin + '/' + name;
    return {
        id: crypto.createHash('md5').update(url).digest('hex'),
        url: url,
        name: name,
        origin: origin
    };
};

var requestSite = exports.requestSite = function requestSite(origin, callback) {
    return callback(null, function (parallelCallback) {
        return request(protocol + origin, function (err, res, body) {
            var $ = cheerio.load(body);
            var selector = 'a[href$=".gif"], a[href$=".jpg"], a[href$=".jpeg"], a[href$=".png"]';
            var links = [];
            $(selector).each(function () {
                var link = createLink(origin, $(this).attr('href'));
                links.push(link);
            });
            return parallelCallback(null, links);
        });
    });
};

var start = exports.start = function start() {
    profiler.beginProfiling();
    async.map(sites, requestSite, mapDone);
};