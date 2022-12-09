class VolumeCubeShader extends Shader{

    constructor(side){
        super("volumeCube_vert", "volumeCube_frag");

        if (side) {
            this.material.side = THREE.FrontSide;
        } else {
            this.material.side = THREE.BackSide;
        }
    }
}