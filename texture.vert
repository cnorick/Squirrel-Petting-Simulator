attribute vec3 vPos; //vertex position
attribute vec2 aTextureCoord;
attribute vec3 vNormal;

varying highp vec2 vTextureCoord;
varying vec3 mvNormal;
varying vec3 mvVertex;
varying vec3 mvPos;

uniform mat4 uMVMatrix;//modelviewmatrix
uniform mat4 uPMatrix;//projectionmatrix

// Calculate the normals per vertex so they can be interpolated across fragments.
void main(void) {
    gl_Position = uPMatrix * uMVMatrix * vec4(vPos, 1.0);
    vTextureCoord = aTextureCoord;
    mvVertex = vec3(uMVMatrix * vec4(vPos, 1.0));
    mvNormal = normalize(vec3(uMVMatrix * vec4(vNormal, 0.0)));
    mvPos = vec3(uMVMatrix * vec4(vPos, 1.0));
}