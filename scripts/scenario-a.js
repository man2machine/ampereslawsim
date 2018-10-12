function inBounds(num, a, b) {
  return (a <= num && num <= b) || (b <= num && num <= a);
}

// Solenoid
var ScenarioA = {
  current: 0.5,

  wireSize3d: [50, 100], // [x/z , y]
  loopYLim3d: 120,
  numLoopsSolenoid: 20,
  wireRadius3d: null,
  wire: null,
  loop: null,
  magFieldLineObjs: [],
  magFieldShow: false,
  currentLineObjs: [],
  currentShow: false,

  tool: null,
  path: null,
  startPoint: new paper.Point(0, 0),
  endPoint: new paper.Point(0, 0),
  crossWireLocs: [],
  dotWireLocs: [],
  wireRadius2d: null,

  addedControls: [],

  turnsPerMeter: 1,

  reset: function() {
    clearScene();

    this.wireRadius3d = null;
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
      this.endPoint = this.startPoint;
      this.path = new paper.Path.Rectangle(
        this.startPoint,
        new paper.Size(1, 1)
      );
      this.path.strokeColor = "red";
      this.path.strokeWidth = 5;
    }.bind(this);

    tool.onMouseDrag = function(event) {
      this.path.remove();
      this.endPoint = boundPoint(
        event.point,
        paper.view.viewSize.width,
        paper.view.viewSize.height
      );
      var pathSize = new paper.Size(
        this.endPoint.x - this.startPoint.x,
        this.endPoint.y - this.startPoint.y
      );
      this.path = new paper.Path.Rectangle(this.startPoint, pathSize);
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

    controller = datControls.add(this, "turnsPerMeter", 0.1, 10, 0.1);
    controller.name("Turns per Meter");
    this.addedControls.push(controller);

    controller = datControls.add(this, "numLoopsSolenoid", 8, 40, 1);
    controller.name("Number of Turns");
    controller.onFinishChange(
      function(value) {
        this.reset();
        this.init();
      }.bind(this)
    );
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

    var xdelta2d = this.wireSize3d[0] / this.loopYLim3d * maxHeight2d / 2;
    var ydelta2d = this.wireSize3d[1] / this.loopYLim3d * maxHeight2d / 2;

    var x1 = centerx2d - xdelta2d;
    var x2 = centerx2d + xdelta2d;
    var y1 = centery2d - ydelta2d;
    var y2 = centery2d + ydelta2d;
    var r = (y2 - y1) / (this.numLoopsSolenoid * 2);
    this.wireRadius2d = r;
    var ycurr = y1;
    for (var i = 0; i < this.numLoopsSolenoid; i++) {
      drawWire2d(x1, ycurr + r, r, false);
      this.dotWireLocs.push([x1, ycurr + r]);
      drawWire2d(x2, ycurr, r, true);
      this.crossWireLocs.push([x2, ycurr]);
      ycurr += r * 2;
    }
  },

  addWire: function() {
    var wireMaterial = new THREE.MeshPhongMaterial({
      color: 0xddddbb,
      specular: 0x111111,
      shininess: 30,
      flatShading: true,
      side: THREE.DoubleSide
    });

    var geometry = new THREE.Geometry();

    const r1 = this.wireSize3d[0];
    const h = this.wireSize3d[1] * 2;
    const r2 = h / (this.numLoopsSolenoid - 0.5) / 2 - 0.2;
    this.wireRadius3d = r2;
    const ystart = -this.wireSize3d[1];
    const divisions = [2000, 20];

    for (var i = 0; i <= divisions[0]; i++) {
      var t =
        2 * Math.PI * (0.125 + this.numLoopsSolenoid * (i / divisions[0]));
      var x = r1 * Math.cos(t);
      var z = r1 * Math.sin(t);
      var y = h * (i / divisions[0]);
      for (var j = 0; j <= divisions[1]; j++) {
        // https://math.stackexchange.com/questions/73237/parametric-equation-of-a-circle-in-3d-space
        var rad = 2 * Math.PI * j / divisions[1];
        var a = [0, 1, 0];
        var b = [Math.cos(t), 0, Math.sin(t)];
        var xp = x + r2 * Math.cos(rad) * a[0] + r2 * Math.sin(rad) * b[0];
        var yp = y + r2 * Math.cos(rad) * a[1] + r2 * Math.sin(rad) * b[1];
        var zp = z + r2 * Math.cos(rad) * a[2] + r2 * Math.sin(rad) * b[2];
        geometry.vertices.push(new THREE.Vector3(xp, yp, zp));
      }
    }

    divisions[0] += 1;
    divisions[1] += 1;
    var totalPoints = divisions[0] * divisions[1];
    for (var i = 0; i < geometry.vertices.length; i++) {
      if (i < totalPoints - divisions[1]) {
        geometry.faces.push(
          new THREE.Face3(
            (i + divisions[1]) % totalPoints,
            i % totalPoints,
            (i + 1) % totalPoints
          )
        );
        geometry.faces.push(
          new THREE.Face3(
            (i + 1) % totalPoints,
            (i + 1 + divisions[1]) % totalPoints,
            (i + divisions[1]) % totalPoints
          )
        );
      }
    }

    var triangles = THREE.ShapeUtils.triangulateShape(
      geometry.vertices.slice(0, divisions[1]),
      []
    );

    for (var i = 0; i < triangles.length; i++) {
      geometry.faces.push(
        new THREE.Face3(triangles[i][0], triangles[i][1], triangles[i][2])
      );
      var shift = totalPoints - divisions[1];
      geometry.faces.push(
        new THREE.Face3(
          shift + triangles[i][0],
          shift + triangles[i][1],
          shift + triangles[i][2]
        )
      );
    }

    var wire = new THREE.Mesh(geometry, wireMaterial);
    wire.position.set(0, ystart, 0);
    scene.add(wire);
    this.wire = wire;
  },

  drawCurrent: function() {
    this.wire.material.opacity = 0.5;
    this.wire.material.transparent = true;

    var material = new THREE.MeshLambertMaterial({ color: 0xffff00 });

    const r1 = this.wireSize3d[0];
    const r2 = 1;
    const h = this.wireSize3d[1] * 2;
    const numCurrentStrips = Math.floor(this.numLoopsSolenoid * 2.5);
    const ystart = -this.wireSize3d[1];

    for (var i = 0; i < numCurrentStrips; i++) {
      var iter = i + 0.5;
      var iterCone = i + 0.49;
      var t =
        2 *
        Math.PI *
        (0.125 + this.numLoopsSolenoid * (iter / numCurrentStrips));
      var tCone =
        2 *
        Math.PI *
        (0.125 + this.numLoopsSolenoid * (iterCone / numCurrentStrips));
      var arc =
        2 * Math.PI * (0.125 + this.numLoopsSolenoid) / numCurrentStrips / 4;
      var geometry = new THREE.TorusGeometry(r1, r2, 8, 8, arc);
      var torus = new THREE.Mesh(geometry, material);

      torus.rotation.x = Math.PI / 2;
      torus.rotation.z = t % (2 * Math.PI);
      var angle = -Math.asin(h / numCurrentStrips / 4 / (r1 * arc));
      torus.position.set(0, h * (iter / numCurrentStrips) + ystart, 0);
      geometry = new THREE.ConeGeometry(2, 6, 8);
      var cone = new THREE.Mesh(geometry, material);
      cone.position.set(
        r1 * Math.cos(tCone),
        h * (iterCone / numCurrentStrips) + ystart,
        r1 * Math.sin(tCone)
      );
      cone.rotation.x = Math.PI / 2;
      cone.rotation.z = (tCone - Math.PI) % (2 * Math.PI);
      scene.add(torus);
      scene.add(cone);
      this.currentLineObjs.push(torus);
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
    const numLineLvls = 4;
    const r = this.wireSize3d[0] - this.wireRadius3d * 1.2;
    var lineOrigins = [];

    var lineGapIncrement = 2 * r / numLineLvls;
    for (var i = 0; i < numLineLvls; i++) {
      for (var j = 0; j < numLineLvls; j++) {
        var x = -r + lineGapIncrement / 2 + i * lineGapIncrement;
        var z = -r + lineGapIncrement / 2 + j * lineGapIncrement;
        if (Math.pow(x * x + z * z, 0.5) < r) {
          lineOrigins.push([x, z]);
        }
      }
    }

    var material = new THREE.MeshLambertMaterial({ color: 0xaaaaff });
    for (var i = 0; i < lineOrigins.length; i++) {
      var geometry = new THREE.CylinderGeometry(1, 1, 2 * this.loopYLim3d, 32);
      var cylinder = new THREE.Mesh(geometry, material);
      cylinder.position.set(lineOrigins[i][0], 0, lineOrigins[i][1]);
      geometry = new THREE.ConeGeometry(2, 5, 16);
      var cone = new THREE.Mesh(geometry, material);
      cone.position.set(
        lineOrigins[i][0],
        this.loopYLim3d + 0.2,
        lineOrigins[i][1]
      );
      scene.add(cone);
      scene.add(cylinder);
      this.magFieldLineObjs.push(cone);
      this.magFieldLineObjs.push(cylinder);
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
    const drawRatio = maxWidth2d / maxHeight2d;

    const xcenter = 0;
    const r = 1;
    const divisions = [1, 16];

    var bound1 = [xcenter - drawRatio * this.loopYLim3d, this.loopYLim3d];
    var bound2 = [xcenter + drawRatio * this.loopYLim3d, -this.loopYLim3d];
    var delta = [bound2[0] - bound1[0], bound2[1] - bound1[1]];

    var p1 = [
      bound1[0] + this.startPoint.x / maxWidth2d * delta[0],
      bound1[1] + this.startPoint.y / maxHeight2d * delta[1]
    ];
    var p3 = [
      bound1[0] + this.endPoint.x / maxWidth2d * delta[0],
      bound1[1] + this.endPoint.y / maxHeight2d * delta[1]
    ];

    delta = [p3[0] - p1[0], p3[1] - p1[1]];
    var mult = 2.5;
    if (Math.abs(delta[0]) < r * mult && delta[0] >= 0) {
      p3[0] = p1[0] + r * mult;
    } else if (Math.abs(delta[0]) < r * mult && delta[1] <= 0) {
      p3[0] = p1[0] - r * mult;
    }
    if (Math.abs(delta[1]) < r * mult && delta[0] >= 0) {
      p3[1] = p1[1] + r * mult;
    } else if (Math.abs(delta[1]) < r * mult && delta[1] <= 0) {
      p3[1] = p1[1] - r * mult;
    }

    var hdiag = [(p3[0] - p1[0]) / 2, (p3[1] - p1[1]) / 2];
    var center = [(p3[0] + p1[0]) / 2, (p3[1] + p1[1]) / 2];
    var p2 = [center[0] - hdiag[0], center[1] + hdiag[1]];
    var p4 = [center[0] + hdiag[0], center[1] - hdiag[1]];
    var points = [p1, p2, p3, p4];
    var geometry = new THREE.Geometry();

    for (var side = 0; side < 4; side++) {
      var start = points[side].slice();
      var end = points[(side + 1) % 4].slice();
      var delta = [end[0] - start[0], end[1] - start[1]];
      var dir = delta.map(function(n) {
        if (n != 0) {
          return n / Math.max(...delta.map(Math.abs));
        } else {
          return 0;
        }
      });
      start[0] += dir[0] * r;
      start[1] += dir[1] * r;
      end[0] -= dir[0] * r;
      end[1] -= dir[1] * r;
      delta = [end[0] - start[0], end[1] - start[1]];
      for (var i = 0; i <= divisions[0]; i++) {
        var frac = i / divisions[0];
        var lvl = [start[0] + delta[0] * frac, start[1] + delta[1] * frac];
        for (var j = 0; j <= divisions[1]; j++) {
          var rad = 2 * Math.PI * j / divisions[1];
          var x = lvl[0];
          var y = lvl[1];
          var z = 0;
          if (Math.abs(delta[0]) < 1e-5) {
            x += r * Math.sin(rad);
            z += r * Math.cos(rad);
          } else {
            y += r * Math.sin(rad);
            z += r * Math.cos(rad);
          }
          geometry.vertices.push(new THREE.Vector3(x, y, z));
        }
      }
    }
    geometry.vertices.push(new THREE.Vector3(0, 0, 100));
    divisions[0] += 1;
    divisions[1] += 1;
    var totalPoints = divisions[0] * divisions[1] * 4;
    var sidePoints = divisions[0] * divisions[1];
    for (var curr = 0; curr < totalPoints; curr++) {
      var side = Math.trunc(curr / sidePoints);
      var iter = curr % sidePoints;
      if (side % 2 == 1 && iter > sidePoints - divisions[1] - 1) {
        var base = curr - curr % divisions[1];
        var reversed =
          (divisions[1] - curr % divisions[1]) % divisions[1] + base;
        var reversedNext =
          (divisions[1] - (curr + 1) % divisions[1]) % divisions[1] + base;
        geometry.faces.push(
          new THREE.Face3(
            (curr + divisions[1]) % totalPoints,
            reversed % totalPoints,
            reversedNext % totalPoints
          )
        );
        if (iter < sidePoints - 1) {
          geometry.faces.push(
            new THREE.Face3(
              reversedNext % totalPoints,
              (curr + 1 + divisions[1]) % totalPoints,
              (curr + divisions[1]) % totalPoints
            )
          );
        }
      } else {
        geometry.faces.push(
          new THREE.Face3(
            (curr + divisions[1]) % totalPoints,
            curr % totalPoints,
            (curr + 1) % totalPoints
          )
        );
        geometry.faces.push(
          new THREE.Face3(
            (curr + 1) % totalPoints,
            (curr + 1 + divisions[1]) % totalPoints,
            (curr + divisions[1]) % totalPoints
          )
        );
      }
    }
    geometry.computeBoundingSphere();

    var loop;
    var loopMaterial = new THREE.MeshPhongMaterial({
      color: 0xff0000,
      specular: 0x333333,
      shininess: 30,
      flatShading: true,
      side: THREE.DoubleSide
    });
    loop = new THREE.Mesh(geometry, loopMaterial);
    loop.position.set(0, 0, 0);
    scene.add(loop);
    this.loop = loop;
  },

  calcShow: function() {
    if (this.path == null) {
      $("#calcIModalBody").html("Please draw an Amperian loop");
      return;
    }
    var dotWireInside = false;
    var dotWireInsideLeft = false;
    var dotWireInsideRight = false;
    for (var i = 0; i < this.dotWireLocs.length; i++) {
      var x = this.dotWireLocs[i][0];
      var y = this.dotWireLocs[i][1];
      if (
        inBounds(x - this.wireRadius2d, this.startPoint.x, this.endPoint.x) &&
        inBounds(y - this.wireRadius2d, this.startPoint.y, this.endPoint.y)
      ) {
        dotWireInsideLeft = true;
      }
      if (
        inBounds(x + this.wireRadius2d, this.startPoint.x, this.endPoint.x) &&
        inBounds(y + this.wireRadius2d, this.startPoint.y, this.endPoint.y)
      ) {
        dotWireInsideRight = true;
      }
      dotWireInside = dotWireInsideLeft && dotWireInsideRight;
      if (dotWireInside) {
        break;
      }
    }

    var crossWireInside = false;
    var crossWireInsideLeft = false;
    var crossWireInsideRight = false;
    for (var i = 0; i < this.crossWireLocs.length; i++) {
      var x = this.crossWireLocs[i][0];
      var y = this.crossWireLocs[i][1];
      if (
        inBounds(x - this.wireRadius2d, this.startPoint.x, this.endPoint.x) &&
        inBounds(y - this.wireRadius2d, this.startPoint.y, this.endPoint.y)
      ) {
        crossWireInsideLeft = true;
      }
      if (
        inBounds(x + this.wireRadius2d, this.startPoint.x, this.endPoint.x) &&
        inBounds(y + this.wireRadius2d, this.startPoint.y, this.endPoint.y)
      ) {
        crossWireInsideRight = true;
      }
      crossWireInside = crossWireInsideLeft && crossWireInsideRight;
      if (crossWireInside) {
        break;
      }
    }
    if (
      dotWireInsideLeft ^ dotWireInsideRight ||
      crossWireInsideLeft ^ crossWireInsideRight
    ) {
      $("#calcIModalBody").html(
        "Please draw an Amperian loop which along each part has uniform magnetic field"
      );
      return;
    }
    if (!dotWireInside && !crossWireInside) {
      var img = ScenAEmpty;
      var html = "Amperes Law Equation:\r\n$$\\oint {B \\cdot d \\ell = \\mu_0 I }$$";
      html += '<img src="' + img + '" height="175">';
      html +=
        "$$\\oint {B \\cdot d \\ell} = \\mu_0 I_{\\text{enclosed}} = \\mu_0 * 0 = 0$$";
      html += "$$B = 0$$";
      $("#calcIModalBody").html(html);
      MathJax.Hub.Queue(["Typeset", MathJax.Hub, $("#calcIModalBody").get(0)]);
      return;
    }

    if (dotWireInside && crossWireInside) {
      var img = ScenABoth;
      var html = "Amperes Law Equation:\r\n$$\\oint {B \\cdot d \\ell = \\mu_0 I }$$";
      html += '<img src="' + img + '" height="175">';
      html +=
        "$$\\oint {B \\cdot d \\ell} = \\mu_0 I_{\\text{net enclosed}} = \\mu_0 * 0 = 0$$";
      html += "$$B = 0$$";
      $("#calcIModalBody").html(html);
      MathJax.Hub.Queue(["Typeset", MathJax.Hub, $("#calcIModalBody").get(0)]);
      return;
    }
    if (!(dotWireInside ^ crossWireInside)) {
      $("#calcIModalBody").html("Please draw an Amperian loop");
      return;
    }
    var img;
    if (dotWireInside) {
      img = ScenADot;
    } else {
      img = ScenACross;
    }
    var html = "Amperes Law Equation:\r\n$$\\oint {B \\cdot d \\ell = \\mu_0 I }$$";
    html += '<img src="' + img + '" height="300">';
    html +=
      "$$\\oint {B \\cdot d \\ell} = \\sum B_{||}\\ell = ({B_{||}\\ell})_{ab} + ({B_{||}\\ell})_{bc} + ({B_{||}\\ell})_{cd} + ({B_{||}\\ell})_{da}$$";
    html += "$$= B L +0+0+0 = \\mu_0 I_{\\text{enclosed}}$$";
    html += "$$I_{\\text{enclosed}} = N I$$";
    html += "$$\\text{L = length of amperian loop, N = number of turns}$$";
    html += "$$B L = \\mu_0 N I$$";
    html += "$$\\frac{B L}{L} = \\frac{\\mu_0 N I}{L}$$";
    html += "$$B = \\mu_0 \\frac{N}{L} I$$";
    html += "$$\\text{n = Number of turns per meter = N\\L}$$";
    html += "$$B = \\mu_0 n I$$";
    var n = this.turnsPerMeter;
    var I = this.current;
    var mu0 = 4 * Math.PI * 1e-7;
    html += "$$\\text{I = " + I + ", n = " + n + "}$$";
    html += "$$\\mu_0 = 4\\pi × 10^{−7}$$";
    html += "$$ B = " + mu0 * n * I + "$$";
    $("#calcIModalBody").html(html);
    MathJax.Hub.Queue(["Typeset", MathJax.Hub, $("#calcIModalBody").get(0)]);
  },

  measurementShow: function() {
    var n = this.turnsPerMeter;
    var I = this.current;
    var html = "";
    html += "$$\\text{current in the wire} = " + I + "$$";
    html += "$$\\text{number of turns\\loops per meter} = " + n + "$$";
    html += "$$\\mu_0 = \\text{permeability} = 4\\pi × 10^{−7}$$";
    $("#measurementModalBody").html(html);
    MathJax.Hub.Queue([
      "Typeset",
      MathJax.Hub,
      $("#measurementModalBody").get(0)
    ]);
  }
};
