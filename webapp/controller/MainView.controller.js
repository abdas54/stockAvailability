sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/ndc/BarcodeScanner"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller,JSONModel,MessageToast,Fragment,MessageBox,BarcodeScanner) {
        "use strict";
        var that;
        return Controller.extend("com.eros.stockavailability.controller.MainView", {
            onInit: function () {
                that = this;
                this.oModel = this.getOwnerComponent().getModel();
                that.stockModel = new JSONModel({Product:[],MaterialCode : ""});
                that.getView().setModel(that.stockModel,"StockModel");

            },
            getStockDetailManually: function(oEvent){
                this.getStockDetail(true,oEvent.getParameter("value"));
                
            },
            getStockDetail: function(flag,matCode){
                var aFilters=[];

                if(flag){
                    aFilters.push(new sap.ui.model.Filter("Itemcode", sap.ui.model.FilterOperator.EQ, matCode));
                }
                else{
                    aFilters.push(new sap.ui.model.Filter("Barcode", sap.ui.model.FilterOperator.EQ, matCode));
                }
                aFilters.push(new sap.ui.model.Filter("AllLocations", sap.ui.model.FilterOperator.EQ, "X"));
                this.oModel.read("/MaterialSet", {
                    filters: aFilters,
                    success: function(oData) {
                        if(oData.results.length > 0){
                            that.stockModel = new JSONModel({Product:[]});
                            that.getView().setModel(that.stockModel,"StockModel");
                            var aProducts = that.getView().getModel("StockModel").getProperty("/Product");
                            aProducts.push(...oData.results);
                            that.getView().getModel("StockModel").setProperty("/Product", aProducts);
                            that.getView().getModel("StockModel").setProperty("/MaterialCode", "");

                            //that.onOpenFragment();
                            
                        }
                        else{
                            sap.m.MessageBox.show(
                                "No Item found", {
                                    icon: sap.m.MessageBox.Icon.INFORMATION,
                                    title: "Stock Availability Check",
                                    actions: ["OK", "CANCEL"],
                                    onClose: function(oAction) {
                                        if (oAction === "OK") {
                                           
                                        } else {
                                            
                                        }
                                    }
                                }
                            );
                        }
                        console.log("Success", oData);
                    },
                    error: function(oError) {
                        console.error("Error", oError);
                    }
                });
            },
            onScanSuccessStock: function(oEvent){
                if (oEvent.getParameter("cancelled")) {
					MessageToast.show("Scan cancelled", { duration:1000 });
				} else {
					if (oEvent.getParameter("text")) {
                        this.getStockDetail(false,oEvent.getParameter("text"));
						
					} 
				}
            },
            onScanErrorOne: function(oEvent){
                MessageToast.show("Scan Failed");
            },
             onScan: function () {
                var that = this;
                BarcodeScanner.scan(
                    function (mResult) {

                        if (!mResult.cancelled) {
                            that.getStockDetail(true,mResult.text);
                           
                        }
                    },
                    function (Error) {
                        window.alert("Scanning Failed :" + Error)
                    }
                )

            },
            onSuggest: function (oEvent) {
                var that = this;
                this.openMessageBox = false;
                var sValue = oEvent.getParameter("suggestValue");
                that._lastSuggestTimestamp = Date.now();
                var requestTimestamp = that._lastSuggestTimestamp;
                if (sValue.length > 0) {
                     var oSuggestionModel = that.getView().getModel("suggestionModel");
                    if (!oSuggestionModel) {
                        oSuggestionModel = new sap.ui.model.json.JSONModel({ suggestions: [] });
                        that.getView().setModel(oSuggestionModel, "suggestionModel");
                    } else {
                        oSuggestionModel.setProperty("/suggestions", []);
                    } // Suggest only when user types 3 or more characters
                    var aFilters = [new sap.ui.model.Filter("Itemcode", sap.ui.model.FilterOperator.Contains, sValue)];
                    this.oModel.read("/MaterialSet", {
                        urlParameters: {
                            "$expand": "ToDiscounts"
                        },
                        filters: aFilters,
                        success: function (oData) {
                            if (oData.results.length > 0) {
                                  if (requestTimestamp !== that._lastSuggestTimestamp) {
                                    return;
                                }
                                else {
                                    oSuggestionModel.setProperty("/suggestions", oData.results);
                                }
                              

                            }

                        },
                        error: function (oError) {
                            aFilters.push(new sap.ui.model.Filter("AllLocations", sap.ui.model.FilterOperator.EQ, "X"));
                            if (JSON.parse(oError.responseText).error.code === "MATERIAL_CHECK") {
                                if (!that.openMessageBox) {
                                    sap.m.MessageBox.show(
                                        "Item is not available at this store location. Do you want to check other locations?", {
                                        icon: sap.m.MessageBox.Icon.INFORMATION,
                                        title: "Availability Check",
                                        actions: ["OK", "CANCEL"],
                                        onClose: function (oAction) {
                                            if (oAction === "OK") {
                                                that.openMessageBox = true;
                                                that.getMaterialAllLocation(aFilters);


                                            } else {

                                            }
                                        }
                                    }
                                    );
                                }
                            }
                            else {
                                sap.m.MessageBox.show(
                                    JSON.parse(oError.responseText).error.message.value, {
                                    icon: sap.m.MessageBox.Icon.Error,
                                    title: "Error",
                                    actions: ["OK", "CANCEL"],
                                    onClose: function (oAction) {

                                    }
                                }
                                );
                            }
                            console.error("Error", oError);
                        }
                    });

                }
            },
            onSuggestionStockSelected: function (oEvent) {
                var that = this;
                var oSelectedRow = oEvent.getParameter("selectedRow");
                if (oSelectedRow) {
                    var oContext = oSelectedRow.getBindingContext("suggestionModel");
                    var sItemCode = oContext.getProperty("Itemcode");
                    
                    this.getStockDetail(true, sItemCode);

                }
            }
        });
    });
