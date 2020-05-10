'use strict';

const sessionTimeout = 10*1000;

const SharedSession = function(session, io, redis, mariaDB) {
	let me = this;

	me.token = session.token;
	session.connections = [];

	let pinger;
	let destructionCountdown;

	// start destruction countdown
	let startDestructionCountdown = function(){
		destructionCountdown = setTimeout(() => {
			// delete from redis
			redis.del(session.token);
			// delete from mariaDB
			mariaDB.query('UPDATE user SET shared_session = NULL WHERE id = ?', [session.user_id]);
		}, sessionTimeout);
	};

	// stop destruction countdown
	let stopDestructionCountDown = function(){
		clearTimeout(destructionCountdown);
	};

	// start refresh redis every x sec
	let startPinger = function(){
		pinger = setInterval(() => {
			session['last_ping_at'] = Math.floor(Date.now() / 1000);
			redis.set(session.token, session);
		}, 5000);
	};

	// stop updating redis
	let stopPinger = function(){
		clearInterval(pinger);
	};

	// add connection
	let addConnection = function(socket){
		let connection = {
			app: socket.handshake.headers.origin,
			ip: socket.handshake.address,
			started_at: Math.floor(Date.now() / 1000),
			url: socket.handshake.headers.referer.replace(socket.handshake.headers.origin, ''),
			userAgent: socket.handshake.headers['user-agent']
		};
		session.connections.push(connection);
		if(session.connections.length === 1){
			startPinger();
		}
		if(session.connections.length > 0){
			stopDestructionCountDown();
		}
		// on disconnect
		socket.on('disconnect', () => {
			let i = session.connections.indexOf(connection);
			session.connections.splice(i, 1);
			if(session.connections.length === 0){
				stopPinger();
				startDestructionCountdown();
			}
		});
	};

	// new socket
	me.addSocket = function(socket){
		// add to room
		socket.join(me.token);
		addConnection(socket);
	};

	// to json
	me.debug = function(){
		let debug = {
			devices: {},
			last_ping_at: session.last_ping_at,
			started_at: session.started_at,
			token: session.token,
			user_id: session.user_id
		};
		for(let connection of session.connections){
			if(typeof debug.devices[connection.userAgent] === 'undefined'){
				debug.devices[connection.userAgent] = {apps: {}};
			}
			if(typeof debug.devices[connection.userAgent].apps[connection.app] === 'undefined'){
				debug.devices[connection.userAgent].apps[connection.app] = {pages: []};
			}
			debug.devices[connection.userAgent].apps[connection.app].pages.push(connection.url);
		}
		return JSON.stringify(debug);
	};

};

module.exports = SharedSession;
