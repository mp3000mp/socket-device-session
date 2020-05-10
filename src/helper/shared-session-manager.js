'use strict';

const SharedSession = require('./shared-session');

let SharedSessionManager = function(io, redis, mariadb) {
	let me = this;

	let activeSessions = {};

	// check session token
	let checkToken = function(token){
		return new Promise((resolve, reject) => {
			// si déjà en mémoire on garde
			if(typeof activeSessions[token] !== 'undefined'){
				resolve(activeSessions[token]);
			}else{
				// sinon check dans redis (php créé entrée dans redis)
				redis.get(token)
					.then(session => {
						// si ok on créé la sharedSession
						if (session !== null) {
							session = JSON.parse(session);
							let sharedSession = new SharedSession(session, io, redis, mariadb);
							resolve(sharedSession);
						}else{
							reject();
						}
					})
					.catch(err => {
						console.log(err);
					});
			}
		});
	};

	io.on('connection', socket => {
		socket.on('handshake', handshake => {
			checkToken(handshake.token)
				.then(sharedSession => {
					// authentified
					sharedSession.addSocket(socket);
					activeSessions[sharedSession.token] = sharedSession;
				})
				.catch(err => {
					console.log(err);
					socket.close();
				});
		});
	});

	me.debug = function(){
		let r = [];
		for(let sharedSession in activeSessions){
			r.push(activeSessions[sharedSession].debug());
		}
		return r;
	};
};

module.exports = SharedSessionManager;
