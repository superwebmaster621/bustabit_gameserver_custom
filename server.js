var async = require('async');
var assert = require('assert');
var constants = require('constants');
var fs = require('fs');
var path = require('path');

var config = require('./server/config');
var socket = require('./server/socket');
var database = require('./server/database');
var wallet = require('./server/wallet');
var Game = require('./server/game');
var Chat = require('./server/chat');
var GameHistory = require('./server/game_history');

var _ = require('lodash');

var server;

if (config.USE_HTTPS) {
    var options = {
        key: fs.readFileSync(config.HTTPS_KEY),
        cert: fs.readFileSync(config.HTTPS_CERT),
        secureProtocol: 'SSLv23_method',
        secureOptions: constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_SSLv2
    };

    if (config.HTTPS_CA) {
        options.ca = fs.readFileSync(config.HTTPS_CA);
    }

    server = require('https').createServer(options).listen(config.PORT, function() {
        console.log('Listening on port ', config.PORT, ' on HTTPS!');
    });
} else {
    server = require('http').createServer().listen(config.PORT, function() {
        console.log('Listening on port ', config.PORT, ' with http');
    });
}
// wallet.syncFundings(function (err, res) {
//     console.log("server.js syncFundings Finished", err, res);
//     wallet.syncUserBalances(function (err, res) {
//         console.log("server.js syncUserBalances Finished", err, res);

        async.parallel([
            database.getGameHistory,
            database.getLastGameInfo,
            // wallet.getBankroll,
            // database.getBankroll
        ], function(err, results) {
            if (err) {
                console.error('[INTERNAL_ERROR] got error: ', err,
                    'Unable to get table history');
                throw err;
            }
            var gameHistory = new GameHistory(results[0]);
            var info = results[1];
            var bankroll = 1000000000;//results[2];
            // if (results[2] != results[3]){
            //     console.log("wallet server's bankroll and gameserver's bankroll is different!! (database.bankroll, wallet.bankroll)", results[2], " ", results[3]);
            //     console.log("if problem persist, remove fundings and users table on game server and restart!!");
            //     return;
            // }

            console.log('Have a bankroll of: ', bankroll, ' wei');

            var lastGameId = info.id;
            var lastHash = info.hash;
            assert(typeof lastGameId === 'number');

            var game = new Game(lastGameId, lastHash, bankroll, gameHistory);
            var chat = new Chat();

            socket(server, game, chat);

        });
//     });
// });

