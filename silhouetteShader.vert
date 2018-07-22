attribute vec3 vPos; //vertex position
attribute vec3 vNormal; // vertex normals
// attribute vec2 aTextureCoord;

varying vec3 modelViewVertex;
varying vec3 modelViewNormal;
varying highp vec2 vTextureCoord;

uniform mat4 uMVMatrix;//modelviewmatrix
uniform mat4 uPMatrix;//projectionmatrix
    
// Calculate the normals per vertex so they can be interpolated across fragments.
void main(void) {
    gl_Position = uPMatrix * uMVMatrix * vec4(vPos, 1.0);

    modelViewVertex = vec3(uMVMatrix * vec4(vPos, 1.0));
    modelViewNormal = normalize(vec3(uMVMatrix * vec4(vNormal, 0.0)));
}