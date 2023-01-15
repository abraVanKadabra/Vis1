class RaycastingShader extends Shader{
    constructor(fragmentShaderProgram, frontTexture, backTexture, volumeTexture, isoValue, color, lightPosition){
        super("rayCast_vert", fragmentShaderProgram);

        this.setUniform("frontTexture", frontTexture);
        this.setUniform("backTexture", backTexture);
        this.setUniform("volumeTexture", volumeTexture);
        this.setUniform("iso", isoValue);

        this.setUniform("lightPos", lightPosition);
        this.setUniform("lightColor", new THREE.Vector3(1, 1, 1));
        this.setUniform("diffuseColor", color);
        this.setUniform("specularColor", new THREE.Vector3(0.5, 0.5, 0.5));
        this.setUniform("spec", 0.25);
    }
}