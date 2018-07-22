var gl = null; //our OpenGL handler

var GC = {};   //the graphics context

//initialize the graphics context variables
GC.perspectiveMatrix = null;      //the Perspective matrix
GC.mvMatrix = null;               //the ModelView matrix
GC.mvMatrixStack = [];            //the ModelView matrix stack
GC.mouseDown = null;              //boolean check for mouseDown
GC.width = window.innerWidth;     // Make the canvas area full screen
GC.height = window.innerHeight;
GC.lightSourceLocation = null;
GC.backgroundColor = [0, 0, 0];
GC.fps = 60;
GC.lightSourceLocation = [10, 10, 10];
GC.fogDensity = 0.0;
GC.fogColor = [0.5, 0.5, 0.5];
GC.gameScene = true;
GC.timers = [];
GC.disableMovement = false;
GC.grabbedGems = 0;

var pressedKeys = {};

var camera = new ArcBall();              //create a new arcball camera
camera.setBounds(GC.width, GC.height);    //initialize camera with screen space dimensions


//demo constructor
function demo(canvasName) {
    this.canvasName = canvasName;
}

function initCamera() {
    let bbox = calculateBoundingBox(GC.objects);
    GC.bbox = bbox;
    //calculate the largest range in x,y,z
    var s = Math.max(Math.abs(bbox.minX - bbox.maxX),
        Math.abs(bbox.minY - bbox.maxY),
        Math.abs(bbox.minZ - bbox.maxZ))

    //calculate the distance to place camera from model
    var d = (s / 2.0) / Math.tan(45 / 2.0) * 2;

    GC.perspectiveMatrix = makePerspective(45, GC.width / GC.height, 0.1, Math.max(2000.0, bbox.maxZ));

    const startY = 1.4;
    const startZ = 10;
    const startX = 1;

    //place the camera at the calculated position
    camera.position[2] = startZ;
    camera.position[0] = 0;
    camera.position[1] = startY;

    //orient the camera to look at the center of the model
    camera.lookAt = [0, startY, startZ-1];

    camera.lastTime = 0;
}

//initialize webgl, populate all buffers, load shader programs, and start drawing
demo.prototype.init = function () {
    this.canvas = document.getElementById(this.canvasName);
    this.canvas.width = GC.width;
    this.canvas.height = GC.height;

    //Here we check to see if WebGL is supported 
    this.initWebGL(this.canvas);

    gl.clearColor(...GC.backgroundColor, 1);
    gl.clearDepth(1.0);                 //set depth to yon plane
    gl.enable(gl.DEPTH_TEST);           //enable depth test
    gl.depthFunc(gl.LEQUAL);            //change depth test to use LEQUAL

    //set mouse event callbacks
    this.setMouseEventCallbacks();

    //set keyboard event callbacks
    this.setKeyboardEventCallbacks();

    //Get opengl derivative extension -- enables using fwidth in shader
    gl.getExtension("OES_standard_derivatives");

    //init the shader programs
    this.initShaders();

    //init the vertex buffer
    this.initGeometryBuffers();

    initCamera();

    // Load all the textures and draws scene when finished.
    this.initTextures(drawScene);
}

demo.prototype.MainLoop = function () {
    drawScene();
    window.setTimeout(() => this.MainLoop(), 1000 / GC.fps);
}

demo.prototype.setMouseEventCallbacks = function () {
    // Hook pointer lock state change events
    document.addEventListener('pointerlockchange', this.pointerLockChangeHandler, false);
    document.addEventListener('mozpointerlockchange', this.pointerLockChangeHandler, false);
    document.addEventListener('webkitpointerlockchange', this.pointerLockChangeHandler, false);

    document.addEventListener('pointerlockerror', lockError, false);
    document.addEventListener('mozpointerlockerror', lockError, false);
    
    function lockError(e) {
      alert("Pointer lock failed"); 
    }

    this.canvas.requestPointerLock = this.canvas.requestPointerLock ||
        this.canvas.mozRequestPointerLock ||
        this.canvas.webkitRequestPointerLock;
          
    //-------- set callback functions
    this.canvas.onmousedown = this.mouseDown;
    this.canvas.onmousewheel = this.mouseWheel;

    //--Why set these to callbacks for the document object?
    document.onmouseup = this.mouseUp;
    document.onmousemove = this.mouseMove;

    //--touch event callbacks
    this.canvas.ontouchstart = this.touchDown;
    this.canvas.ontouchend = this.touchUp;
    this.canvas.ontouchmove = this.touchMove;
    //-------- end set callback functions
}

