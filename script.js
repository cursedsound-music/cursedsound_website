// ── NAV HAMBURGER + SMOOTH SCROLL ──
document.addEventListener('DOMContentLoaded',function(){
  var navToggle=document.querySelector('.nav-toggle');
  var navLinks=document.querySelector('.nav-links');
  var isMenuOpen=false;

  function setMenuState(open){
    isMenuOpen=open;
    navLinks.classList.toggle('open',open);
    navToggle.setAttribute('aria-expanded',String(open));
    navToggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');
  }

  function smoothScrollToHash(hash){
    var target=document.querySelector(hash);
    if(!target) return;
    var reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({behavior:reduceMotion?'auto':'smooth'});
  }

  if(navToggle && navLinks){
    navToggle.addEventListener('click',function(){
      setMenuState(!isMenuOpen);
    });

    document.addEventListener('keydown',function(e){
      if(e.key==='Escape'&&isMenuOpen){
        setMenuState(false);
        navToggle.focus();
      }
    });

    document.addEventListener('click',function(e){
      if(!isMenuOpen) return;
      if(e.target===navToggle||navToggle.contains(e.target)||navLinks.contains(e.target)) return;
      setMenuState(false);
    });

    window.addEventListener('resize',function(){
      if(window.innerWidth>768&&isMenuOpen){
        setMenuState(false);
      }
    },{passive:true});

    // Close menu on link click + smooth scroll
    navLinks.querySelectorAll('a').forEach(function(link){
      link.addEventListener('click',function(e){
        setMenuState(false);
        var href=link.getAttribute('href');
        if(href&&href.startsWith('#')){
          e.preventDefault();
          smoothScrollToHash(href);
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
        smoothScrollToHash(href);
      }
    });
  }
});

// ── BOOKING FORM ──
document.addEventListener('DOMContentLoaded',function(){
  var form=document.getElementById('booking-form');
  if(!form) return;
  var status=form.querySelector('.f-status');
  var button=form.querySelector('.submit');
  var FALLBACK='Please email booking@cursedsound.com instead.';

  // date inputs have no placeholder: dim the empty dd.mm.yyyy like the other fields
  var dateInput=form.querySelector('input[type=date]');
  function syncDate(){ dateInput.classList.toggle('is-empty',!dateInput.value); }
  dateInput.addEventListener('input',syncDate);
  form.addEventListener('reset',function(){ setTimeout(syncDate,0); });
  syncDate();

  function setStatus(msg,ok){
    status.textContent=msg;
    status.className='f-status '+(ok?'ok':'bad');
  }

  // back from a no-JS form post
  if(/[?&]sent=1/.test(window.location.search)){
    setStatus('Thanks — your request was sent. You will hear back within 48 hours.',true);
  }

  form.addEventListener('submit',function(e){
    e.preventDefault();
    if(!form.reportValidity()) return;
    var data={};
    new FormData(form).forEach(function(v,k){ if(k!=='redirect') data[k]=String(v).trim(); });
    button.disabled=true;
    setStatus('Sending…',true);
    fetch(form.action,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(data)
    }).then(function(r){
      return r.json().catch(function(){ return {}; }).then(function(body){
        if(r.ok&&body.ok){
          form.reset();
          setStatus('Thanks — your request was sent. You will hear back within 48 hours.',true);
        }else if(r.status===429){
          setStatus('Too many requests from your connection. '+FALLBACK,false);
        }else{
          setStatus((body.error?'Could not send: '+body.error+'. ':'Could not send. ')+FALLBACK,false);
        }
      });
    }).catch(function(){
      setStatus('Could not reach the server. '+FALLBACK,false);
    }).then(function(){
      button.disabled=false;
    });
  });
});

/* ── INTERACTIVE MOLTEN ORB ── */
(function(){
  var container=document.getElementById('hero-3d');
  if(!container) return;

  var prefersReducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData=navigator.connection&&navigator.connection.saveData;
  var lowPowerDevice=navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=2;
  if(prefersReducedMotion||saveData||lowPowerDevice){
    return;
  }

  var canvas=document.createElement('canvas');
  canvas.style.display='block';
  container.appendChild(canvas);

  var gl=canvas.getContext('webgl',{antialias:false,alpha:false,powerPreference:'low-power'})||
         canvas.getContext('experimental-webgl');
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
    uniform vec2 u_center;   // orb centre in pixels
    uniform float u_scale;   // pixels per view unit (sets the orb size)
    uniform float u_time;
    uniform vec2 u_mouse;

    #define PI 3.14159265
    #define R 1.6            // shell radius
    #define BPM 128.0

    mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,s,-s,c);}

    float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
    float noise(vec3 p){
      vec3 i=floor(p),f=fract(p);
      f=f*f*(3.0-2.0*f);
      return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
                     mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                 mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                     mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
    }

    // fake studio environment for the glossy reflections: two soft light strips + red floor bounce
    vec3 env(vec3 r){
      float strip=smoothstep(0.86,0.97,r.y)+0.6*smoothstep(0.93,0.99,dot(r,normalize(vec3(-0.8,0.25,0.5))));
      vec3 c=vec3(1.0,0.92,0.9)*strip;
      c+=vec3(0.5,0.02,0.01)*smoothstep(0.0,-0.8,r.y);
      return c;
    }

    float tt,morph,kick;
    vec3 np;          // folded space of the last map() call
    float holeD;      // distance to the carved holes (for the molten rims)
    float mat;        // 0 = obsidian shell, 1 = molten core

    float map(vec3 p){
      // obsidian shell, carved by a kaleidoscopic fold
      float shell=length(p)-R-0.03*kick;
      np=p+0.06*sin(p.yzx*2.0+tt*0.7);
      vec3 off=mix(vec3(0.40,0.30,0.20),vec3(0.25,0.45,0.35),morph);
      for(int i=0;i<5;i++){
        np=abs(np)-off;
        np.xy*=rot(0.39*float(i)+tt*0.06);
        np.yz*=rot(0.52*float(i)-tt*0.045);
      }
      holeD=(length(np)-0.34)*0.6;
      float d=max(shell,-holeD);
      d=max(d,-(length(p)-R+0.3));              // hollow it out: a thin shell
      d+=noise(p*2.6+tt*0.12)*0.05;

      // molten heart, visible through the holes
      float core=length(p)-0.62-0.05*kick-0.04*noise(p*4.0+tt*0.6);
      mat=core<d?1.0:0.0;
      return min(d,core)*0.7;
    }

    // tetrahedral normal: 4 map() calls instead of 6
    vec3 calcNormal(vec3 p){
      const vec2 k=vec2(1.0,-1.0);
      const float e=0.0015;
      return normalize(k.xyy*map(p+k.xyy*e)+k.yyx*map(p+k.yyx*e)+
                       k.yxy*map(p+k.yxy*e)+k.xxx*map(p+k.xxx*e));
    }

    void main(){
      vec2 uv=(gl_FragCoord.xy-u_center)/u_scale;

      tt=mod(u_time,200.0);
      morph=0.5+0.5*sin(tt*0.35);
      kick=pow(1.0-fract(u_time*BPM/60.0),8.0);      // soft pulse on every beat

      // camera: slow auto orbit + mouse
      float camX=(u_mouse.x-0.5)*PI*0.9+tt*0.12;
      float camY=(u_mouse.y-0.5)*0.9+0.25;
      vec3 ro=vec3(sin(camX)*cos(camY),sin(camY),cos(camX)*cos(camY))*5.0;
      vec3 cw=normalize(-ro);
      vec3 cu=normalize(cross(cw,vec3(0,1,0)));
      vec3 cv=cross(cu,cw);
      vec3 rd=normalize(uv.x*cu+uv.y*cv+2.0*cw);

      // closest approach of the ray to the orb centre (for halo + early out)
      float tc=-dot(ro,rd);
      float b=length(ro+rd*tc);

      vec3 col=vec3(0.0);
      // red halo around the orb
      float halo=exp(-max(b-R,0.0)*4.5);
      col+=vec3(0.55,0.02,0.01)*halo*(0.05+0.05*kick);

      if(b<R+0.2){                                   // only march pixels that can hit
        float t=tc-sqrt(max((R+0.2)*(R+0.2)-b*b,0.0));
        float hit=0.0;
        float glow=0.0;
        float d=1.0;
        for(int i=0;i<96;i++){
          d=map(ro+rd*t);
          if(mat>0.5)glow+=0.006/(1.0+d*d*80.0);   // light leaking from the core
          if(d<0.0008*t){hit=1.0;break;}
          t+=d;
          if(t>tc+R+0.3)break;
        }
        if(hit<0.5&&d<0.02&&t<tc+R+0.3)hit=1.0;      // ran out of steps right at a surface
        col+=vec3(0.9,0.05,0.02)*glow*(0.8+0.6*kick);

        if(hit>0.5){
          vec3 pos=ro+rd*t;
          float m=mat;
          float rim=holeD;
          vec3 nor=calcNormal(pos);
          vec3 ld=normalize(vec3(-0.6,0.7,0.4));
          vec3 hal=normalize(ld-rd);
          float fres=pow(clamp(1.0+dot(nor,rd),0.0,1.0),4.0);

          if(m>0.5){
            // molten core: hot centre, darker crust
            float n=noise(pos*5.0+tt*0.8);
            col=mix(vec3(0.5,0.015,0.005),vec3(1.4,0.32,0.08),n*n)*(1.0+1.0*kick);
          }else{
            float dif=max(dot(nor,ld),0.0);
            float spec=pow(max(dot(nor,hal),0.0),120.0);
            float rl=length(pos);
            col=vec3(0.012,0.004,0.004)*(0.3+dif);        // obsidian
            col+=env(reflect(rd,nor))*(0.04+0.9*fres);     // glassy reflections
            col+=vec3(1.0,0.9,0.85)*spec*0.8;              // sharp gloss
            // inner walls lit by the core: faces turned towards the centre glow red
            float facing=max(dot(nor,-pos/rl),0.0);
            float depth=smoothstep(R,R-0.35,rl);
            col+=vec3(0.9,0.05,0.015)*facing*facing*depth*(0.35+0.9*kick);
            // molten seam where a hole meets the outer surface
            float seam=exp(-abs(rim)*160.0)*exp(-abs(rl-R)*40.0);
            col+=vec3(1.0,0.15,0.04)*seam*(0.8+1.4*kick);
          }
        }
      }

      // tone map + subtle film grain
      col=1.0-exp(-col*1.6);
      col=pow(max(col,0.0),vec3(0.4545));
      col+=(hash(vec3(gl_FragCoord.xy,floor(u_time*24.0)))-0.5)*0.025;
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
  var uCenter=gl.getUniformLocation(prog,'u_center');
  var uScale=gl.getUniformLocation(prog,'u_scale');
  var uTime=gl.getUniformLocation(prog,'u_time');
  var uMouse=gl.getUniformLocation(prog,'u_mouse');

  // render scale: capped pixel ratio, lowered automatically if frames are slow
  var quality=Math.min(window.devicePixelRatio||1,1.5);
  var layout={cx:0,cy:0,scale:1};

  function resize(){
    var w=container.offsetWidth;
    var h=container.offsetHeight;
    canvas.width=Math.round(w*quality);
    canvas.height=Math.round(h*quality);
    canvas.style.width=w+'px';
    canvas.style.height=h+'px';
    gl.viewport(0,0,canvas.width,canvas.height);

    // Orb placement (CSS px, origin bottom-left like gl_FragCoord).
    // Wide screens: beside the title on the right. Narrow/portrait: above the title.
    var radius,cx,cy;
    if(w/h>1.15&&w>760){
      radius=Math.min(h*0.25,w*0.17);
      cx=w*0.71;cy=h*0.62;
    }else{
      radius=Math.min(w*0.33,h*0.2);
      cx=w*0.5;cy=h*0.66;
    }
    // the shell projects to ~0.69 view units at this camera distance
    layout.cx=cx*quality;layout.cy=cy*quality;layout.scale=radius/0.69*quality;
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
  var last=0,slowFrames=0;

  var observer=new IntersectionObserver(function(entries){
    isVisible=entries[0].isIntersecting;
  },{threshold:0});
  observer.observe(container);

  function render(now){
    requestAnimationFrame(render);
    if(!isVisible||document.hidden){last=0;return;}

    // adaptive quality: drop resolution once if the device keeps missing ~40fps
    if(last&&now-last>25){
      if(++slowFrames>45&&quality>0.6){quality=Math.max(0.6,quality*0.7);slowFrames=0;resize();}
    }else if(slowFrames>0){slowFrames--;}
    last=now;

    // Smooth mouse interpolation
    mouse.x+=(mouse.targetX-mouse.x)*0.05;
    mouse.y+=(mouse.targetY-mouse.y)*0.05;

    var t=(performance.now()-start)/1000;
    gl.uniform2f(uRes,canvas.width,canvas.height);
    gl.uniform2f(uCenter,layout.cx,layout.cy);
    gl.uniform1f(uScale,layout.scale);
    gl.uniform1f(uTime,t);
    gl.uniform2f(uMouse,mouse.x,mouse.y);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  }
  requestAnimationFrame(render);
})();
