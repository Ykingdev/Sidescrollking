class MainScene extends Phaser.Scene {
    constructor () {
        super('MainScene');
    }

    preload() {
        // --- Sectie: Assets Voorladen ---
        this.load.image('sky', 'assets/sky.png');
        this.load.image('ground', 'assets/ground.png');
        this.load.image('platform', 'assets/platform.png');
        this.load.image('star', 'assets/star.png');
        this.load.image('meteor', 'assets/bomb.png');
        this.load.spritesheet('dude', 'assets/dude.png', {
            frameWidth: 32,
            frameHeight: 48
        });
    }

    create() {
        // --- Sectie: Variabelen Initialiseren ---
        this.gameSpeed = 200;
        this.gameStarted = false;
        this.gameOver = false;
        this.extraLives = 0;
        this.starsCollected = 0;
        this.score = 0;
        this.fallSpeedFactor = 1;

        // --- Sectie: Achtergrond en Grond Toevoegen ---
        this.sky = this.add.tileSprite(400, 300, 800, 600, 'sky');

        this.ground = this.add.tileSprite(400, 568, 800, 64, 'ground');
        this.physics.add.existing(this.ground, true);

        // --- Sectie: Speler Instellen ---
        this.player = this.physics.add.sprite(100, 450, 'dude');
        this.player.body.onWorldBounds = true;

        this.player.setDragX(600);
        this.player.setMaxVelocity(300, 600);

        // --- Sectie: Groepen Maken voor Items ---
        this.enemies = this.physics.add.group();
        this.platforms = this.physics.add.group({
            allowGravity: false,
            immovable: true
        });
        this.stars = this.physics.add.group();

        // --- Sectie: Partikels Toevoegen ---
        this.particles = this.add.particles('star');

        this.lastPlatformX = this.player.x + 400;
        this.lastPlatformY = 450;

        this.generateInitialPlatforms();

        // --- Sectie: Colliders en Overlaps ---
        this.physics.add.collider(this.player, this.ground);
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.stars, this.platforms);

        this.physics.add.overlap(this.player, this.stars, this.collectStar, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.hitEnemy, null, this);
        this.physics.add.collider(this.enemies, this.platforms, this.meteorBounce, null, this);
        this.physics.add.collider(this.enemies, this.ground, this.meteorBounce, null, this);

        // --- Sectie: Animaties Maken ---
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

        // --- Sectie: Speler Invoer Instellen ---
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spacebar = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.SPACE
        );

        // --- Sectie: Tekst Toevoegen ---
        this.scoreText = this.add.text(10, 10, 'Time: 0', {
            fontSize: '24px',
            fill: '#fff'
        });
        this.starText = this.add.text(10, 40, 'Stars: 0', {
            fontSize: '24px',
            fill: '#fff'
        });
        this.extraLivesText = this.add.text(10, 70, 'Lives: 0', {
            fontSize: '24px',
            fill: '#fff'
        });

        // --- Sectie: Verhaal en Start Teksten ---
        this.loreDisplayed = true;
        this.loreText = this.add
            .text(
                400,
                300,
                'Als astronaut ben je gestrand op een buitenaardse planeet omdat een alien je bemanningslid aan boord heeft geïnfecteerd. Je kunt je bemanningslid nog steeds horen, die meestal jouw ogen op de grond was, maar nu moet je proberen hun advies niet te volgen. Druk op spatie om verder te gaan.',
                {
                    fontSize: '24px',
                    fill: '#fff',
                    align: 'center',
                    wordWrap: { width: 700 }
                }
            )
            .setOrigin(0.5);

        this.startText = this.add
            .text(400, 300, 'Druk op de pijltjestoetsen om te beginnen', {
                fontSize: '32px',
                fill: '#fff'
            })
            .setOrigin(0.5)
            .setVisible(false);

        // --- Sectie: Game Over Teksten ---
        this.gameOverText = this.add
            .text(400, 200, 'Game Over', {
                fontSize: '48px',
                fill: '#ff0000'
            })
            .setOrigin(0.5)
            .setVisible(false)
            .setDepth(10);

        this.retryText = this.add
            .text(400, 300, 'Druk op spatiebalk om opnieuw te proberen', {
                fontSize: '32px',
                fill: '#fff'
            })
            .setOrigin(0.5)
            .setVisible(false)
            .setDepth(10);

        // --- Sectie: Timers Instellen ---
        this.speedIncreaseTimer = this.time.addEvent({
            delay: 5000,
            callback: () => {
                this.gameSpeed *= 1.1;
                this.fallSpeedFactor *= 1.1;
            },
            callbackScope: this,
            loop: true
        });

        // Timer voor vijanden zal starten wanneer het spel begint
        this.enemyTimer = null;
    }

    update(time, delta) {
        // --- Sectie: Verhaal Weergeven ---
        if (this.loreDisplayed) {
            if (Phaser.Input.Keyboard.JustDown(this.spacebar)) {
                this.loreText.setVisible(false);
                this.loreDisplayed = false;
                this.startText.setVisible(true);
            }
            return;
        }

        // --- Sectie: Spel Starten ---
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

                // Start de vijandentimer
                this.enemyTimer = this.time.addEvent({
                    delay: 2000, // Pas de vertraging indien nodig aan
                    callback: this.spawnEnemy,
                    callbackScope: this,
                    loop: true
                });
            } else {
                return;
            }
        }

        // --- Sectie: Game Over Afhandelen ---
        if (this.gameOver) {
            if (Phaser.Input.Keyboard.JustDown(this.spacebar)) {
                this.restartGame();
            }
            return;
        }

        // --- Sectie: Achtergrond Scrollen ---
        this.sky.tilePositionX += this.gameSpeed * delta * 0.001;
        this.ground.tilePositionX += this.gameSpeed * delta * 0.001;

        // --- Sectie: Speler Beweging Controleren ---
        if (this.cursors.left.isDown) {
            this.player.setAccelerationX(-1000);
            this.player.anims.play('left', true);
        } else if (this.cursors.right.isDown) {
            this.player.setAccelerationX(1000);
            this.player.anims.play('right', true);
        } else {
            this.player.setAccelerationX(0);

            // Als er geen invoer is, duw de speler naar links terwijl platforms en achtergrond scrollen
            this.player.x -= this.gameSpeed * delta * 0.001; // Beweeg de speler naar achteren
            if (this.player.body.velocity.x > 10) {
                this.player.anims.play('right', true);
            } else if (this.player.body.velocity.x < -10) {
                this.player.anims.play('left', true);
            } else {
                this.player.anims.play('turn');
            }
        }

        // --- Sectie: Verticale Beweging - Snelle Val ---
        if (this.cursors.down.isDown) {
            this.player.setVelocityY(500);
        }

        // --- Sectie: Spring Logica ---
        if (this.cursors.up.isDown && this.player.body.touching.down) {
            this.player.setVelocityY(-600 * this.fallSpeedFactor);
        }

        // --- Sectie: Speler Buiten Scherm Controleren ---
        if (this.player.x < 0 || this.player.y > this.cameras.main.height || this.player.y < 0) {
            this.endGame();
        }

        // --- Sectie: Platforms Beweging en Hergebruik ---
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

        // --- Sectie: Vijanden Verwijderen die Buiten Scherm Gaan ---
        this.enemies.getChildren().forEach((enemy) => {
            if (enemy.y > this.game.config.height) {
                enemy.destroy();
            }
        });
    }


    // --- Sectie: Speler en Platform Collisie ---
    playerPlatformCollision(player, platform) {
        // Controleer op zijcollisies
        if (
            (player.body.touching.right && platform.body.touching.left) ||
            (player.body.touching.left && platform.body.touching.right)
        ) {
            // Bepaal de richting van de botsing en pas kracht toe
            if (player.body.touching.right && platform.body.touching.left) {
                // Speler geraakt vanaf rechts
                player.setVelocityX(-500); // Pas indien nodig aan
            } else if (player.body.touching.left && platform.body.touching.right) {
                // Speler geraakt vanaf links
                player.setVelocityX(500); // Pas indien nodig aan
            }

            // Pas opwaartse kracht toe
            player.setVelocityY(-200); // Pas indien nodig aan

            // Optioneel: Speel een geluid of animatie
        }
    }

    // --- Sectie: Meteoor Stuiteren ---
    meteorBounce(enemy, platformOrGround) {
        // Verhoog het aantal stuiteringen
        enemy.bounces += 1;

        // Voeg deeltjes toe op de positie van de meteoor
        this.createBounceParticles(enemy.x, enemy.y);

        // Controleer of de meteoor genoeg keren heeft gestuiterd
        if (enemy.bounces >= this.extraLives) {
            enemy.destroy();
        }
    }

    // --- Sectie: Deeltjes voor Stuiteren Maken ---
    createBounceParticles(x, y) {
        this.particles.createEmitter({
            x: x,
            y: y,
            speed: { min: -100, max: 100 },
            angle: { min: 0, max: 360 },
            lifespan: { min: 300, max: 500 },
            quantity: 10,
            scale: { start: 0.5, end: 0 },
            blendMode: 'ADD',
            emitZone: {
                type: 'edge',
                source: new Phaser.Geom.Circle(0, 0, 10),
                quantity: 10,
                yoyo: false
            }
        }).explode(10, x, y);
    }

    // --- Sectie: Vijanden Spawnen ---
    spawnEnemy() {
        const x = Phaser.Math.Between(0, this.game.config.width);
        const y = 0;
        const enemy = this.enemies.create(x, y, 'meteor');

        // Stel een willekeurige schaal in tussen 0.5 en 1.5
        const scale = Phaser.Math.FloatBetween(0.5, 1.5);
        enemy.setScale(scale);

        // Pas de fysica body grootte aan om overeen te komen met de nieuwe weergavegrootte
        enemy.body.setSize(enemy.displayWidth, enemy.displayHeight);
        enemy.body.setOffset(0, 0);

        // Stel de initiële velocityY in proportioneel aan fallSpeedFactor
        const fallSpeed = Phaser.Math.Between(200, 400) * this.fallSpeedFactor;
        enemy.setVelocityY(fallSpeed);

        // Schakel zwaartekracht in voor vijanden
        enemy.body.setAllowGravity(true);

        // Stel stuiteren in
        enemy.setBounce(1);

        // Initialiseer het stuiter aantal
        enemy.bounces = 0;

        // Stel collide met wereldgrenzen uit
        enemy.setCollideWorldBounds(false);
    }

    // --- Sectie: Vijand Treft Speler ---
    hitEnemy(player, enemy) {
        enemy.destroy(); // Verwijder de vijand

        if (this.extraLives > 0) {
            // Speler heeft een extra leven
            this.extraLives -= 1;
            this.extraLivesText.setText('Lives: ' + this.extraLives);
        } else {
            // Speler sterft
            this.endGame();
        }
    }

    // --- Sectie: Initiële Platforms Genereren ---
    generateInitialPlatforms() {
        let x = this.lastPlatformX;
        let y = this.lastPlatformY;

        for (let i = 0; i < 10; i++) {
            let platform = this.platforms.create(x, y, 'platform');
            platform.setScale(1).refreshBody();

            platform.body.setImmovable(true); // Zorg ervoor dat het platform niet beweegt bij botsing
            platform.body.setSize(platform.displayWidth, platform.displayHeight); // Update de grootte om overeen te komen met de schaal
            platform.body.setOffset(0, 0); // Lijn de body uit

            // Voeg een ster toe op het platform
            let star = this.stars.create(x, y - 32, 'star');
            star.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
            star.body.setAllowGravity(false);
            platform.star = star;

            // Volgende platform positie
            x += 200;
            y = this.getNextPlatformY();
        }
        this.lastPlatformX = x - 200;
    }

    // --- Sectie: Speler en Platform Collisie (Duplicaat) ---
    playerPlatformCollision(player, platform) {
        // Aangepaste botsingsafhandeling
        if (player.body.touching.down && platform.body.touching.up) {
            // Stop de speler met vallen door het platform
            player.setVelocityY(0);
            player.body.position.y = platform.body.position.y - player.body.height; // Bevestig de speler aan het platform
        }
    }

    // --- Sectie: Platform Hergebruiken ---
    recyclePlatform(platform) {
        const distanceAhead = 600;
        let x = this.player.x + distanceAhead;
        let y = this.getNextPlatformY();

        platform.x = x;
        platform.y = y;
        platform.refreshBody();

        // Pas de fysica body grootte aan
        platform.body.setSize(platform.displayWidth, platform.displayHeight);
        platform.body.setOffset(0, 0);

        // Herpositioneer of creëer een ster
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
        platform.body.setSize(platform.displayWidth, platform.displayHeight);
        platform.body.setOffset(0, 0);
    }

    // --- Sectie: Volgende Platform Y Bepalen ---
    getNextPlatformY() {
        const minY = 150;
        const maxY = 450;
        const verticalSpacing = 100;

        let yChange = verticalSpacing * (Math.random() > 0.5 ? 1 : -1);

        let newY = this.lastPlatformY + yChange;

        newY = Phaser.Math.Clamp(newY, minY, maxY);

        if (newY === this.lastPlatformY) {
            yChange *= -1;
            newY = this.lastPlatformY + yChange;
            newY = Phaser.Math.Clamp(newY, minY, maxY);
        }

        this.lastPlatformY = newY;

        return newY;
    }

    // --- Sectie: Ster Verzamelen ---
    collectStar(player, star) {
        star.disableBody(true, true);
        this.starsCollected++;
        this.starText.setText('Stars: ' + this.starsCollected);

        // Controleer of er 5 sterren zijn verzameld
        if (this.starsCollected >= 5) {
            this.extraLives += 1;
            this.starsCollected -= 5;
            this.extraLivesText.setText('Lives: ' + this.extraLives);
            this.starText.setText('Stars: ' + this.starsCollected);
        }

        // Verwijder ster referentie van het platform
        this.platforms.getChildren().forEach((platform) => {
            if (platform.star === star) {
                platform.star = null;
            }
        });
    }

    // --- Sectie: Spel Einde Afhandelen ---
    endGame() {
        this.gameOver = true;
        this.gameOverText.setVisible(true);
        this.retryText.setVisible(true);
        this.player.setVelocity(0);
        this.stopScoreTimer();
        this.speedIncreaseTimer.remove(false);

        // Stop de vijandentimer
        if (this.enemyTimer) {
            this.enemyTimer.remove(false);
            this.enemyTimer = null;
        }
    }

    // --- Sectie: Score Timer Starten ---
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

    // --- Sectie: Score Timer Stoppen ---
    stopScoreTimer() {
        if (this.scoreTimer) {
            this.scoreTimer.remove(false);
        }
    }

    // --- Sectie: Spel Herstarten ---
    restartGame() {
        this.gameOver = false;
        this.gameStarted = false;

        // Reset speler
        this.player.setPosition(100, 450);
        this.player.setVelocity(0);
        this.player.setAccelerationX(0);

        // Verwijder objecten
        this.platforms.clear(true, true);
        this.stars.clear(true, true);
        this.enemies.clear(true, true);

        // Reset variabelen
        this.starsCollected = 0;
        this.score = 0;
        this.extraLives = 0;
        this.lastPlatformX = this.player.x + 400;
        this.lastPlatformY = 450;
        this.gameSpeed = 200;
        this.fallSpeedFactor = 1;
        this.starText.setText('Stars: 0');
        this.scoreText.setText('Time: 0');
        this.extraLivesText.setText('Lives: 0');

        // Genereer platforms opnieuw
        this.generateInitialPlatforms();

        // Verberg teksten
        this.gameOverText.setVisible(false);
        this.retryText.setVisible(false);
        this.startText.setVisible(true);

        // Verwijder de vijandentimer
        if (this.enemyTimer) {
            this.enemyTimer.remove(false);
            this.enemyTimer = null;
        }

        // Herstart de snelheidverhoging timer
        this.speedIncreaseTimer.reset({
            delay: 5000,
            callback: () => {
                this.gameSpeed *= 1.1;
                this.fallSpeedFactor *= 1.1;
            },
            callbackScope: this,
            loop: true
        });

        // creëer de partikelbeheerder
        if (this.particles) {
            this.particles.destroy();
        }
        this.particles = this.add.particles('star');
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
            debug: false // Zet op true om fysica debugging in te schakelen indien nodig
        }
    },
    scene: [MainScene]
};

const game = new Phaser.Game(config);
