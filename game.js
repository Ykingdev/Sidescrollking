async function fetchBadAdvice() {
    const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'llama3.1',
            prompt: 'You are roleplaying as the antagonist in an infinite sidescroller video game. Your goal is to give one short, misleading sentence of bad advice to the player in order to make them fail and feel worthless. The game involves jumping, avoiding obstacles, collecting stars, and surviving as long as possible, with the score tracked by time and stars collected. Keep it concise, misleading, and demoralizing. Example advice: "Touch the spiky balls" or "Stop pressing all buttons." Stay in character as the antagonist and give only one sentence.',
            stream: false
        })
    });
    const data = await response.json();
    return data.response;
}

var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1000 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var player;
var ground, sky;
var cursors;
var gameStarted = false;
var gameOver = false;
var startText, gameOverText, retryText, scoreText, starText;
var platforms;
var platformSpacingX = 300;
var score = 0;
var scoreTimer;
var badAdviceText;
var gameSpeed = 100;
var starsCollected = 0;
var stars;
var adviceInterval;
var game = new Phaser.Game(config);

function preload() {
    this.load.image('sky', 'assets/sky.png');
    this.load.image('ground', 'assets/platform.png');
    this.load.image('platform', 'assets/platform.png');
    this.load.image('star', 'assets/star.png');
    this.load.image('scroll', 'assets/scroll.png');
    this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
}

function create() {
    sky = this.add.tileSprite(400, 300, 800, 600, 'sky');

    ground = this.add.tileSprite(400, 568, 800, 64, 'ground');
    this.physics.add.existing(ground, true);

    player = this.physics.add.sprite(100, 450, 'dude');
    player.setBounce(0);
    player.setCollideWorldBounds(false);
  this.time.addEvent({
        delay: 2000, // 2000ms = 2 seconds, change to your desired interval
        callback: generateStars,
        callbackScope: this,
        loop: true
    });
  

    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
        frameRate: 15,
        repeat: -1
    });
    this.anims.create({
        key: 'turn',
        frames: [{ key: 'dude', frame: 4 }],
        frameRate: 20
    });
    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
        frameRate: 15,
        repeat: -1
    });

    this.physics.add.collider(player, ground);

    startText = this.add.text(400, 300, 'Press the arrow keys to start', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);

    gameOverText = this.add.text(400, 200, 'Game Over', { fontSize: '48px', fill: '#ff0000' }).setOrigin(0.5).setVisible(false).setDepth(10);

    retryText = this.add.text(400, 300, 'Press spacebar to retry', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setVisible(false).setDepth(10);

    scoreText = this.add.text(10, 10, 'Time: 0', { fontSize: '24px', fill: '#fff' });

    starText = this.add.text(10, 40, 'Stars: 0', { fontSize: '24px', fill: '#fff' });

    cursors = this.input.keyboard.createCursorKeys();

    platforms = this.physics.add.group({
        allowGravity: false,
        immovable: true
    });

    generatePlatforms.call(this);
    this.physics.add.collider(player, platforms);

    stars = this.physics.add.group();
    generateStars.call(this);
    this.physics.add.collider(ground, stars);
    this.physics.add.overlap(player, stars, collectStar, null, this);

    var scrollImage = this.add.image(400, 100, 'scroll');
    scrollImage.setScale(1.5);
    scrollImage.setVisible(false);

    badAdviceText = this.add.text(400, 100, '', {
        fontSize: '16px',
        fill: '#000',
        align: 'center',
        wordWrap: { width: 700 }
    }).setOrigin(0.5).setDepth(6).setVisible(false);

    startAdviceInterval.call(this, scrollImage);
}

function startAdviceInterval(scrollImage) {
    adviceInterval = setInterval(async () => {
        if (!gameOver) {
            const advice = await fetchBadAdvice();
            showBadAdvice(advice, scrollImage);
        }
    }, 10000);
}

