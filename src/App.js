import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const App = () => {
  // Game states
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [aiSpeed, setAiSpeed] = useState(1);
  const [countdown, setCountdown] = useState(0);
  const [difficulty, setDifficulty] = useState('medium');
  

const getGameSettings = () => {
  switch(difficulty) {
    case 'easy':
      return { pipeGap: 220, initialDistance: 350, collisionBuffer: 20 };
    case 'medium':
      return { pipeGap: 200, initialDistance: 300, collisionBuffer: 15 };
    case 'hard':
      return { pipeGap: 180, initialDistance: 250, collisionBuffer: 10 };
    default:
      return { pipeGap: 200, initialDistance: 300, collisionBuffer: 15 };
  }
};
  const getTopCollisionBuffer = () => {
  switch(difficulty) {
    case 'easy': return 40;
    case 'medium': return 30;
    case 'hard': return 20;
    default: return 30;
  }
};

const getPhysicsSettings = () => {
  switch(difficulty) {
    case 'easy':
      return { gravity: 0.3, jumpForce: -7, pipeGap: 200 };
    case 'medium':
      return { gravity: 0.4, jumpForce: -8, pipeGap: 180 };
    case 'hard':
      return { gravity: 0.5, jumpForce: -10, pipeGap: 150 };
    default:
      return { gravity: 0.4, jumpForce: -8, pipeGap: 180 };
  }
};

//const { gravity, jumpForce, pipeGap } = getPhysicsSettings();
const useGameAreaSize = () => {
  const [size, setSize] = useState({ width: 400, height: 600 });
  
  useEffect(() => {
    const handleResize = () => {
      const maxWidth = Math.min(window.innerWidth - 40, 400);
      const ratio = 600/400;
      setSize({
        width: maxWidth,
        height: maxWidth * ratio
      });
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
};

const { width: gameAreaWidth, height: gameAreaHeight } = useGameAreaSize();

  // Game elements refs
  const birdRef = useRef(null);
  const gameAreaRef = useRef(null);
  const requestRef = useRef();
  const previousTimeRef = useRef();
  const aiTimeoutRef = useRef();
  
  // Game constants
  const gravity = 0.5;
  const jumpForce = -10;
  const pipeWidth = 80;
  const pipeGap = 180;
  const topCollisionBuffer = 10;

   const initialPipeDistance = gameAreaWidth * 0.75; // Increased from 400 to give more space
  const minPipeHeight = 80; // Minimum distance from top/bottom
  const collisionBuffer = 15; // Buffer around bird for collisions
  
  

  // Game variables
  let birdPosition = 250;
  let birdVelocity = 0;
  let pipes = [];

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(requestRef.current);
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
      }
    };
  }, []);

  const startGame = () => {
    // Reset all states
    setGameOver(false);
    setScore(0);
    setGameStarted(true);
    
    // Reset physics
    birdPosition = 250;
    birdVelocity = 0;
    
    // Clear all pipes
    pipes = [];
    const existingPipes = document.querySelectorAll('.pipe');
    existingPipes.forEach(pipe => pipe.remove());
    
    // Reset bird position
    if (birdRef.current) {
      birdRef.current.style.top = `${birdPosition}px`;
      birdRef.current.style.transform = `rotate(0deg)`;
    }

    
    
    // Start countdown
    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          
          // Add first pipe
          pipes.push({
             x: initialPipeDistance, // Increased initial distance
             height: Math.floor(Math.random() * (gameAreaHeight - pipeGap - minPipeHeight * 2)) + minPipeHeight,
             passed: false,
             id: Date.now()
          });
          
          // Start game loop
          previousTimeRef.current = performance.now();
          requestRef.current = requestAnimationFrame(gameLoop);
          
          // Start AI
          aiPlay();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const gameLoop = (timestamp) => {
    if (gameOver) return;
    
    if (!previousTimeRef.current) previousTimeRef.current = timestamp;
    const deltaTime = timestamp - previousTimeRef.current;
    previousTimeRef.current = timestamp;
    
    moveBird();
    updatePipes(deltaTime);
    checkCollision();
    
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  const moveBird = () => {
    birdVelocity += gravity;
    birdPosition += birdVelocity;
    
    if (birdPosition < topCollisionBuffer) {
      birdPosition = topCollisionBuffer;
      birdVelocity = 0;
    }
    
    if (birdRef.current) {
      birdRef.current.style.top = `${birdPosition}px`;
      birdRef.current.style.transform = `rotate(${Math.min(birdVelocity * 5, 90)}deg)`;
    }
  };

  const updatePipes = (deltaTime) => {
    const speed = 0.1 * aiSpeed;
    
    // Add new pipes when needed
    if (pipes.length === 0 || pipes[pipes.length - 1].x < 350) {
      pipes.push({
        x: 400,
        height: Math.floor(Math.random() * 200) + 50,
        passed: false,
        id: Date.now() + Math.random()
      });
    }
    
    // Update pipe positions and check if passed
    pipes = pipes.map(pipe => {
      const newX = pipe.x - speed * deltaTime;
      
      if (!pipe.passed && newX + pipeWidth < 50 && !gameOver) {
        pipe.passed = true;
        setScore(prev => prev + 1);
      }
      
      return { ...pipe, x: newX };
    }).filter(pipe => pipe.x > -pipeWidth);
    
    // Update DOM
    renderPipes();
  };

  const renderPipes = () => {
    const gameArea = gameAreaRef.current;
    if (!gameArea || gameOver) return;
    
    // Remove old pipes
    const oldPipes = gameArea.querySelectorAll('.pipe');
    oldPipes.forEach(pipe => pipe.remove());
    
    // Create new pipes
    pipes.forEach(pipe => {
      // Top pipe
      const topPipe = document.createElement('div');
      topPipe.className = 'pipe top';
      topPipe.style.left = `${pipe.x}px`;
      topPipe.style.height = `${pipe.height}px`;
      topPipe.style.width = `${pipeWidth}px`;
      topPipe.dataset.id = `top-${pipe.id}`;
      gameArea.appendChild(topPipe);

      // Bottom pipe
      const bottomPipe = document.createElement('div');
      bottomPipe.className = 'pipe bottom';
      bottomPipe.style.left = `${pipe.x}px`;
      bottomPipe.style.top = `${pipe.height + pipeGap}px`;
      bottomPipe.style.height = `calc(100% - ${pipe.height + pipeGap}px)`;
      bottomPipe.style.width = `${pipeWidth}px`;
      bottomPipe.dataset.id = `bottom-${pipe.id}`;
      gameArea.appendChild(bottomPipe);
    });
  };

  const checkCollision = () => {
    if (!birdRef.current || !gameAreaRef.current || gameOver) return;
    
    const bird = birdRef.current.getBoundingClientRect();
    const gameArea = gameAreaRef.current.getBoundingClientRect();
    
    // Ground/ceiling check with larger buffer
    if (bird.bottom >= gameArea.bottom - 20 ) {
      endGame();
      return;
    }

    if (bird.top <= gameArea.top + topCollisionBuffer) {
      birdVelocity = Math.abs(birdVelocity) * 0.5; // Reverse and reduce velocity
      return;
    }
    
    // Only check collision with nearest pipe
    const nearestPipe = pipes.find(pipe => pipe.x < 100 && pipe.x > -pipeWidth);
    const relevantPipes = pipes.filter(pipe => 
      pipe.x < bird.right + 50 && pipe.x + pipeWidth > bird.left - 50
    );

    for (const pipe of relevantPipes) {
      const pipeTop = document.querySelector(`.pipe[data-id="top-${pipe.id}"]`);
      const pipeBottom = document.querySelector(`.pipe[data-id="bottom-${pipe.id}"]`);
      
      
      if (pipeTop && pipeBottom) {
        const topRect = pipeTop.getBoundingClientRect();
        const bottomRect = pipeBottom.getBoundingClientRect();
        
        // More precise collision detection with buffers
        const birdRight = bird.right - 15; // Right side with buffer
        const birdLeft = bird.left + 15;   // Left side with buffer
        const birdBottom = bird.bottom - 10; // Bottom with buffer
        const birdTop = bird.top + 10;      // Top with buffer
        
        if (
          bird.right - collisionBuffer > topRect.left + collisionBuffer && 
          bird.left + collisionBuffer < topRect.right - collisionBuffer &&
          (bird.bottom - collisionBuffer > topRect.bottom || 
           bird.top + collisionBuffer < bottomRect.top)
        ) {
            endGame();
            return;
          } 
      }
    }
   
  };

  const jump = () => {
  if (gameOver) return;
  
  // Smoother jump with velocity cap
  birdVelocity = Math.max(jumpForce, birdVelocity * 0.7 + jumpForce);
  
  setTimeout(() => {
    if (!gameOver) {
      checkCollision();
    }
  }, 75);
};

  const aiPlay = () => {
    // Clear any existing AI loop
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
    }
    
    const aiLoop = () => {
      if (gameOver || !birdRef.current) return;
      
      const bird = birdRef.current.getBoundingClientRect();
      const nextPipe = pipes.find(pipe => pipe.x + pipeWidth > 50);
      
      if (nextPipe) {
        const pipeTop = document.querySelector(`.pipe[data-id="top-${nextPipe.id}"]`);
        if (pipeTop) {
          const pipeTopRect = pipeTop.getBoundingClientRect();
          if (
            (bird.top + bird.height > pipeTopRect.bottom - 10 && birdVelocity >= 0) ||
            (bird.top < pipeTopRect.bottom - pipeGap / 2 && birdVelocity < -5)
          ) {
            jump();
          }
        }
      }
      
      aiTimeoutRef.current = setTimeout(() => aiLoop(), 20 / aiSpeed);
    };
    
    aiLoop();
  };

  const endGame = () => {
    setGameOver(true);
    setHighScore(prev => Math.max(prev, score));
    cancelAnimationFrame(requestRef.current);
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
    }
    const existingPipes = document.querySelectorAll('.pipe');
    existingPipes.forEach(pipe => pipe.remove());
    //setScore(0);
  };

  const handleKeyDown = (e) => {
    // Only handle space and up arrow keys
    if (e.code === 'Space' || e.key === 'ArrowUp') {
      e.preventDefault(); // Prevent default page scrolling
      jump(); // Call the jump function
    }
  };

  

  // Add to your component