demo.prototype.setKeyboardEventCallbacks = function () {
    //--Why set these to callbacks for the document object?
    document.onkeydown = this.keyDown;
    document.onkeyup = this.keyUp;
}

//initialize the shaders and grab the shader variable attributes
demo.prototype.initShaders = function () {
    let objects = [...GC.objects, GC.skybox];
    objects.forEach((obj) => {

        let fragShader = this.makeShaderFromSource(GC.shaderSource[obj.shader].f, gl.FRAGMENT_SHADER);
        let vertShader = this.makeShaderFromSource(GC.shaderSource[obj.shader].v, gl.VERTEX_SHADER);
        let shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertShader);
        gl.attachShader(shaderProgram, fragShader);
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.log("unable to init shader program");
        }


        // all objects will have these attributes.
        obj.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "vPos");
        gl.enableVertexAttribArray(obj.vertexPositionAttribute);

        if(!obj.skybox) {
            obj.vertexNormalsAttribute = gl.getAttribLocation(shaderProgram, "vNormal");
            gl.enableVertexAttribArray(obj.vertexNormalsAttribute);
        }

        if((obj.textureFile || obj.textureFiles) && !obj.skybox) {
            obj.textureCoordLocation = gl.getAttribLocation(shaderProgram, "aTextureCoord");
            gl.enableVertexAttribArray(obj.textureCoordLocation);
        }

        obj.shaderProgram = shaderProgram;
    });
}

// Loads textures for all objects and calls callback when they are finished loading.
demo.prototype.initTextures = (callback) => {
    loadSkybox(GC.skybox, (texture) => {
        GC.skybox.texture = texture;
        callback();
    });

    let count = 0;
    GC.objects.forEach((obj) => {
        if (obj.textureFiles) {
            loadMultipleTextures(obj.textureFiles, (textures) => { 
                obj.textures = textures;
                obj.texture = obj.textures[obj.textureFiles[0]];

                count++;
                if (count == GC.objects.length) {
                    callback();
                }
            });
        }
        else if (obj.textureFile) {
            obj.texture = loadTexture(obj.textureFile, () => {
                count++;
                if (count == GC.objects.length) {
                    callback();
                }
            });
        }
        else {
            // If there is no texture file for the specified object, there's nothing to load. So we need to account for that.
            count++;
            if (count == GC.objects.length) {
                callback();
            }
        }
    });
}

//initialize the buffers for drawing and the edge highlights
demo.prototype.initGeometryBuffers = function () {
    let objects = [...GC.objects, GC.skybox];
    objects.forEach((obj) => {
        let m = obj.mesh.model;

        let verts = [];                   //array to hold vertices laid out according to indices
        let vertexNorms = [];
        let textureCoords = [];
        let min = [90000, 90000, 90000];    //used for bounding box calculations
        let max = [-90000, -90000, -90000]; //used for bounding box calculations

        // Loop through the indices array and create a vertices array (this means
        //     duplicating data) from the listed indices
        m.indices.forEach(function (d, i) {
            //grab the x,y,z values for the current vertex
            vx = (parseFloat(m.vertices[d * 3]));
            vy = (parseFloat(m.vertices[d * 3 + 1]));
            vz = (parseFloat(m.vertices[d * 3 + 2]));

            //add this vertex to our array
            verts.push(vx, vy, vz);

            let n = m.vertexNormals[d];
            vertexNorms.push(n.x, n.y, n.z);

            //check to see if we need to update the min/max
            if (vx < min[0]) min[0] = vx;
            if (vy < min[1]) min[1] = vy;
            if (vz < min[2]) min[2] = vz;
            if (vx > max[0]) max[0] = vx;
            if (vy > max[1]) max[1] = vy;
            if (vz > max[2]) max[2] = vz;

            if (obj.textureFile || obj.textureFiles) {
                let coords = [];
                
                // If the object had textures included in the obj file, they're in the textures property.
                if (obj.mesh.model.textures) {
                    coords = [obj.mesh.model.textures[d * 2], obj.mesh.model.textures[d * 2 + 1]];
                }
                else {
                    coords = obj.calcTextureCoord(obj, vx, vy, vz);
                }

                textureCoords.push(...coords);
            }
        });

        //set the min/max variables
        m.minX = min[0]; m.minY = min[1]; m.minZ = min[2];
        m.maxX = max[0]; m.maxY = max[1]; m.maxZ = max[2];

        m.centroid = { x: (m.maxX + m.minX) / 2, y: (m.maxY + m.minY) / 2, z: (m.maxZ + m.minZ) / 2 };

        obj.vertexBuffer = gl.createBuffer();
        //bind the data we placed in the verts array to an OpenGL buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

        obj.vertexNormsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertexNormsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNorms), gl.STATIC_DRAW);

        if (obj.textureFile || obj.textureFiles) {
            obj.textureCoordBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, obj.textureCoordBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
        }
    });
}

