function init() {
    //create a new model viewing demo
    var myDemo = new demo("glcanvas");

    loadGems();

    loadShaders(function () {
        // Callback when loadShaders is finished.
        loadMeshes(function() {
            //setup the webgl context and initialize everything
            myDemo.init();

            //enter the event driven loop; ---- demo.js
            myDemo.MainLoop();
        });
    });
}

function loadGems() {
    const defaultGem = GC.objects.find((elm) => elm.name == "gem");
    const gemColors = ["Red", "Blue", "Green", "Clear", "Yellow", "Purple"];
    GC.gems = [];

    for (let color of gemColors) {
        let gem = Object.assign({}, defaultGem);
        gem.name = `${color}Gem`;
        gem.textureFile = `objects/gem/${color}.png`;
        GC.gems.push(gem);
        GC.objects.push(gem);
    }
}

function loadMeshes(callback){
    let count = 0;
    // Load mesh for the skybox too.
    let objects = [...GC.objects, GC.skybox];

    for(let obj of objects) {
        //jQuery ajax call to load the shader source code.
        $.ajax({
            url: "./" + obj.meshFile,
            success: (data) => {
                count++;

                if (data.target != undefined) {
                    var mesh = { model: new OBJ.Mesh(data.target.result) }
                } else {
                    var mesh = { model: new OBJ.Mesh(data) }
                }

                processMesh(mesh);
                obj.mesh = mesh;

                // When we've loaded all of the shaders, call the callback function.
                if (count == objects.length) {
                    callback();
                }
            }
        });
    }
}

// loads all the shader source into the GC.shadersSource object and calls callback when finished.
function loadShaders(callback) {
    let count = 0;
    GC.shaderSource = {};

    for(let s in shaders) {
        let obj = shaders[s];
        GC.shaderSource[s] = {};
        //jQuery ajax call to load the shader source code.
        for(let type of ['f', 'v']) { // for both the vert shader and the frag shader...
            $.ajax({
                url: "./" + obj[type],
                success: (source) => {
                    count++;
                    GC.shaderSource[s][type] = source;

                    // When we've loaded all of the shaders, call the callback function.
                    if(count == Object.keys(shaders).length * 2) {
                        callback();
                    }
                }
            });
        }
    }
}


//function to load the mesh and setup the opengl rendering demo
function processMesh(mesh){
    // if(!mesh.model.vertexMaterialIndices) {
        AddNormalsArrays(mesh);
    // }
}

function normalize(vector) {
    let magnitude = Math.sqrt(Math.pow(vector.x, 2) + Math.pow(vector.y, 2) + Math.pow(vector.z, 2));

    // for x, y, and z...
    for (let j in vector) {
        vector[j] /= magnitude;
    }
}

function AddFaceNormals(mesh) {
    let vertices = mesh.model.vertices;
    let indices = mesh.model.indices;
    let normals = [];

    for(let i = 0; i < indices.length; i+=3) {
        // A, B, and C are the indices of the 3 vertices in the triangle.
        let A = indices[i];
        let B = indices[i+1];
        let C = indices[i+2];

        // (x, y, z) of each vertex.
        let ax = vertices[A*3];
        let ay = vertices[A*3+1];
        let az = vertices[A*3+2];

        let bx = vertices[B*3];
        let by = vertices[B*3+1];
        let bz = vertices[B*3+2];

        let cx = vertices[C*3];
        let cy = vertices[C*3+1];
        let cz = vertices[C*3+2];

        // These are 2 of the edges. We'll use these to calculate the normal.
        let BminusA = [];
        let CminusA = [];
        BminusA[0] = bx - ax;
        BminusA[1] = by - ay;
        BminusA[2] = bz - az;

        CminusA[0] = cx - ax;
        CminusA[1] = cy - ay;
        CminusA[2] = cz - az;

        // Cross product of (B-A) X (C-A).
        let norm = {};
        norm.x = (BminusA[1] * CminusA[2]) - (BminusA[2] * CminusA[1]);
        norm.y = (BminusA[2] * CminusA[0]) - (BminusA[0] * CminusA[2]);
        norm.z = (BminusA[0] * CminusA[1]) - (BminusA[1] * CminusA[0]);

        normalize(norm);

        // Indices' x, y, and z are listed in order. our normals are being stored as objects tho.
        // That's why we need to divide by 3.
        normals[i/3] = norm;
    }

    mesh.model.faceNormals = normals;
}

