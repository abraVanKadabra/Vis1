class RaycastingShader extends Shader{
    constructor(fragmentShaderProgram, frontTexture, backTexture, volumeTexture, isoValue){
        super("rayCast_vert", fragmentShaderProgram);

        this.setUniform("frontTexture", frontTexture);
        this.setUniform("backTexture", backTexture);
        this.setUniform("volumeTexture", volumeTexture);
        this.setUniform("iso", isoValue);
    }
}