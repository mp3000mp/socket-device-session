'use strict';

module.exports = {
	home: (req, res) => {
		res.send('Running...');
	},

  /**
   * test redis and mariadb then send pong
   * @param req
   * @param res
   */
	ping: (req, res) => {
		req.db.query('SELECT COUNT(1) AS cpt FROM connection_audit_trail WHERE ended_at IS NULL')
			.then(rows => {
				console.log(`${rows[0].cpt  } connected user(s) on MariaDB`);
				req.redis.keys('3S_*')
					.then(data => {
						console.log(`${data.length  } connected user(s) on Redis`);
						res.send('pong');
					})
					.catch(err => {
						res.status(500).send('error: redis unreachable...');
						console.log(err);
					});
			})
			.catch(err => {
				res.status(500).send('error: database unreachable...');
				console.log(err);
			});
	},

  /**
   * debug connexions en cours
   * @param req
   * @param res
   */
  status: (req, res) => {
    req.db.query('SELECT ip, user_agent, email, started_at, url\n' +
      'FROM connection_audit_trail\n' +
      'INNER JOIN user ON user.id = connection_audit_trail.user_id\n' +
      'INNER JOIN application ON connection_audit_trail.application_id = application.id\n' +
      'WHERE ended_at IS NULL\n' +
      (typeof req.query.userId !== 'undefined' ? 'AND user_id = ?' : '') +
      'ORDER BY user_id, started_at\n' +
      ';', typeof req.query.userId !== 'undefined' ? [req.query.userId] : [])
      .then(rows => {
        res.send(JSON.stringify(rows));
      })
      .catch(err => {
        res.status(500).send('error: database unreachable...');
        console.log(err);
      })
  }
};
