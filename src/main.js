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

    this.settings = {
      dropTiming: 'year' // 'minute', 'hour', 'year'
    };
    this.loadSettings();
    this.createSettingsButton();
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

    // Progress bar bg 
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
    
    this.drawLayer('sky', 320);
    this.drawLayer('clouds', 128);
    this.drawLayer('nearClouds', 144);
    this.drawLayer('farMountains', 160);
    this.drawLayer('mountains', 320);
    this.drawLayer('trees', 240);

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
  // I am bored
  checkOutro() {
    const now = new Date();
    now.setTime(now.getTime() + this.timeOffset);
    console.log(now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
    let shouldDrop = false;
    switch(this.settings.dropTiming) {
      case 'minute':
        shouldDrop = now.getSeconds() === 2;
        break;
      case 'hour':
        shouldDrop = now.getMinutes() === 59 && now.getSeconds() === 2;
        break;
      case 'year':
        shouldDrop = now.getMonth() === 11 && now.getDate() === 31 && 
                    now.getHours() === 23 && now.getMinutes() === 59 && 
                    now.getSeconds() === 2 ;
        break;
    }

    if (shouldDrop && !this.isOutro) {
      console.log('shouldDrop', shouldDrop);
      this.stopMusic();
      this.playMusic('outro');
      this.isOutro = true;
    } else if (!shouldDrop) {
      this.isOutro = false;
    }
  }

  loadSettings() {
    const saved = localStorage.getItem('gameSettings');
    if (saved) {
      this.settings = JSON.parse(saved);
    }
  }

  createSettingsButton() {
    const button = document.createElement('button');
    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24">
        <path fill="#CDD6F4" d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
      </svg>`;
    button.className = 'settings-btn';
    document.body.appendChild(button);

    button.addEventListener('click', () => this.showSettingsModal());
  }

  showSettingsModal() {
    const modal = document.createElement('div');
    modal.className = 'settings-modal';
    modal.innerHTML = `
      <div class="settings-content">
        <h2>Settings</h2>
        <div class="setting-group">
          <label>Drop Timing:</label>
          <select id="dropTiming">
            <option value="minute" ${this.settings.dropTiming === 'minute' ? 'selected' : ''}>Every Minute</option>
            <option value="hour" ${this.settings.dropTiming === 'hour' ? 'selected' : ''}>Every Hour</option>
            <option value="year" ${this.settings.dropTiming === 'year' ? 'selected' : ''}>New Year</option>
          </select>
        </div>
        <div class="button-group">
          <button class="save-btn">Save</button>
          <button class="cancel-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.save-btn').addEventListener('click', () => {
      this.settings.dropTiming = modal.querySelector('#dropTiming').value;
      localStorage.setItem('gameSettings', JSON.stringify(this.settings));
      modal.remove();
    });

    modal.querySelector('.cancel-btn').addEventListener('click', () => {
      modal.remove();
    });
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
