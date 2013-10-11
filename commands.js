var _ = require('underscore');
var Q = require('Q');
var request = require('request');
var util = require('util');
var bamboo = require('../bamboo.js');

// helper to log an obj
var logObj = function(obj, depth) {
    console.log(util.inspect(obj, { colors:true, depth: depth || 2 }));
};

// i.e. 
// var obj = { 
//   message: 'test', 
//   one: [
//     { 
//       two: [
//         'dummy', 
//         { 
//           three: 'ultitest' 
//         }
//       ] 
//     }
//   ] 
// }
// // returns "ultitest"
// accessByString(obj, 'one[0].two[1].three'); 
// 
// from http://stackoverflow.com/questions/6491463/accessing-nested-javascript-objects-with-string-key
var accessByString = function(obj, str) {
    str = str.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
    str = str.replace(/^\./, '');           // strip a leading dot
    var ary = str.split('.');
    while (ary.length) {
        var part = ary.shift();
        if (part in obj) {
            obj = obj[part];
        } else {
            return; // undefined
        }
    }
    return obj;
};

// simple helper function to quickly query a URL
// property can be a string representation of the property you want to access:
// i.e. 'one[0].two[1].three' (see Object.prototype.accessByString comment)
var promiseUrl = function(url, property) {
    var deferred = Q.defer();

    request({ url: url, json: true }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            if(typeof body == 'string') body = JSON.parse(body);
            deferred.resolve(accessByString(body, property));
        }
    });

    return deferred.promise;
};

// and now the commands
// the key is the command word used to trigger.
// i.e. !help triggers commands.help.message()
// 
// messages can return a string, or a function.
// that function can return a promise whose first
// argument when resolved is a string, or it can
// return a string directly
// 
// some HTML is allowed
// 
// you can pass in parameters if message is a function
// (see hammertime2 as an example)
// 
// if a keywords property exists, it will search the entire
// message for that work and trigger the message if one of
// those keywords were found (first command matched wins).
// keywords are matched against the following (where
// "text" is the body of the last message sent):
// _.uniq(text.toLowerCase().replace(/[^a-z0-9 ]+/g, '').split(' '))
// 
// the "note" property is what's printed in the !help command
// 
// author is so you know who made it! 
// (doesn't show in anywhere while running)
var commands = {
    help: {
        message: function() {
            var ts = [
                '<strong>List of commands:</strong>',
                '<em>Trigger a command with !commandName or if the command has keywords associated with it, just say one of those words anywhere in your message to trigger the command.</em>',
                ''
            ];
            _.each(commands, function(command, commandName) {
                var str = '<strong>' + commandName + '</strong>' + ': ' + command.note;
                if(command.keywords) str += ' (keywords: [' + command.keywords.join(', ') + '])';
                ts.push(str);
            });
            return ts.join('<br>');
        },
        note: "Outputs help message.",
        author: 'CWSpear'
    },
    hammertime: {
        message: '━━▊ ━━▊ ━━▊',
        note: "It's Hammer Time!",
        author: 'CWSpear'
    },
    // !hammertime2 Cameron Spear
    // name1 will be "Cameron", name2 will be "Spear"
    hammertime2: {
        message: function(name1, name2) {
            return name1 + ' ━━▊ ━━▊ ━━▊ ' + name2;
        },
        note: "It's <em>really</em> Hammer Time! (2 params)",
        author: 'CWSpear'
    },
    // could bring this back if you could sanitize it to be safe! haha
    // eval: {
    //     message: function() {
    //         var args = Array.prototype.slice.call(arguments);
    //         return eval(args.join(' '));
    //     },
    //     note: "Eval is evil!",
    //     author: 'CWSpear'
    // },
    dirty: {
        keywords: ['hard', 'fast', 'quick'],
        message: "That's what she said!",
        note: "That's what she said!",
        author: 'CWSpear'        
    },
    build: {
        message: function(planName) {
            // contact CWSpear to add plans
            var plans = bamboo.plans;

            var action = 'queue';

            if(!(plan = plans[planName])) return 'Invalid Plan: "' + planName + '" (plans must be preconfigured)';

            var url = bamboo.api + action + '/' + [plan.projectKey, plan.buildKey].join('-');
            var deferred = Q.defer();

            var r = request.post({
                url: url,
                json: true,
                qs: {
                    os_authType: 'basic'
                },
                auth: {
                    user: bamboo.username,
                    pass: bamboo.password,
                    sendImmediately: true
                }
            }, function(error, response, result) {
                if (!error && response.statusCode == 200) {
                    deferred.resolve([result.planKey, '#' + result.buildNumber, 'passed.', result.triggerReason, 'by <em>me</em>.'].join(' '));
                } else {
                    deferred.resolve('[' + response.statusCode + '] There was an error!');
                }
            });

            return deferred.promise;
        },
        note: "Perform a build on Bamboo (must be preconfigured)",
        author: 'CWSpear'
    },
    test: {
        // keywords: ['test'],
        message: "Test <em>this!</em>",
        note: "Need something to test?",
        author: 'CWSpear'        
    },
    weather: {
        message: function() {
            var args = Array.prototype.slice.call(arguments);
            var arg = args.join(' ');
            return promiseUrl('http://api.openweathermap.org/data/2.5/weather?q=' + arg, 'weather[0].description');
        },
        note: "Find out the weather in a city, state (i.e. pass in Spokane, WA).",
        author: 'CWSpear'
    },
    excuse: {
        message: function() {
            return promiseUrl('http://clintorion.com/cgi-bin/excuses.py', 'message');
        },
        note: "Outputs an excuse that a developer might use.",
        author: 'CWSpear'
    }
    //, calc: {
    //     message: function() {
    //         var args = Array.prototype.slice.call(arguments);
    //         var arg = encodeURIComponent(args.join(' '));
    //         console.log(arg);
    //         return promiseUrl('https://www.google.com/ig/calculator?q=' + arg, 'rhs');
    //     },
    //     note: 'Performs arbitrary numerical calculations.',
    //     author: 'JFrancis'
    // }
};

module.exports = commands;
