var jwt = require('jsonwebtoken');
var request = require('request-promise');
var config = require('./config');
var async = require('async');
var _ = require('lodash');
var db = require('./database');
var lib = require('./lib');

var secret = "testing";
var devMode = true;

exports.getWallet = function(user, callback) {
	if (devMode == true) {
		callback(null, '0x3456a24541b13a790d1hg4f4394943329f03c9f2');
	} else {
		var token = jwt.sign({id: -1}, secret, { expiresIn: 60*60});

		const options = {
			method: "POST",
			uri: config.WALLET_API_DOMAIN + '/address',
			headers: {
				'Authorization': token
			},
			body: {
				uid: user.id,
			},
			json: true
		}

		request(options)
			.then(function (walletAddress) {
				console.log(walletAddress);
				callback(null, walletAddress);
			})
			.catch(function (err) {
				console.log(err);
				callback(err, null);
			})
	}
}

exports.updateBalanceArray = function(bonuses, callback) {	
	if (devMode == true) {
		callback(null, []);
	} else {
		var token = jwt.sign({id: -1}, secret, { expiresIn: 60*60});

		const options = {
			method: "POST",
			uri: config.WALLET_API_DOMAIN + '/update',
			headers: {
				'Authorization': token
			},
			body: {
				users: bonuses.map(function (bonus) {
								return {
									id: bonus.user.id,
									pnl: bonus.amount
								}
							})
			},
			json: true
		}

		request(options)
			.then(function (updatedBalances) {
				console.log(updatedBalances);
				callback(null, updatedBalances);
			})
			.catch(function (err) {
				console.log(err);
				callback(err, null);
			})
	}
}

exports.updateBalance = function(userId, updateAmount, callback) {	
	if (devMode == true) {
		callback(null, []);
	} else {
		var token = jwt.sign({id: -1}, secret, { expiresIn: 60*60});

		const options = {
			method: "POST",
			uri: config.WALLET_API_DOMAIN + '/update',
			headers: {
				'Authorization': token
			},
			body: {
				users: [
					{
						id: userId,
						pnl: updateAmount
					}
				]
			},
			json: true
		}

		request(options)
			.then(function (updatedBalances) {
				console.log(updatedBalances);
				callback(null, updatedBalances);
			})
			.catch(function (err) {
				console.log(err);
				callback(err, null);
			})
	}
}


exports.getBankroll = function(callback) {
	if (devMode == true) {
		callback(null, 1000000000);
	} else {
		var token = jwt.sign({id: -1}, secret, { expiresIn: 60*60});

		const options = {
			method: "GET",
			uri: config.WALLET_API_DOMAIN + '/bankroll',
			headers: {
				'Authorization': token
			},
			body: {
			},
			json: true
		}

		request(options)
			.then(function (balanceHouse) {
				console.log('aaaaaaaaaaaa');
				console.log(balanceHouse);
				callback(null, balanceHouse);
			})
			.catch(function (err) {
				console.log(err);
				callback(err, null);
			})
	}
}

exports.getHouseBalance = function(callback) {
	if (devMode == true) {
		callback(null, 10000000000);
	} else {
		var token = jwt.sign({id: -1}, secret, { expiresIn: 60*60});

		const options = {
			method: "GET",
			uri: config.WALLET_API_DOMAIN + '/house',
			headers: {
				'Authorization': token
			},
			body: {
			},
			json: true
		}

		request(options)
			.then(function (balanceHouse) {
				console.log(balanceHouse);
				callback(null, balanceHouse);
			})
			.catch(function (err) {
				console.log(err);
				callback(err, null);
			})
	}
}

