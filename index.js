'use strict';

require('dotenv').config({path: './.env.local'});
const Mariadb = require('mariadb');
const Redis = require('ioredis');
const express = require('express');
const SharedSessionManager = require('./src/helper/shared-session-manager');
const app = express();
const io = require('socket.io')();

// connect db
const mariadbPool = Mariadb.createPool({
	connectionLimit: 5,
	database: process.env.DB_NAME,
	host: process.env.DB_HOST,
	password: process.env.DB_PASS,
	port: process.env.DB_PORT,
	user: process.env.DB_USER
});

// connect redis
const redis = new Redis({
	host: process.env.REDIS_HOST,
	password: process.env.REDIS_AUTH,
	port: process.env.REDIS_PORT
});
let attachRedis = (req, res, next) => {
	req.redis = redis;
	next();
};
app.use(attachRedis);

// declare controler
let appController = require('./src/controller/app');

mariadbPool.getConnection()
	.then(mariadbConn => {

		let attachMariaDB = (req, res, next) => {
			req.db = mariadbConn;
			next();
		};
		app.use(attachMariaDB);

		// declare routes
		app.get('/', (req, res) => {
			appController.home(req, res);
		});
		app.get('/ping', (req, res) => {
			appController.ping(req, res);
		});

		// start server
		/*let server = */app.listen(process.env.APP_PORT, () => {
			console.log(`${process.env.APP_NAME} listenning port ${  process.env.APP_PORT}`);
		});

		// socket server
		let sharedSessionManager = new SharedSessionManager(io, redis, mariadbConn);

		// debug
		if(process.env.APP_ENV !== 'prod'){
			setInterval(() => {
				console.log(sharedSessionManager.debug());
			},5000);
		}

	})
	.catch(err => {
		console.log(`Impossible de se connecter à la 
		base ${  process.env.DB_NAME  } 
		host ${  process.env.DB_HOST  } 
		port ${  process.env.DB_PORT  } 
		user ${  process.env.DB_USER}`);
		console.log(err);
	});
