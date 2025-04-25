const socket = io()

const grid = document.getElementById('board');
const rows = ['9', '8', '7', '6', '5', '4', '3', '2', '1', '0', '-1', '-2', '-3', '-4', '-5', '-6', '-7', '-8', '-9'];
const cols = ['-9', '-8', '-7', '-6', '-5', '-4', '-3', '-2', '-1', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const size = 19;
const moveHistory = document.getElementById('move-history');
const turnDisplay = document.getElementById('turn');
let currentPlayer = 'black';
let gameBoard = Array(size).fill().map(() => Array(size).fill(null));
let intersectionCounter = 0;

let playerColor = null;
let currentTurn = null;

// Passing count
let passCount = 0;
let stonesPlaced = 0;
let areaScoringPhase = false;
const totalStones = 361; // 19x19 board

const margin = 50;
const lineLength = 900;

// Timer variables
let timeLeftBlack = 600;
let timeLeftWhite = 600;
let countdownInterval;
let gameStarted = false;
let canPlaceStone = false;
const countdownDisplayBlack = document.getElementById('countdown-player-black');
const countdownDisplayWhite = document.getElementById('countdown-player-white');

const blackPlayerName = document.getElementById('player-name-black')
const whitePlayerName = document.getElementById('player-name-white')
const blackPlayerRanking = document.getElementById('black-player-ranking')
const whitePlayerRanking = document.getElementById('white-player-ranking')

const winnerDisplay = document.getElementById('winner-display');
const passButton = document.getElementById('pass');

function displayName() {
    blackPlayerName.textContent = "Black"
    whitePlayerName.textContent = "White"
}

function displayRanking() {
    blackPlayerRanking.textContent = "1000"
    whitePlayerRanking.textContent = "1000"
}

function enableStones() {
    const intersections = document.querySelectorAll('.intersection');
    intersections.forEach(intersection => {
        intersection.addEventListener('click', placeStone);
    });
}

function disableStones() {
    const intersections = document.querySelectorAll('.intersection');
    intersections.forEach(intersection => {
        intersection.removeEventListener('click', placeStone);
    });
}

function startGame() {
    if (!gameStarted) {
        gameStarted = true;
    }
}

function updateCountdown(player) {
    if (!gameStarted) return;
    let timeLeft;
    let countdownDisplay;
    if (player === 'black') {
        timeLeft = timeLeftBlack;
        countdownDisplay = countdownDisplayBlack;
    } else {
        timeLeft = timeLeftWhite;
        countdownDisplay = countdownDisplayWhite;
    }
    const minutes = Math.floor(timeLeft / 60);
    let seconds = timeLeft % 60;
    seconds = seconds < 10 ? '0' + seconds : seconds;
    countdownDisplay.textContent = `${minutes}:${seconds}`;
    if (timeLeft <= 0) {
        clearInterval(countdownInterval);
        countdownDisplay.textContent = 'Time is up!';
        endGame();
    } else {
        if (player === 'black') {
            timeLeftBlack--;
        } else {
            timeLeftWhite--;
        }
    }
}

function switchTurns() {
    currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
    if (gameStarted) {
        clearInterval(countdownInterval);
        countdownInterval = setInterval(() => updateCountdown(currentPlayer), 1000);
    }
}

function updateMoveHistory(action) {
    const move = document.createElement('p');
    move.textContent = `${currentPlayer}: ${action === 'pass' ? 'Pass' : `Row ${rows}, Col ${cols}`}`;
    moveHistory.appendChild(move);
    moveHistory.scrollTop = moveHistory.scrollHeight;
}
// Create grid lines and intersections (same as before)
for (let i = 1; i <= 19; i++) {
    const line = document.createElement('div');
    line.className = 'grid-line horizontal';
    line.style.top = `${i * 50}px`;
    line.style.left = `${margin}px`;
    line.style.width = `${lineLength}px`
    grid.appendChild(line);
}
for (let i = 1; i <= 19; i++) {
    const line = document.createElement('div');
    line.className = 'grid-line vertical';
    line.style.left = `${i * 50}px`;
    line.style.top = `${margin}px`;
    line.style.height = `${lineLength}px`
    grid.appendChild(line);
}
// Create intersections
for (let i = 1; i <= 19; i++) {
    for (let j = 1; j <= 19; j++) {
        const intersection = document.createElement('div');
        intersection.className = 'intersection';
        intersection.style.left = `${j * 50}px`;
        intersection.style.top = `${i * 50}px`;
        intersection.setAttribute('data-row', i);
        intersection.setAttribute('data-col', j);
        intersection.addEventListener('click', placeStone);
        if (intersectionCounter == 60 || intersectionCounter == 66 || intersectionCounter == 72 || intersectionCounter == 174 ||
            intersectionCounter == 180 || intersectionCounter == 186 || intersectionCounter == 288 || intersectionCounter == 294 || intersectionCounter == 300) {
            intersection.id = 'hoshi';
        }
        grid.appendChild(intersection);
        intersectionCounter++;
    }
}
for (let i = 0; i <= 19; i++) {
    const rowLabel = document.createElement('div');
    rowLabel.className = 'label';
    rowLabel.textContent = rows[i];
    rowLabel.style.left = '6px';
    rowLabel.style.top = `${(i + 1) * 50 - 5}px`;
    grid.appendChild(rowLabel);
}
for (let j = 0; j <= 19; j++) {
    const colLabel = document.createElement('div');
    colLabel.className = 'label';
    colLabel.textContent = cols[j];
    colLabel.style.left = `${(j + 1) * 50 - 5}px`;
    colLabel.style.top = '6px';
    grid.appendChild(colLabel);
}

function placeStone(e) {

    if (playerColor !== currentTurn) {
        alert("Wait for your turn!");
        return;
    }

    const row = parseInt(e.target.dataset.row) - 1;
    const col = parseInt(e.target.dataset.col) - 1;

    if (gameBoard[row][col] !== null) return;

    // Suicide Prevention
    if (isSuicideMove(row, col, currentPlayer)) {
        alert("That move is suicide and not allowed.");
        return;
    }

    gameBoard[row][col] = currentPlayer;

    const stone = document.createElement('div');
    stone.classList.add('stone', currentPlayer);
    e.target.appendChild(stone);

    const move = document.createElement('p');
    move.textContent = `${currentPlayer}: Row ${row}, Col ${col}`;
    moveHistory.appendChild(move);
    moveHistory.scrollTop = moveHistory.scrollHeight;

    // Update the countdown immediately
    updateCountdown(currentPlayer);

    // Defer potentially slow operations
    setTimeout(() => {
        removeDeadStones(currentPlayer === 'black' ? 'white' : 'black');
    }, 0);

    socket.emit('placeStone', {
        room: currentRoom,
        row: row,
        col: col,
        player: currentPlayer
    });
}

function updateTurnDisplay() {
    turnDisplay.textContent = currentTurn.charAt(0).toUpperCase() + currentTurn.slice(1) + " move";
}

function removeDeadStones(playerToCheck) {
    const removed = [];
    const visited = new Set();

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (gameBoard[i][j] === playerToCheck && !visited.has(`${i},${j}`)) {
                if (!groupHasLiberties(i, j)) {
                    const stones = removeGroup(i, j);
                    removed.push(...stones);
                    stones.forEach(([r, c]) => visited.add(`${r},${c}`));
                }
            }
        }
    }
    if (removed.length > 0) {
        socket.emit('removeDeadStones', { room: currentRoom, stones: removed });
    }
    return removed;
}

