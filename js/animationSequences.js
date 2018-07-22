// Ask the browser to lock the pointer
function start(event) {
    let canvas = document.getElementById("glcanvas");

    // Only request the lock if we don't already have it.
    canvas.requestPointerLock();
};

function killSquirrel(callback) {
    const squirrel = GC.objects.find((elm) => elm.name == "squirrel");
    const animationFrameTime = 60; // Time in between each texture.
    const pause = 1000; // Time to pause before moving squirrel.
    const endPos = [squirrel.position[0], squirrel.position[1] - 2, squirrel.position[2]];

    for (let i = 1; i < squirrel.textureFiles.length; i++) {
        GC.timers.push(setTimeout(() => {
            const textureName = `objects/squirrel/squirrel${i}.png`;
            squirrel.texture = squirrel.textures[textureName];

            // After apply the last texture, pause for a moment then move the squirrel.
            if (i == squirrel.textureFiles.length - 1) {
                GC.timers.push(setTimeout(() => {
                    const duration = 4000;
                    // Calculate the minimum number of steps to get a step per frame.
                    linearMove(squirrel, endPos, duration, duration * GC.fps / 1000, () => {
                        squirrel.disabled = true;
                        callback();
                    });
                }, pause));
            }

        }, i * animationFrameTime));
    }
}

function removeFog(totalTime, callback) {
    const steps = 100;
    const finalDensity = 0.0;
    const initialDensity = GC.fogDensity;

    for(let i = 0; i < steps; i++) {
        GC.timers.push(setTimeout(() => {
            GC.fogDensity -= initialDensity / steps;

            if(i == steps - 1) {
                if(callback != null) {
                    callback();
                }
            }
        }, (i+1) * (totalTime / steps)));
    }
}

function addFog(totalTime, callback) {
    const steps = 100;
    const finalDensity = 0.0999;

    GC.fogDensity = 0.0;

    for(let i = 0; i < steps; i++) {
        GC.timers.push(setTimeout(() => {
            GC.fogDensity += finalDensity / steps;

            if(i == steps - 1) {
                if(callback != null) {
                    callback();
                }
            }
        }, (i+1) * (totalTime / steps)));
    }
}

function animateInRedead(callback) {
    const redead = GC.objects.find((elm) => elm.name == "redead");
    const endPos = [0, 0, 0];
    const duration = 6000;
    redead.position = [0, -4, 0];
    redead.disabled = false;

    linearMove(redead, endPos, duration, duration * GC.fps / 1000, () => {
        if(callback != null) {
            callback();
        }
    });
}

function placeGems() {
    const y = 0.8;

    for(gem of GC.gems) {
        const maxArray = [GC.skybox.mesh.model.maxX, GC.skybox.mesh.model.maxY, GC.skybox.mesh.model.maxZ].map((val) => val * GC.skybox.scaleFactor - 1);
        const minArray = [GC.skybox.mesh.model.minX, GC.skybox.mesh.model.minY, GC.skybox.mesh.model.minZ].map((val) => val * GC.skybox.scaleFactor + 1);
        gem.position = (new Array(3)).fill(0).map((val, index) => Math.random() * (maxArray[index] - minArray[index]) + minArray[index]);
        gem.position[1] = y;
        gem.disabled = false;
    }

    const redGem = GC.objects.find((elm) => elm.name == "RedGem");
    const stump = GC.objects.find((elm) => elm.name == "trunk");
    redGem.position = [...stump.position];
    redGem.position[1] = y;

    const gemCounter = document.getElementById("gemCounter");
    gemCounter.style.display = "block";
    gemCounter.innerHTML = `Gems ${GC.grabbedGems} / ${GC.gems.length}`;
}

function petSquirrel() {
    const squirrel = GC.objects.find((elm) => elm.name == "squirrel");
    const redead = GC.objects.find((elm) => elm.name == "redead");
    const hand = GC.objects.find((elm) => elm.name == "hand");
    squirrel.petted = true;
    hand.petting = true;
    drawInfoBox(null, "gamestart");

    GC.timers.push(setTimeout(() => {
        hand.disabled = true;
        killSquirrel(() => {
            addFog(15000);

            GC.timers.push(setTimeout(() => {
                animateInRedead(() => {
                    drawInfoBox("RUN", "petsquirrel", 4000);
                    redead.chase = true;
                    GC.timers.push(setTimeout(() => {
                        placeGems();
                        drawInfoBox("Collect all the gems to escape", "petsquirrel", 4000);
                    }, 4000));
                });
            }, 2000));
        });
    }, 4000));
}

