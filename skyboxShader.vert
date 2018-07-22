attribute vec3 vPos; //vertex position

varying vec3 vcoords;
varying vec3 mvPos;

uniform mat4 uMVMatrix;//modelviewmatrix
uniform mat4 uPMatrix;//projectionmatrix
    
// Calculate the normals per vertex so they can be interpolated across fragments.
void main(void) {
    gl_Position = uPMatrix * uMVMatrix * vec4(vPos, 1.0);
    vcoords = vPos;
    mvPos = vec3(uMVMatrix * vec4(vPos, 1.0));
}