function syncFundingsToDatabase(fundings, start_cnt, total_cnt, syncCallback) {
	var current_cnt = start_cnt;
	var inserts = _.range(total_cnt).map(function(i) {

			return function(cb) {
					//"transaction_id", "uid", "amount"currency
					//fundings[i].currency
					console.log("syncFundingsToDatabase: ", i);
					current_cnt ++;
					db.query('SELECT COUNT(*) FROM fundings WHERE bitcoin_deposit_txid = $1', [fundings[i].transaction_id], function(err, result) {

						console.log("syncFundingsToDatabase: db.query SELECT COUNT", err, result);
						if (err) return cb(err);
						if (result.rows[0].count > 0) {
							cb(null, "available");
						} else {
							console.log("syncFundingsToDatabase: db.query INSERT INTO fundings");
							db.query('INSERT INTO fundings(user_id, amount, bitcoin_deposit_txid) VALUES($1, $2, $3)', [fundings[i].uid, fundings[i].amount, fundings[i].transaction_id], cb);
						}
				});
					
			};
	});

	async.parallel(inserts, function(err, res) {
			console.log("syncFundingsToDatabase async.parallel ", err, res);
			if (err) throw err;

			// process.stdout.clearLine();
			// process.stdout.cursorTo(0);
			// process.stdout.write(
			// 		"Processed: " + (current_cnt) + ' / ' + total_cnt +
			// 				' (' + (100*current_cnt/total_cnt).toFixed(2)  + '%)');
			console.log("Processed: " + (current_cnt) + ' / ' + total_cnt + ' (' + (100*current_cnt/total_cnt).toFixed(2)  + '%)')

			console.log(' Done');
			if (current_cnt == total_cnt)
				syncCallback();
	});
}

function syncUserBalanceToDatabase(users, start_cnt, total_cnt, syncCallback) {
	var current_cnt = start_cnt;
	var inserts = _.range(total_cnt).map(function(i) {

			return function(cb) {
				console.log("syncUserBalanceToDatabase: ", i);
				var token = jwt.sign({id: -1}, secret, { expiresIn: 60*60});

				const options = {
					method: "POST",
					uri: config.WALLET_API_DOMAIN + '/balance',
					headers: {
						'Authorization': token
					},
					body: {
						uid: users[i].id
					},
					json: true
				}

				request(options)
				  .then(function (balance) {
						console.log("178 balance of uid=", users[i].id , " ", balance);
						current_cnt ++;
						if (users[i].balance_satoshis != balance){
							db.query('UPDATE users SET balance_satoshis = $1 WHERE id = $2', [balance, users[i].id], cb);
						} else {
							cb(null, "available");
						}				
				  })
				  .catch(function (err) {
				    console.log(err);
				    cb(err);
				  })			
			};
	});

	async.parallel(inserts, function(err, res) {
			console.log("syncUserBalanceToDatabase async.parallel ", err, res);
			if (err) throw err;

			// process.stdout.clearLine();
			// process.stdout.cursorTo(0);
			// process.stdout.write(
			// 		"Processed: " + (current_cnt) + ' / ' + total_cnt +
			// 				' (' + (100*current_cnt/total_cnt).toFixed(2)  + '%)');
			console.log("Processed: " + (current_cnt) + ' / ' + total_cnt + ' (' + (100*current_cnt/total_cnt).toFixed(2)  + '%)')
			console.log(' Done');
			if (current_cnt == total_cnt)
				syncCallback();
	});
}


exports.syncFundings = function(callback) {
	if (devMode == true) {
		callback(null, []);
	} else {
		var token = jwt.sign({id: -1}, secret, { expiresIn: 60*60});

		const options = {
			method: "POST",
			uri: config.WALLET_API_DOMAIN + '/fundings',
			headers: {
				'Authorization': token
			},
			body: {
			},
			json: true
		}
		// var fundings = [
		// 	{
		// 		uid: 1,
		// 		amount: 100,
		// 		transaction_id: 'txid1'
		// 	},		{
		// 		uid: 2,
		// 		amount: 200,
		// 		transaction_id: 'txid2'
		// 	},		{
		// 		uid: 3,
		// 		amount: 300,
		// 		transaction_id: 'txid3'
		// 	},
		// ]
		// loop(fundings, 0, fundings.length, function(){
		// 	console.log("loop finished");
		// })
		request(options)
			.then(function (fundings) {
				console.log(fundings);
				var total_cnt = fundings.length;
				syncFundingsToDatabase(fundings, 0, total_cnt, function(){
					console.log("syncFundingsToDatabase finished");
						callback(null, fundings);
				})
			})
			.catch(function (err) {
				console.log(err);
				callback(err, null);
			})
	}
}

exports.syncUserBalances = function(callback) {
	if (devMode == true) {
		callback(null, []);
	} else {
		var token = jwt.sign({id: -1}, secret, { expiresIn: 60*60});

		db.getAllUsers(function(error, users) {
			// console.log("users", users);
			// callback(0, 0);/**need to remove :) */
			syncUserBalanceToDatabase(users, 0, users.length, function(err, res){
				console.log("syncUserBalanceToDatabase finished", err, res);
				callback(err, res);
			})
		})
	}
}
