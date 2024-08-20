const mariadb = require('mariadb');

const pool = mariadb.createPool({
  host: 'localhost',
  user: 'root',
  password: 'new_password',
  database: 'gabot',
  connectionLimit: 5,
});

module.exports = pool;