function reset() {
    GC.gameStarted = false;
    const squirrel = GC.objects.find((elm) => elm.name == "squirrel");
    const redead = GC.objects.find((elm) => elm.name == "redead");
    const ghost = GC.objects.find((elm) => elm.name == "ghost");
    const spider = GC.objects.find((elm) => elm.name == "spider");

    const gemCounter = document.getElementById("gemCounter");
    gemCounter.style.display = "none";

    // Stop all timers.
    for(let timer of GC.timers) {
        clearTimeout(timer);
    }

    initCamera();

    squirrel.disabled = false;
    redead.disabled = true;
    ghost.disabled = true;
    spider.disabled = true;
    GC.fogDensity = 0.0;
    GC.gameScene = true;
    GC.disableMovement = false;
    GC.grabbedGems = 0;

    for(obj of GC.objects) {
        if(obj.reset) {
            obj.reset(obj);
        }
    }

    let start = document.getElementById("start-button");
    start.innerHTML = "Start";

    drawInfoBox();
}

function startGameScene() {
    if(GC.gameScene && !GC.gameStarted) {
        drawInfoBox("Go pet the squirrel", "gamestart");
    }
    GC.gameStarted = true;
    start();
}

function gameOver(catcher) {
    const redead = GC.objects.find((elm) => elm.name == "redead");
    const ghost = GC.objects.find((elm) => elm.name == "ghost");
    const spider = GC.objects.find((elm) => elm.name == "spider");

    drawInfoBox(`Game Over: Caught by ${catcher.name}`);
    GC.disableMovement = true;

    redead.chase = false;
    ghost.chase = false;
    spider.chase = false;
    let endPos = [...camera.position];
    endPos[1] = -2;
    const duration = 3000;

    linearMove(redead, endPos, duration, duration * GC.fps / 1000, () => {
    });
}

function win() {
    const redead = GC.objects.find((elm) => elm.name == "redead");
    const squirrel = GC.objects.find((elm) => elm.name == "squirrel");
    const ghost = GC.objects.find((elm) => elm.name == "ghost");
    const spider = GC.objects.find((elm) => elm.name == "spider");

    drawInfoBox("You Win!");

    redead.chase = false;
    ghost.chase = false;
    ghost.freeze = true;
    spider.chase = false;
    squirrel.chase = false;
    let endPosRedead = [10, 7, 30];
    let endPosGhost = [0, 15, 0];
    let endPosSpider = [0, 0, 30];
    const duration = 9000;
    removeFog(8000);

    linearMove(ghost, endPosGhost, duration, duration * GC.fps / 1000);
    linearMove(spider, endPosSpider, duration, duration * GC.fps / 1000);
    linearMove(redead, endPosRedead, duration, duration * GC.fps / 1000, () => {
        GC.timers.push(setTimeout(() => {
            const duration = 4000;
            squirrel.disabled = false;
            squirrel.position = [0, -2, 0];
            squirrel.texture = squirrel.textures[squirrel.textureFiles[0]];

            linearMove(squirrel, [0, 0, 0], duration, duration * GC.fps / 1000, () => {
                reset();
            });
        }, 8000));
    });
}

function setStaticScene() {
    const squirrel = GC.objects.find((elm) => elm.name == "squirrel");
    const redead = GC.objects.find((elm) => elm.name == "redead");
    const ghost = GC.objects.find((elm) => elm.name == "ghost");
    const spider = GC.objects.find((elm) => elm.name == "spider");
    const hand = GC.objects.find((elm) => elm.name == "hand");

    reset();
    squirrel.disabled = true;
    hand.disabled = true;
    redead.disabled = false;
    redead.chase = false
    ghost.disabled = false;
    spider.disabled = false;
    GC.fogDensity = 0.1;
    GC.gameScene = false;
    drawInfoBox();
    start();
}


let requests = {};
function drawInfoBox(text, requester, duration) {
    // Clear everything if called with no parameters.
    if(!text && !requester) {
        requests = {};
    }
    if(duration) {
        drawInfoBox(text, requester);
        setTimeout(() => {
            drawInfoBox(null, requester);
        }, duration);
        return;
    }

    // Keep track of which object is using the infobox.
    if(!requester) {
        requester = "default";
    }
    // Add this requester if they haven't used the infobox before.
    if (!requests[requester]) {
        requests[requester] = {};
    }
    requests[requester].time = Date.now();
    requests[requester].text = text;

    // Get requests that have messages.
    let messages = Object.values(requests).filter((val) => val.text != "" && val.text != null);

    let infoBox = document.getElementById("infobox");
    if (messages.length == 0) {
        infoBox.style.display = "none";
    }
    else {
        // Newest message gets displayed.
        text = messages.reduce((a, b) => a.time > b.time ? a : b).text;
        infoBox.style.display = "block";
        infoBox.innerHTML = text;
    }
}