'use strict';

module.exports = {
	home: (req, res) => {
		res.send('Running...');
	},
	ping: (req, res) => {
		req.db.query('SELECT COUNT(1) AS cpt FROM user WHERE shared_session IS NOT NULL')
			.then(rows => {
				console.log(`${rows[0].cpt  } connected user(s) on MariaDB`);
				req.redis.keys('3S_*')
					.then(data => {
						console.log(`${data.length  } connected user(s) on Redis`);
						res.send('pong');
					})
					.catch(err => {
						res.send('500, redis unreachable...');
						console.log(err);
					});
			})
			.catch(err => {
				res.send('500, database unreachable...');
				console.log(err);
			});
	}
};
