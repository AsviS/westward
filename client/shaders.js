var FoWPipeline = new Phaser.Class({

    Extends: Phaser.Renderer.WebGL.Pipelines.TextureTintPipeline,

    initialize:
        function FoWPipeline(game,nbr) {
            Phaser.Renderer.WebGL.Pipelines.TextureTintPipeline.call(this, {
                game: game,
                renderer: game.renderer,
                fragShader:
                `precision mediump float;
                varying vec2 outTexCoord;
                uniform sampler2D uMainSampler;
                uniform float rects[`+nbr+`];
                
                vec3 makeRect(vec2 st,vec4 coords, vec3 col){
                    vec2 blur = vec2(0.05);
                    // top-left
                    vec2 ps = vec2(coords.x,coords.y) - blur;
                    vec2 bl = smoothstep(ps,ps+blur,st);
                    float pct = bl.x * bl.y;
                    // bottom-right
                    ps = vec2(coords.z,coords.w);
                    vec2 tr = 1.0-smoothstep(ps,ps+blur,st);
                    pct *= tr.x * tr.y;
                    vec3 newcol = vec3(pct)*col; 
                    return newcol;
                }
                vec3 mr(vec2 st,vec4 coords, vec3 col){
                    return vec3(st.x);
                }
                void main(){
                    vec2 st = outTexCoord;
                    
                    vec3 color = vec3(0.0);
                    const int nbr = `+nbr+`;
                    for(int i = 0; i < nbr; i+=4){
                       vec4 r = vec4(rects[i],rects[i+1],rects[i+2],rects[i+3]);
                       color += makeRect(st,r,vec3(1.0)); 
                    }
                    
                    vec4 fcolor = texture2D(uMainSampler, outTexCoord);
                    
                    //gl_FragColor = fcolor*vec4(color,1.0);
                    gl_FragColor = min(fcolor,fcolor*vec4(color,1.0)); // avoids overlapping rects to create bright stripes
                }`
            });
        }

});

var HighlightPipeline = new Phaser.Class({

    Extends: Phaser.Renderer.WebGL.Pipelines.TextureTintPipeline,

    initialize:

    function HighlightPipeline (game)
    {
        Phaser.Renderer.WebGL.Pipelines.TextureTintPipeline.call(this, {
            game: game,
            renderer: game.renderer,
            fragShader: `
            precision mediump float;
            uniform sampler2D uMainSampler;
            varying vec2 outTexCoord;
            uniform vec2 uTextureSize;
            uniform vec4 uFrameCut;
            uniform float uRadius;
            vec2 px_size = 1.0/uTextureSize;
            float alphaThreshold = 0.9;
            void main(void) {
                vec4 color = texture2D(uMainSampler, outTexCoord);
                if(color.a > alphaThreshold){
                    gl_FragColor = color;
                    return;
                }
                
                int u_color = 0x111111;
                float r = float(u_color / 256 / 256);
                float g = float(u_color / 256 - int(r * 256.0));
                float b = float(u_color - int(r * 256.0 * 256.0) - int(g * 256.0));
                
                for(float x = -1.0; x <= 1.0; x++){
                    for(float y = -1.0; y <= 1.0; y++){
                        if(x == 0.0 && y == 0.0) continue;
                        vec2 neighbor = vec2(outTexCoord.x + x*px_size.x*uRadius, outTexCoord.y + y*px_size.y*uRadius);
                        if(neighbor.y <= uFrameCut.y/uTextureSize.y) continue;
                        if(texture2D(uMainSampler, neighbor).a > alphaThreshold){
                            gl_FragColor = vec4(r, g, b, 1.0);
                            return;
                        }
                    }
                }
                gl_FragColor = color;            
            }
            `
        });
    } 
});

var HollowPipeline = new Phaser.Class({

    Extends: Phaser.Renderer.WebGL.Pipelines.TextureTintPipeline,

    initialize:

    function HollowPipeline (game)
    {
        Phaser.Renderer.WebGL.Pipelines.TextureTintPipeline.call(this, {
            game: game,
            renderer: game.renderer,
            fragShader: `
            precision mediump float;
            uniform sampler2D uMainSampler;
            varying vec2 outTexCoord;
            void main(void) {
                vec4 color = texture2D(uMainSampler, outTexCoord);
                vec4 colorU = texture2D(uMainSampler, vec2(outTexCoord.x, outTexCoord.y - 0.01));
                vec4 colorD = texture2D(uMainSampler, vec2(outTexCoord.x, outTexCoord.y + 0.01));
                vec4 colorL = texture2D(uMainSampler, vec2(outTexCoord.x + 0.01, outTexCoord.y));
                vec4 colorR = texture2D(uMainSampler, vec2(outTexCoord.x - 0.01, outTexCoord.y));
                
                gl_FragColor = color;
                
                if (color.a == 0.0 && (colorU.a != 0.0 || colorD.a != 0.0 || colorL.a != 0.0 || colorR.a != 0.0)  ) {
                    gl_FragColor = vec4(1.0, 1.0, 1.0, .2);
                }
                if (color.a != 0.0) gl_FragColor = vec4(.0, .0, .0, .0);
            }`
        });
    } 

});
