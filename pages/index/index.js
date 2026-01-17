// pages/index/index.js
Page({
  /**
   * Cloud storage base URL
   */
  cloudBaseUrl: 'https://hougong721-1308856491.cos.ap-guangzhou.myqcloud.com/',

  /**
   * Game state
   */
  data: {
    board: [], // 4x4 grid: board[row][col] = { level, image } or null
    gameOver: false,
    score: 0, // Max level reached
    maxLevelReached: 0,
    currentThemeLevel: 3,
    showUnlock: false,
    isGameStart: false, // 标记游戏是否已开始（用于手机端音频播放）
    currentBgImage: 'https://hougong721-1308856491.cos.ap-guangzhou.myqcloud.com/theme_1.png',
    currentBorderColor: '#FFD700',
    containerStyle: "background-image: url('https://hougong721-1308856491.cos.ap-guangzhou.myqcloud.com/theme_1.png');",
    touchStartX: 0,
    touchStartY: 0,
    isMoving: false // Prevent multiple moves during animation
  },

  /**
   * Theme configuration
   */
  themes: [
    { level: 3, bgImage: 'https://hougong721-1308856491.cos.ap-guangzhou.myqcloud.com/theme_1.png', borderColor: '#FFD700' },
    { level: 4, bgImage: 'https://hougong721-1308856491.cos.ap-guangzhou.myqcloud.com/theme_2.png', borderColor: '#9370DB' },
    { level: 5, bgImage: 'https://hougong721-1308856491.cos.ap-guangzhou.myqcloud.com/theme_3.png', borderColor: '#FF69B4' },
    { level: 6, bgImage: 'https://hougong721-1308856491.cos.ap-guangzhou.myqcloud.com/theme_4.png', borderColor: '#FF1493' },
    { level: 7, bgImage: 'https://hougong721-1308856491.cos.ap-guangzhou.myqcloud.com/theme_5.png', borderColor: '#C71585' },
    { level: 8, bgImage: 'https://hougong721-1308856491.cos.ap-guangzhou.myqcloud.com/theme_6.png', borderColor: '#8B008B' }
  ],

  /**
   * Audio contexts
   */
  bgmAudio: null,
  unlockAudio: null,
  gameoverAudio: null,

  /**
   * Timeout IDs for cleanup
   */
  timeoutIds: [],

  /**
   * Page loaded flag
   */
  isPageLoaded: false,

  /**
   * Lifecycle: Initialize game
   */
  onLoad() {
    this.isPageLoaded = true;
    this.timeoutIds = [];
    // 只初始化游戏和音频，不播放音频（手机端必须由用户操作触发）
    this.initGame();
    this.initAudio();
    // 注意：不在这里调用 playBGM()，需要用户点击开始游戏按钮
  },

  /**
   * Initialize game board and state
   */
  initGame() {
    // Create empty 4x4 board
    const board = [];
    for (let i = 0; i < 4; i++) {
      board[i] = [];
      for (let j = 0; j < 4; j++) {
        board[i][j] = null;
      }
    }

    // Spawn initial tiles (2 tiles)
    this.spawnTile(board);
    this.spawnTile(board);

    this.setData({
      board: board,
      gameOver: false,
      score: 0,
      maxLevelReached: 0,
      currentThemeLevel: 3,
      showUnlock: false,
      // 注意：不重置 isGameStart，保持游戏已开始状态
      currentBgImage: 'https://hougong721-1308856491.cos.ap-guangzhou.myqcloud.com/theme_1.png',
      currentBorderColor: '#FFD700',
      containerStyle: "background-image: url('https://hougong721-1308856491.cos.ap-guangzhou.myqcloud.com/theme_1.png');"
    });
  },

  /**
   * Initialize audio contexts (只创建实例，不播放)
   */
  initAudio() {
    const baseUrl = 'https://hougong721-1308856491.cos.ap-guangzhou.myqcloud.com/';
    
    // Background music
    this.bgmAudio = wx.createInnerAudioContext();
    this.bgmAudio.src = baseUrl + 'bgm.MP3';
    this.bgmAudio.loop = true;
    this.bgmAudio.volume = 0.7; // 设置音量
    this.bgmAudio.onError((err) => {
      if (!this.isPageLoaded) return;
      console.error('BGM audio error:', err);
      if (this.isPageLoaded) {
        wx.showToast({ title: '背景音乐加载失败', icon: 'none', duration: 2000 });
        // 尝试小写文件名
        this.bgmAudio.src = baseUrl + 'bgm.mp3';
      }
    });
    this.bgmAudio.onCanplay(() => {
      if (!this.isPageLoaded) return;
      console.log('BGM audio can play');
    });
    this.bgmAudio.onPlay(() => {
      if (!this.isPageLoaded) return;
      console.log('BGM audio playing');
    });

    // Unlock sound
    this.unlockAudio = wx.createInnerAudioContext();
    this.unlockAudio.src = baseUrl + 'unlock.MP3';
    this.unlockAudio.volume = 0.8;
    this.unlockAudio.onError((err) => {
      if (!this.isPageLoaded) return;
      console.error('Unlock audio error:', err);
      // 尝试小写文件名
      this.unlockAudio.src = baseUrl + 'unlock.mp3';
    });
    this.unlockAudio.onCanplay(() => {
      if (!this.isPageLoaded) return;
      console.log('Unlock audio can play');
    });

    // Game over sound
    this.gameoverAudio = wx.createInnerAudioContext();
    this.gameoverAudio.src = baseUrl + 'gameover.MP3';
    this.gameoverAudio.volume = 0.8;
    this.gameoverAudio.onError((err) => {
      if (!this.isPageLoaded) return;
      console.error('Gameover audio error:', err);
      // 尝试小写文件名
      this.gameoverAudio.src = baseUrl + 'gameover.mp3';
    });
    this.gameoverAudio.onCanplay(() => {
      if (!this.isPageLoaded) return;
      console.log('Gameover audio can play');
    });
  },

  /**
   * 用户点击开始游戏按钮（必须由用户操作触发，手机端才能播放音频）
   */
  onGameStart() {
    if (this.data.isGameStart) return;
    
    console.log('onGameStart called');
    
    // 1. 播放背景音乐（用户操作触发，手机端允许）
    // 手机端关键：必须在用户点击事件的同步执行中立即创建和播放
    const baseUrl = 'https://hougong721-1308856491.cos.ap-guangzhou.myqcloud.com/';
    
    try {
      // 手机端最佳实践：在用户点击时重新创建音频实例，确保是用户操作触发的
      if (this.bgmAudio) {
        this.bgmAudio.destroy();
      }
      
      // 重新创建音频实例（在用户点击事件中，手机端允许）
      this.bgmAudio = wx.createInnerAudioContext();
      
      // 设置音频播放选项（重要：手机端可能需要）
      wx.setInnerAudioOption({
        mixWithOther: true,  // 与其他音频混播
        obeyMuteSwitch: false,  // 不遵循静音开关（重要！）
        success: () => {
          console.log('音频选项设置成功');
        },
        fail: (err) => {
          console.error('音频选项设置失败:', err);
        }
      });
      
      this.bgmAudio.src = baseUrl + 'bgm.MP3';
      this.bgmAudio.loop = true;
      this.bgmAudio.volume = 1.0; // 设置为最大音量测试
      
      // 添加事件监听（添加页面加载检查）
      this.bgmAudio.onCanplay(() => {
        if (!this.isPageLoaded) return;
        console.log('BGM audio can play, duration:', this.bgmAudio.duration);
      });
      this.bgmAudio.onPlay(() => {
        if (!this.isPageLoaded) return;
        console.log('BGM audio playing - 播放成功！');
        console.log('BGM audio state:', {
          paused: this.bgmAudio.paused,
          volume: this.bgmAudio.volume,
          duration: this.bgmAudio.duration,
          currentTime: this.bgmAudio.currentTime
        });
      });
      this.bgmAudio.onPause(() => {
        console.log('BGM audio paused');
      });
      this.bgmAudio.onStop(() => {
        console.log('BGM audio stopped');
      });
      this.bgmAudio.onError((err) => {
        if (!this.isPageLoaded) return;
        console.error('BGM audio error:', err);
        if (this.isPageLoaded) {
          wx.showToast({ 
            title: '音频加载失败，请检查网络', 
            icon: 'none', 
            duration: 3000 
          });
        }
      });
      
      // 手机端关键：必须在用户点击事件的同步执行中立即调用 play()
      // 不能使用 setTimeout 延迟，否则会被认为是异步操作，手机端会阻止
      this.bgmAudio.play();
      console.log('BGM play() called immediately in user click event');
      
      // 检查播放状态
      this.safeSetTimeout(() => {
        if (this.isPageLoaded && this.bgmAudio) {
          console.log('BGM audio status after 500ms:', {
            paused: this.bgmAudio.paused,
            volume: this.bgmAudio.volume,
            duration: this.bgmAudio.duration
          });
        }
      }, 500);
      
    } catch (err) {
      console.error('播放背景音乐失败:', err);
      wx.showToast({ 
        title: '播放失败: ' + (err.message || err), 
        icon: 'none', 
        duration: 3000 
      });
    }
    
    // 2. 标记游戏已开始
    this.setData({ isGameStart: true });
  },

  /**
   * Play background music
   */
  playBGM() {
    if (this.bgmAudio && this.isPageLoaded) {
      try {
        this.bgmAudio.play();
      } catch (err) {
        console.error('Failed to play BGM:', err);
      }
    }
  },

  /**
   * Play sound effect (音效播放，由用户操作触发，手机端允许)
   */
  playSound(audioContext) {
    if (audioContext && this.isPageLoaded && this.data.isGameStart) {
      try {
        // 停止当前播放
        audioContext.stop();
        // 重新设置src确保加载
        const baseUrl = 'https://hougong721-1308856491.cos.ap-guangzhou.myqcloud.com/';
        if (audioContext === this.unlockAudio) {
          audioContext.src = baseUrl + 'unlock.MP3';
        } else if (audioContext === this.gameoverAudio) {
          audioContext.src = baseUrl + 'gameover.MP3';
        }
        // 播放音效
        audioContext.play();
        console.log('Sound effect playing');
      } catch (err) {
        console.error('Failed to play sound:', err);
      }
    }
  },

  /**
   * Safe setData wrapper - checks if page is still loaded
   */
  safeSetData(data) {
    if (this.isPageLoaded) {
      this.setData(data);
    }
  },

  /**
   * Safe setTimeout wrapper - tracks timeout IDs for cleanup
   */
  safeSetTimeout(callback, delay) {
    if (!this.isPageLoaded) return null;
    const timeoutId = setTimeout(() => {
      if (this.isPageLoaded && callback) {
        callback();
      }
    }, delay);
    this.timeoutIds.push(timeoutId);
    return timeoutId;
  },

  /**
   * Touch start handler - record initial position
   */
  onTouchStart(e) {
    if (this.data.isMoving || this.data.gameOver || !this.isPageLoaded || !this.data.isGameStart) return;
    
    const touch = e.touches[0];
    this.setData({
      touchStartX: touch.clientX,
      touchStartY: touch.clientY
    });
  },

  /**
   * Touch move handler - prevent page scroll
   */
  onTouchMove(e) {
    // 阻止页面滚动
    return false;
  },

  /**
   * Touch end handler - calculate swipe direction and move
   */
  onTouchEnd(e) {
    if (this.data.isMoving || this.data.gameOver || !this.isPageLoaded || !this.data.isGameStart) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - this.data.touchStartX;
    const deltaY = touch.clientY - this.data.touchStartY;
    const minSwipeDistance = 30; // Minimum swipe distance in pixels

    // Determine swipe direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) < minSwipeDistance) return;
      if (deltaX > 0) {
        this.moveRight();
      } else {
        this.moveLeft();
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) < minSwipeDistance) return;
      if (deltaY > 0) {
        this.moveDown();
      } else {
        this.moveUp();
      }
    }
  },

  /**
   * Move tiles left
   */
  moveLeft() {
    if (this.data.isMoving || !this.isPageLoaded) return;
    this.setData({ isMoving: true });

    const originalBoard = JSON.parse(JSON.stringify(this.data.board)); // Save original for comparison
    const board = JSON.parse(JSON.stringify(this.data.board)); // Deep copy
    let moved = false;
    let newLevelCreated = 0;

    // Process each row
    for (let row = 0; row < 4; row++) {
      // Slide tiles left (remove empty spaces)
      const rowTiles = [];
      for (let col = 0; col < 4; col++) {
        if (board[row][col] !== null) {
          rowTiles.push(board[row][col]);
        }
      }

      // Merge adjacent same-level tiles
      const merged = [];
      for (let i = 0; i < rowTiles.length; i++) {
        if (i < rowTiles.length - 1 && rowTiles[i].level === rowTiles[i + 1].level) {
          // Merge tiles
          const newLevel = rowTiles[i].level + 1;
          merged.push({
            level: newLevel,
            image: `https://hougong721-1308856491.cos.ap-guangzhou.myqcloud.com/${newLevel}.png`
          });
          newLevelCreated = Math.max(newLevelCreated, newLevel);
          moved = true;
          i++; // Skip next tile as it's merged
        } else {
          merged.push(rowTiles[i]);
        }
      }

      // Update row
      for (let col = 0; col < 4; col++) {
        board[row][col] = col < merged.length ? merged[col] : null;
      }
    }

    // Check if board actually changed by comparing with original
    if (JSON.stringify(originalBoard) !== JSON.stringify(board)) {
      moved = true;
    }

    if (moved) {
      // Spawn new tile
      this.spawnTile(board);

      // Update board
      this.setData({ board: board });

      // Check for unlock effects
      if (newLevelCreated > 0) {
        this.checkUnlock(newLevelCreated);
      }

      // Check for game over
      this.safeSetTimeout(() => {
        this.safeSetData({ isMoving: false });
        this.checkGameOver();
      }, 200);
    } else {
      this.setData({ isMoving: false });
    }
  },

  /**
   * Move tiles right
   */
  moveRight() {
    if (this.data.isMoving || !this.isPageLoaded) return;
    this.setData({ isMoving: true });

    const originalBoard = JSON.parse(JSON.stringify(this.data.board)); // Save original for comparison
    const board = JSON.parse(JSON.stringify(this.data.board)); // Deep copy
    let moved = false;
    let newLevelCreated = 0;

    // Process each row
    for (let row = 0; row < 4; row++) {
      // Slide tiles right (remove empty spaces)
      const rowTiles = [];
      for (let col = 3; col >= 0; col--) {
        if (board[row][col] !== null) {
          rowTiles.push(board[row][col]);
        }
      }

      // Merge adjacent same-level tiles
      const merged = [];
      for (let i = 0; i < rowTiles.length; i++) {
        if (i < rowTiles.length - 1 && rowTiles[i].level === rowTiles[i + 1].level) {
          // Merge tiles
          const newLevel = rowTiles[i].level + 1;
          merged.push({
            level: newLevel,
            image: `https://hougong721-1308856491.cos.ap-guangzhou.myqcloud.com/${newLevel}.png`
          });
          newLevelCreated = Math.max(newLevelCreated, newLevel);
          moved = true;
          i++; // Skip next tile as it's merged
        } else {
          merged.push(rowTiles[i]);
        }
      }

      // Update row (fill from right)
      for (let col = 3; col >= 0; col--) {
        const idx = 3 - col;
        board[row][col] = idx < merged.length ? merged[idx] : null;
      }
    }

    // Check if board actually changed by comparing with original
    if (JSON.stringify(originalBoard) !== JSON.stringify(board)) {
      moved = true;
    }

    if (moved) {
      // Spawn new tile
      this.spawnTile(board);

      // Update board
      this.setData({ board: board });

      // Check for unlock effects
      if (newLevelCreated > 0) {
        this.checkUnlock(newLevelCreated);
      }

      // Check for game over
      this.safeSetTimeout(() => {
        this.safeSetData({ isMoving: false });
        this.checkGameOver();
      }, 200);
    } else {
      this.setData({ isMoving: false });
    }
  },

  /**
   * Move tiles up
   */
  moveUp() {
    if (this.data.isMoving || !this.isPageLoaded) return;
    this.setData({ isMoving: true });

    const originalBoard = JSON.parse(JSON.stringify(this.data.board)); // Save original for comparison
    const board = JSON.parse(JSON.stringify(this.data.board)); // Deep copy
    let moved = false;
    let newLevelCreated = 0;

    // Process each column
    for (let col = 0; col < 4; col++) {
      // Slide tiles up (remove empty spaces)
      const colTiles = [];
      for (let row = 0; row < 4; row++) {
        if (board[row][col] !== null) {
          colTiles.push(board[row][col]);
        }
      }

      // Merge adjacent same-level tiles
      const merged = [];
      for (let i = 0; i < colTiles.length; i++) {
        if (i < colTiles.length - 1 && colTiles[i].level === colTiles[i + 1].level) {
          // Merge tiles
          const newLevel = colTiles[i].level + 1;
          merged.push({
            level: newLevel,
            image: `https://hougong721-1308856491.cos.ap-guangzhou.myqcloud.com/${newLevel}.png`
          });
          newLevelCreated = Math.max(newLevelCreated, newLevel);
          moved = true;
          i++; // Skip next tile as it's merged
        } else {
          merged.push(colTiles[i]);
        }
      }

      // Update column
      for (let row = 0; row < 4; row++) {
        board[row][col] = row < merged.length ? merged[row] : null;
      }
    }

    // Check if board actually changed by comparing with original
    if (JSON.stringify(originalBoard) !== JSON.stringify(board)) {
      moved = true;
    }

    if (moved) {
      // Spawn new tile
      this.spawnTile(board);

      // Update board
      this.setData({ board: board });

      // Check for unlock effects
      if (newLevelCreated > 0) {
        this.checkUnlock(newLevelCreated);
      }

      // Check for game over
      this.safeSetTimeout(() => {
        this.safeSetData({ isMoving: false });
        this.checkGameOver();
      }, 200);
    } else {
      this.setData({ isMoving: false });
    }
  },

  /**
   * Move tiles down
   */
  moveDown() {
    if (this.data.isMoving || !this.isPageLoaded) return;
    this.setData({ isMoving: true });

    const originalBoard = JSON.parse(JSON.stringify(this.data.board)); // Save original for comparison
    const board = JSON.parse(JSON.stringify(this.data.board)); // Deep copy
    let moved = false;
    let newLevelCreated = 0;

    // Process each column
    for (let col = 0; col < 4; col++) {
      // Slide tiles down (remove empty spaces)
      const colTiles = [];
      for (let row = 3; row >= 0; row--) {
        if (board[row][col] !== null) {
          colTiles.push(board[row][col]);
        }
      }

      // Merge adjacent same-level tiles
      const merged = [];
      for (let i = 0; i < colTiles.length; i++) {
        if (i < colTiles.length - 1 && colTiles[i].level === colTiles[i + 1].level) {
          // Merge tiles
          const newLevel = colTiles[i].level + 1;
          merged.push({
            level: newLevel,
            image: `https://hougong721-1308856491.cos.ap-guangzhou.myqcloud.com/${newLevel}.png`
          });
          newLevelCreated = Math.max(newLevelCreated, newLevel);
          moved = true;
          i++; // Skip next tile as it's merged
        } else {
          merged.push(colTiles[i]);
        }
      }

      // Update column (fill from bottom)
      for (let row = 3; row >= 0; row--) {
        const idx = 3 - row;
        board[row][col] = idx < merged.length ? merged[idx] : null;
      }
    }

    // Check if board actually changed by comparing with original
    if (JSON.stringify(originalBoard) !== JSON.stringify(board)) {
      moved = true;
    }

    if (moved) {
      // Spawn new tile
      this.spawnTile(board);

      // Update board
      this.setData({ board: board });

      // Check for unlock effects
      if (newLevelCreated > 0) {
        this.checkUnlock(newLevelCreated);
      }

      // Check for game over
      this.safeSetTimeout(() => {
        this.safeSetData({ isMoving: false });
        this.checkGameOver();
      }, 200);
    } else {
      this.safeSetData({ isMoving: false });
    }
  },

  /**
   * Spawn a new tile in a random empty cell
   */
  spawnTile(board) {
    // Find all empty cells
    const emptyCells = [];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (board[row][col] === null) {
          emptyCells.push({ row, col });
        }
      }
    }

    // If no empty cells, return
    if (emptyCells.length === 0) return;

    // Randomly select an empty cell
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const cell = emptyCells[randomIndex];

    // Spawn level 1 (90% chance) or level 2 (10% chance)
    const level = Math.random() < 0.9 ? 1 : 2;
    board[cell.row][cell.col] = {
      level: level,
      image: `https://hougong721-1308856491.cos.ap-guangzhou.myqcloud.com/${level}.png`
    };
  },

  /**
   * Check for game over condition
   */
  checkGameOver() {
    const board = this.data.board;

    // Check for empty cells
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (board[row][col] === null) {
          return; // Game not over, there are empty cells
        }
      }
    }

    // Check for possible merges in all four directions
    // Check horizontal merges
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        if (board[row][col] && board[row][col + 1] && 
            board[row][col].level === board[row][col + 1].level) {
          return; // Game not over, merge possible
        }
      }
    }

    // Check vertical merges
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        if (board[row][col] && board[row + 1][col] && 
            board[row][col].level === board[row + 1][col].level) {
          return; // Game not over, merge possible
        }
      }
    }

    // No moves available - game over
    this.setData({ gameOver: true });
    this.playSound(this.gameoverAudio);
    
    // Auto-restart after showing game over overlay for 2 seconds
    this.safeSetTimeout(() => {
      if (this.isPageLoaded) {
        this.onRestart();
      }
    }, 2000);
  },

  /**
   * Check for unlock effects and apply theme
   */
  checkUnlock(newLevel) {
    // Update max level reached
    const maxLevelReached = Math.max(this.data.maxLevelReached, newLevel);
    const score = maxLevelReached;

    // Check if unlock effect should trigger
    if (newLevel >= 3 && newLevel > this.data.maxLevelReached) {
      // Play unlock sound
      this.playSound(this.unlockAudio);

      // Show unlock overlay
      this.setData({ showUnlock: true });

      // Hide overlay after 2000ms (2 seconds)
      this.safeSetTimeout(() => {
        this.safeSetData({ showUnlock: false });
      }, 2000);

      // Update theme if applicable
      this.applyTheme(newLevel);
    }

    // Update score and max level
    this.setData({
      score: score,
      maxLevelReached: maxLevelReached
    });
  },

  /**
   * Apply theme based on level
   */
  applyTheme(level) {
    // Ensure themes array exists
    const themes = this.themes || [
      { level: 3, bgImage: 'https://hougong721-1308856491.cos.ap-guangzhou.myqcloud.com/theme_1.png', borderColor: '#FFD700' },
      { level: 4, bgImage: 'https://hougong721-1308856491.cos.ap-guangzhou.myqcloud.com/theme_2.png', borderColor: '#9370DB' },
      { level: 5, bgImage: 'https://hougong721-1308856491.cos.ap-guangzhou.myqcloud.com/theme_3.png', borderColor: '#FF69B4' },
      { level: 6, bgImage: 'https://hougong721-1308856491.cos.ap-guangzhou.myqcloud.com/theme_4.png', borderColor: '#FF1493' },
      { level: 7, bgImage: 'https://hougong721-1308856491.cos.ap-guangzhou.myqcloud.com/theme_5.png', borderColor: '#C71585' },
      { level: 8, bgImage: 'https://hougong721-1308856491.cos.ap-guangzhou.myqcloud.com/theme_6.png', borderColor: '#8B008B' }
    ];
    
    // Find matching theme
    let themeToApply = null;
    for (let i = themes.length - 1; i >= 0; i--) {
      if (level >= themes[i].level && level > this.data.currentThemeLevel) {
        themeToApply = themes[i];
        break;
      }
    }

    // Apply theme if found and not already applied
    if (themeToApply && level > this.data.currentThemeLevel) {
      const containerStyle = themeToApply.bgImage 
        ? `background-image: url('${themeToApply.bgImage}');` 
        : '';
      this.setData({
        currentBgImage: themeToApply.bgImage,
        currentBorderColor: themeToApply.borderColor,
        currentThemeLevel: themeToApply.level,
        containerStyle: containerStyle
      });
    }
  },

  /**
   * Restart game
   */
  onRestart() {
    // Stop and restart BGM
    if (this.bgmAudio) {
      this.bgmAudio.stop();
    }
    
    // Reset game state
    this.initGame();
    this.playBGM();
  },

  /**
   * Cleanup on page unload
   */
  onUnload() {
    // Mark page as unloaded
    this.isPageLoaded = false;

    // Clear all timeouts
    if (this.timeoutIds && this.timeoutIds.length > 0) {
      this.timeoutIds.forEach(timeoutId => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      });
      this.timeoutIds = [];
    }

    // Stop and destroy audio contexts (移除所有事件监听器)
    if (this.bgmAudio) {
      // 移除所有事件监听器，防止页面卸载后回调执行
      try {
        this.bgmAudio.offError();
        this.bgmAudio.offCanplay();
        this.bgmAudio.offPlay();
        this.bgmAudio.offEnded();
        this.bgmAudio.stop();
        this.bgmAudio.destroy();
      } catch (e) {
        // 忽略销毁时的错误
      }
      this.bgmAudio = null;
    }
    if (this.unlockAudio) {
      try {
        this.unlockAudio.offError();
        this.unlockAudio.offCanplay();
        this.unlockAudio.offEnded();
        this.unlockAudio.stop();
        this.unlockAudio.destroy();
      } catch (e) {
        // 忽略销毁时的错误
      }
      this.unlockAudio = null;
    }
    if (this.gameoverAudio) {
      try {
        this.gameoverAudio.offError();
        this.gameoverAudio.offCanplay();
        this.gameoverAudio.offEnded();
        this.gameoverAudio.stop();
        this.gameoverAudio.destroy();
      } catch (e) {
        // 忽略销毁时的错误
      }
      this.gameoverAudio = null;
    }
  }
});

