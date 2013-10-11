var _ = require('underscore');
var Q = require('Q');
var request = require('request');

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

    request({ url: url }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            body = JSON.parse(body);
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
// those keywords were found (first one found wins)
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
    dirty: {
        keywords: ['hard', 'fast', 'quick'],
        message: "That's what she said!",
        note: "That's what she said!",
        author: 'CWSpear'        
    },
    test: {
        keywords: ['test'],
        message: "Test <em>this!</em>",
        note: "Need something to test?",
        author: 'CWSpear'        
    },
    excuse: {
        message: function() {
            return promiseUrl('http://clintorion.com/cgi-bin/excuses.py', 'message');
        },
        note: "Outputs an excuse that a developer might use.",
        author: 'CWSpear'
    }
};

module.exports = commands;