// processes the movement of all the currently pressed keys.
function processMovement(time) {
    if(GC.disableMovement) {
        return;
    }

    const t = time / 1000;
    const speed = .1052; // Move speed number of spaces every frame.

    // Only move the camera once per frame.
    if (t - camera.lastTime > 1 / GC.fps) {
        camera.lastTime = t;

        // Use this so we don't go twice as fast when there are multiple keys down at once.
        let numKeysPressed = Object.values(pressedKeys).reduce((prev, cur) => prev + (cur ? 1 : 0), 0);

        // dx and dz are the change in distance in the direction of the lookat.
        let dz = (camera.lookAt[2] - camera.position[2]) * speed / numKeysPressed;
        let dx = (camera.lookAt[0] - camera.position[0]) * speed / numKeysPressed;

        const prevLookAt = [...camera.lookAt];
        const prevPosition = [...camera.position];

        for (let key in pressedKeys) {
            if (pressedKeys[key]) {
                switch (parseInt(key)) {
                    case 65: //a
                    case 37: //Left arrow
                        camera.position[2] -= dx;
                        camera.position[0] += dz

                        camera.lookAt[2] -= dx;
                        camera.lookAt[0] += dz;
                        break;
                    case 87: //w
                    case 38: //Up arrow
                        camera.position[2] += dz;
                        camera.position[0] += dx;

                        camera.lookAt[2] += dz;
                        camera.lookAt[0] += dx;
                        break;
                    case 68: //d
                    case 39: //Right arrow
                        camera.position[2] += dx;
                        camera.position[0] -= dz

                        camera.lookAt[2] += dx;
                        camera.lookAt[0] -= dz;
                        break;
                    case 83: //s
                    case 40: //Down arrow
                        camera.position[2] -= dz;
                        camera.position[0] -= dx;

                        camera.lookAt[2] -= dz;
                        camera.lookAt[0] -= dx;
                        break;
                }
            }
        }

        // For all 3 dimensions, if you excede the world box, move you back inside.
        const maxArray = [GC.skybox.mesh.model.maxX, GC.skybox.mesh.model.maxY, GC.skybox.mesh.model.maxZ].map((val) => val * GC.skybox.scaleFactor - 1);
        const minArray = [GC.skybox.mesh.model.minX, GC.skybox.mesh.model.minY, GC.skybox.mesh.model.minZ].map((val) => val * GC.skybox.scaleFactor + 1);
        // console.log(camera.position[0], minArray[0], maxArray[0])
        for(let i = 0; i < 3; i++) {
            if(camera.position[i] < minArray[i]) {
                camera.position[i] = prevPosition[i];
                camera.lookAt[i] = prevLookAt[i];
            }
            else if(camera.position[i] > maxArray[i]) {
                camera.position[i] = prevPosition[i];
                camera.lookAt[i] = prevLookAt[i];
            }
        }
    }
}

function positionCamera(time) {
    processMovement(time);

    //setup perspective and lookat matrices
    let lookAtMatrix = makeLookAt(camera.position[0], camera.position[1], camera.position[2],
        camera.lookAt[0], camera.lookAt[1], camera.lookAt[2],
        0, 1, 0);

    //set initial camera lookat matrix
    mvLoadIdentity(GC);

    //multiply by our lookAt matrix
    mvMultMatrix(lookAtMatrix, GC);
}

