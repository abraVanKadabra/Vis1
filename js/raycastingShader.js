class RaycastingShader extends Shader{
    constructor(frontTexture, backTexture, volumeTexture){
        super("rayCast_vert_mip", "rayCast_frag_mip");

        this.setUniform("frontTexture", frontTexture);
        this.setUniform("backTexture", backTexture);
        this.setUniform("volumeTexture", volumeTexture);
    }
}