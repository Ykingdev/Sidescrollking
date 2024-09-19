class MainScene extends Phaser.Scene {
    constructor () {
        super('MainScene');
    }

    preload() {
        this.load.image('sky', 'assets/sky.png');
        this.load.image('ground', 'assets/platform.png');
        this.load.image('platform', 'assets/platform.png');
        this.load.image('star', 'assets/star.png');
        this.load.image('bomb', 'assets/bomb.png');
        this.load.spritesheet('dude', 'assets/dude.png', {
            frameWidth: 32,
            frameHeight: 48
        });
    }

    create() {
        this.gameSpeed = 200;
        this.gameStarted = false;
        this.gameOver = false;
        this.starsCollected = 0;
        this.score = 0;

        this.sky = this.add.tileSprite(400, 300, 800, 600, 'sky');

        this.ground = this.add.tileSprite(400, 568, 800, 64, 'ground');
        this.physics.add.existing(this.ground, true);

        this.player = this.physics.add.sprite(100, 450, 'dude');
        this.player.body.onWorldBounds = true;

        this.player.setDragX(600);
        this.player.setMaxVelocity(300, 600);

        // Player animations
        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers('dude', {
                start: 0,
                end: 3
            }),
            frameRate: 20,
            repeat: -1
        });
        this.anims.create({
            key: 'turn',
            frames: [{ key: 'dude', frame: 4 }],
            frameRate: 20
        });
        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('dude', {
                start: 5,
                end: 8
            }),
            frameRate: 20,
            repeat: -1
        });

        this.cursors = this.input.keyboard.createCursorKeys();
        this.spacebar = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.SPACE
        );

        this.platforms = this.physics.add.group({
            allowGravity: false,
            immovable: true
        });
        this.stars = this.physics.add.group();

        // Initialize lastPlatformX and lastPlatformY
        this.lastPlatformX = this.player.x + 400; // Starting x-position for platforms
        this.lastPlatformY = 450; // Starting y-position for platforms

        this.generateInitialPlatforms();

        this.physics.add.collider(this.player, this.ground);
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.stars, this.platforms);
        this.physics.add.overlap(this.player, this.stars, this.collectStar, null, this);

        // Texts
        this.scoreText = this.add.text(10, 10, 'Time: 0', {
            fontSize: '24px',
            fill: '#fff'
        });
        this.starText = this.add.text(10, 40, 'Stars: 0', {
            fontSize: '24px',
            fill: '#fff'
        });

        // Lore and start texts
        this.loreDisplayed = true;
        this.loreText = this.add
            .text(
                400,
                300,
                'As an astronaut, you have crashed on an alien planet because an alien infected your crew member on your ship. You can still hear your crew member, who was usually your eyes on the ground, but now you must try not to listen to their advice.',
                {
                    fontSize: '24px',
                    fill: '#fff',
                    align: 'center',
                    wordWrap: { width: 700 }
                }
            )
            .setOrigin(0.5);

        this.startText = this.add
            .text(400, 300, 'Press the arrow keys to start', {
                fontSize: '32px',
                fill: '#fff'
            })
            .setOrigin(0.5)
            .setVisible(false);

        // Game over texts
        this.gameOverText = this.add
            .text(400, 200, 'Game Over', {
                fontSize: '48px',
                fill: '#ff0000'
            })
            .setOrigin(0.5)
            .setVisible(false)
            .setDepth(10);

        this.retryText = this.add
            .text(400, 300, 'Press spacebar to retry', {
                fontSize: '32px',
                fill: '#fff'
            })
            .setOrigin(0.5)
            .setVisible(false)
            .setDepth(10);

        this.speedIncreaseTimer = this.time.addEvent({
            delay: 5000,
            callback: () => {
                this.gameSpeed *= 1.1;
            },
            callbackScope: this,
            loop: true
        });
    }

    update(time, delta) {
        if (this.loreDisplayed) {
            if (Phaser.Input.Keyboard.JustDown(this.spacebar)) {
                this.loreText.setVisible(false);
                this.loreDisplayed = false;
                this.startText.setVisible(true);
            }
            return;
        }

        if (!this.gameStarted) {
            if (
                this.cursors.left.isDown ||
                this.cursors.down.isDown ||
                this.cursors.right.isDown ||
                this.cursors.up.isDown
            ) {
                this.gameStarted = true;
                this.startText.setVisible(false);
                this.startScoreTimer();
            } else {
                return;
            }
        }

        if (this.gameOver) {
            if (Phaser.Input.Keyboard.JustDown(this.spacebar)) {
                this.restartGame();
            }
            return;
        }

        // Background scroll
        this.sky.tilePositionX += this.gameSpeed * delta * 0.001;
        this.ground.tilePositionX += this.gameSpeed * delta * 0.001;

        // Player movement
        if (this.cursors.left.isDown) {
            this.player.setAccelerationX(-1000);
            this.player.anims.play('left', true);
        } else if (this.cursors.right.isDown) {
            this.player.setAccelerationX(1000);
            this.player.anims.play('right', true);
        } else {
            this.player.setAccelerationX(0);

            if (this.player.body.velocity.x > 10) {
                this.player.anims.play('right', true);
            } else if (this.player.body.velocity.x < -10) {
                this.player.anims.play('left', true);
            } else {
                this.player.anims.play('turn');
            }
        }

        // Vertical movement - fast fall
        if (this.cursors.down.isDown) {
            this.player.setVelocityY(500);
        }

        // Jump logic
        if (this.cursors.up.isDown && this.player.body.touching.down) {
            this.player.setVelocityY(-600);
        }

        // Check if player has moved off-screen
        if (
            this.player.x < 0 ||
            this.player.x > this.cameras.main.width ||
            this.player.y > this.cameras.main.height ||
            this.player.y < 0
        ) {
            this.endGame();
        }

        // Platforms movement and recycling
        this.platforms.getChildren().forEach((platform) => {
            platform.x -= this.gameSpeed * delta * 0.001;
            platform.refreshBody();

            if (platform.x < -platform.displayWidth) {
                this.recyclePlatform(platform);
            } else {
                if (platform.star && platform.star.active) {
                    platform.star.x = platform.x;
                    platform.star.y = platform.y - 32;
                }
            }
        });
    }

    generateInitialPlatforms() {
        let x = this.lastPlatformX;
        let y = this.lastPlatformY;

        for (let i = 0; i < 10; i++) {
            let platform = this.platforms.create(x, y, 'platform');
            platform.setScale(0.5).refreshBody();

            // Star on platform
            let star = this.stars.create(x, y - 32, 'star');
            star.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
            star.body.setAllowGravity(false);
            platform.star = star;

            // Next platform position
            x += 200; // Fixed horizontal spacing
            y = this.getNextPlatformY(); // Fixed vertical spacing
        }

        this.lastPlatformX = x - 200; // Adjust to the last platform's x-position
    }

    recyclePlatform(platform) {
        const distanceAhead = 600; // Distance ahead of the player to place the platform
        let x = this.player.x + distanceAhead; // Place the platform ahead of the player
        let y = this.getNextPlatformY(); // Fixed vertical spacing

        platform.x = x;
        platform.y = y;
        platform.refreshBody();

        // Reposition or create star
        if (platform.star && !platform.star.active) {
            platform.star.enableBody(true, platform.x, platform.y - 32, true, true);
            platform.star.setActive(true).setVisible(true);
        } else if (!platform.star) {
            let star = this.stars.create(platform.x, platform.y - 32, 'star');
            star.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
            star.body.setAllowGravity(false);
            platform.star = star;
        } else {
            platform.star.x = platform.x;
            platform.star.y = platform.y - 32;
        }
    }

    getNextPlatformY() {
        const minY = 150; // Platforms won't be too high
        const maxY = 450; // Platforms stay above the ground (which is at 568)
        const verticalSpacing = 100; // Fixed vertical spacing

        let yChange = verticalSpacing * (Math.random() > 0.5 ? 1 : -1);

        let newY = this.lastPlatformY + yChange;

        // Clamp the y-position within bounds
        newY = Phaser.Math.Clamp(newY, minY, maxY);

        if (newY === this.lastPlatformY) {
            yChange *= -1;
            newY = this.lastPlatformY + yChange;
            newY = Phaser.Math.Clamp(newY, minY, maxY);
        }

        this.lastPlatformY = newY;

        return newY;
    }



    collectStar(player, star) {
        star.disableBody(true, true);
        this.starsCollected++;
        this.starText.setText('Stars: ' + this.starsCollected);

        // Remove star reference from platform
        this.platforms.getChildren().forEach((platform) => {
            if (platform.star === star) {
                platform.star = null;
            }
        });
    }

    endGame() {
        this.gameOver = true;
        this.gameOverText.setVisible(true);
        this.retryText.setVisible(true);
        this.player.setVelocity(0);
        this.stopScoreTimer();
        this.speedIncreaseTimer.remove(false);
    }

    startScoreTimer() {
        this.scoreTimer = this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.score++;
                this.scoreText.setText('Time: ' + this.score);
            },
            callbackScope: this,
            loop: true
        });
    }

    stopScoreTimer() {
        if (this.scoreTimer) {
            this.scoreTimer.remove(false);
        }
    }

    restartGame() {
        this.gameOver = false;
        this.gameStarted = false;

        // Reset player
        this.player.setPosition(100, 450);
        this.player.setVelocity(0);
        this.player.setAccelerationX(0);

        // Clear objects
        this.platforms.clear(true, true);
        this.stars.clear(true, true);

        // Reset variables
        this.starsCollected = 0;
        this.score = 0;
        this.lastPlatformX = this.player.x + 400; // Reset starting x position
        this.lastPlatformY = 450; // Reset starting y position
        this.gameSpeed = 200;
        this.starText.setText('Stars: 0');
        this.scoreText.setText('Time: 0');

        // Generate platforms
        this.generateInitialPlatforms();

        // Reset colliders and overlaps
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.stars, this.platforms);
        this.physics.add.overlap(this.player, this.stars, this.collectStar, null, this);

        // Hide texts
        this.gameOverText.setVisible(false);
        this.retryText.setVisible(false);
        this.startText.setVisible(true);

        // Restart the speed increase timer
        this.speedIncreaseTimer.reset({
            delay: 5000,
            callback: () => {
                this.gameSpeed *= 1.1;
            },
            callbackScope: this,
            loop: true
        });
    }
}

const config = {
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
    scene: [MainScene]
};

const game = new Phaser.Game(config);
