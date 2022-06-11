var LabController = {
  currentScenario: null,
  resetScenario: function() {
    if (this.currentScenario != null) {
      this.currentScenario.reset();
      this.currentScenario = null;
    }
    $("#calcIModalBody").html(
      "Click on a scenario in the controls panel. (Top Right)"
    );
    $("#measurementModalBody").html(
      "Click on a scenario in the controls panel. (Top Right)"
    );
  },
  scenarioA: function() {
    this.resetScenario();
    ScenarioA.init();
    this.currentScenario = ScenarioA;
  },
  scenarioB: function() {
    this.resetScenario();
    ScenarioB.init();
    this.currentScenario = ScenarioB;
  },
  scenarioC: function() {
    this.resetScenario();
    ScenarioC.init();
    this.currentScenario = ScenarioC;
  },
  clearScenario: function() {
    this.resetScenario();
    this.currentScenario = null;
  },
  calcShow: function() {
    if (this.currentScenario != null) {
      this.currentScenario.calcShow();
    }
  },
  measurementShow: function() {
    if (this.currentScenario != null) {
      this.currentScenario.measurementShow();
    }
  },
  toggleCurrent: function() {
    if (this.currentScenario != null) {
      this.currentScenario.toggleCurrent();
    }
  },
  toggleMagField: function() {
    if (this.currentScenario != null) {
      this.currentScenario.toggleMagField();
    }
  }
};

var datControls = new dat.GUI();
datControls.width = 600;
var f1 = datControls.addFolder("Scenarios");
f1.add(LabController, "scenarioA").name("Solenoid");
f1.add(LabController, "scenarioB").name("Long Wire");
f1.add(LabController, "scenarioC").name("Coaxial Wire");
f1.add(LabController, "clearScenario").name("Clear Scenario");
f1.open();
datControls.open();
// $(document).ready(function () {LabController.scenarioA();});
