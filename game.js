async function fetchBadAdvice() {
    const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'llama3.1',
            prompt: 'Give one sentence of bad advice to a player trying to win a video game also make sure to make the player feel worthless (the videogame is an infinite sidescroller with enemies score is being tracked with time). Keep it short and misleading, like: "Touch the spiky balls" or "Let go of all buttons."',
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
            gravity: { y: 400 },
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
var gameSpeed = 3;
var baseSpeed = 2;
var gameStarted = false;
var gameOver = false;
var startText, gameOverText, retryText, scoreText;
var platforms;
var platformSpacingX = 300;
var platformSpacingY = 200;
var score = 0;
var scoreTimer;
var pushedBack = false;

var game = new Phaser.Game(config);

function preload() {
    this.load.image('sky', 'assets/sky.png');
    this.load.image('ground', 'assets/platform.png');
    this.load.image('platform', 'assets/platform.png');  // Load platform image
    this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
}

function create() {
    sky = this.add.tileSprite(400, 300, 800, 600, 'sky');

    ground = this.add.image(400, 568, 'ground');

    var groundPhysics = this.physics.add.staticGroup();
    groundPhysics.create(400, 568, 'ground').setScale(2).refreshBody();  

    player = this.physics.add.sprite(100, 450, 'dude');
    player.setBounce(0.2);
    player.setCollideWorldBounds(true); 
    player.setImmovable(false);

    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
        frameRate: 10,
        repeat: -1
    });

    this.physics.add.collider(player, groundPhysics);

    startText = this.add.text(400, 300, 'Press the arrow keys to start', { fontSize: '32px', fill: '#fff' });
    startText.setOrigin(0.5);

    gameOverText = this.add.text(400, 200, 'Game Over', { fontSize: '48px', fill: '#ff0000' });
    gameOverText.setOrigin(0.5);
    gameOverText.setVisible(false);

    retryText = this.add.text(400, 300, 'Press spacebar to retry', { fontSize: '32px', fill: '#fff' });
    retryText.setOrigin(0.5);
    retryText.setVisible(false);  

    scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '24px', fill: '#fff' });

    cursors = this.input.keyboard.createCursorKeys();

    platforms = this.physics.add.group({
        allowGravity: false, 
        immovable: true  
    });

    generatePlatforms();
    this.physics.add.overlap(player, platforms, handlePlatformOverlap, null, this);
    this.cameras.main.setBounds(0, 0, Number.MAX_SAFE_INTEGER, 600); 


    badAdviceText = this.add.text(400, 100, '', { fontSize: '12px', fill: '#ff0000', align: 'center', wordWrap: { width: 700 } });

    badAdviceText.setOrigin(0.5);

    setInterval(async () => {
        const advice = await fetchBadAdvice(); 
        showBadAdvice(advice); 
    }, 10000); 
}
function showBadAdvice(advice) {
    badAdviceText.setText(advice);

    setTimeout(() => {
        badAdviceText.setText('');
    }, 5000);
}

function update() {
    if (!gameStarted && (cursors.left.isDown || cursors.right.isDown || cursors.up.isDown || cursors.down.isDown)) {
        gameStarted = true;  
        startText.setVisible(false);  
        startScoreTimer();  
    }

    if (gameOver) {
        if (cursors.space.isDown) {
            restartGame();
        }
        return;
    }

    if (!gameStarted) {
        return;
    }

    player.anims.play('right', true);

    sky.tilePositionX += gameSpeed;

    if (player.body.touching.down && cursors.up.isDown) {
        player.setVelocityY(-330); 
    }

    platforms.children.iterate(function (platform) {
        platform.x -= gameSpeed;  
        if (platform.x < -platform.width) {
            resetPlatform(platform);  
        }
    });

    if (player.x <= 0) {
        endGame();
    }
}


function handlePlatformOverlap(player, platform) {
    if (player.body.velocity.y >= 0 && player.body.bottom <= platform.body.top + 10) {
        this.physics.world.collide(player, platform);
    }
}
function endGame() {
    gameOver = true;
    gameOverText.setVisible(true);
    retryText.setVisible(true); 

    
    player.setVelocityX(0);
    platforms.setVelocityX(0); 

    stopScoreTimer();
}

function startScoreTimer() {
    score = 0;  
    scoreTimer = setInterval(() => {
        score += 1;  
        scoreText.setText('Score: ' + score);  
    }, 1000);
}

function stopScoreTimer() {
    clearInterval(scoreTimer);  
}

function restartGame() {
    gameOver = false;
    gameStarted = false;

    player.setPosition(100, 450);
    player.setVelocityX(0);

    platforms.children.iterate(function (platform) {
        resetPlatform(platform);
    });

    gameOverText.setVisible(false);
    retryText.setVisible(false);
    startText.setVisible(true);

    scoreText.setText('Score: 0');
    gameSpeed = baseSpeed;  
    pushedBack = false;  
}

function generatePlatforms() {
    var x = 800;
    var y = 500;  
    var previousY = y;  

    for (var i = 0; i < 5; i++) {
        if (i === 0) {
            y = 500;
        } else {

            y = Phaser.Math.Between(previousY - 200, previousY + 200);

            y = Phaser.Math.Clamp(y, 400, 600);
        }

        var platform = platforms.create(x, y, 'platform');
        platform.setScale(0.5).refreshBody();

        previousY = y;

        x += Phaser.Math.Between(platformSpacingX, platformSpacingX + 100);  
    }
}



function resetPlatform(platform) {
    platform.x = 800;  
    platform.y = Phaser.Math.Between(200, 500);  
}
