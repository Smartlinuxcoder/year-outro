const SPRITE_PATHS = {
  sky: '/sprites/sky.png',
  clouds: '/sprites/far-clouds.png',
  nearClouds: '/sprites/near-clouds.png', 
  mountains: '/sprites/mountains.png',
  farMountains: '/sprites/far-mountains.png',
  trees: '/sprites/trees.png'
};

const AUDIO_PATHS = {
  outro: '/sprites/outro.mp3',
  waiting: '/sprites/waiting.mp3'
};

class Game {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    document.body.appendChild(this.canvas);
    
    this.sprites = {};
    this.audio = {};
    this.isOutro = false;
    this.isLoading = true;
    this.loadingProgress = 0;
    this.showInstructions = true;
    
    // Load Google Font
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap';
    document.head.appendChild(link);
    
    this.resize();
    this.loadAssets();
    this.setupTimeSync();
    
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('click', () => {
      if (this.isLoading) return;
      this.showInstructions = false;
      this.toggleMusic();
    });
    
    requestAnimationFrame(() => this.gameLoop());
  }

  async loadAssets() {
    const totalAssets = Object.keys(SPRITE_PATHS).length + Object.keys(AUDIO_PATHS).length;
    let loadedAssets = 0;

    const updateProgress = () => {
      loadedAssets++;
      this.loadingProgress = loadedAssets / totalAssets;
    };

    const spritePromises = Object.entries(SPRITE_PATHS).map(([key, path]) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          this.sprites[key] = img;
          updateProgress();
          resolve();
        };
        img.onerror = reject;
        img.src = path;
      });
    });

    const audioContext = new AudioContext();
    const audioPromises = Object.entries(AUDIO_PATHS).map(([key, path]) => {
      return fetch(path)
        .then(res => res.arrayBuffer())
        .then(buffer => audioContext.decodeAudioData(buffer))
        .then(audioBuffer => {
          this.audio[key] = {
            buffer: audioBuffer,
            context: audioContext
          };
          updateProgress();
        });
    });

    try {
      await Promise.all([...spritePromises, ...audioPromises]);
      this.isLoading = false;
    } catch (error) {
      console.error('Failed to load assets:', error);
    }
  }

  async setupTimeSync() {
    try {
      //TODO http tomfoolery
      const response = await fetch('http://worldtimeapi.org/api/ip');
      const data = await response.json();
      const serverTime = new Date(data.utc_datetime);
      this.timeOffset = serverTime - new Date();
    } catch (error) {
      console.error('Time sync failed:', error);
    }
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.scale = window.innerHeight / 240;
  }

  drawLayer(spriteName, width) {
    let x = 0;
    while (x < this.canvas.width) {
      this.ctx.drawImage(
        this.sprites[spriteName],
        x,
        0,
        width * this.scale,
        this.canvas.height
      );
      x += width * this.scale;
    }
  }

  drawLoadingScreen() {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    const barWidth = this.canvas.width * 0.8;
    const barHeight = 10;
    const x = (this.canvas.width - barWidth) / 2;
    const y = this.canvas.height / 2;

    // Progress bar background
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(x, y, barWidth, barHeight);

    // Progress bar
    this.ctx.fillStyle = '#0ff';
    this.ctx.fillRect(x, y, barWidth * this.loadingProgress, barHeight);

    // Loading text
    this.ctx.font = '20px Orbitron';
    this.ctx.fillStyle = '#fff';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Loading...', this.canvas.width / 2, y - 20);
  }

  drawInstructions() {
    const alpha = Math.sin(Date.now() / 1000) * 0.3 + 0.7;
    this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    this.ctx.font = '20px Orbitron';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Click anywhere to toggle music', this.canvas.width / 2, this.canvas.height - 40);
  }

  draw() {
    if (this.isLoading) {
      this.drawLoadingScreen();
      return;
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw background layers
    this.drawLayer('sky', 320);
    this.drawLayer('clouds', 128);
    this.drawLayer('nearClouds', 144);
    this.drawLayer('farMountains', 160);
    this.drawLayer('mountains', 320);
    this.drawLayer('trees', 240);

    // Draw time with enhanced styling
    const time = this.getCurrentTime();
    this.ctx.font = `bold ${48 * this.scale}px Orbitron`;
    this.ctx.fillStyle = '#06D6D8';
    this.ctx.strokeStyle = '#033d3e';
    this.ctx.lineWidth = 2;
    this.ctx.textAlign = 'center';
    this.ctx.strokeText(time, this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.fillText(time, this.canvas.width / 2, this.canvas.height / 2);

    if (this.showInstructions) {
      this.drawInstructions();
    }
  }

  getCurrentTime() {
    const now = new Date();
    now.setTime(now.getTime() + this.timeOffset);
    return now.toLocaleTimeString('en-GB');
  }

  toggleMusic() {
    if (!this.musicSource) {
      this.playMusic('waiting');
    } else {
      this.stopMusic();
    }
  }

  playMusic(trackName) {
    const track = this.audio[trackName];
    const source = track.context.createBufferSource();
    source.buffer = track.buffer;
    source.connect(track.context.destination);
    source.loop = true;
    source.start();
    this.musicSource = source;
  }

  stopMusic() {
    if (this.musicSource) {
      this.musicSource.stop();
      this.musicSource = null;
    }
  }

  checkOutro() {
    const now = new Date();
    now.setTime(now.getTime() + this.timeOffset);
    if (now.getSeconds() === 2 && !this.isOutro) {
      this.stopMusic();
      this.playMusic('outro');
      this.isOutro = true;
    }
  }

  gameLoop() {
    this.draw();
    this.checkOutro();
    requestAnimationFrame(() => this.gameLoop());
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new Game();
});