function AddVertexNormals(mesh) {
    let vertices = mesh.model.vertices;
    let indices = mesh.model.indices;
    let vNormals = Array(vertices.length / 3).fill().map(u => ({ x: 0, y: 0, z: 0 }));//Array.apply(null, Array(vertices.length/3)).map(function() { return { x: 0, y: 0, z: 0 }; }); // Array the same size as vertices all with the value 0;

    for(let i = 0; i < indices.length; i+=3) {
        for(let j = 0; j < 3; j++) {
            let vertex = indices[i + j];

            // Add the triangle's normal to the vertex's normal.
            // Use i/3 for the same reason here as above.
            vNormals[vertex].x += mesh.model.faceNormals[i/3].x;
            vNormals[vertex].y += mesh.model.faceNormals[i/3].y;
            vNormals[vertex].z += mesh.model.faceNormals[i/3].z;
        }
    }

    for(let normal of vNormals)
        normalize(normal);

    mesh.model.vertexNormals = vNormals;
}

function AddNormalsArrays(mesh) {
    AddFaceNormals(mesh);
    AddVertexNormals(mesh);
}

var shaders = {
    'texture': { f: 'texture.frag', v: 'texture.vert' },
    'skybox': { f: 'skyboxShader.frag', v: 'skyboxShader.vert' },
    'toon': { f: 'toonShader.frag', v: 'toonShader.vert' },
    'silhouette': { f: 'silhouetteShader.frag', v: 'silhouetteShader.vert' }
};
var defaultLighting = {
    ambient: 1.0,
    diffuse: 1.0,
    specular: 1.0
};
var materials = {
    "default": {
        a: [0, 0, 0, 1.0],
        d: [0, 0, 0, 1.0],
        s: [0, 0, 0, 1.0],
        n: 0.00000001
    },
    "ghost": {
        a: [.75, .75, .75, 1.0],
        d: [.95, .95, .95, 1.0],
        s: [1, 1, 1, 1.0],
        n: 100
    },
    "redead": {
        a: [.2, .2, .2, 1.0],
        d: [.8, .8, .8, 1.0],
        s: [0, 0, 0, 1.0],
        n: 0.00000001
    },
    "spider": {
        a: [.2, .2, .2, 1.0],
        d: [0.13725, 0.13725, 0.13725, 1.0],
        s: [0.13725, 0.13725, 0.13725, 1.0],
        n: 0.00000001
    },
    "squirrel": {
        a: [.2, .2, .2, 1.0],
        d: [0.8, 0.8, 0.8, 1.0],
        s: [0, 0, 0, 1.0],
        n: 0.00000001
    },
    "log": {
        a: [0, 0, 0, 1.0],
        d: [0.8, 0.8, 0.8, 1.0],
        s: [0, 0, 0, 1.0],
        n: 0.00000001
    },
    "mushroom": {
        a: [0, 0, 0, 1.0],
        d: [1, 1, 1, 1.0],
        s: [0, 0, 0, 1.0],
        n: 4
    },
    "hand": {
        a: [0, 0, 0, 1.0],
        d: [0.64, 0.64, 0.64, 1.0],
        s: [0.5, 0.5, 0.5, 1.0],
        n: 96.078431
    },
    "gem": {
        a: [0, 0, 0, 1.0],
        d: [0, 0, 0, 1.0],
        s: [0, 0, 0, 1.0],
        n: 10
    }
};

