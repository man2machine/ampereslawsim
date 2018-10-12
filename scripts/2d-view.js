var canvas = document.getElementById("paper-container");
window.onload = function() {
  /*
  var paperScope1 = new paper.PaperScope();
  paperScope1.install(canvas);
  */
  paper.setup(canvas);
};

var wireColor2d = "#ffffe9";

function drawWire2d(x, y, r, dir) {
  var circle = new paper.Path.Circle(new paper.Point(x, y), r);
  circle.strokeColor = "black";
  circle.fillColor = wireColor2d;

  var path;
  if (dir) {
    path = new paper.Path.Star({
      center: [x, y],
      points: 4,
      radius1: 1,
      radius2: r * 0.75,
      fillColor: "black"
    });
  } else {
    path = new paper.Path.Circle(new paper.Point(x, y), r * 0.2);
    path.fillColor = "black";
  }
  return [circle, path];
}

function clamp(num, min, max) {
  return num <= min ? min : num >= max ? max : num;
}

function boundPoint(point, width, height) {
  var x = clamp(point.x, 0, width);
  var y = clamp(point.y, 0, height);
  return new paper.Point(x, y);
}

function clearDrawing() {
  paper.project.activeLayer.removeChildren();
  paper.view.draw();
}

function onWindowResizePaper() {
  var width = (canvas.width = $("#paper-container").width());
  var height = (canvas.height = $("#paper-container").height());
  paper.view.viewSize = new paper.Size(width, height);
  paper.view.draw();
}

$(window).on("load", onWindowResizePaper);
window.addEventListener("resize", onWindowResizePaper, false);
