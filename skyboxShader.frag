#ifdef GL_OES_standard_derivatives
     #extension GL_OES_standard_derivatives : enable
#endif

precision mediump float;

varying vec3 vcoords;
varying vec3 mvPos;

uniform samplerCube skybox;
uniform float uFogDensity;
uniform vec3 uFogColor;
uniform vec3 uEye;

void main(void) {
    vec4 textureColor = textureCube(skybox, vcoords);

    float dist = distance(abs(uEye), mvPos);

    float fogFactor = clamp(exp2(-uFogDensity * dist), 0.0, 1.0);
    vec3 color = mix(uFogColor, vec3(textureColor), fogFactor);
    gl_FragColor = vec4(color, textureColor.a);
}