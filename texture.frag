#ifdef GL_OES_standard_derivatives
     #extension GL_OES_standard_derivatives : enable
#endif

precision mediump float;

varying highp vec2 vTextureCoord;
varying vec3 mvNormal;
varying vec3 mvVertex;
varying vec3 mvPos;

uniform vec3 uLightSource;
uniform vec4 uAmbientColor;
uniform vec4 uDiffuseColor;
uniform vec4 uSpecularColor;
uniform float uShininess;
uniform float uKa;
uniform float uKd;
uniform float uKs;
uniform float uFogDensity;
uniform vec3 uFogColor;
uniform vec3 uEye;

uniform sampler2D uSampler;


void main(void){
    vec4 textureColor = texture2D(uSampler, vTextureCoord);

    vec3 lightVector = normalize(uLightSource - mvVertex);
    vec4 diffuse = textureColor * dot(abs(mvNormal), lightVector);
 
    vec3 viewVec = -lightVector;
    vec3 reflection = normalize(reflect(viewVec, mvNormal));
    float RdotV = max(0.0, dot(lightVector, reflection));
    vec4 spec = uSpecularColor * pow(RdotV, uShininess);

    float dist = distance(abs(uEye), mvPos);
    float fogFactor = clamp(exp2(-uFogDensity * dist), 0.0, 1.0);
    vec4 preFogColor = spec * uKs + diffuse * uKd + uAmbientColor * uKa;
    vec3 color = mix(uFogColor, vec3(preFogColor), fogFactor);
    gl_FragColor = vec4(color, preFogColor.a);
}