GC.skybox = {
    textureFiles: [
        'skyboxes/forest/right.png',
        'skyboxes/forest/back.png',
        'skyboxes/forest/left.png',
        'skyboxes/forest/front.png',
        'skyboxes/forest/top.png',
        'skyboxes/forest/bottom.png',
    ],
    meshFile: 'objects/cube.obj',
    shader: 'skybox',
    skybox: true,
    scaleFactor: 40,
    useFog: true,
    sizeY: 0.3, // If the box is shorter than wide, it looks more like a forest.
    doTransforms: (obj) => {
        mvTranslate([0, obj.scaleFactor * obj.sizeY / 2, 0], GC);
        mvScale([obj.scaleFactor, obj.scaleFactor * obj.sizeY, obj.scaleFactor], GC);
    }
}
GC.objects = [
    {
        name: "ghost",
        material: materials["ghost"],
        lighting: defaultLighting,
        shader: 'toon',
        meshFile: 'objects/Ghost/Ghost.obj',
        useFog: true,
        disabled: true,
        chase: false,
        position: [2, 2, -4],
        safeDistance: 3,
        freeze: false,
        doTransforms: (obj, time) => {
            const t = time / 1000; // Time is seconds.

            if (!obj.freeze) {
                if (obj.chase) {
                    const maxArray = [GC.skybox.mesh.model.maxX, GC.skybox.mesh.model.maxY, GC.skybox.mesh.model.maxZ].map((val) => val * GC.skybox.scaleFactor - 1);
                    const minArray = [GC.skybox.mesh.model.minX, GC.skybox.mesh.model.minY, GC.skybox.mesh.model.minZ].map((val) => val * GC.skybox.scaleFactor + 1);
                    const moveTime = 9;
                    const height = 15;

                    // exponentially slow ghost as it reaches the ground.
                    const speed = 0.15 / (t % moveTime);

                    // Every moveTime seconds, pick another random spot for the ghost.
                    obj.position[1] -= speed;
                    if (Math.floor(t) % moveTime === 0) {
                        obj.position[0] = Math.random() * ((maxArray[0] - minArray[0]) + minArray[0]);
                        obj.position[2] = Math.random() * ((maxArray[2] - minArray[2]) + minArray[2]);
                        obj.position[1] = height;
                    }

                    if ($V(camera.position).distanceFrom($V(obj.position)) < obj.safeDistance) {
                        gameOver(obj);
                    }
                }

                else {
                    const speed = 0.5;
                    const height = 2;

                    let y = (t * speed % height);
                    y = y > height / 2 ? height - y : y;

                    obj.position[1] = y + 2;
                }
            }
            
            mvTranslate(obj.position, GC);
        },
        reset(obj) {
            obj.chase = false;
            obj.position = [2, 2, -4];
            obj.disabled = true;
            obj.freeze = false;
        }
    },
    {
        name: "redead",
        material: materials["redead"],
        lighting: defaultLighting,
        shader: 'texture',
        meshFile: 'objects/redead/redead.obj',
        scaleFactor: .02,
        textureFile: 'objects/redead/redead_grp.png',
        useFog: true,
        disabled: true,
        chase: false,
        position: [0, 0, 0],
        safeDistance: 3,
        speed: 0.02,
        doTransforms: (obj, time) => {
            let angle = 0;
            if(obj.chase) {
                const direction = $V(camera.position).subtract($V(obj.position)).toUnitVector();
                obj.position = $V(obj.position).add(direction.multiply(obj.speed)).elements;
                obj.position[1] = 0;
                angle = Math.atan2(camera.position[0] - obj.position[0], camera.position[2] - obj.position[2]);

                if($V(camera.position).distanceFrom($V(obj.position)) < obj.safeDistance) {
                    gameOver(obj);
                }
            }

            mvTranslate(obj.position, GC);
            mvScale([obj.scaleFactor, obj.scaleFactor, obj.scaleFactor], GC);
            mvRotate(angle * 180/Math.PI, [0, 1, 0], GC);
        },
        reset(obj) {
            obj.position = [0, 0, 0];
            obj.chase = false;
            obj.speed = 0.02;
        }
    },
    {
        name: "squirrel",
        material: materials["squirrel"],
        lighting: defaultLighting,
        shader: 'texture',
        meshFile: 'objects/squirrel/squirrel.obj',
        scaleFactor: .2,
        textureFiles: Array(21).fill("").map((val, index) => `objects/squirrel/squirrel${index}.png`),
        useFog: true,
        petted: false,
        position: [0, 0, 0],
        pettingDist: 4, // you have to be this close to pet the squirrel.
        chase: false,
        safeDistance: 3,
        doTransforms: (obj, time) => {
            const dist = $V(camera.position).distanceFrom($V(obj.position));
            if (dist < obj.pettingDist && !obj.petted) {
                drawInfoBox("Press space to pet the squirrel", obj.name);
            }
            else {
                drawInfoBox(null, obj.name);
            }

            if (obj.chase && $V(camera.position).distanceFrom($V(obj.position)) < obj.safeDistance) {
                gameOver(obj);
            }

            mvTranslate(obj.position, GC);
            mvRotate(30, [0, 1, 0], GC);
            mvScale([obj.scaleFactor, obj.scaleFactor, obj.scaleFactor], GC);
        },
        reset: (obj) => {
            obj.petted = false;
            obj.position = [0, 0, 0];
            obj.disabled = false;
            obj.texture = obj.textures[obj.textureFiles[0]];
            obj.scaleFactor = 0.2;
            obj.chase = false;
        }
    },
    {
        name: "spider",
        material: materials["spider"],
        lighting: defaultLighting,
        shader: 'silhouette',
        meshFile: 'objects/spider/TRANTULA.OBJ',
        scaleFactor: 30,
        useFog: true,
        disabled: true,
        chase: false,
        position: [1, 0, 0],
        safeDistance: 3,
        doTransforms: (obj, time) => {
            if(obj.chase) {
                const t = time / 1000; // Time is seconds.
                const maxZ = GC.skybox.mesh.model.maxZ * GC.skybox.scaleFactor - 1;
                const minZ = GC.skybox.mesh.model.minZ * GC.skybox.scaleFactor + 1;
                const speed = 7;
                const dist = maxZ - minZ;

                let z = (t * speed % (dist * 2)) + minZ;
                z = z > dist + minZ ? maxZ - z + minZ + dist : z;

                obj.position[2] = z;

                if ($V(camera.position).distanceFrom($V(obj.position)) < obj.safeDistance) {
                    gameOver(obj);
                }
            }

            mvTranslate(obj.position, GC);
            mvScale([obj.scaleFactor, obj.scaleFactor, obj.scaleFactor], GC);
        },
        reset(obj) {
            obj.disabled = true;
            obj.chase = false;
            obj.position = [1, 0, 0];
        }
    },
    {
        name: "hand",
        material: materials["hand"],
        lighting: defaultLighting,
        shader: 'texture',
        meshFile: 'objects/hand/hand.obj',
        textureFile: 'objects/hand/hand.png',
        scaleFactor: 3,
        useFog: true,
        disabled: false,
        petting: false,
        doTransforms: (obj, time) => {
            let position;

            // If currently petting the squirrel, move the hand up and down above it.
            if(obj.petting) {
                const squirrel = GC.objects.find((elm) => elm.name == "squirrel");
                const t = time / 1000; // Time is seconds.
                const speed = 1;
                const height = .7;

                let y = (t * speed % height);
                y = y > height / 2 ? height - y : y;
                position = [...squirrel.position];
                position[1] += y + 1.65;
                position[0] += .28;
                position[2] += .6;
                mvTranslate(position, GC);
                mvRotate(90, [1, 0, 0], GC);
                mvRotate(180, [0, 0, 1], GC);
                // Make hand a little bit bigger when petting.
                mvScale([obj.scaleFactor*2, obj.scaleFactor*2, obj.scaleFactor*2], GC);
            }
            // Keep the hand next to the camera if not currently petting.
            else {
                let direction = $V(camera.lookAt).subtract($V(camera.position)).toUnitVector();
                position = $V(camera.position).add(direction).elements;
                let angle = Math.atan2(camera.lookAt[2] - camera.position[2], camera.lookAt[0] - camera.position[0], );
                mvTranslate(position, GC);
                mvRotate(90, [1, 0, 0], GC);
                mvRotate(angle * 180 / Math.PI - 90, [0, 0, 1], GC);
                mvRotate(-20, [1, 0, 0], GC);
                mvTranslate([-.5, -.5, .0], GC);
                mvScale([obj.scaleFactor, obj.scaleFactor, obj.scaleFactor], GC);
            }
        },
        reset(obj) {
            obj.petting = false;
            obj.disabled = false;
        }
    },
    {
        name: "trunk",
        material: materials["default"],
        lighting: defaultLighting,
        shader: 'texture',
        meshFile: 'objects/trunk/tree.obj',
        textureFile: 'objects/trunk/w3.jpg',
        useFog: true,
        disabled: false,
        scaleFactor: 1,
        position: [-5, 2.7, -10],
        doTransforms: (obj, time) => {
            mvTranslate(obj.position, GC);
            mvScale([obj.scaleFactor, obj.scaleFactor, obj.scaleFactor], GC);   
        }
    },
    {
        name: "log",
        material: materials["log"],
        lighting: defaultLighting,
        shader: 'texture',
        meshFile: 'objects/log/log.obj',
        textureFile: 'objects/log/log.png',
        useFog: true,
        disabled: false,
        scaleFactor: 0.03,
        position: [-8, 0, 7],
        doTransforms: (obj, time) => {
            mvTranslate(obj.position, GC);
            mvRotate(60, [0, 1, 0], GC);
            mvScale([obj.scaleFactor, obj.scaleFactor, obj.scaleFactor], GC);   
        }
    },
    {
        name: "log2",
        material: materials["log"],
        lighting: defaultLighting,
        shader: 'texture',
        meshFile: 'objects/log/log.obj',
        textureFile: 'objects/log/log.png',
        useFog: true,
        disabled: false,
        scaleFactor: 0.01,
        position: [6, 0, 14],
        doTransforms: (obj, time) => {
            mvTranslate(obj.position, GC);
            mvRotate(111, [0, 1, 0], GC);
            mvScale([obj.scaleFactor, obj.scaleFactor, obj.scaleFactor], GC);   
        }
    },
    {
        name: "mushroom",
        material: materials["mushroom"],
        lighting: defaultLighting,
        shader: 'texture',
        meshFile: 'objects/mushroom/mushroom.obj',
        textureFile: 'objects/mushroom/mushroom.jpg',
        useFog: true,
        disabled: false,
        scaleFactor: 0.03,
        position: [-15, 0, 10],
        doTransforms: (obj, time) => {
            mvTranslate(obj.position, GC);
            mvRotate(280, [1, 0, 0], GC);
            mvScale([obj.scaleFactor, obj.scaleFactor, obj.scaleFactor], GC);   
        }
    },
    {
        name: "mushroom2",
        material: materials["mushroom"],
        lighting: defaultLighting,
        shader: 'texture',
        meshFile: 'objects/mushroom/mushroom.obj',
        textureFile: 'objects/mushroom/mushroom.jpg',
        useFog: true,
        disabled: false,
        scaleFactor: 0.05,
        position: [15, 0, -10],
        doTransforms: (obj, time) => {
            mvTranslate(obj.position, GC);
            mvRotate(280, [1, 0, 0], GC);
            mvScale([obj.scaleFactor, obj.scaleFactor, obj.scaleFactor], GC);   
        }
    },
    {
        name: "mushroom3",
        material: materials["mushroom"],
        lighting: defaultLighting,
        shader: 'texture',
        meshFile: 'objects/mushroom/mushroom.obj',
        textureFile: 'objects/mushroom/mushroom.jpg',
        useFog: true,
        disabled: false,
        scaleFactor: 0.01,
        position: [-3, 0, -6],
        doTransforms: (obj, time) => {
            mvTranslate(obj.position, GC);
            mvRotate(280, [1, 0, 0], GC);
            mvScale([obj.scaleFactor, obj.scaleFactor, obj.scaleFactor], GC);   
        }
    },
    {
        name: "mushroom4",
        material: materials["mushroom"],
        lighting: defaultLighting,
        shader: 'texture',
        meshFile: 'objects/mushroom/mushroom.obj',
        textureFile: 'objects/mushroom/mushroom.jpg',
        useFog: true,
        disabled: false,
        scaleFactor: 0.01,
        position: [-3.9, 0, -6.2],
        doTransforms: (obj, time) => {
            mvTranslate(obj.position, GC);
            mvRotate(280, [1, 0, 0], GC);
            mvScale([obj.scaleFactor, obj.scaleFactor, obj.scaleFactor], GC);   
        }
    },
    {
        name: "mushroom5",
        material: materials["mushroom"],
        lighting: defaultLighting,
        shader: 'texture',
        meshFile: 'objects/mushroom/mushroom.obj',
        textureFile: 'objects/mushroom/mushroom.jpg',
        useFog: true,
        disabled: false,
        scaleFactor: 0.008,
        position: [-2.1, 0, -6.4],
        doTransforms: (obj, time) => {
            mvTranslate(obj.position, GC);
            mvRotate(280, [1, 0, 0], GC);
            mvScale([obj.scaleFactor, obj.scaleFactor, obj.scaleFactor], GC);   
        }
    },
    {
        name: "mushroom6",
        material: materials["mushroom"],
        lighting: defaultLighting,
        shader: 'texture',
        meshFile: 'objects/mushroom/mushroom.obj',
        textureFile: 'objects/mushroom/mushroom.jpg',
        useFog: true,
        disabled: false,
        scaleFactor: 0.014,
        position: [-4, 0, -5],
        doTransforms: (obj, time) => {
            mvTranslate(obj.position, GC);
            mvRotate(280, [1, 0, 0], GC);
            mvScale([obj.scaleFactor, obj.scaleFactor, obj.scaleFactor], GC);   
        }
    },
    {
        name: "gem",
        material: materials["gem"],
        lighting: defaultLighting,
        shader: 'texture',
        meshFile: 'objects/gem/Gem.obj',
        textureFile: 'objects/gem/Clear.png',
        useFog: false,
        disabled: true,
        scaleFactor: 0.01,
        grabbed: false,
        grabbingDist: 3,
        doTransforms: (obj, time) => {
            const dist = $V(camera.position).distanceFrom($V(obj.position));
            if (dist < obj.grabbingDist && !obj.petted) {
                drawInfoBox("Press space to grab gem", obj.name);
            }
            else {
                drawInfoBox(null, obj.name);
            }

            mvTranslate(obj.position, GC);
            mvScale([obj.scaleFactor, obj.scaleFactor, obj.scaleFactor], GC);   
        },
        reset(obj) {
            obj.disabled = true;
        }
    }
];