//the drawing function
function drawScene() {
    let time = Date.now();

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    renderSkybox();

    let objects = [...GC.objects];
    objects.forEach((obj) => {
        // Only render the object if it's enabled.
        if (!obj.disabled) {
            gl.depthMask(true)
            positionCamera(time);
            let m = obj.mesh.model;
            gl.useProgram(obj.shaderProgram);

            /////
            // Do object transforms here.
            if (obj.doTransforms) {
                obj.doTransforms(obj, time);
            }
            /////

            //passes modelview and projection matrices to the vertex shader
            setMatrixUniforms(GC, obj.shaderProgram);

            //pass the vertex buffer to the shader
            gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertexBuffer);
            gl.vertexAttribPointer(obj.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertexNormsBuffer);
            gl.vertexAttribPointer(obj.vertexNormalsAttribute, 3, gl.FLOAT, false, 0, 0);

            if (obj.texture) {
                gl.bindBuffer(gl.ARRAY_BUFFER, obj.textureCoordBuffer);
                gl.vertexAttribPointer(obj.textureCoordLocation, 2, gl.FLOAT, false, 0, 0);
            }

            if (obj.material) {
                // Send light source location to the shaders.
                let lightSource = gl.getUniformLocation(obj.shaderProgram, "uLightSource");
                gl.uniform3fv(lightSource, new Float32Array(GC.lightSourceLocation));

                let ambientColor = gl.getUniformLocation(obj.shaderProgram, "uAmbientColor");
                gl.uniform4fv(ambientColor, new Float32Array(obj.material.a));

                let diffuseColor = gl.getUniformLocation(obj.shaderProgram, "uDiffuseColor");
                gl.uniform4fv(diffuseColor, new Float32Array(obj.material.d));

                let specularColor = gl.getUniformLocation(obj.shaderProgram, "uSpecularColor");
                gl.uniform4fv(specularColor, new Float32Array(obj.material.s));

                let shininess = gl.getUniformLocation(obj.shaderProgram, "uShininess");
                gl.uniform1f(shininess, obj.material.n);
            }

            if (obj.lighting) {
                let Ka = gl.getUniformLocation(obj.shaderProgram, "uKa");
                gl.uniform1f(Ka, obj.lighting.ambient);

                let Kd = gl.getUniformLocation(obj.shaderProgram, "uKd");
                gl.uniform1f(Kd, obj.lighting.diffuse);

                let Ks = gl.getUniformLocation(obj.shaderProgram, "uKs");
                gl.uniform1f(Ks, obj.lighting.specular);
            }

            if (obj.texture) {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, obj.texture);
            }

            if (obj.useFog) {
                let eye = gl.getUniformLocation(obj.shaderProgram, "uEye");
                gl.uniform3fv(eye, new Float32Array(camera.position));

                let fogColor = gl.getUniformLocation(obj.shaderProgram, "uFogColor");
                gl.uniform3fv(fogColor, new Float32Array(GC.fogColor));

                let fogDensity = gl.getUniformLocation(obj.shaderProgram, "uFogDensity");
                gl.uniform1f(fogDensity, GC.fogDensity);
            }

            //draw everything
            gl.drawArrays(gl.TRIANGLES, 0, m.indices.length);
        }
    });
}

function renderSkybox() {
    let obj = GC.skybox;
    let m = obj.mesh.model;

    // gl.depthMask(false);
    positionCamera();
    gl.useProgram(obj.shaderProgram);

    /////
    // Do object transforms here.
    if (obj.doTransforms) {
        obj.doTransforms(obj);
    }
    /////

    //passes modelview and projection matrices to the vertex shader
    setMatrixUniforms(GC, obj.shaderProgram);

    if (obj.useFog) {
        let eye = gl.getUniformLocation(obj.shaderProgram, "uEye");
        gl.uniform3fv(eye, new Float32Array(camera.position));

        let fogColor = gl.getUniformLocation(obj.shaderProgram, "uFogColor");
        gl.uniform3fv(fogColor, new Float32Array(GC.fogColor));

        let fogDensity = gl.getUniformLocation(obj.shaderProgram, "uFogDensity");
        gl.uniform1f(fogDensity, GC.fogDensity);
    }

    //pass the vertex buffer to the shader
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertexBuffer);
    gl.vertexAttribPointer(obj.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, m.indices.length);
}

//initialize webgl
demo.prototype.initWebGL = function () {
    gl = null;

    try {
        gl = this.canvas.getContext("experimental-webgl");
    }
    catch (e) {
        //pass through
    }

    // If we don't have a GL context, give up now
    if (!gl) {
        alert("Unable to initialize WebGL. Your browser may not support it.");
    }
}

