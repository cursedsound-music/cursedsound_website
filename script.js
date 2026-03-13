// ── NAV HAMBURGER + SMOOTH SCROLL ──
document.addEventListener('DOMContentLoaded',function(){
  var navToggle=document.querySelector('.nav-toggle');
  var navLinks=document.querySelector('.nav-links');
  if(navToggle && navLinks){
    navToggle.addEventListener('click',function(){
      navLinks.classList.toggle('open');
    });
    // Close menu on link click + smooth scroll
    navLinks.querySelectorAll('a').forEach(function(link){
      link.addEventListener('click',function(e){
        navLinks.classList.remove('open');
        var href=link.getAttribute('href');
        if(href&&href.startsWith('#')){
          e.preventDefault();
          var target=document.querySelector(href);
          if(target){
            target.scrollIntoView({behavior:'smooth'});
          }
        }
      });
    });
  }
  // Logo smooth scroll
  var logo=document.querySelector('.logo');
  if(logo){
    logo.addEventListener('click',function(e){
      var href=logo.getAttribute('href');
      if(href&&href.startsWith('#')){
        e.preventDefault();
        var target=document.querySelector(href);
        if(target){
          target.scrollIntoView({behavior:'smooth'});
        }
      }
    });
  }
});

/* ── INTERACTIVE FRACTAL SPHERE ── */
(function(){
  var container=document.getElementById('hero-3d');
  if(!container) return;

  var canvas=document.createElement('canvas');
  canvas.style.display='block';
  container.appendChild(canvas);

  var gl=canvas.getContext('webgl')||canvas.getContext('experimental-webgl');
  if(!gl){console.warn('WebGL not supported');return;}

  var mouse={x:0.5,y:0.5,targetX:0.5,targetY:0.5};

  /* Shaders */
  var vertSrc=`
    attribute vec2 a_position;
    void main(){gl_Position=vec4(a_position,0.0,1.0);}
  `;

  var fragSrc=`
    precision highp float;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec2 u_mouse;

    #define PI 3.14159265
    
    // Rotation matrix
    mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,s,-s,c);}
    
    // Noise
    float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
    float noise(vec3 p){
      vec3 i=floor(p),f=fract(p);
      f=f*f*(3.0-2.0*f);
      return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
                     mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                 mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                     mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
    }

    vec3 np;
    float tt,morph;
    
    // The orb
    float map(vec3 p){
      // Base sphere
      float sphere=length(p)-2.2;
      
      // Store original for effects
      np=p;
      
      // Breathing animation
      float breath=0.5+0.5*sin(tt*0.8);
      
      // Recursive fold/mirror for organic detail (evvvvil style)
      for(int i=0;i<5;i++){
        // Abs symmetry creates crystalline patterns
        np=abs(np)-mix(vec3(0.8,0.6,0.4),vec3(0.5,0.9,0.7),morph)*0.5;
        // Rotate to create organic flow
        np.xy*=rot(0.785*float(i)*0.5+tt*0.1);
        np.yz*=rot(0.523*float(i)+tt*0.05);
        // Pull apart for depth
        np-=0.15*sin(p.y*2.0+tt);
      }
      
      // Inner recursive structure
      float inner=length(np)-0.3-0.1*breath;
      
      // Combine: sphere shell with inner detail punched through
      float d=max(sphere,-inner*0.5);
      
      // Surface displacement
      float disp=noise(p*3.0+tt*0.2)*0.15*(0.5+0.5*morph);
      d+=disp;
      
      // Organic veins on surface
      float veins=abs(sin(np.x*8.0)*sin(np.y*8.0)*sin(np.z*8.0));
      d-=veins*0.02*breath;
      
      return d*0.7;
    }

    vec3 calcNormal(vec3 p){
      vec2 e=vec2(0.001,0.0);
      return normalize(vec3(
        map(p+e.xyy)-map(p-e.xyy),
        map(p+e.yxy)-map(p-e.yxy),
        map(p+e.yyx)-map(p-e.yyx)
      ));
    }

    vec2 trace(vec3 ro,vec3 rd){
      float t=0.1;
      for(int i=0;i<100;i++){
        float d=map(ro+rd*t);
        if(abs(d)<0.0005||t>30.0)break;
        t+=d;
      }
      return vec2(t,t<30.0?1.0:0.0);
    }

    void main(){
      vec2 uv=(gl_FragCoord.xy-0.5*u_resolution.xy)/u_resolution.y;
      
      tt=mod(u_time,100.0);
      morph=0.5+0.5*sin(tt*0.5);
      
      // Camera with mouse orbit + auto rotation
      float autoRot=tt*0.15;
      float camX=(u_mouse.x-0.5)*PI+autoRot;
      float camY=(u_mouse.y-0.5)*0.8;
      
      // Adjust camera distance based on aspect ratio
      float aspect=u_resolution.x/u_resolution.y;
      float camDist=6.0+max(0.0,(1.0-aspect)*4.0)+sin(tt*0.3)*0.5;
      
      vec3 ro=vec3(sin(camX)*cos(camY),sin(camY)+0.5,cos(camX)*cos(camY))*camDist;
      vec3 ta=vec3(0.0);
      vec3 cw=normalize(ta-ro);
      vec3 cu=normalize(cross(cw,vec3(0,1,0)));
      vec3 cv=cross(cu,cw);
      vec3 rd=normalize(uv.x*cu+uv.y*cv+1.8*cw);
      
      // Background
      vec3 bgCol=vec3(0.0);
      vec3 col=bgCol;
      
      vec2 hit=trace(ro,rd);
      
      if(hit.y>0.0){
        vec3 pos=ro+rd*hit.x;
        vec3 nor=calcNormal(pos);
        vec3 ld=normalize(vec3(0.5,0.8,-0.3));
        
        // Base albedo
        vec3 albedo=vec3(0.12,0.0,0.0);
        
        // Add detail coloring
        nor*=1.0+0.4*ceil(sin(np*3.0));
        nor=normalize(nor);
        
        // Diffuse
        float dif=max(0.0,dot(nor,ld));
        dif=pow(dif,1.5);
        
        // Ambient occlusion
        float ao=1.0-smoothstep(0.0,1.5,hit.x)*0.5;
        
        // Specular with glossy variation
        float gloss=8.0+20.0*noise(np*0.5);
        float spec=pow(max(0.0,dot(reflect(-ld,nor),-rd)),gloss);
        
        // Fresnel rim
        float fresnel=pow(max(0.0,1.0+dot(nor,rd)),5.0);
        
        // Colors
        col=albedo*(0.05+0.95*dif*ao);
        col+=vec3(0.35,0.0,0.0)*spec*0.25;
        col=mix(col,vec3(0.18,0.0,0.0),fresnel*0.25);
        
        // Inner glow pulse
        float pulse=0.5+0.5*sin(tt*1.2);
        col+=vec3(0.08,0.0,0.0)*fresnel*pulse*0.15;
      }
      
      // Vignette
      vec2 vUv=gl_FragCoord.xy/u_resolution.xy;
      col*=1.0-0.2*length(vUv-0.5);
      
      // Tone mapping
      col=pow(col,vec3(0.45));
      
      gl_FragColor=vec4(col,1.0);
    }
  `;

  function createShader(type,src){
    var s=gl.createShader(type);
    gl.shaderSource(s,src);
    gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){
      console.error(gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  var vert=createShader(gl.VERTEX_SHADER,vertSrc);
  var frag=createShader(gl.FRAGMENT_SHADER,fragSrc);
  if(!vert||!frag)return;

  var prog=gl.createProgram();
  gl.attachShader(prog,vert);
  gl.attachShader(prog,frag);
  gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog,gl.LINK_STATUS)){
    console.error(gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  /* Fullscreen quad */
  var posLoc=gl.getAttribLocation(prog,'a_position');
  var buf=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc,2,gl.FLOAT,false,0,0);

  /* Uniforms */
  var uRes=gl.getUniformLocation(prog,'u_resolution');
  var uTime=gl.getUniformLocation(prog,'u_time');
  var uMouse=gl.getUniformLocation(prog,'u_mouse');

  function resize(){
    var dpr=Math.min(devicePixelRatio,2);
    var w=container.offsetWidth;
    var h=container.offsetHeight;
    canvas.width=w*dpr;
    canvas.height=h*dpr;
    canvas.style.width=w+'px';
    canvas.style.height=h+'px';
    gl.viewport(0,0,canvas.width,canvas.height);
  }
  resize();
  window.addEventListener('resize',resize,{passive:true});

  /* Mouse interaction */
  document.addEventListener('mousemove',function(e){
    var rect=container.getBoundingClientRect();
    var inBounds=e.clientX>=rect.left&&e.clientX<=rect.right&&
                 e.clientY>=rect.top&&e.clientY<=rect.bottom;
    if(inBounds){
      mouse.targetX=((e.clientX-rect.left)/rect.width);
      mouse.targetY=1.0-((e.clientY-rect.top)/rect.height);
    }else{
      mouse.targetX=0.5;
      mouse.targetY=0.5;
    }
  },{passive:true});

  /* Touch support */
  document.addEventListener('touchmove',function(e){
    if(e.touches.length>0){
      var rect=container.getBoundingClientRect();
      var touch=e.touches[0];
      var inBounds=touch.clientX>=rect.left&&touch.clientX<=rect.right&&
                   touch.clientY>=rect.top&&touch.clientY<=rect.bottom;
      if(inBounds){
        mouse.targetX=((touch.clientX-rect.left)/rect.width);
        mouse.targetY=1.0-((touch.clientY-rect.top)/rect.height);
      }
    }
  },{passive:true});

  document.addEventListener('touchend',function(){
    mouse.targetX=0.5;
    mouse.targetY=0.5;
  },{passive:true});

  /* Animation loop */
  var start=performance.now();
  var isVisible=true;
  
  var observer=new IntersectionObserver(function(entries){
    isVisible=entries[0].isIntersecting;
  },{threshold:0});
  observer.observe(container);
  
  function render(){
    requestAnimationFrame(render);
    if(!isVisible)return;
    
    // Smooth mouse interpolation
    mouse.x+=(mouse.targetX-mouse.x)*0.05;
    mouse.y+=(mouse.targetY-mouse.y)*0.05;
    
    var t=(performance.now()-start)/1000;
    gl.uniform2f(uRes,canvas.width,canvas.height);
    gl.uniform1f(uTime,t);
    gl.uniform2f(uMouse,mouse.x,mouse.y);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  }
  render();
})();