function showBadAdvice(advice, scrollImage) {
    scrollImage.setVisible(true);
    scrollImage.setDepth(5);
    badAdviceText.setText(advice);
    badAdviceText.setVisible(true);
    badAdviceText.setDepth(6);

    setTimeout(() => {
        badAdviceText.setText('');
        badAdviceText.setVisible(false);
        scrollImage.setVisible(false);
    }, 5000);
}

function update() {
    if (!gameStarted && (cursors.left.isDown || cursors.right.isDown || cursors.up.isDown)) {
        gameStarted = true;
        startText.setVisible(false);
        startScoreTimer();
    }

    if (gameOver) {
        if (cursors.space.isDown) {
            restartGame.call(this);
        }
        return;
    }

    if (!gameStarted) {
        return;
    }

    player.setVelocityX(-gameSpeed);

    if (cursors.right.isDown) {
        player.setVelocityX(200);
        player.anims.play('right', true);
    } else if (cursors.left.isDown) {
        player.setVelocityX(-200 - gameSpeed);
        player.anims.play('left', true);
    } else {
        player.anims.play('turn');
    }

    if (cursors.up.isDown && player.body.touching.down) {
        player.setVelocityY(-500);
    }

    if (player.x + player.width < 0 || player.y > 600) {
        endGame();
    }

    platforms.children.iterate(function (platform) {
        platform.x -= gameSpeed * this.game.loop.delta / 1000;
        if (platform.x < -platform.width) {
            platform.x = 800 + Phaser.Math.Between(0, 400);
            platform.y = Phaser.Math.Between(200, 500);
        }
    }, this);

    stars.children.iterate(function (star) {
        star.x -= gameSpeed * this.game.loop.delta / 1000;
        if (star.x < -star.width) {
            star.x = 800 + Phaser.Math.Between(0, 400);
            star.y = Phaser.Math.Between(50, 550);
            star.enableBody(false, star.x, star.y, true, true);
        }
    }, this);
}

function endGame() {
    gameOver = true;
    gameOverText.setVisible(true);
    retryText.setVisible(true);
    player.setVelocity(0);
    stopScoreTimer();
    gameOverText.setDepth(10);
    retryText.setDepth(10);

    clearInterval(adviceInterval);
}

function startScoreTimer() {
    score = 0;
    scoreTimer = setInterval(() => {
        score += 1;
        scoreText.setText('Time: ' + score);
    }, 1000);
}

function stopScoreTimer() {
    clearInterval(scoreTimer);
}

function restartGame() {
    gameOver = false;
    gameStarted = false;

    player.setPosition(100, 450);
    player.setVelocity(0);

    platforms.clear(true, true);
    generatePlatforms.call(this);

    stars.clear(true, true);
    generateStars.call(this);

    this.physics.add.collider(player, platforms);
    this.physics.add.overlap(player, stars, collectStar, null, this);

    gameOverText.setVisible(false);
    retryText.setVisible(false);
    startText.setVisible(true);

    scoreText.setText('Time: 0');
    starText.setText('Stars: 0');
    starsCollected = 0;

    startAdviceInterval.call(this, this.children.getByName('scrollImage'));
}

function generatePlatforms() {
    var x = 800;
    for (var i = 0; i < 10; i++) {
        var y = Phaser.Math.Between(200, 500);
        var platform = platforms.create(x, y, 'platform');
        platform.setScale(0.5).refreshBody();
        x += Phaser.Math.Between(platformSpacingX, platformSpacingX + 200);
    }
}

function generateStars() {
    var x = 50;
    for (var i = 0; i < 10; i++) {
        var y = Phaser.Math.Between(50, 550);  // Randomized y between 50 and 550 for vertical positioning
        var star = stars.create(x, y, 'star');
        star.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
        x += Phaser.Math.Between(400, 600);  // Random horizontal positioning increment
    }
}

function collectStar(player, star) {
    star.disableBody(true, true);
    starsCollected += 1;
    starText.setText('Stars: ' + starsCollected);
}
