// Long wire
var ScenarioB = {
  current: 0.5,

  wireLength3d: 400,
  wireRadius3d: 5,
  loopRadiusLim3d: 50,
  wire: null,
  loop: null,
  magFieldLineObjs: [],
  magFieldShow: false,
  currentLineObjs: [],
  currentShow: false,

  tool: null,
  path: null,
  pathRadius: null,
  startPoint: null,
  endPoint: null,
  wireRadius2d: null,
  validLoop: false,

  wireRadiusSet: 1,
  addedControls: [],

  reset: function() {
    clearScene();

    this.wireRadius = null;
    this.magFieldLineObjs = [];
    this.magFieldShow = false;

    if (this.path != null) {
      this.path.remove();
    }
    if (this.tool != null) {
      this.tool.remove();
    }
    this.tool = null;
    this.path = null;

    clearDrawing();
    for (var i = 0; i < this.addedControls.length; i++) {
      datControls.remove(this.addedControls[i]);
    }

    this.addedControls = [];
  },

  init: function() {
    this.addWire();

    // adding Amperian loop path and tool
    var tool = new paper.Tool();

    tool.onMouseDown = function(event) {
      if (this.path != null) {
        this.path.remove();
      }
      this.startPoint = boundPoint(
        event.point,
        paper.view.viewSize.width,
        paper.view.viewSize.height
      );
      var centerx2d = paper.view.viewSize.width / 2;
      var centery2d = paper.view.viewSize.height / 2;
      if (
        Math.pow(this.startPoint.x - centerx2d, 2) +
          Math.pow(this.startPoint.y - centery2d, 2) <
        Math.pow(this.wireRadius2d, 2)
      ) {
        this.startPoint = new paper.Point(centerx2d, centery2d);
        this.validLoop = true;
      } else {
        this.validLoop = false;
      }
      this.pathRadius = 0;
      this.endPoint = this.startPoint;
      this.path = new paper.Path.Circle(this.startPoint, 1);
      this.path.strokeColor = "red";
      this.path.strokeWidth = 5;
    }.bind(this);

    tool.onMouseDrag = function(event) {
      this.path.remove();
      this.endPoint = event.point;
      this.pathRadius = Math.pow(
        Math.pow(this.endPoint.x - this.startPoint.x, 2) +
          Math.pow(this.endPoint.y - this.startPoint.y, 2),
        0.5
      );
      var minDim =
        Math.min(paper.view.viewSize.width, paper.view.viewSize.height) -
        this.path.strokeWidth * 2;
      if (this.pathRadius > minDim / 2) {
        this.pathRadius = minDim / 2;
      }
      this.path = new paper.Path.Circle(this.startPoint, this.pathRadius);
      this.path.strokeColor = "red";
      this.path.strokeWidth = 5;
    }.bind(this);

    tool.onMouseUp = function(event) {
      this.drawAmperianLoop();
    }.bind(this);

    this.tool = tool;

    this.drawWireCrossSection();

    var controller = datControls.add(this, "current", 0.1, 5, 0.1);
    controller.name("Current");
    this.addedControls.push(controller);

    controller = datControls.add(this, "wireRadiusSet", 0.1, 10, 0.1);
    controller.name("Wire Radius");
    this.addedControls.push(controller);

    controller = datControls.add(this, "toggleMagField");
    controller.name("Show Magnetic Field");
    this.addedControls.push(controller);

    controller = datControls.add(this, "toggleCurrent");
    controller.name("Show Current");
    this.addedControls.push(controller);
  },

  drawWireCrossSection() {
    this.wirePaths = [];

    var maxWidth2d = paper.view.viewSize.width;
    var maxHeight2d = paper.view.viewSize.height;
    var centerx2d = maxWidth2d / 2;
    var centery2d = maxHeight2d / 2;

    var minDim2d = Math.min(maxWidth2d, maxHeight2d);
    var wireRadius2d = minDim2d / 2 * this.wireRadius3d / this.loopRadiusLim3d;
    this.wireRadius2d = wireRadius2d;

    drawWire2d(centerx2d, centery2d, wireRadius2d, false);
  },

  addWire: function() {
    var wireMaterial = new THREE.MeshPhongMaterial({
      color: 0xddddbb,
      specular: 0x111111,
      shininess: 30,
      flatShading: true,
      side: THREE.DoubleSide
    });

    var geometry = new THREE.CylinderGeometry(
      this.wireRadius3d,
      this.wireRadius3d,
      this.wireLength3d,
      32
    );
    var wire = new THREE.Mesh(geometry, wireMaterial);
    wire.rotation.z = Math.PI / 2;
    scene.add(wire);
    this.wire = wire;
  },

  drawCurrent: function() {
    this.wire.material.opacity = 0.5;
    this.wire.material.transparent = true;

    var material = new THREE.MeshLambertMaterial({ color: 0xffff00 });
    var numStrips = 5;
    for (var i = 0; i < numStrips; i++) {
      var geometry = new THREE.CylinderGeometry(
        1,
        1,
        this.wireLength3d / numStrips / 2
      );
      var x =
        -(this.wireLength3d / 2) +
        this.wireLength3d * i / numStrips +
        this.wireLength3d / numStrips / 2;
      var cylinder = new THREE.Mesh(geometry, material);
      cylinder.position.x = x;
      cylinder.rotation.z = Math.PI / 2;
      geometry = new THREE.ConeGeometry(2, 5, 8);
      var cone = new THREE.Mesh(geometry, material);
      cone.position.x = x + this.wireLength3d / numStrips / 4;
      cone.rotation.z = -Math.PI / 2;
      scene.add(cylinder);
      scene.add(cone);
      this.currentLineObjs.push(cylinder);
      this.currentLineObjs.push(cone);
    }
    this.currentShow = true;
  },

  removeCurrent: function() {
    for (var i = 0; i < this.currentLineObjs.length; i++) {
      scene.remove(this.currentLineObjs[i]);
    }
    this.currentLineObjs = [];
    this.currentShow = false;
    this.wire.material.opacity = 1.0;
    this.wire.material.transparent = false;
  },

  toggleCurrent: function() {
    if (this.currentShow) {
      this.removeCurrent();
    } else {
      this.drawCurrent();
    }
  },

  drawMagField: function() {
    var numFieldRings = 6;
    var numLineLvls = 2;
    var numLineArcs = 6;
    var maxLineRadius = this.loopRadiusLim3d;

    var material = new THREE.MeshLambertMaterial({ color: 0xaaaaff });
    var radiusIncrement = maxLineRadius / numLineLvls;
    for (var n = 0; n < numFieldRings; n++) {
      for (var i = 0; i < numLineLvls; i++) {
        for (var j = 0; j < numLineArcs; j++) {
          var rad = 2 * Math.PI * j / numLineArcs;
          var radius =
            radiusIncrement / 2 + radiusIncrement * i + this.wireRadius3d;
          var x =
            -(this.wireLength3d / 2) +
            this.wireLength3d * n / numFieldRings +
            this.wireLength3d / numFieldRings / 2;
          var y = Math.cos(rad) * radius;
          var z = Math.sin(rad) * radius;
          var geometry = new THREE.TorusGeometry(
            radius,
            1,
            8,
            8,
            Math.PI / numLineArcs
          );
          var torus = new THREE.Mesh(geometry, material);
          torus.position.x = x;
          torus.rotation.y = Math.PI / 2;
          torus.rotation.x = rad;

          geometry = new THREE.ConeGeometry(2, 5, 8);
          var cone = new THREE.Mesh(geometry, material);
          cone.position.set(x, y, z);
          cone.rotation.x = rad + Math.PI / 2;
          scene.add(torus);
          scene.add(cone);
          this.magFieldLineObjs.push(torus);
          this.magFieldLineObjs.push(cone);
        }
      }
    }

    this.magFieldShow = true;
  },

  removeMagField: function() {
    for (var i = 0; i < this.magFieldLineObjs.length; i++) {
      scene.remove(this.magFieldLineObjs[i]);
    }
    this.magFieldLineObjs = [];
    this.magFieldShow = false;
  },

  toggleMagField: function() {
    if (this.magFieldShow) {
      this.removeMagField();
    } else {
      this.drawMagField();
    }
  },

  drawAmperianLoop: function() {
    if (this.loop != null) {
      scene.remove(this.loop);
    }

    const maxWidth2d = paper.view.viewSize.width;
    const maxHeight2d = paper.view.viewSize.height;
    const minDim2d = Math.min(maxWidth2d, maxHeight2d);
    const centerx2d = maxWidth2d / 2;
    const centery2d = maxHeight2d / 2;

    const r1 = this.loopRadiusLim3d * this.pathRadius / (minDim2d / 2);
    const r2 = 1;
    const divisions = [1000, 16];
    const z =
      -((this.startPoint.x - centerx2d) / (minDim2d / 2)) *
      this.loopRadiusLim3d;
    const y =
      -((this.startPoint.y - centery2d) / (minDim2d / 2)) *
      this.loopRadiusLim3d;

    var geometry = new THREE.TorusGeometry(r1, r2, 16, 100);

    var loop;
    var loopMaterial = new THREE.MeshPhongMaterial({
      color: 0xff0000,
      specular: 0x333333,
      shininess: 30,
      flatShading: true,
      side: THREE.DoubleSide
    });
    loop = new THREE.Mesh(geometry, loopMaterial);
    loop.rotation.y = Math.PI / 2;
    loop.position.z = z;
    loop.position.y = y;
    scene.add(loop);
    this.loop = loop;
  },

  calcShow: function() {
    if (this.path == null) {
      $("#calcIModalBody").html("Please draw an Amperian loop");
      return;
    }
    if (!this.validLoop) {
      var centerx2d = paper.view.viewSize.width / 2;
      var centery2d = paper.view.viewSize.height / 2;
      var a = Math.pow(Math.abs(this.pathRadius) - this.wireRadius2d, 2);
      var b =
        Math.pow(this.startPoint.x - centerx2d, 2) +
        Math.pow(this.startPoint.y - centery2d, 2);
      var c = Math.pow(Math.abs(this.pathRadius) + this.wireRadius2d, 2);
      if (b < c) {
        $("#calcIModalBody").html(
          "Please draw an Amperian loop which along each part has uniform magnetic field"
        );
        return;
      } else {
        var img = ScenBCEmpty;
        var html =
          "Amperes Law Equation:\r\n$$\\oint {B d \\ell = \\mu_0 I }$$";
        html += '<img src="' + img + '" height="175">';
        html +=
          "$$\\oint {B d \\ell} = \\mu_0 I_{\\text{enclosed}} = \\mu_0 * 0 = 0$$";
        html += "$$B = 0$$";
        $("#calcIModalBody").html(html);
        MathJax.Hub.Queue([
          "Typeset",
          MathJax.Hub,
          $("#calcIModalBody").get(0)
        ]);
        return;
      }
    }

    var loopRadius = Math.abs(
      this.wireRadiusSet / this.wireRadius2d * this.pathRadius
    );

    var html = "Amperes Law Equation:\r\n$$\\oint {B d \\ell = \\mu_0 I }$$";
    if (Math.abs(this.pathRadius) > this.wireRadius2d) {
      var img = ScenBCOutside;
      html += '<img src="' + img + '" height="300">';
      html +=
        "$$\\oint {B d \\ell} = B (2 \\pi r) = \\mu_0 I_{\\text{enclosed}}$$";
      html += "$$B = \\frac{\\mu_0 I}{2 \\pi r}$$";
      var r = loopRadius;
      var I = this.current;
      var mu0 = 4 * Math.PI * 1e-7;
      html += "$$\\text{I = " + I + ", r = " + r + "}$$";
      html += "$$\\mu_0 = 4\\pi × 10^{−7}$$";
      html += "$$ B = " + mu0 * I / (2 * Math.PI * r) + "$$";
    } else {
      var img = ScenBCInside;
      html += '<img src="' + img + '" width="300">';
      html +=
        "$$\\oint {B d \\ell} = B (2 \\pi r) = \\mu_0 I_{\\text{enclosed}}$$";
      html += "$$B = \\frac{\\mu_0 I_{\\text{enclosed}}}{2 \\pi r}$$";
      html += "The current enclosed is proportional to the area in the loop";
      html +=
        "$$\\frac{I_{\\text{enclosed}}}{I} = \\frac{\\pi r^2}{\\pi a^2}$$";
      html += "$$I_{\\text{enclosed}} = I \\frac{r^2}{a^2}$$";
      html += "$$B = \\frac{\\mu_0 I r^2}{2 \\pi r a^2}$$";
      html += "$$B = \\frac{\\mu_0 I r}{2 \\pi a^2}$$";
      var r = loopRadius;
      var a = this.wireRadiusSet;
      var I = this.current;
      var mu0 = 4 * Math.PI * 1e-7;
      html += "$$\\text{I = " + I + ", r = " + r + ", a = " + a + "}$$";
      html += "$$\\mu_0 = 4\\pi × 10^{−7}$$";
      html += "$$ B = " + mu0 * I * r / (2 * Math.PI * a * a) + "$$";
    }
    $("#calcIModalBody").html(html);
    MathJax.Hub.Queue(["Typeset", MathJax.Hub, $("#calcIModalBody").get(0)]);
  },

  measurementShow: function() {
    var I = this.current;
    var loopRadius = Math.abs(
      this.wireRadiusSet / this.wireRadius2d * this.pathRadius
    );
    if (this.path == null) {
      loopRadius = undefined;
    }
    var r = loopRadius;
    var a = this.wireRadiusSet;
    var html = "";
    html += "$$\\text{current in the wire} = " + I + "$$";
    html += "$$\\text{radius of Amperian loop}= " + r + "$$";
    html += "$$\\text{wire radius} = " + a + "$$";
    html += "$$\\mu_0 = \\text{permeability} = 4\\pi × 10^{−7}$$";
    $("#measurementModalBody").html(html);
    MathJax.Hub.Queue([
      "Typeset",
      MathJax.Hub,
      $("#measurementModalBody").get(0)
    ]);
  }
};
