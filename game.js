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
var gameSpeed = 100;
var starsCollected = 0;
var stars;
var starsToDestroy = [];
var game = new Phaser.Game(config);

/**
 * Preloads game assets before the game starts.
 */
function preload() {
    this.load.image('sky', 'assets/sky.png');
    this.load.image('ground', 'assets/platform.png');
    this.load.image('platform', 'assets/platform.png');
    this.load.image('star', 'assets/star.png');
    this.load.image('scroll', 'assets/scroll.png'); // Can remove if not used elsewhere
    this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
}

/**
 * Creates the initial game scene, sets up objects, animations, and input.
 */
function create() {
    // Add background sky
    sky = this.add.tileSprite(400, 300, 800, 600, 'sky');

    // Add ground
    ground = this.add.tileSprite(400, 568, 800, 64, 'ground');
    this.physics.add.existing(ground, true);

    // Add player sprite
    player = this.physics.add.sprite(100, 450, 'dude');
    player.setBounce(0);
    player.setCollideWorldBounds(false);

    // Create player animations
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

    // Set up cursor keys for player input
    cursors = this.input.keyboard.createCursorKeys();

    // Create groups for platforms and stars
    platforms = this.physics.add.group({
        allowGravity: false,
        immovable: true
    });
    stars = this.physics.add.group();

    // Generate initial platforms and stars
    generatePlatforms.call(this);

    // Set up collisions and overlaps
    this.physics.add.collider(player, ground);
    this.physics.add.collider(player, platforms);
    this.physics.add.collider(stars, platforms);
    this.physics.add.collider(ground, stars);
    this.physics.add.overlap(player, stars, collectStar, null, this);

    // Display start text
    startText = this.add.text(400, 300, 'Press the arrow keys to start', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);

    // Display game over text, hidden initially
    gameOverText = this.add.text(400, 200, 'Game Over', { fontSize: '48px', fill: '#ff0000' }).setOrigin(0.5).setVisible(false).setDepth(10);

    // Display retry text, hidden initially
    retryText = this.add.text(400, 300, 'Press spacebar to retry', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setVisible(false).setDepth(10);

    // Display score and stars collected
    scoreText = this.add.text(10, 10, 'Time: 0', { fontSize: '24px', fill: '#fff' });
    starText = this.add.text(10, 40, 'Stars: 0', { fontSize: '24px', fill: '#fff' });
}

/**
 * The main game loop that runs every frame.
 */
function update() {
    // Start the game when an arrow key is pressed
    if (!gameStarted && (cursors.left.isDown || cursors.right.isDown || cursors.up.isDown)) {
        gameStarted = true;
        startText.setVisible(false);
        startScoreTimer();
    }

    // Handle game over state
    if (gameOver) {
        if (cursors.space.isDown) {
            restartGame.call(this);
        }
        return;
    }

    // Do nothing if the game hasn't started
    if (!gameStarted) {
        return;
    }

    // Player automatically moves to the left
    player.setVelocityX(-gameSpeed);

    // Handle player movement based on input
    if (cursors.right.isDown) {
        player.setVelocityX(200);
        player.anims.play('right', true);
    } else if (cursors.left.isDown) {
        player.setVelocityX(-200 - gameSpeed);
        player.anims.play('left', true);
    } else {
        player.anims.play('turn');
    }

    // Handle player jump
    if (cursors.up.isDown && player.body.touching.down) {
        player.setVelocityY(-500);
    }

    // Check if player has fallen off the screen
    if (player.x + player.width < 0 || player.y > 600) {
        endGame();
    }

    // Move platforms to the left
    platforms.children.iterate(function (platform) {
        platform.previousX = platform.x; // Store previous x position
        platform.x -= gameSpeed * this.game.loop.delta / 1000;

        if (platform.x < -platform.width) {
            platform.x = 800 + Phaser.Math.Between(0, 400);
            platform.y = Phaser.Math.Between(200, 500);
            platform.refreshBody();
            platform.previousX = platform.x; // Reset previous x position

            // Add a new star on the new platform
            var star = stars.create(platform.x, platform.y - 32, 'star');
            star.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
            star.setGravityY(-1000);
        }
    }, this);

    // Move stars with platforms
    stars.children.iterate(function (star) {
        if (!star.active) {
            return;
        }

        // Attach star to its platform
        var platform = platforms.getChildren().find(function (p) {
            return p && p.active && p.x !== undefined && Math.abs(p.x - star.x) < 10;
        });

        if (platform) {
            star.x = platform.x;
        } else {
            // Move star to the left if not on a platform
            star.x -= gameSpeed * this.game.loop.delta / 1000;
        }

        // Mark stars that have moved off screen for destruction
        if (star.x < -star.width) {
            starsToDestroy.push(star);
        }
    }, this);

    // Destroy stars that have moved off screen
    starsToDestroy.forEach(function (star) {
        star.destroy();
    });
    starsToDestroy = [];
}

/**
 * Ends the game, displays game over text, and stops timers.
 */
function endGame() {
    gameOver = true;
    gameOverText.setVisible(true);
    retryText.setVisible(true);
    player.setVelocity(0);
    stopScoreTimer();
    gameOverText.setDepth(10);
    retryText.setDepth(10);
}

/**
 * Starts the score timer that increments every second.
 */
function startScoreTimer() {
    score = 0;
    scoreTimer = setInterval(() => {
        score += 1;
        scoreText.setText('Time: ' + score);
    }, 1000);
}

/**
 * Stops the score timer.
 */
function stopScoreTimer() {
    clearInterval(scoreTimer);
}

/**
 * Restarts the game to its initial state.
 */
function restartGame() {
    gameOver = false;
    gameStarted = false;

    // Reset player position and velocity
    player.setPosition(100, 450);
    player.setVelocity(0);

    // Clear existing platforms and stars
    platforms.clear(true, true);
    stars.clear(true, true);

    // Generate new platforms and stars
    generatePlatforms.call(this);

    // Reset colliders
    this.physics.add.collider(player, platforms);
    this.physics.add.collider(stars, platforms);
    this.physics.add.collider(ground, stars);
    this.physics.add.overlap(player, stars, collectStar, null, this);

    // Reset text displays
    gameOverText.setVisible(false);
    retryText.setVisible(false);
    startText.setVisible(true);

    scoreText.setText('Time: 0');
    starText.setText('Stars: 0');
    starsCollected = 0;
}

/**
 * Generates platforms and places stars on them.
 */
function generatePlatforms() {
    var x = 800;
    for (var i = 0; i < 10; i++) {
        var y = Phaser.Math.Between(200, 500);
        var platform = platforms.create(x, y, 'platform');
        platform.setScale(0.5).refreshBody();

        platform.previousX = platform.x; // Initialize previousX

        // Create a star on top of the platform
        var star = stars.create(platform.x, platform.y - 32, 'star');
        star.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
        star.setGravityY(-1000);
        star.setCollideWorldBounds(false);

        x += Phaser.Math.Between(platformSpacingX, platformSpacingX + 200);
    }
}

/**
 * Handles the collection of stars by the player.
 */
function collectStar(player, star) {
    star.disableBody(true, true);
    starsCollected += 1;
    starText.setText('Stars: ' + starsCollected);
}
