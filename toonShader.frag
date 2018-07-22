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
uniform vec3 uEye;
uniform float uFogDensity;
uniform vec3 uFogColor;

uniform sampler2D uSampler;

void main(void){
    // Get a lighting direction vector from the light to the vertex.
    vec3 lightVector = normalize(uLightSource - modelViewVertex);
 
    // Calculate the dot product of the light vector and vertex normal. If the normal and light vector are
    // pointing in the same direction then it will get max illumination.
    float diffuse = max(dot(abs(modelViewNormal), lightVector), 0.1);
 
    // Calculate Specular.
    vec3 viewVec = -lightVector;
    vec3 reflection = normalize(reflect(viewVec, modelViewNormal));
    float RdotV = max(0.0, dot(lightVector, reflection));
    float spec = pow(RdotV, uShininess);

    float intensity = spec * uKs + diffuse * uKd;

    float dist = distance(abs(uEye), modelViewVertex);
    float fogFactor = clamp(exp2(-uFogDensity * dist), 0.0, 1.0);
    
    vec4 preFogColor;
    if(intensity > 0.9)
        preFogColor = uSpecularColor;
    else if (intensity > 0.6)
        preFogColor = uDiffuseColor;
    else 
        preFogColor = uAmbientColor;

    vec3 color = mix(uFogColor, vec3(preFogColor), fogFactor);
    gl_FragColor = vec4(color, preFogColor.a);
}