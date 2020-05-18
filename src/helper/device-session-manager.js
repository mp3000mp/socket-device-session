'use strict';

const DeviceSession = require('./device-session');


let DeviceSessionManager = function(io, redis, mariadb) {
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
					.then(sessionData => {
						// si ok on créé la deviceSession
						if (sessionData !== null) {
							sessionData = JSON.parse(sessionData);
							sessionData.deviceToken = token;

							let deviceSession = new DeviceSession(sessionData, me, mariadb, io);
							resolve(deviceSession);
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
			checkToken(handshake.deviceToken)
				.then(deviceSession => {
					// authentified
          socket.emit('handshakeOK', {});
          if(typeof activeSessions[deviceSession.deviceToken] === 'undefined'){
            activeSessions[deviceSession.deviceToken] = deviceSession;
          }
					activeSessions[deviceSession.deviceToken].addSocket(socket, handshake.appId);
				})
				.catch(err => {
					console.log(err);
					socket.close();
				});
		});
	});

	// détruit device session
	me.destroySession = function(deviceToken, reason){
	  redis.del(deviceToken)
      .then(() => {
        mariadb.query('UPDATE connection_audit_trail SET reason = ?, ended_at = NOW() WHERE ended_at IS NULL AND device_session_token = ?', [reason, deviceToken])
          .then(() => {
            delete activeSessions[deviceToken];
          })
          .catch(err => {
            console.log(err);
          })
      })
      .catch(err => {
        console.log(err);
      })
  }

	me.debug = function(){
		let r = [];
		for(let deviceSession in activeSessions){
			r.push(activeSessions[deviceSession].debug());
		}
		return r;
	};
};

module.exports = DeviceSessionManager;
