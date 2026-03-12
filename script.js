/* ── RAIN SCENE── */
(function(){
  var s=document.createElement('script');
  s.src='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  s.onload=initScene;
  document.head.appendChild(s);
})();

function initScene(){
  var container=document.getElementById('hero-3d');
  var W=function(){return container.offsetWidth;};
  var H=function(){return container.offsetHeight;};

  var renderer=new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setSize(W(),H());
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.0;
  container.appendChild(renderer.domElement);

  var scene=new THREE.Scene();
  scene.background=new THREE.Color(0x050505);

  /* Camera */
  var camera=new THREE.PerspectiveCamera(50,W()/H(),0.1,100);


  /* Floor */
  var floor=new THREE.Mesh(
    new THREE.PlaneGeometry(1000,1000),
    new THREE.MeshStandardMaterial({color:0x050505,roughness:1})
  );
  floor.rotation.x=-Math.PI/2;
  floor.receiveShadow=true;
  scene.add(floor);

  /* Collision box */
  var collisionBox=new THREE.Mesh(
    new THREE.BoxGeometry(30,1,15),
    new THREE.MeshStandardMaterial({color:0x333333})
  );
  collisionBox.position.y=12;
  collisionBox.scale.x=3.5;
  collisionBox.scale.z=3.33;
  collisionBox.castShadow=true;
  scene.add(collisionBox);

  /* ── BLACK CAT ── */
  function makeCat(){
    var g=new THREE.Group();
    var bm=new THREE.MeshStandardMaterial({color:0x080808,roughness:1,metalness:0});
    var em=new THREE.MeshStandardMaterial({color:0xff0000,emissive:0xff0000,emissiveIntensity:20,roughness:0});

    /* body */
    var body=new THREE.Mesh(new THREE.SphereGeometry(2.0,32,24),bm);
    body.scale.set(1.5,1.0,1.0); body.castShadow=true; g.add(body);
    /* neck */
    var neck=new THREE.Mesh(new THREE.CylinderGeometry(0.75,1.0,1.1,16),bm);
    neck.position.set(2.2,0.9,0); neck.rotation.z=-0.35; neck.castShadow=true; g.add(neck);
    /* head */
    var head=new THREE.Mesh(new THREE.SphereGeometry(1.35,32,24),bm);
    head.position.set(3.1,1.6,0); head.castShadow=true; g.add(head);
    /* ears */
    [-1,1].forEach(function(s){
      var ear=new THREE.Mesh(new THREE.ConeGeometry(0.42,0.9,4),bm);
      ear.position.set(3.5,2.75,s*0.68); ear.rotation.z=s*0.3; ear.castShadow=true; g.add(ear);
    });
    /* snout */
    var snout=new THREE.Mesh(new THREE.SphereGeometry(0.42,16,12),bm);
    snout.scale.set(1,0.65,0.75); snout.position.set(4.3,1.35,0); g.add(snout);
    /* eyes — glowing red */
    [-0.52,0.52].forEach(function(s){
      var eyeMat=new THREE.MeshBasicMaterial({color:0xff0000});
      var eye=new THREE.Mesh(new THREE.SphereGeometry(0.28,16,16),eyeMat);
      eye.position.set(4.15,1.75,s); g.add(eye);
      var el=new THREE.PointLight(0xff0000,5,12);
      el.position.copy(eye.position); g.add(el);
    });
    /* tail */
    var tail=new THREE.Mesh(new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-2.4,-0.8,0),
        new THREE.Vector3(-3.8,0.5,0),
        new THREE.Vector3(-4.2,2.4,0),
        new THREE.Vector3(-3.0,4.0,0)
      ]),24,0.26,8),bm);
    tail.castShadow=true; g.add(tail);
    /* legs */
    [[-1.1,-1.8,-0.7],[-1.1,-1.8,0.7],[0.9,-1.8,-0.7],[0.9,-1.8,0.7]].forEach(function(p){
      var leg=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.22,1.6,10),bm);
      leg.position.set(p[0],p[1],p[2]); leg.castShadow=true; g.add(leg);
    });
    return g;
  }

  var cat=makeCat();
  cat.scale.setScalar(1);
  cat.rotation.y=Math.PI;
  cat.position.y=2.5;
  scene.add(cat);

  /* ── RAIN ── */
  var ACTIVE=25000;
  var dropPos=new Float32Array(ACTIVE*3);
  var dropVel=new Float32Array(ACTIVE);

  function initDrop(i,fromTop){
    dropPos[i*3]  =(Math.random()-0.5)*100;
    dropPos[i*3+1]=fromTop?25+Math.random()*25:15+Math.random()*10;
    dropPos[i*3+2]=(Math.random()-0.5)*100;
    dropVel[i]=-(0.2+Math.random()*0.04);
  }
  for(var i=0;i<ACTIVE;i++) initDrop(i,true);

  var rainGeo=new THREE.BufferGeometry();
  var rainArr=new Float32Array(ACTIVE*3);
  rainGeo.setAttribute('position',new THREE.BufferAttribute(rainArr,3));
  scene.add(new THREE.Points(rainGeo,
    new THREE.PointsMaterial({color:0x8899bb,size:0.01,sizeAttenuation:true,
      transparent:true,opacity:0.35,depthWrite:false})));

  /* Ripple rings */
  var RIPP=400; var ripples=[]; var rIdx=0;
  var ringBaseGeo=new THREE.RingGeometry(0.05,0.8,24);
  ringBaseGeo.rotateX(-Math.PI/2);
  for(var ri=0;ri<RIPP;ri++){
    var m=new THREE.MeshBasicMaterial({color:0x8899bb,transparent:true,opacity:0,
      side:THREE.DoubleSide,depthWrite:false});
    var r=new THREE.Mesh(ringBaseGeo.clone(),m);
    r.position.set(9999,0,9999);
    r.userData={life:0,active:false};
    scene.add(r); ripples.push(r);
  }

  function spawnRipple(x,y,z){
    var r=ripples[rIdx++%RIPP];
    r.position.set(x,y+0.05,z);
    r.scale.set(0.1,0.1,0.1);
    r.material.opacity=0.6;
    r.userData={life:1.0,active:true};
  }

  /* Bounding box for cat collision */
  var catBB=new THREE.Box3().setFromObject(cat);

  window.addEventListener('resize',function(){
    renderer.setSize(W(),H());
    camera.aspect=W()/H();
    camera.updateProjectionMatrix();
  },{passive:true});

  var last=0;
  function animate(ms){
    requestAnimationFrame(animate);
    var dt=Math.min((ms-last)/1000,0.05); last=ms;
    var t=ms/1000;

    catBB.setFromObject(cat);

    /* Camera moves slowly left and right */
    camera.position.set(
      -40,
      10,
      Math.sin(t*0.15)*15
    );
    camera.lookAt(0,6,0);

    /* Rain */
    for(var i=0;i<ACTIVE;i++){
      dropPos[i*3+1]+=dropVel[i];
      var px=dropPos[i*3],py=dropPos[i*3+1],pz=dropPos[i*3+2];
      var hitFloor=py<0.05;
      var hitCat=py>catBB.min.y&&py<catBB.max.y+0.5
               &&px>catBB.min.x&&px<catBB.max.x
               &&pz>catBB.min.z&&pz<catBB.max.z;
      /* Collision with solid box above cat */
      var cbTop=collisionBox.position.y+0.5;
      var cbBot=collisionBox.position.y-0.5;
      var cbL=collisionBox.position.x-collisionBox.scale.x*15;
      var cbR=collisionBox.position.x+collisionBox.scale.x*15;
      var cbF=collisionBox.position.z+collisionBox.scale.z*7.5;
      var cbB=collisionBox.position.z-collisionBox.scale.z*7.5;
      var hitBox=py>cbBot&&py<cbTop&&px>cbL&&px<cbR&&pz>cbB&&pz<cbF;
      if(hitFloor||hitCat||hitBox){
        if(Math.random()>0.4) spawnRipple(px,hitFloor?0:py,pz);
        initDrop(i,false);
      }
      rainArr[i*3]=dropPos[i*3];
      rainArr[i*3+1]=dropPos[i*3+1];
      rainArr[i*3+2]=dropPos[i*3+2];
    }
    rainGeo.attributes.position.needsUpdate=true;

    /* Ripples */
    ripples.forEach(function(r){
      if(!r.userData.active) return;
      r.userData.life-=dt*0.9;
      if(r.userData.life<=0){r.userData.active=false;r.position.set(9999,0,9999);return;}
      var s=0.1+(1-r.userData.life)*4.5;
      r.scale.set(s,s,s);
      r.material.opacity=r.userData.life*0.4;
    });

    renderer.render(scene,camera);
  }
  requestAnimationFrame(animate);
}