useEffect(() => {
  console.log('Game area dimensions:', { gameAreaWidth, gameAreaHeight });
}, [gameAreaWidth, gameAreaHeight]);

  return (
    <div className="app">
      <h1>Flappy Bird AI </h1>
      
      <div className="controls">
        <button onClick={startGame} disabled={gameStarted && !gameOver}>
          {gameStarted && !gameOver ? 'AI Playing' : 'Start AI'}
        </button>
        
        <div className="ai-speed-control">
          <label>AI Speed:</label>
          <input 
            type="range" 
            min="1" 
            max="5" 
            value={aiSpeed} 
            onChange={(e) => setAiSpeed(parseInt(e.target.value))}
          />
          <span>{aiSpeed}x</span>
        </div>
      </div>
      
      <div className="scores">
        <div>Score: {score}</div>
        <div>High Score: {highScore}</div>
      </div>
      
      <div ref={gameAreaRef} className="game-area" style={{
          width: `${gameAreaWidth}px`,
          height: `${gameAreaHeight}px`
        }}
        tabIndex="0"
         onKeyDown={handleKeyDown} >
        {gameStarted && (
          <>
            <div ref={birdRef} className="bird" />
            {/* Pipes are rendered via DOM manipulation */}
          </>
        )}
        
        {countdown > 0 && (
          <div className="countdown-overlay">
            <div className="countdown">{countdown}</div>
            <div className="instructions">AI is getting ready...</div>
          </div>
        )}
        
        {gameOver && (
          <div className="game-over">
            <h2>Game Over!</h2>
            <p>Score: {score}</p>
            <button onClick={startGame}>Play Again</button>
          </div>
        )}
        
        {!gameStarted && (
          <div className="instructions">
            <p>Watch the AI play Flappy Bird!</p>
            <p>Adjust speed with the slider.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;