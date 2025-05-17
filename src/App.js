import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  const [scoreAnimation, setScoreAnimation] = useState(false);
  const [highScoreAnimation, setHighScoreAnimation] = useState(false);
  const [newHighScore, setNewHighScore] = useState(false);
  const [particles, setParticles] = useState([]);
  
  
   const gameSettings =  useMemo(() => {
    switch(difficulty) {
      case 'easy':
        return { 
          pipeGap: 220,
          initialDistance : 0.50, 
          collisionBuffer: 20,
          topCollisionBuffer: 40,
          gravity: 0.3, 
          jumpForce: -7
        };
      case 'medium':
        return { 
          pipeGap: 200, 
          initialDistance : 0.75, 
          collisionBuffer: 15,
          topCollisionBuffer: 30,
          gravity: 0.4, 
          jumpForce: -8
        };
      case 'hard':
        return { 
          pipeGap: 180, 
          initialDistance : 0.80, 
          collisionBuffer: 10,
          topCollisionBuffer: 20,
          gravity: 0.5, 
          jumpForce: -10
        };
      default:
        return { 
          pipeGap: 200, 
          initialDistance : 0.75, 
          collisionBuffer: 15,
          topCollisionBuffer: 30,
          gravity: 0.4, 
          jumpForce: -8
        };
    }
  }, [difficulty]);

  // Destructure all settings at once
  const {
    pipeGap,
    collisionBuffer,
    topCollisionBuffer,
    gravity,
    jumpForce,
    initialDistance
  } = gameSettings;

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

