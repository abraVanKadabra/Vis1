class RaycastingShader extends Shader{
    constructor(frontTexture, backTexture, volumeTexture){
        super("rayCastMIP_vert", "rayCastMIP_frag");

        this.setUniform("frontTexture", frontTexture);
        this.setUniform("backTexture", backTexture);
        this.setUniform("volumeTexture", volumeTexture);
    }
}