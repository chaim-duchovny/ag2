const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let waitingPlayer = null;
const games = {};

// MySQL Connection - home.html
const connection_home = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "email" // Specify the database
});

// **** Connection - Home.html - Begin ****

connection_home.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err.message);
        return;
    }
    console.log('Connected to MySQL!');
});

// Create database and table if they don't exist (run once)
function initializeDatabase() {
    const createDbQuery = 'CREATE DATABASE IF NOT EXISTS email';
    connection_home.query(createDbQuery, (err) => {
        if (err) console.error('Error creating database:', err.message);
        else console.log('Database "email" created or already exists.');

        const useDbQuery = 'USE email';
        connection_home.query(useDbQuery, (err) => {
            if (err) console.error('Error switching to database:', err.message);
            else console.log('Using "email" database.');

            const createTableQuery = `
                CREATE TABLE IF NOT EXISTS emails (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    email VARCHAR(255) NOT NULL UNIQUE
                )
            `;
            connection_home.query(createTableQuery, (err) => {
                if (err) console.error('Error creating table:', err.message);
                else console.log('"emails" table created or already exists.');
            });
        });
    });
}

initializeDatabase(); // Call this function when the server starts

// Email Subscription Route

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'home.html'));
});

app.post('/home.html', (req, res) => {
    const email = req.body.email;

    if (!email) {
        return res.status(400).send('Email is required.');
    }

    if (!isValidEmail(email)) {
        console.log('Invalid email format:', email);
        return res.status(400).send('Invalid email format.');
    }

    insertEmail(email, connection_home, res);
});

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function insertEmail(email, connection_home, res) {
    const checkQuery = 'SELECT COUNT(*) AS count FROM emails WHERE email = ?';
    connection_home.query(checkQuery, [email], (err, results) => {
        if (err) {
            console.error('Error checking for duplicate email:', err.message);
            return res.status(500).send('Error checking email.');
        }

        const count = results[0].count;
        if (count > 0) {
            console.log('Email already exists:', email);
            return res.status(409).send('Email already exists.');
        } else {
            const insertQuery = 'INSERT INTO emails (email) VALUES (?)';
            connection_home.query(insertQuery, [email], (err) => {
                if (err) {
                    console.error('Error inserting email:', err.message);
                    return res.status(500).send('Error inserting email.');
                }

                console.log('Email successfully inserted:', email);
                return res.status(200).send('Email successfully subscribed!');
            });
        }
    });
}

// ******** Connection - Home.html - End ********

// Middleware
app.use(express.static(__dirname));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// MySQL connection for registration
const connection_register = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "registration"
});

connection_register.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.message);
    return;
  }
  console.log('Connected to MySQL! - Ready to register!');
});

// Multer storage setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Ensure this folder exists
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, req.body.email + '-' + Date.now() + ext);
  }
});
const upload = multer({ storage: storage });

// Registration endpoint
app.post('/register', upload.single('agentFile'), async (req, res) => {
  const { username, email, password } = req.body;
  const agentFile = req.file;

  if (!username || !email || !password || !agentFile) {
    return res.status(400).json({ message: 'All fields are required, including agent file.' });
  }

  // Check if user exists
  connection_register.query('SELECT * FROM registrationtable WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (results.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into database
    connection_register.query(
      'INSERT INTO registrationtable (username, email, password, agentFile) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, agentFile.filename],
      (err) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.status(201).json({ message: 'User registered successfully' });
      }
    );
  });
});

// Serve the registration page
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'register.html'));
});

// Serve the HTML file*********************************************************
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Socket.IO Logic
io.on('connection_home', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Matchmaking
    socket.on('findMatch', () => {
        if (waitingPlayer) {
            const roomId = `room-${Date.now()}`;
            const game = {
                players: {
                    [waitingPlayer.id]: 'black',
                    [socket.id]: 'white'
                },
                currentTurn: 'black'
            };

            games[roomId] = game;

            // Notify players with their colors
            waitingPlayer.emit('gameStart', { 
                room: roomId, 
                color: 'black',
                currentTurn: 'black'
            });

            socket.emit('gameStart', { 
                room: roomId, 
                color: 'white',
                currentTurn: 'black'
            });
            
            waitingPlayer.join(roomId);
            socket.join(roomId);
            waitingPlayer = null;
        } else {
            waitingPlayer = socket;
            socket.emit('waitingForPlayer');
        }
    });

    socket.on('pass', ({ room, player }) => {
        const game = games[room];
        if (!game) return;

        // Add validation: Ensure it's the player's turn
        if (player !== game.currentTurn) {
            socket.emit('invalidMove', 'Not your turn to pass!');
            return;
        }

        // Track pass count (add this property if not already present)
        if (!game.passCount) game.passCount = 0;

        game.passCount += 1;

        // Switch turns
        game.currentTurn = game.currentTurn === 'black' ? 'white' : 'black';

        // If both players have passed consecutively, trigger area scoring/end game
        if (game.passCount >= 2) {
            io.to(room).emit('turnUpdate', { currentTurn: null }); // No one's turn
            io.to(room).emit('endGame', { reason: 'Both players passed' });
            // Optionally, handle scoring logic here
        } else {
            // Notify both players of the turn change
            io.to(room).emit('turnUpdate', { currentTurn: game.currentTurn });
        }

        if (!game.history) game.history = [];
        game.history.push({ type: 'pass', player });

        // Broadcast updated history
        io.to(room).emit('historyUpdate', game.history);
    });

    // Handle stone placement
    socket.on('placeStone', ({ room, row, col, player }) => {
        const game = games[room];
        if (!game) return;
        game.passCount = 0;
        
        // Validate move
        if (game.currentTurn !== player) {
            socket.emit('invalidMove', 'Not your turn!');
            return;
        }
        
        // Process valid move
        game.currentTurn = game.currentTurn === 'black' ? 'white' : 'black';
        io.to(room).emit('turnUpdate', { currentTurn: game.currentTurn });
        socket.to(room).emit('opponentMove', { row, col, player });

        if (!game.history) game.history = [];
        game.history.push({ type: 'move', player, row, col });

        // Broadcast updated history
        io.to(room).emit('historyUpdate', game.history);
    });

    socket.on('removeDeadStones', ({ room, stones }) => {
        io.to(room).emit('removeDeadStones', stones);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        if (socket === waitingPlayer) waitingPlayer = null;
    });

    socket.on('historyUpdate', (history) => {
        moveHistory.innerHTML = ''; // Clear existing history
        history.forEach(entry => {
            const move = document.createElement('p');
            if (entry.type === 'move') {
                move.textContent = `${entry.player}: Row ${entry.row}, Col ${entry.col}`;
            } else if (entry.type === 'pass') {
                move.textContent = `${entry.player}: Pass`;
            }
            moveHistory.appendChild(move);
        });
        moveHistory.scrollTop = moveHistory.scrollHeight;
    });
    
});

server.listen(3000, () => console.log('Server running on port 3000'));