function groupHasLiberties(row, col) {
    const color = gameBoard[row][col];
    const visited = new Set(); // Keep track of visited stones to avoid infinite loops
    const stack = [[row, col]];
    while (stack.length > 0) {
        const [r, c] = stack.pop();
        const key = `${r},${c}`; // Unique key for each cell
        if (visited.has(key) || gameBoard[r][c] !== color) {
            continue; // Skip if already visited or not the same color
        }
        visited.add(key);
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (let [dx, dy] of directions) {
            const newRow = r + dx;
            const newCol = c + dy;
            if (newRow >= 0 && newRow < size && newCol >= 0 && newCol < size) {
                if (gameBoard[newRow][newCol] === null) {
                    return true; // Found a liberty for the group
                }
            }
        }
        // Add neighbors to the stack
        for (let [dx, dy] of directions) {
            const newRow = r + dx;
            const newCol = c + dy;
            if (newRow >= 0 && newRow < size && newCol >= 0 && newCol < size && gameBoard[newRow][newCol] === color) {
                stack.push([newRow, newCol]);
            }
        }
    }
    return false; // No liberties found for the entire group
}

function hasLiberties(row, col) {
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (let [dx, dy] of directions) {
        const newRow = row + dx;
        const newCol = col + dy;
        if (newRow >= 0 && newRow < size && newCol >= 0 && newCol < size) {
            if (gameBoard[newRow][newCol] === null) {
                return true;
            }
        }
    }
    return false;
}

