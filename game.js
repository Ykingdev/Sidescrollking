var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
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
var gameSpeed = 4;
var gameStarted = false;
var startText;

var game = new Phaser.Game(config);

function preload() {
    this.load.image('sky', 'assets/sky.png');
    this.load.image('ground', 'assets/platform.png');
    this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
}

function create() {
    sky = this.add.tileSprite(400, 300, 800, 600, 'sky');
    ground = this.add.image(400, 568, 'ground');

    var groundPhysics = this.physics.add.staticGroup();
    groundPhysics.create(400, 568, 'ground').setScale(2).refreshBody();  

    // Create the player with physics
    player = this.physics.add.sprite(100, 450, 'dude');
    player.setBounce(0.2);
    player.setCollideWorldBounds(true);  // Prevents the player from leaving the screen

    // Set up player animations (walking left, turning, walking right)
    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
        frameRate: 10,
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
        frameRate: 10,
        repeat: -1
    });

    // Enable collision between the player and the ground
    this.physics.add.collider(player, groundPhysics);

    // Display "Press the arrow keys to start" message
    startText = this.add.text(400, 300, 'Press the arrow keys to start', { fontSize: '32px', fill: '#fff' });
    startText.setOrigin(0.5); 

    cursors = this.input.keyboard.createCursorKeys();

    this.cameras.main.setBounds(0, 0, Number.MAX_SAFE_INTEGER, 600);  // Infinite background width
}

function update() {
    // Check if any arrow key is pressed to start the game
    if (!gameStarted && (cursors.left.isDown || cursors.right.isDown || cursors.up.isDown || cursors.down.isDown)) {
        gameStarted = true;  // Mark the game as started
        startText.setVisible(false);  // Hide the start message
    }

    if (!gameStarted) {
        return;
    }

    player.anims.play('right', true);  

    sky.tilePositionX += gameSpeed;  // Scroll the sky (background) to the left

    // Allow the player to jump if they are on the ground
    if (player.body.touching.down && cursors.up.isDown) {
        player.setVelocityY(-330);  // Jump
    }
}