demo.prototype.makeShaderFromSource = (source, type) => {
    //check type of shader to give openGL the correct hint
    shader = gl.createShader(type);
    //add the shader source code to the created shader object
    gl.shaderSource(shader, source);

    //compile the shader
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log("error compiling shaders -- " + gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

//compile shader located within a script tag
demo.prototype.getShader = function (id) {
    var shaderScript, theSource, currentChild, shader;

    shaderScript = document.getElementById(id);
    if (!shaderScript) {
        return null;
    }

    //init the source code variable
    theSource = "";

    //begin reading the shader source from the beginning
    currentChild = shaderScript.firstChild;

    //read the shader source as text
    while (currentChild) {
        if (currentChild.nodeType == currentChild.TEXT_NODE) {
            theSource += currentChild.textContent;
        }
        currentChild = currentChild.nextSibling;
    }

    //check type of shader to give openGL the correct hint
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.makeShaderFromSource(theSource, gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.makeShaderFromSource(theSource, gl.VERTEX_SHADER);
    } else {
        return null;
    }

    return shader;
}


//handle mousedown
demo.prototype.mouseDown = function (event) {
    return false;
}

//handle mouseup
demo.prototype.mouseUp = function (event) {
    return false;
}

//handle mouse movement
demo.prototype.mouseMove = function (event) {
    const horizontalScale = 0.2; // Quick way to fix issue of the horizontal movement being quicker than vertical.

    // Calculate an angle in the world xz plane based on the movement in the screen X.
    let changeAngle = (event.movementX * horizontalScale / GC.width) * 2 * Math.PI; // radians

    // Caluclate vectors to the old lookat from the old positions.
    let oldX = camera.lookAt[0] - camera.position[0];
    let oldZ = camera.lookAt[2] - camera.position[2];

    // Angle within the unit circle.
    // We want the lookat to always just be 1 away from the position.
    let oldAngle = Math.acos(oldX) * Math.sign(oldZ);

    let angle = oldAngle + changeAngle;
    camera.lookAt[0] = camera.position[0] + Math.cos(angle);
    camera.lookAt[2] = camera.position[2] + Math.sin(angle);

    let newVal = camera.lookAt[1] + -event.movementY / GC.height;

    // Clamp the y between 0 and 3.
    camera.lookAt[1] = Math.max(Math.min(newVal, 3), 0);

    return false;
}

//handle mouse scroll event
demo.prototype.mouseWheel = function (event) {

    return false;
}

demo.prototype.keyUp = function (e) {
    pressedKeys[e.keyCode] = false;
}

//--------- handle keyboard events
demo.prototype.keyDown = function (e) {
    // Add the new key to the map.
    pressedKeys[e.keyCode] = true;

    // space
    if(e.keyCode === 32) {
        const squirrel = GC.objects.find((elm) => elm.name == "squirrel");
        const ghost = GC.objects.find((elm) => elm.name == "ghost");
        const spider = GC.objects.find((elm) => elm.name == "spider");
        const redead = GC.objects.find((elm) => elm.name == "redead");

        const distToSquirrel = $V(camera.position).distanceFrom($V(squirrel.position));
        if(distToSquirrel < squirrel.pettingDist) {
            petSquirrel();
        }

        // See if any of the gems can be collected.
        for (let gem of GC.gems) {
            if (!gem.disabled) {
                const distToGem = $V(camera.position).distanceFrom($V(gem.position));

                if (distToGem < gem.grabbingDist) {
                    gem.grabbed = true;
                    gem.disabled = true;
                    GC.grabbedGems++;
                    drawInfoBox(null, gem.name);

                    const gemCounter = document.getElementById("gemCounter");
                    gemCounter.innerHTML = `Gems ${GC.grabbedGems} / ${GC.gems.length}`;

                    // Make game more difficult as you get more gems.
                    switch (GC.grabbedGems) {
                        case 5:
                            squirrel.scaleFactor *= 7;
                            squirrel.disabled = false;
                            squirrel.position = [-25, 0, -25];
                            squirrel.chase = true;
                            const duration = 16000;
                            linearMove(squirrel, [30, 0, 30], duration, duration * GC.fps / 1000, () => {
                                squirrel.reset(squirrel);
                                squirrel.disabled = true;
                            });
                            break;
                        case 4:
                            redead.speed += .013;
                            break;
                        case 3:
                            spider.disabled = false;
                            spider.chase = true;
                            break;
                        case 2:
                            redead.speed += .01;
                            break;
                        case 1:
                            ghost.disabled = false;
                            ghost.chase = true;
                            break;
                    }
                }
            }
        }

        if (GC.grabbedGems == GC.gems.length) {
            win();
        }
    }
}


// --------- handle touch events
demo.prototype.touchDown = function (event) {
    return false;
}

//handle touchEnd
demo.prototype.touchUp = function (event) {
    return false;
}

//handle touch movement
demo.prototype.touchMove = function (event) {
    return false;
}
// --------- end handle touch events
demo.prototype.pointerLockChangeHandler = function (event) {
    let menu = document.getElementById("game-menu");
    let thanks = document.getElementById("thanks");
    let start = document.getElementById("start-button");

    // If the element isn't null, then we just captured the pointer.
    if (document.pointerLockElement != null) {
        menu.style.display = "none";
    }
    // Gave up the pointer.
    else {
        menu.style.display = "block";
        thanks.style.display = "block";
        start.innerHTML = "Resume";
    }
}
  