function removeGroup(row, col) {
    const color = gameBoard[row][col];
    const stack = [[row, col]];
    const stonesToRemove = [];
    while (stack.length > 0) {
        const [r, c] = stack.pop();
        if (r < 0 || r >= size || c < 0 || c >= size || gameBoard[r][c] !== color) continue;
        stonesToRemove.push([r, c]);
        gameBoard[r][c] = null;
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (let [dx, dy] of directions) {
            stack.push([r + dx, c + dy]);
        }
    }
    // Remove from UI as before
    stonesToRemove.forEach(([r, c]) => {
        const intersections = document.querySelectorAll('.intersection');
        intersections.forEach(intersection => {
            if (parseInt(intersection.dataset.row) === (r + 1) && parseInt(intersection.dataset.col) === (c + 1)) {
                const stone = intersection.querySelector('.stone');
                if (stone) intersection.removeChild(stone);
            }
        });
    });
    return stonesToRemove; // Return all removed positions
}

function isSuicideMove(row, col, player) {
    // Temporarily place the stone on the board
    gameBoard[row][col] = player;
    // Check if the group has liberties
    const hasLiberties = groupHasLiberties(row, col);
    let captured = false;
    //If the move doesn't have liberties, check if captures are made
    if (!hasLiberties) {
        const opponent = player === 'black' ? 'white' : 'black';
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (newRow >= 0 && newRow < size && newCol >= 0 && newCol < size && gameBoard[newRow][newCol] === opponent) {
                if (!groupHasLiberties(newRow, newCol)) {
                    captured = true;
                    break;
                }
            }
        }
    }
    // Remove the temporarily placed stone
    gameBoard[row][col] = null;
    // The move is suicidal if has no liberties and no captures are made.
    return !hasLiberties && !captured;
}

passButton.addEventListener('click', () => {
    // Prevent passing if it's not your turn
    if (playerColor !== currentTurn) {
        alert("It's not your turn!");
        return;
    }
    // Disable the pass button until the next turn
    passButton.disabled = true;

    // Emit the pass event with room and player info
    socket.emit('pass', {
        room: currentRoom,
        player: playerColor
    });
    
    // Optionally, update move history or UI immediately
    updateMoveHistory('pass');
});


function calculateTerritory() {
    let blackTerritory = 0;
    let whiteTerritory = 0;
    const visited = Array(size).fill().map(() => Array(size).fill(false));

    function floodFill(row, col, territoryColor) {
        if (row < 0 || row >= size || col < 0 || col >= size || visited[row][col] || gameBoard[row][col] !== null) {
            return;
        }
        visited[row][col] = true;
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dx, dy] of directions) {
            floodFill(row + dx, col + dy, territoryColor);
        }
        if (territoryColor === 'black') {
            blackTerritory++;
        } else {
            whiteTerritory++;
        }
    }
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (gameBoard[i][j] === null && !visited[i][j]) {
                let controlledBy = null;
                let foundContradiction = false;
                const territoryStack = [[i, j]];
                const territoryCells = [];
                while (territoryStack.length > 0) {
                    const [row, col] = territoryStack.pop();
                    if (row < 0 || row >= size || col < 0 || col >= size || territoryCells.some(cell => cell[0] === row && cell[1] === col)) {
                        continue;
                    }
                    if (gameBoard[row][col] === 'black' || gameBoard[row][col] === 'white') {
                        if (controlledBy === null) {
                            controlledBy = gameBoard[row][col];
                        } else if (controlledBy !== gameBoard[row][col]) {
                            foundContradiction = true;
                            break;
                        }
                    } else {
                        territoryCells.push([row, col]);
                        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                        for (const [dx, dy] of directions) {
                            territoryStack.push([row + dx, col + dy]);
                        }
                    }
                }
                if (!foundContradiction && controlledBy !== null) {
                    territoryCells.forEach(([row, col]) => {
                        visited[row][col] = true;
                        if (controlledBy === 'black') {
                            blackTerritory++;
                        } else {
                            whiteTerritory++;
                        }
                    });
                }
            }
        }
    }
    return {
        blackTerritory,
        whiteTerritory
    };
}

