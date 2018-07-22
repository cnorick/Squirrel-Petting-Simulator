#ifdef GL_OES_standard_derivatives
        #extension GL_OES_standard_derivatives : enable
#endif

precision mediump float;

varying vec3 modelViewVertex;
varying vec3 modelViewNormal;

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
    vec3 lightVector = normalize(uLightSource - modelViewVertex);
    vec4 diffuse = uDiffuseColor * dot(abs(modelViewNormal), lightVector);
 
    vec3 viewVec = -lightVector;
    vec3 reflection = normalize(reflect(viewVec, modelViewNormal));
    float RdotV = max(0.0, dot(lightVector, reflection));
    vec4 spec = uSpecularColor * pow(RdotV, uShininess);

    float dist = distance(abs(uEye), modelViewVertex);
    float fogFactor = clamp(exp2(-uFogDensity * dist), 0.0, 1.0);

    vec4 preFogColor = spec * uKs + diffuse * uKd + uAmbientColor * uKa;

    //For silhouette.
    if(abs(normalize(modelViewNormal).z) < 0.1)
        preFogColor = vec4(0.0, 0.0, 0.0, 1.0);

    vec3 color = mix(uFogColor, vec3(preFogColor), fogFactor);
    gl_FragColor = vec4(color, preFogColor.a);
}