// Add this with your other utility functions at the top of your component
const generatePipeId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Game elements refs
  const birdRef = useRef(null);
  const gameAreaRef = useRef(null);
  const requestRef = useRef();
  const previousTimeRef = useRef();
  const aiTimeoutRef = useRef();
  
  // Game constants
  //const gravity = 0.5;
  //const jumpForce = -10;
  const pipeWidth = 80;
  //const pipeGap = 180;
  //const topCollisionBuffer = 10;

   const initialPipeDistance = gameAreaWidth * initialDistance; // Increased from 400 to give more space
  const minPipeHeight = 80; // Minimum distance from top/bottom
  //const collisionBuffer = 15; // Buffer around bird for collisions
  
  

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
             id: generatePipeId()
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
  /*  if (deltaTime < 100) { // Only continue if frame time is reasonable
    requestRef.current = requestAnimationFrame(gameLoop);
  } else {
    console.warn('Frame time exceeded threshold:', deltaTime);
    endGame();
  } */

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
        id: generatePipeId
      });
    }
    
    // Update pipe positions and check if passed
    pipes = pipes.map(pipe => {
      const newX = pipe.x - speed * deltaTime;
      
      if (!pipe.passed && newX + pipeWidth < 50 && !gameOver) {
        pipe.passed = true;
        setScore(prev => {
        // Cap score at maximum safe integer if needed
        const newScore = prev + 1;
        return newScore > Number.MAX_SAFE_INTEGER - 1000 ? 0 : newScore;
      });
      setScoreAnimation(true);
      setTimeout(() => setScoreAnimation(false), 500); // Increase score
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
    //const oldPipes = gameArea.querySelectorAll('.pipe');
    //oldPipes.forEach(pipe => pipe.remove());

    const oldPipes = gameArea.querySelectorAll('[data-id^="top-"], [data-id^="bottom-"]');
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
    if (bird.bottom >= gameArea.bottom - 10 || bird.top <= gameArea.top + 10 ) {
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
        const birdRight = bird.right - 5; // Right side with buffer
        const birdLeft = bird.left + 5;   // Left side with buffer
        const birdBottom = bird.bottom - 5; // Bottom with buffer
        const birdTop = bird.top + 5;      // Top with buffer
        
        if (
          bird.right - collisionBuffer > topRect.left + collisionBuffer && 
          bird.left + collisionBuffer < topRect.right - collisionBuffer &&
          (bird.bottom - collisionBuffer > topRect.bottom || 
           bird.top + collisionBuffer < bottomRect.top)
        ) {
            endGame();
            return;
          } 
          if (
        birdRight > topRect.left + 5 && 
        birdLeft < topRect.right - 5 &&
        (birdBottom > topRect.bottom || birdTop < bottomRect.top)
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

  const handleDifficultyChange = (newDifficulty) => {
    // Only reset if the difficulty actually changed
    if (difficulty !== newDifficulty) {
      setDifficulty(newDifficulty);
      
      // If game is running, restart to apply new settings
     if (gameStarted && !gameOver) {
    startGame();
       // resetGame();
      } 
    }
  };

const restartGame = () => {
  resetGame();
  startGame();
};
  
  

  const resetGame = () => {
  // Reset all states
  setGameStarted(false);
  setGameOver(false);
  setScore(0);
  //setIsPlaying(false);
  setCountdown(0);
  
  // Reset physics
  birdPosition = 250;
  birdVelocity = 0;
  pipes = [];
  
  // Clear DOM elements
  const existingPipes = document.querySelectorAll('.pipe');
  existingPipes.forEach(pipe => pipe.remove());
  
  // Reset bird position
  if (birdRef.current) {
    birdRef.current.style.top = '250px';
    birdRef.current.style.transform = 'rotate(0deg)';
  }
  
  // Cancel any ongoing animations
  cancelAnimationFrame(requestRef.current);
  if (aiTimeoutRef.current) {
    clearTimeout(aiTimeoutRef.current);
  }
};

// Add this effect when score increases
const spawnParticles = (count, x, y, isHighScore = false) => {
  const newParticles = [];
  for (let i = 0; i < count; i++) {
    newParticles.push({
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
      size: isHighScore ? 
        Math.random() * 6 + 4 : 
        Math.random() * 4 + 2,
      color: isHighScore ?
        `hsl(${Math.random() * 30 + 40}, 100%, 50%)` : // Golden hues
        `hsl(${Math.random() * 60 + 100}, 100%, 50%)`, // Greenish hues
      speedX: (Math.random() - 0.5) * 4,
      speedY: (Math.random() - 1) * 3, // Float upward more
      life: isHighScore ? 90 : 60, // Longer life for high scores
      className: isHighScore ? 'particle highscore' : 'particle score',
      style: {
        '--tx': `${(Math.random() - 0.5) * 100}px`,
        '--ty': `${(Math.random() - 1) * 80}px`
      }
    });
  }
  setParticles(prev => [...prev, ...newParticles]);
};


const cleanUpPipes = () => {
  pipes = pipes.filter(pipe => pipe.x > -pipeWidth * 2);
};

const increaseScore = () => {
    setScore(prev => {
      const newScore = prev + 1;
      
      // Check for new high score
      if (newScore > highScore) {
        setHighScore(newScore);
        setHighScoreAnimation(true);
        setNewHighScore(true);
        setTimeout(() => setNewHighScore(false), 2000);
        playHighScoreSound();
        spawnParticles(10, 100, 50, true); // Position near high score display
    } else {
      playScoreSound();
      spawnParticles(5, 50, 50); // Position near score display
    }
      
      return newScore;
    });
    
    // Trigger score animation
    setScoreAnimation(true);
    setTimeout(() => setScoreAnimation(false), 500);
  };

  const playScoreSound = () => {
  const audio = new Audio('/sounds/score.mp3');
  audio.volume = 0.3;
  audio.play();
};

const playHighScoreSound = () => {
  const audio = new Audio('/sounds/highscore.mp3');
  audio.volume = 0.5;
  audio.play();
};

useEffect(() => {
  // Prevent score reset due to integer overflow
  if (score > highScore) {
        setHighScore(score);
        setHighScoreAnimation(true);
        setNewHighScore(true);
        setTimeout(() => setNewHighScore(false), 2000);
       playHighScoreSound();
      spawnParticles(10, 100, 50, true); // Position near high score display
    } else {
      playScoreSound();
      spawnParticles(5, 50, 50); // Position near score display
    }
}, [score]);

// Update your game loop to handle particles
useEffect(() => {
  const particleLoop = setInterval(() => {
    setParticles(prev => 
      prev.map(p => ({
        ...p,
        x: p.x + p.speedX,
        y: p.y + p.speedY,
        life: p.life - 1
      })).filter(p => p.life > 0)
    );
  }, 16);

  return () => clearInterval(particleLoop);
}, []);

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
      
     {/*} <div className="scores">
        <div>Score: {score}</div>
        <div>High Score: {highScore}</div>
      </div> */}

      <div className="score-container">
            <div className="score-item">
               <div className="score-label">Score:</div>
                  <div className={`score-value score-display ${scoreAnimation ? 'score-increase' : ''}`}>
                    {score}
                  </div>
            </div>
  
            <div className="score-item">
                <div className="score-label">High Score:</div>
                    <div className={`score-value score-display ${highScoreAnimation ? 'highscore-beat' : ''}`}>
                        {highScore}
                        {newHighScore && <span className="new-highscore">New!</span>}
                    </div>
                   {highScoreAnimation && 
                    setTimeout(() => setHighScoreAnimation(false), 1000)
                   }
           </div>
       </div>

<div className="particles-container">
  {particles.map(particle => (
    <div
      key={particle.id}
      className={particle.className}
      style={{
        left: `${particle.x}px`,
        top: `${particle.y}px`,
        width: `${particle.size}px`,
        height: `${particle.size}px`,
        backgroundColor: particle.color,
        animationDuration: `${particle.life/60}s`,
        ...particle.style
      }}
    />
  ))}
</div>
      
      <div className="difficulty-controls">
      <h3>Difficulty:</h3>
      <div className="difficulty-buttons">
        <button
          className={`difficulty-btn ${difficulty === 'easy' ? 'active' : ''}`}
          onClick={() => handleDifficultyChange('easy')}
        >
          Easy
        </button>
        <button
          className={`difficulty-btn ${difficulty === 'medium' ? 'active' : ''}`}
          onClick={() => handleDifficultyChange('medium')}
        >
          Medium
        </button>
        <button
          className={`difficulty-btn ${difficulty === 'hard' ? 'active' : ''}`}
          onClick={() => handleDifficultyChange('hard')}
        >
          Hard
        </button>
      </div>
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
            <button onClick={resetGame}>Play Again</button>
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