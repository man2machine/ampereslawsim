var scene, camera, controls, stats, renderer;

var container = document.getElementById("three-container");

// add stats
// stats = new Stats();
// container.appendChild(stats.dom);

var stayObjs = [];

if (!Detector.webgl) Detector.addGetWebGLMessage();

init();
animate();

$(window).on("load", onWindowResize);

// Initialize
function init() {
  // setup camera
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.x = 100;
  camera.position.y = 100;
  camera.position.z = 350;

  // add controls
  controls = new THREE.OrbitControls(camera, container);

  // create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  // add lights;
  var light;
  var ambientLight = new THREE.AmbientLight(0x555555, 0.5);
  scene.add(ambientLight);
  stayObjs.push(ambientLight);
  var pointLight = new THREE.PointLight(0xffffff, 0.8);
  // pointLight.position.set(0,100,0);
  camera.add(pointLight);

  // add camera to scene
  scene.add(camera);
  stayObjs.push(camera);

  // add ground
  /*
  var geometry = new THREE.PlaneBufferGeometry(20000, 20000);
  var groundMaterial = new THREE.MeshPhongMaterial({ shininess: 0.1 });
  var ground = new THREE.Mesh(geometry, groundMaterial);
  ground.position.set(0, -250, 0);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  stayObjs.push(ground)*/

  scene.fog = new THREE.Fog(0xffffff, 1000, 10000);

  var axesHelper = new THREE.AxesHelper(350);
  scene.add(axesHelper);
  stayObjs.push(axesHelper);

  // adding renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  //renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // adding resize function
  window.addEventListener("resize", onWindowResize, false);
}

function clearScene() {
  for (var i = scene.children.length - 1; i >= 0; i--) {
    var rem = true;
    for (var j = 0; j < stayObjs.length; j++) {
      if (scene.children[i] == stayObjs[j]) {
        rem = false;
      }
    }
    if (rem) {
      scene.remove(scene.children[i]);
    }
  }
}

function onWindowResize() {
  renderer.setSize(10, 10);
  var width = $("#three-container").width();
  var height = $("#three-container").outerHeight();
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function animate() {
  requestAnimationFrame(animate);
  render();
  // stats.update();
}

function render() {
  var timer = Date.now() * 0.0001;
  renderer.render(scene, camera);
}
