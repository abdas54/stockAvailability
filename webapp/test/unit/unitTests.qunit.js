/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"comeros/stockavailability/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
