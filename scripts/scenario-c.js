// Coaxial wire
var ScenarioC = {
  innerCurrent: 0.5,
  outerCurrent: 0.5,

  wireLength3d: 300,
  wireOuterRadius3d: 50,
  wireRadiusRatios: [0.8, 0.2],
  loopRadiusLim3d: 100,
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
  wireOuterRadius2d: null,
  wireInnerRadius2d: null,
  validLoop: false,

  wireOuterRadiusSet: 1,
  addedControls: [],

  reset: function () {
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

  init: function () {
    this.addWire();

    // adding Amperian loop path and tool
    var tool = new paper.Tool();

    tool.onMouseDown = function (event) {
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
        Math.pow(this.wireInnerRadius2d, 2)
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

    tool.onMouseDrag = function (event) {
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

    tool.onMouseUp = function (event) {
      this.drawAmperianLoop();
    }.bind(this);

    this.tool = tool;

    this.drawWireCrossSection();

    var controller = datControls.add(this, "innerCurrent", 0.1, 5, 0.1);
    controller.name("Inner Wire Current");
    this.addedControls.push(controller);

    controller = datControls.add(this, "outerCurrent", 0.1, 5, 0.1);
    controller.name("Outer Wire Current");
    this.addedControls.push(controller);

    controller = datControls.add(this, "wireOuterRadiusSet", 0.1, 10, 0.1);
    controller.name("Outer Wire Radius");
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
    var wireOuterRadius2d =
      minDim2d / 2 * this.wireOuterRadius3d / this.loopRadiusLim3d;
    this.wireOuterRadius2d = wireOuterRadius2d;
    this.wireInnerRadius2d = wireOuterRadius2d * this.wireRadiusRatios[1];

    drawWire2d(centerx2d, centery2d, this.wireOuterRadius2d, false);
    var circle = new paper.Path.Circle(
      new paper.Point(centerx2d, centery2d),
      this.wireOuterRadius2d * this.wireRadiusRatios[0]
    );
    circle.strokeColor = "black";
    circle.fillColor = "white";

    var r = this.wireOuterRadius2d * (1 + this.wireRadiusRatios[0]) / 2;
    var starSize = this.wireOuterRadius2d * (1 - this.wireRadiusRatios[0]) / 4;
    for (var i = 0; i <= 8; i++) {
      var rad = 2 * Math.PI * i / 8;

      var star = new paper.Path.Star({
        center: [centerx2d + r * Math.cos(rad), centery2d + r * Math.sin(rad)],
        points: 4,
        radius1: 1,
        radius2: starSize,
        fillColor: "black"
      });
    }

    drawWire2d(centerx2d, centery2d, this.wireInnerRadius2d, false);
  },

  addWire: function () {
    var wireMaterial = new THREE.MeshPhongMaterial({
      color: 0xddddbb,
      specular: 0x111111,
      shininess: 30,
      flatShading: true,
      side: THREE.DoubleSide
    });

    var outerCircle = new THREE.Shape();
    outerCircle.moveTo(0, 0);
    outerCircle.absarc(0, 0, this.wireOuterRadius3d, 0, Math.PI * 2, false);
    var innerCircle = new THREE.Path();
    innerCircle.moveTo(0, 0);
    innerCircle.absarc(
      0,
      0,
      this.wireOuterRadius3d * this.wireRadiusRatios[0],
      0,
      Math.PI * 2,
      true
    );
    outerCircle.holes.push(innerCircle);

    var extrudeSettings = {
      curveSegments: 32,
      steps: 1,
      amount: this.wireLength3d,
      bevelEnabled: false,
      bevelThickness: 0,
      bevelSize: 0,
      bevelSegments: 1
    };

    var geometry = new THREE.ExtrudeGeometry(outerCircle, extrudeSettings);
    geometry.rotateY(Math.PI / 2);
    geometry.translate(-this.wireLength3d / 2, 0, 0);
    var wireOuter = new THREE.Mesh(geometry);

    var innerRadius = this.wireOuterRadius3d * this.wireRadiusRatios[1];
    geometry = new THREE.CylinderGeometry(
      innerRadius,
      innerRadius,
      this.wireLength3d,
      32
    );
    geometry.rotateZ(Math.PI / 2);

    var wireInner = new THREE.Mesh(geometry);

    var singleGeometry = new THREE.Geometry();

    wireInner.updateMatrix();
    singleGeometry.merge(wireInner.geometry, wireOuter.matrix);

    wireOuter.updateMatrix();
    singleGeometry.merge(wireOuter.geometry, wireOuter.matrix);

    var wire = new THREE.Mesh(singleGeometry, wireMaterial);
    scene.add(wire);
    this.wire = wire;
  },

  drawCurrent: function () {
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

      var radius = this.wireOuterRadius3d * (1 + this.wireRadiusRatios[0]) / 2;

      for (var j = 0; j <= 8; j++) {
        var rad = 2 * Math.PI * j / 8;
        var y = Math.cos(rad) * radius;
        var z = Math.sin(rad) * radius;
        var geometry = new THREE.CylinderGeometry(
          1,
          1,
          this.wireLength3d / numStrips / 2
        );
        var cylinder = new THREE.Mesh(geometry, material);
        cylinder.position.x = x;
        cylinder.position.y = y;
        cylinder.position.z = z;
        cylinder.rotation.z = Math.PI / 2;
        geometry = new THREE.ConeGeometry(2, 5, 8);
        var cone = new THREE.Mesh(geometry, material);
        cone.position.x = x - this.wireLength3d / numStrips / 4;
        cone.position.y = y;
        cone.position.z = z;
        cone.rotation.z = Math.PI / 2;
        scene.add(cylinder);
        scene.add(cone);
        this.currentLineObjs.push(cylinder);
        this.currentLineObjs.push(cone);
      }
    }
    this.currentShow = true;
  },

  removeCurrent: function () {
    for (var i = 0; i < this.currentLineObjs.length; i++) {
      scene.remove(this.currentLineObjs[i]);
    }
    this.currentLineObjs = [];
    this.currentShow = false;
    this.wire.material.opacity = 1.0;
    this.wire.material.transparent = false;
  },

  toggleCurrent: function () {
    if (this.currentShow) {
      this.removeCurrent();
    } else {
      this.drawCurrent();
    }
  },

  drawMagField: function () {
    var numFieldRings = 6;
    var numLineLvls = 2;
    var numLineArcs = 6;
    var maxLineRadius = this.loopRadiusLim3d;

    var material = new THREE.MeshLambertMaterial({ color: 0xaaaaff });
    var radiusIncrement = maxLineRadius / numLineLvls;

    for (var n = 0; n < numFieldRings; n++) {
      var x =
        -(this.wireLength3d / 2) +
        this.wireLength3d * n / numFieldRings +
        this.wireLength3d / numFieldRings / 2;
      for (var i = 0; i < numLineLvls; i++) {
        var radius =
          radiusIncrement / 2 + radiusIncrement * i + this.wireOuterRadius3d;
        for (var j = 0; j < numLineArcs; j++) {
          var rad = 2 * Math.PI * j / numLineArcs;
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
          torus.rotation.x = rad + Math.PI / numLineArcs;

          geometry = new THREE.ConeGeometry(2, 5, 8);
          var cone = new THREE.Mesh(geometry, material);
          cone.position.set(x, y, z);
          cone.rotation.x = rad - Math.PI / 2;
          scene.add(torus);
          scene.add(cone);
          this.magFieldLineObjs.push(torus);
          this.magFieldLineObjs.push(cone);
        }
      }
    }

    var radius =
      this.wireOuterRadius3d *
      (this.wireRadiusRatios[0] + this.wireRadiusRatios[1]) /
      2;
    for (var n = 0; n < numFieldRings; n++) {
      var x =
        -(this.wireLength3d / 2) +
        this.wireLength3d * n / numFieldRings +
        this.wireLength3d / numFieldRings / 2;

      for (var j = 0; j < numLineArcs; j++) {
        var rad = 2 * Math.PI * j / numLineArcs;
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

    this.magFieldShow = true;
  },

  removeMagField: function () {
    for (var i = 0; i < this.magFieldLineObjs.length; i++) {
      scene.remove(this.magFieldLineObjs[i]);
    }
    this.magFieldLineObjs = [];
    this.magFieldShow = false;
  },

  toggleMagField: function () {
    if (this.magFieldShow) {
      this.removeMagField();
    } else {
      this.drawMagField();
    }
  },

  drawAmperianLoop: function () {
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

  calcShow: function () {
    if (this.path == null) {
      $("#calcIModalBody").html("Please draw an Amperian loop");
      return;
    }
    var radii = [];
    radii.push(this.wireOuterRadius2d);
    radii.push(this.wireOuterRadius2d * this.wireRadiusRatios[0]);
    radii.push(this.wireOuterRadius2d * this.wireRadiusRatios[1]);

    if (!this.validLoop) {
      var centerx2d = paper.view.viewSize.width / 2;
      var centery2d = paper.view.viewSize.height / 2;
      var b =
        Math.pow(this.startPoint.x - centerx2d, 2) +
        Math.pow(this.startPoint.y - centery2d, 2);

      for (var i = 0; i < radii.length; i++) {
        var a = Math.pow(Math.abs(this.pathRadius) - radii[i], 2);
        var c = Math.pow(Math.abs(this.pathRadius) + radii[i], 2);
        if (b < c) {
          $("#calcIModalBody").html(
            "Please draw an Amperian loop which along each part has uniform magnetic field"
          );
          return;
        }
      }

      var img = ScenBCEmpty;
      var html = "Amperes Law Equation:\r\n$$\\oint {B d \\ell = \\mu_0 I }$$";
      html += '<img src="' + img + '" height="175">';
      html +=
        "$$\\oint {B d \\ell} = \\mu_0 I_{\\text{enclosed}} = \\mu_0 * 0 = 0$$";
      html += "$$B = 0$$";
      $("#calcIModalBody").html(html);
      MathJax.Hub.Queue(["Typeset", MathJax.Hub, $("#calcIModalBody").get(0)]);
      return;
    }

    var loopRadius = Math.abs(
      this.wireOuterRadiusSet / this.wireOuterRadius2d * this.pathRadius
    );

    var html = "Amperes Law Equation:\r\n$$\\oint {B d \\ell = \\mu_0 I }$$";
    if (this.pathRadius < radii[2]) {
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
      var a = this.wireOuterRadiusSet * this.wireRadiusRatios[1];
      var I = this.innerCurrent;
      var mu0 = 4 * Math.PI * 1e-7;
      html += "$$\\text{I = " + I + ", r = " + r + ", a = " + a + "}$$";
      html += "$$\\mu_0 = 4\\pi × 10^{−7}$$";
      html += "$$ B = " + mu0 * I * r / (2 * Math.PI * a * a) + "$$";
    } else if (this.pathRadius < radii[1]) {
      var img = ScenBCOutside;
      html += '<img src="' + img + '" height="300">';
      html +=
        "$$\\oint {B d \\ell} = B (2 \\pi r) = \\mu_0 I_{\\text{enclosed}}$$";
      html += "$$B = \\frac{\\mu_0 I}{2 \\pi r}$$";
      var r = loopRadius;
      var I = this.innerCurrent;
      var mu0 = 4 * Math.PI * 1e-7;
      html += "$$\\text{I = " + I + ", r = " + r + "}$$";
      html += "$$\\mu_0 = 4\\pi × 10^{−7}$$";
      html += "$$ B = " + mu0 * I / (2 * Math.PI * r) + "$$";
    } else if (this.pathRadius < radii[0]) {
      var img = ScenCRingInside;
      html += '<img src="' + img + '" height="300">';
      html +=
        "$$\\oint {B d \\ell} = B (2 \\pi r) = \\mu_0 I_{\\text{enclosed}}$$";
      html +=
        "$$I_{\\text{enclosed}} = I_{\\text{inner wire}} - I_{\\text{outer wire}}$$";
      html +=
        "$$I_{\\text{part of outer wire}} = I_{\\text{outer wire}}*\\frac{\\pi(r^2-a^2)}{\\pi(b^2-a^2)}$$";
      html += "$$ = I_{\\text{outer wire}}*\\frac{r^2-a^2}{b^2-a^2}$$";
      var a = this.wireOuterRadiusSet * this.wireRadiusRatios[0];
      var b = this.wireOuterRadiusSet;
      var r = loopRadius;
      var I =
        this.innerCurrent -
        this.outerCurrent * (r * r - a * a) / (b * b - a * a);
      var mu0 = 4 * Math.PI * 1e-7;
      html += "$$\\text{r = " + r + "},$$";
      html += "$$\\text{a = " + a + ", b = " + b + "},$$";
      html += "$$I_{\\text{outer wire}} = " + this.outerCurrent + ",$$";
      html += "$$I_{\\text{inner wire}} = " + this.innerCurrent + ",$$";
      html += "$$I_{\\text{enclosed}} = I = " + I + "$$";
      html += "$$\\mu_0 = 4\\pi × 10^{−7}$$";
      html += "$$B = \\frac{\\mu_0 I}{2 \\pi r}$$";
      html += "$$ B = " + mu0 * I / (2 * Math.PI * r) + "$$";
    } else {
      var img = ScenCRingOutside;
      html += '<img src="' + img + '" height="300">';
      html +=
        "$$\\oint {B d \\ell} = B (2 \\pi r) = \\mu_0 I_{\\text{enclosed}}$$";
      html +=
        "$$I_{\\text{enclosed}} = I_{\\text{inner wire}} - I_{\\text{outer wire}}$$";
      var r = loopRadius;
      var I = this.innerCurrent - this.outerCurrent;
      var mu0 = 4 * Math.PI * 1e-7;
      html += "$$I_{\\text{outer wire}} = " + this.outerCurrent + ",$$";
      html += "$$I_{\\text{inner wire}} = " + this.innerCurrent + ",$$";
      html += "$$\\text{I = " + I + ", r = " + r + "}$$";
      html += "$$\\mu_0 = 4\\pi × 10^{−7}$$";
      html += "$$B = \\frac{\\mu_0 I}{2 \\pi r}$$";
      html += "$$ B = " + mu0 * I / (2 * Math.PI * r) + "$$";
    }
    $("#calcIModalBody").html(html);
    MathJax.Hub.Queue(["Typeset", MathJax.Hub, $("#calcIModalBody").get(0)]);
  },

  measurementShow: function () {
    var I = this.current;
    var loopRadius = Math.abs(
      this.wireOuterRadiusSet / this.wireOuterRadius2d * this.pathRadius
    );
    if (this.path == null) {
      loopRadius = undefined;
    }
    var r = loopRadius;
    var c = this.wireOuterRadiusSet;
    var b = this.wireOuterRadiusSet * this.wireRadiusRatios[0];
    var a = this.wireOuterRadiusSet * this.wireRadiusRatios[1];
    var html = "";
    html += "$$\\text{current in the outer wire} = " + this.outerCurrent + "$$";
    html += "$$\\text{current in the inner wire} = " + this.innerCurrent + "$$";
    html += "$$\\text{radius of Amperian loop} = " + r + "$$";
    html += "$$\\text{inner wire radius} = " + a + "$$";
    html += "$$\\text{outer radius of outer wire} = " + c + "$$";
    html += "$$\\text{inner radius of outer wire} = " + b + "$$";
    html += "$$\\mu_0 = \\text{permeability} = 4\\pi × 10^{−7}$$";
    $("#measurementModalBody").html(html);
    MathJax.Hub.Queue([
      "Typeset",
      MathJax.Hub,
      $("#measurementModalBody").get(0)
    ]);
  }
};
