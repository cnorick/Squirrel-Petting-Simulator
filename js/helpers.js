// Converts hex color to an array of [r, g, b].
function hexToArray(hexColor) {
    var bigint = parseInt(hexColor.substring(1), 16);
    var r = (bigint >> 16) & 255;
    var g = (bigint >> 8) & 255;
    var b = bigint & 255;
    return [r/255, g/255, b/255];
}

// Creates a bounding box that encloses the non-transformed position of all the objects.
function calculateBoundingBox(objects) {
    let bb = {};
    let maxes = ['maxX', 'maxY', 'maxZ'];
    let mins = ['minX', 'minY', 'minZ'];

    // Initialize to first object's values.
    for(let val of [...maxes, ...mins]) {
        let scale = objects[0].scaleFactor != null ? objects[0].scaleFactor : 1;
        bb[val] = objects[0].mesh.model[val] * scale;
    }
    
    for(let i = 1; i < objects.length; i++) {
        let scale = objects[i].scaleFactor != null ? objects[i].scaleFactor : 1;

        for (let val of maxes) {
            if(objects[i].mesh.model[val] * scale > bb[val])
                bb[val] = objects[i].mesh.model[val] * scale;
        }
        for (let val of mins) {
            if(objects[i].mesh.model[val] * scale < bb[val])
                bb[val] = objects[i].mesh.model[val] * scale;
        }
    }
    return bb;
}

function createLinearRamp(size) {
    let texture = gl.createTexture();
    let vals = [];

    for(let i = 0; i < size; i++) { // width
        for(let j = 0; j < size; j++) { // height
            for(let k = 0; k < 3; k++) { // rgb
                vals.push(Math.floor(((i + j) / (size * 2)) * 255));
            }
        }
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, size, size, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array(vals));
    gl.generateMipmap(gl.TEXTURE_2D);
    return texture;
}

function loadSkybox(skybox, callback) {
    var count = 0;
    var img = new Array(6);
    for (var i = 0; i < 6; i++) {
        img[i] = new Image();
        img[i].onload = function () {
            count++;
            if (count == 6) {
                let texture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
                var targets = [
                    gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
                    gl.TEXTURE_CUBE_MAP_NEGATIVE_X, gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
                    gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y
                ];
                for (var j = 0; j < 6; j++) {
                    const level = 0;
                    const internalFormat = gl.RGBA;
                    const srcFormat = gl.RGBA;
                    const srcType = gl.UNSIGNED_BYTE;

                    gl.texImage2D(targets[j], level, internalFormat, srcFormat, srcType, img[j]);

                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                }
                gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
                callback(texture);
            }
        }
        img[i].src = skybox.textureFiles[i];
    }
}

function loadTexture(filename, callback) {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const level = 0;
    const internalFormat = gl.RGBA;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;

    // Temporarily load a single pixel texture while we download the real one.
    const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, 1, 1, 0, srcFormat, srcType, pixel);

    const image = new Image();
    image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
            srcFormat, srcType, image);
        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            // Yes, it's a power of 2. Generate mips.
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            // No, it's not a power of 2. Turn of mips and set
            // wrapping to clamp to edge
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }

        callback();
    };
    image.src = filename;

    return texture;
}

function loadMultipleTextures(textureFiles, callback) {
    let count = 0;
    let textures = {};
    textureFiles.forEach((textureFile) => {
        textures[textureFile] = loadTexture(textureFile, () => {
            count++;
            if(count == textureFiles.length) {
                callback(textures);
            }
        });
    });
}

function isPowerOf2(value) {
    return (value & (value - 1)) == 0;
}

// Linearly animates the object from current position to "to" in duration amount of time.
// changes obj.position.
// Steps is how many times the object's position is changed.
function linearMove(obj, to, duration, steps = 100, callback = null) {
    // delta gives the incremental change in each direction required for each step.
    const delta = $V(to).subtract($V(obj.position)).multiply(1/steps).elements;
    for(let i = 0; i < steps; i++) {
        GC.timers.push(setTimeout(() => {
            for(let j = 0; j < 3; j++) {
                obj.position[j] += delta[j];
            }

            if(i == steps - 1 && callback != null) {
                callback();
            }
        }, (duration / steps) * (i+1)));
    }
}