function endGame() {
    gameStarted = false; // Stop the game
    clearInterval(countdownInterval);

    // Remove click event listeners to prevent stone placement
    const intersections = document.querySelectorAll('.intersection');
    intersections.forEach(intersection => {
        intersection.removeEventListener('click', placeStone);
    });

    const { blackTerritory, whiteTerritory } = calculateTerritory();
    const blackStones = gameBoard.flat().filter(stone => stone === 'black').length;
    const whiteStones = gameBoard.flat().filter(stone => stone === 'white').length;
    const blackScore = blackTerritory + blackStones;
    const whiteScore = whiteTerritory + whiteStones;
    let winner;

    if (blackScore > whiteScore) {
        winner = 'Black Wins';
    } else if (whiteScore > blackScore) {
        winner = 'White Wins';
    } else {
        winner = 'Tie';
    }

    // Display the winner in the winnerDisplay div
    winnerDisplay.textContent = `${winner}`;
    winnerDisplay.style.display = 'block'; // Make the winner display visible
}


displayName()
displayRanking()
startGame();

socket.on('connect', () => {
    console.log('Connected to server');
    disableStones()
    document.getElementById('pass').disabled = true; 
});

// Matchmaking
document.getElementById('find-match').addEventListener('click', () => {
    socket.emit('findMatch');
    document.getElementById('find-match').disabled = true;
});

socket.on('waitingForPlayer', () => {
    alert("Waiting for another player...");
});

socket.on('gameStart', (data) => {
    playerColor = data.color;
    currentTurn = data.currentTurn;
    alert("Game started! You are in room: " + data.room);
    updateTurnDisplay();
    currentRoom = data.room;
    enableStones()
    document.getElementById('pass').disabled = false; 
});

socket.on('turnUpdate', ({ currentTurn: serverCurrentTurn }) => {
    currentTurn = serverCurrentTurn;
    updateTurnDisplay();
    switchTurns()

    if (playerColor === currentTurn) {
        enableStones();   // Allow this player to place a stone
    } else {
        disableStones();  // Prevent this player from placing a stone
    }
});

socket.on('opponentMove', ({
    row,
    col,
    player
}) => {
    // Update gameBoard array
    gameBoard[row][col] = player;

    // Find the correct intersection on the board
    const intersections = document.querySelectorAll('.intersection');
    let targetIntersection = null;
    intersections.forEach(intersection => {
        if (parseInt(intersection.dataset.row) === (row + 1) && parseInt(intersection.dataset.col) === (col + 1)) {
            targetIntersection = intersection;
        }
    });

    // Place the stone visually
    if (targetIntersection) {
        const stone = document.createElement('div');
        stone.classList.add('stone', player);
        targetIntersection.appendChild(stone);
    }

    switchTurnsAndSendEvent();
});

// Handle countdown updates
socket.on('updateCountdown', ({
    timeLeftBlack: serverTimeLeftBlack,
    timeLeftWhite: serverTimeLeftWhite
}) => {
    timeLeftBlack = serverTimeLeftBlack;
    timeLeftWhite = serverTimeLeftWhite;
    updateDisplayCountdown('black');
    updateDisplayCountdown('white');
});

// Handle game end event
socket.on('endGame', ({
    winner
}) => {
    endGame(winner)
    disableStones() 
});

socket.emit('removeDeadStones', () => {
    removeDeadStones(currentPlayer)
});

//Handle the other player removing the dead stones
socket.on('removeDeadStones', (stones) => {
    stones.forEach(([r, c]) => {
        gameBoard[r][c] = null;
        const intersections = document.querySelectorAll('.intersection');
        intersections.forEach(intersection => {
            if (parseInt(intersection.dataset.row) === (r + 1) && parseInt(intersection.dataset.col) === (c + 1)) {
                const stone = intersection.querySelector('.stone');
                if (stone) intersection.removeChild(stone);
            }
        });
    });
});

