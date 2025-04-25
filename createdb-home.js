const mysql = require('mysql');

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: ""
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.message);
    return;
  }
  console.log('Connected to MySQL!');

  const createDbQuery = 'CREATE DATABASE IF NOT EXISTS email';
  connection.query(createDbQuery, (err) => {
    if (err) {
      console.error('Error creating database:', err.message);
      return;
    }
    console.log('Database "email" created or already exists.');

    const useDbQuery = 'USE email';
    connection.query(useDbQuery, (err) => {
      if (err) {
        console.error('Error switching to database:', err.message);
        return;
      }
      console.log('Using "email" database.');

      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS emails (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE
        )
      `;
      connection.query(createTableQuery, (err) => {
        if (err) {
          console.error('Error creating table:', err.message);
          return;
        }
        console.log('"emails" table created or already exists.');

        connection.end((err) => {
          if (err) {
            console.error('Error closing connection:', err.message);
            return;
          }
          console.log('Connection closed.');
        });
      });
    });
  });
});
