import React from 'react';
import async from 'async';
import { createRoot } from 'react-dom/client';
import Map from "@arcgis/core/Map.js";
import MapView from "@arcgis/core/views/MapView.js"
																	
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine.js';
import IdentifyParameters from "@arcgis/core/rest/support/IdentifyParameters.js";
import request from "@arcgis/core/request.js";
import Polygon from '@arcgis/core/geometry/Polygon.js';
import Graphic from '@arcgis/core/Graphic.js';
import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol.js";
import Locate from "@arcgis/core/widgets/Locate.js";
import Home from "@arcgis/core/widgets/Home.js";
import BasemapGallery from "@arcgis/core/widgets/BasemapGallery.js";
import Popup from "@arcgis/core/widgets/Popup.js";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";
												  

import ArcticMapButton from './ArcticMapButton';
import ArcticMapLoader from './ArcticMapLoader';
import ArcticMapPanel from './ArcticMapPanel';

import './ArcticMap.css';
												

var style = document.createElement('style');
style.id = "esri-overrides"
style.innerHTML =
  '.esri-ui-bottom-right {' +
  'flex-flow: column;' +
  '}' +
  '.esri-ui-bottom-right .esri-component {' +
  'margin-top: 10px;' +
  '}' +
  '.esri-layer-list { background-color: transparent; padding: 1px; }' +
  '.esri-layer-list__item--has-children .esri-layer-list__item { box-shadow: none; }' +
  '.esri-layer-list__item--has-children { border-bottom: none; box-shadow: 0px 0px 3px 0px black; border-radius: 4px; margin-bottom: 10px;  }' +
  '.esri-basemap-gallery { position: absolute; bottom: 0; right: 0; }'
  ;
document.head.appendChild(style);

class ArcticMapV4 extends React.Component {
    static displayName = 'ArcticMapV4';

    constructor(props) {
        super(props)

        this.mapRef = React.createRef();

        this.state = {
            map: null,
            view: null,  
            hideBasemapButton: false,
            loading: false,
            lat: props.lat,
            lng: props.lng,
            mode: props.mode || "view",
            basemap: props.basemap || "gray-vector",
            sr: Number.parseInt(props.sr || "102100")
        };

        this.handleMapLoad = this.handleMapLoad.bind(this)
        //this.handleMapClick = this.handleMapClick.bind(this)
        this.layers = [];    
    }

    componentDidMount(){
        var self = this;
        var index = 0;
        self.layers = [];
        self.childrenElements = [];

        // create map
        var map = new Map({
          basemap: this.props.basemap
        });

        // load the map view at the ref's DOM node
        var view = new MapView({
            container: this.mapRef.current,
            map: map,
            popup: new Popup({
              dockEnabled: true,
              dockOptions: {
                position: 'bottom-left'
              },
              defaultPopupTemplateEnabled: true
            }),
            center: [-118, 34],
            zoom: 8
        });

        this.setState({ map, view });

        self.state.map = map;
        self.state.view = view;
        
        reactiveUtils.watch(
          () => self.state.view.map.allLayers.map( layer => layer.title),
          (ids) => {
            //console.log(`Layer Titles ${ids}`);
          });        

        map.allLayers.on("change", function(event) {
          //console.log("event",event);
          //console.log("Layer added: ", event.added);
          //console.log("Layer removed: ", event.removed);
          //console.log("Layer moved: ", event.moved);
        });

        var layerchildren = [];
        var children = React.Children.map(this.props.children, function (child) {
            if(child){
              if (child.type.displayName === 'ArcticMapLayer') {
                var ele = React.cloneElement(child, {
                  ref: (c) => { if (c) { self.layers.push(c) } },
                  am: self,
                  map: self.state.map,
                  view: self.state.view
                });
                layerchildren.push(ele);
                return ele;

              } else if (child.type.displayName === 'ArcticMapControlArea') {
																	
                child.props.children.forEach(function (eachChild) {
                  //console.log(eachChild.type.displayName);
                  if (eachChild.type.displayName === 'ArcticMapLLDSearch') {
                    let ele =  React.cloneElement(eachChild, {
                      am: self,
                      map: self.state.map,
                      view: self.state.view,
                      //ref: 'child-' + (index++)
                      ref: (c) => { if (c) { self.childrenElements.push(c); } return 'child-' + (index++) }

                    });
                    let x = document.createElement('div');
                    view.ui.add(x, ele.props.location);
                    createRoot(x).render(<div>{ele}</div>);
                  }
                });

                // console.log(self.refs);
                var ele =  React.cloneElement(child, {
                  am: self,
                  map: self.state.map,
                  view: self.state.view,
                  //ref: 'child-' + (index++)
                  ref: (c) => { if (c) { self.childrenElements.push(c); } return 'child-' + (index++) }
      
                });

                var x = document.createElement('div');
                view.ui.add(x, ele.props.location);
                createRoot(x).render(<div>{ele}</div>);

                return ele;
              }
              else {
                return React.cloneElement(child, {
                  am: self,
                  map: self.state.map,
                  view: self.state.view,
                  //ref: 'child-' + (index++)
                  ref: (c) => { if (c) { self.childrenElements.push(c); } return 'child-' + (index++) }
                })
              }
          }
        })
      
        if (layerchildren) {
            layerchildren = layerchildren.reverse()
        }
		 
        var x = document.createElement('div');
        view.ui.add(x, "bottom-left");
        createRoot(x).render(<div>{layerchildren}</div>);

        //console.info(children);
        
        view.on("layerview-create-error", function(event) {
          console.log("LayerView failed to create for layer with the id: ", event.layer.loadError);
        });
  		
        view.when(() => {
            
            this.handleMapLoad(map, view);
        });
    }

    componentDidUpdate(prevProps, prevState) {
      if (prevProps !== this.props) {
       //console.log('updated Props',this.props); // You can check this.props will change if they are updated
          //this.setState({
          //  amlayers: this.state.map.amlayers,
          //  layers: this.props.layers
          //})
      }
  }

    //TODO L137-230
    handleMapLoad(map, view) {

        var self = this
        self.state.map.amlayers = [];
        var centerSplit = this.props.center.split('|');
        view.center = [parseFloat(centerSplit[1]), parseFloat(centerSplit[0])];
        view.zoom = parseInt(centerSplit[2]);
        self.cntrlIsPressed = false;
    
        window._request = request;
        window._map = self;
        self.request = request;
                         
        view.popup.dockEnabled = true;
        view.popup.dockOptions = {position: 'bottom-left'};
        view.popup.defaultPopupTemplateEnabled = true;
	
        view.popup.watch("visible", function (visible) {

          if (!visible) {
            view.graphics.removeAll();
          }

        });
    
        view.popup.watch('selectedFeature', function (graphic) {
          view.graphics.removeAll();
          if (graphic) {
            var graphicTemplate = graphic.getEffectivePopupTemplate(true);
            if(graphic.geometry){
              graphicTemplate.actions = [{
                id: 'select-item',
                title: 'Select',
                image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyhpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMDE0IDc5LjE1Njc5NywgMjAxNC8wOC8yMC0wOTo1MzowMiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTQgKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NTQyREM3RDkwQzVGMTFFNTk4QkI4OTBEOTYzQTg5MzEiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NTQyREM3REEwQzVGMTFFNTk4QkI4OTBEOTYzQTg5MzEiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo1NDJEQzdENzBDNUYxMUU1OThCQjg5MEQ5NjNBODkzMSIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo1NDJEQzdEODBDNUYxMUU1OThCQjg5MEQ5NjNBODkzMSIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Prb3PqgAAACTSURBVHjaYvz//z8DJYCJgVJAjgsiIyMFQBjEZgQZwMjISJJmILUXynVmIdVmqGZ9qFAe0S7AonnR8uXLk5jItBmsGSUWgIriSdUMNwCoaB6QmgulidaM7AKYgjiYIcRohkdjVFQUhmIoG69mlHSAxUYGQppRAhGo6AMoYQDxRWI1Y02JSC65SEgz3IABzY0AAQYAhIhWWCl3Pj0AAAAASUVORK5CYII=",
              }]
              graphicTemplate.actions.items[0].visible = self.state.map.editor !== undefined// graphic.attributes.website ? true : false;
    
            }else{
              graphicTemplate.actions = [];
            }
            var symbol = {
              type: "simple-fill", // autocasts as new SimpleFillSymbol()
              color: [135, 206, 235, 0.5],
      			  outline: {
			        	// autocasts as new SimpleLineSymbol()
				        color: [0, 191, 255],
				        width: 1
			        }
            };

            if (graphic) {
                graphic.symbol = symbol;
                var popupGraphic = graphic
                view.graphics.add(popupGraphic);
            } else {
              view.graphics.removeAll();
              view.popup.content.graphic = null;
            }                    
    
            //self.state.view.goTo(graphic);
          }
        });
        view.popup.viewModel.on('trigger-action', function (event) {
          //var target = event.target || window.event.target || window.event.srcElement;
          if (event.action.id === 'select-item') {
            self.state.map.editor.setEditFeature(view.popup.selectedFeature, null, null, false, true);
            view.popup.close();
          }
        });
    
        window.addEventListener("keydown",function (event) {
          if (event.which == "17") self.cntrlIsPressed = true;
        });
    
        window.addEventListener("contextmenu", function(event){
          self.contextmenuPressed = true;
        });
    
        window.addEventListener("keyup",function (event) {
          self.cntrlIsPressed = false;
        });
    
        view.on('drag', (event) => {
    
          //console.log("drag",self);
          
          if(self.state.mode==="review"){
            self.drawTempGraphic( self.state.view, event);
            event.stopPropagation();
            var vw = self.state.view;
            var pt = vw.toMap({ x: event.x, y: event.y });
            var idParams = new IdentifyParameters();
            if(event.action==="start"){
              self.dragStart = pt;
            }
            if (event.action == "end"){
              const rings= [
                [pt.x, pt.y],
                [pt.x, self.dragStart.y],      
                [self.dragStart.x, self.dragStart.y],
                [self.dragStart.x, pt.y]
              ]
              const tempPolygon = new Polygon({
                hasz: false,
                hasm: false,
                rings: rings,
                spatialReference: self.state.view.spatialReference
              })
              //console.log("check self", self);
              idParams.geometry=tempPolygon;
              idParams.tolerance = 3;
              idParams.
              returnFieldName = false;
              //vw.goTo([pt,self.dragStart]);
              self.layers.filter( function(layer){
                //console.log("layers", layer);
                layer.params.width = self.state.view.width;
                layer.params.height = self.state.view.height;
                layer.params.mapExtent = self.state.view.extent;
                layer.params.geometry=tempPolygon;
                identify.identify(layer.identifyTask, layer.params).then(function(response){
                  //console.log("identifyTask ",response );
                  
                })
                
              })
            }
    
            // self.layer.identifyArea(self.dragStart, pt, self.layer.props.allowMultiSelect, function (results) {
            //   console.log("identifyArea", results);
            //   if (results) {
            //     results.layer = self.layer;
            //     identresults.push(results);
            //   }
    
            // });
          }
          if(self.state.mode==="select")
          {
    
            self.drawTempGraphic( self.state.view, event);
            event.stopPropagation();
            var vw = self.state.view;
            var pt = vw.toMap({ x: event.x, y: event.y });
    
            if(event.action==="start"){
              self.dragStart = pt;
            }
            else if(event.action==="end"){
              if (event.button == 0 ) {
                self.contextmenuPressed = false;
              }
              if (self.state.map.editor && self.state.map.editor.state.editing === true) {
                  return;
              }
          
              var identresults = [];
              self.setState({ loading: true });
          
              var identLayers = self.layers.filter(function (layer) {
                //TODO check if this is selectable
                if (layer.props.allowMultiSelect === undefined) {
                    return;
                }
          
                  var mapzoom = view.zoom;
          
                if (layer.props.identMaxZoom !== undefined) {
                  if (Number.parseInt(layer.props.identMaxZoom, 10) > mapzoom) {
                    return layer;
                  }
                  else {
                    return;
                  }
                }
          
                return layer;
          
              });
          
              identLayers = identLayers.concat(self.state.map.amlayers);
              //console.log("amlayers");
              //console.log(self.state.map.amlayers);
          
              async.eachSeries(identLayers, function (layer, cb) {
                if(typeof layer.state == "undefined"){
                  cb();
                  return;
                }
                if(!layer.state.disablePopup){   
                  //TODO
                  layer.identifyArea(self.dragStart, pt, layer.props.allowMultiSelect, function (results) {
                    if (results) {
                      results.layer = layer;
                      identresults.push(results);
                    }
                    cb();
                  });
                }
              }, function (err) {
                var results = identresults.map(function (ir) {
                  ir.results.forEach(function (res) {
                    res.layer = ir.layer;
                  });
                  return ir.results;
                }) || [].reduce(function (a, b) {
                  return a.concat(b);
                });
          
                self.setState({ loading: false });
          
                results = results.flat();
          
                  var feature = null;
                  for (var idx = 0; idx<results.length; idx++){
                      feature = results[idx].feature;
          
                      self.state.map.editor.setEditFeature(feature, null, null, false, true, self.contextmenuPressed);            
                  }
              });
            }
          }
          else if(event.button != 0){
            self.drawTempGraphic( self.state.view, event);
            event.stopPropagation();
            var vw = self.state.view;
            var pt = vw.toMap({ x: event.x, y: event.y });
            //console.log("self.", self);
            //console.log("self.dragStart", self.dragStart);
            if(event.action==="start"){
              self.dragStart = pt;
            }
            else if(event.action==="end"){
              vw.goTo([pt,self.dragStart]);
            }
    
          }
        });
    
        view.on('click', (event) => {
          if (event.button == 0 ) {
            self.contextmenuPressed = false;
          }
          
          //console.log(event);
    
          //hide stuff
    
    
          if (self.state.hideBasemapButton && self.state.hideBasemapButton === true) {
            self.state.view.ui.remove(self.basemapGallery);
            self.setState({ hideBasemapButton: false });
            return;
          }
    
    
          if (self.state.mode === "view") { return; }
          
          if (event.button == 0 ) {
            if (self.state.map.editor && self.state.map.editor.state.editing === true) {
              return;
            }
          }
          
    
          var currentmode = self.state.mode;
          if (currentmode !== 'select') {
            self.setMode("view");
          }
    
    
    
          // console.log(event);
          // need to work on identify and add to a single popup
          // https://developers.arcgis.com/javascript/latest/sample-code/sandbox/index.html?sample=tasks-identify
    
          var identresults = [];
          //document.getElementsByClassName('esri-view-root')[0].style.cursor = 'wait';
          self.setState({ loading: true });
    
          var identLayers = self.layers.filter(function (layer) {
            var mapzoom = view.zoom;
    
            if (layer.props.identMaxZoom !== undefined) {
              if (Number.parseInt(layer.props.identMaxZoom, 10) > mapzoom) {
                return layer;
              }
              else {
                return;
              }
            }
    
            return layer;
    
          });
    
          identLayers = identLayers.concat(self.state.map.amlayers);
          
          async.eachSeries(identLayers, function (layer, cb) {
            if(layer.state == undefined){
              console.log("layer.state is undefined");
              cb();   
              return;
            }
            if(layer.layerRef.visible === false || layer.layerRef.sublayers === undefined && layer.props.type !== "geojson" && layer.props.type !== "group" && layer.props.type !== "feature" && layer.props.type !== "groupby")
            {
              cb();   
              return;
            }
            if((!layer.state.disablePopup && layer.layerRef.visible === true && (layer.layerRef.sublayers !== undefined || layer.props.type === "feature")) || layer.props.type === "geojson" || layer.props.type === "group" || layer.props.type === "groupby"){
              const visibleLayers = [];
              let noFilter = false; 
              if(layer.props.sublayers){
                layer.props.sublayers.forEach(s => {
                  if(s.nofilter === true){
                    noFilter = s.nofilter;
                  }
                });
              }
    
              const isLayerVisible = (lyr) => {
                let isVisible = lyr.visible;
                if (lyr.visible && lyr.parent && lyr.parent.title && lyr.parent.url) {
                  isVisible = isLayerVisible(lyr.parent);
                }
                return isVisible;
              }
    
              if (layer.layerRef.sublayers) {
                layer.layerRef.allSublayers.forEach((sub) => {
                  if (!sub.sublayers && isLayerVisible(sub) && noFilter === false) {
                    visibleLayers.push(sub.url);
                  }
                });
              }
                if (layer.props.type === "groupby"){
                var subLayers = [];
                subLayers = layer.layerRef.layers.items;
                subLayers.forEach((sub) => {
                  if (sub.sublayers){
                    sub.sublayers.items.forEach((subSub) => {
                      if (subSub.visible === true){
                        visibleLayers.push(subSub.url);
                      }
                    });
                  }
                })
              }
              
              layer.identify(event, function (resultslist) {
                if(resultslist) {
                  resultslist.forEach(results => {
      
                    if (results) {
                      if(visibleLayers.length > 0){
                        var rem = [];
                        results.results.forEach(res =>{
                          if(visibleLayers.length > 0 && !visibleLayers.includes(`${results.layer.layerRef.url}/${res.layerId}`))
                          {
                            rem.push(res.layerId);
                          }
                        });
                        rem.forEach(remid =>{
                          results.results.splice(results.results.findIndex(r => r.layerId === remid), 1);
                        });                      
                      }
      
                      if(results.results.length > 0)
                      {
                        identresults.push(results);
                      }
                    }
                  });
              }
                cb();
              });
            } 
          }, function (err) { 
            var results = [];
            results = identresults.map(function (ir) {
              ir.results.forEach(function (res) {
                res.layer = ir.layer;
                res.acres = -1;
                if (res.feature.geometry) {
                  res.acres = geometryEngine.geodesicArea(res.feature.geometry, 'acres');
                }
              });
              return ir.results;
            }) || [].reduce(function (a, b) {
              return a.concat(b);
            });
            self.setState({ loading: false });
            results = results.flat();
    
            results = results.sort(function (r1, r2) {
              if(r1.acres < 0 && r2.acres < 0) return 0;
              if(r1.acres < 0) return 1;
              if(r2.acres < 0) return -1;
              if (r1.acres > r2.acres) {
                return 1;
              }
              if (r2.acres > r1.acres) {
                return -1;
              }
              return 0;
              //r.feature.attributes.Shape_Area
            });
    
            if (currentmode === "identify") {
    
              //results = results.reverse();
              var popupresults = results.map(function (result) {
                var feature = result.feature;
                var layerName = result.layerName;
    
                if(feature.attributes !== null){
                  feature.attributes.layerName = layerName;
                }
                
                if (result.layer.layerRef && result.layer.layerRef.allSublayers && result.layer.layerRef.allSublayers.length > 0) {
                  const sublayer = result.layer.layerRef.allSublayers.find(l => l.id === result.layerId);
                  if (sublayer) {
                    feature.attributes.layerUrl = sublayer.url;
                  }
                }
    
                if(result.layer.layerRenderers){
                  //console.log("result.layer  this.layerRenderers", result);
                  var popupDisable = result.layer.layerRenderers.find(l => l.props.layerid === result.layerId.toString());
                  //console.log("result.layer  popupDisable", popupDisable.props);
                  if (popupDisable  && result.layerId == popupDisable.props.layerid) {
                    //console.log("result.layer  popupDisable", popupDisable.props);
                    if (popupDisable.props.disabled == "true") {
                      return null;
                    }
                  }
                }
    
                var PTActions = [];
                if(!result.layer.state.blockSelect)
                {
                  PTActions = [];
                } else {
                  PTActions = [{ title: "Select", id: "select-action" }];
                }
    
                feature.popupTemplate = { // autocasts as new PopupTemplate()
                  //title: layerName,
                  title: result.layer.renderPopupTitle(feature, result),
                  content: result.layer.renderPopup(feature, result),
                  actions: PTActions
                };
    
                return feature;
              });
    
              // remove the disabled popup layer
              for(var i=popupresults.length-1;i>=0;i--){
                if(popupresults[i]==null){
                  popupresults.splice(i, 1);
                }
              }
    
              if (popupresults.length > 0) {
                view.popup.close();
                view.popup.currentSearchResultFeature = null;
                self.state.view.popup.open({
                  features: popupresults,
                  location: event.mapPoint
                });
                // popupresults[0].setCurrentPopup();
    
                self.state.view.popup.on('trigger-action', function (e) {
                  if (e.action.id === 'select-action');
                });
              }
              self.setState({ loading: false });
            } //current mode identify
    
            if (currentmode === "select" && results.length > 0) {
              var feature = null;
              var fType = null;
              for (var idx = 0; idx<results.length && feature===null; idx++){
                feature = results[idx].feature;
                fType = feature.geometry.type;
              }
    
              if (self.contextmenuPressed === true) {
    
                self.state.map.editor.setEditFeature(feature, null, fType, false, true, true);
              }
              else {
    
                self.state.map.editor.setEditFeature(feature, null, fType, false, true);
              }
            } //current mode select
    
    
            //document.getElementsByClassName('esri-view-root')[0].style.cursor = 'auto';
          }); //function(err)
    
          // self.layers.forEach(layer => {
          //     layer.identify(event);
          // })
          //}, 100);
    
        }); 
    
    
        if (this.props.locate) {
          var locateBtn = new Locate({
            view: self.state.view
          });
    
          self.state.view.ui.add(locateBtn, {
            position: 'top-right'
          });
        }
    
        this.basemapGallery = new BasemapGallery({
          view: self.state.view
        });
  
        this.basemapGallery.watch('activeBasemap', function (newValue, oldValue, property, object) {
          //self.state.view.ui.remove(self.basemapGallery)
          //self.setState({ hideBasemapButton: false })
        });
    
    
        map.on("basemap-change", function (a) {

          alert("BM CHanegd")
        });
    
    
        // Add the widget to the top-right corner of the view
        if (this.props.home) {
          var homeBtn = new Home({
            view: view
          })
    
          // Add the home button to the top left corner of the view
          view.ui.add(homeBtn, 'top-right');
        }
    
       // view.ui.remove('zoom');
    
        this.getEditFeature = () => {
          this.state.map.editor.state.tempGraphicsLayer.graphics.items[0];
        }
    
        setTimeout(() => {
          var evt = new Event('mapready', { bubbles: true });
          Object.defineProperty(evt, 'target', { value: self, enumerable: true });
          if (self.props.onmapready) {
            self.props.onmapready(evt);
          }
        }, 500);
         
      }
      setMode(val) {
        this.setState({ mode: val });
        if (val === "identify") {
          this.state.view.cursor = "help";
        }
        if (val === "view") {
          this.state.view.cursor = "grab";
        }
        if (val === "select") {
          this.state.view.cursor = "auto";
        }
        if (val === "edit") {
          this.state.view.cursor = "crosshairs";
        }
      }

      createElementFromHTML(htmlString) {
        var div = document.createElement('div');
        div.innerHTML = htmlString.trim();
    
        // Change this to div.childNodes to support multiple top-level nodes
        return div.firstChild;
      }
    
      setEdit(json, nofire, type) {
        if (nofire === null) {
          nofire = false;
        }
    
        if (type === null) {
          type = "polygon";
        }
    
        if (this.state.map.editor) {
          this.state.map.editor.setEditFeature(json, nofire, type);
        }
      }

      setJson(json) {
        if (this.state.map.editor) {
          this.state.map.editor.setEditFeature(json, true);
        }
      }
    
      drawTempGraphic( view, event) {
        view.graphics.removeAll();
        //w.toMap({ x: event.x, y: event.y });
        const pt1=view.toMap({x:event.origin.x, y:event.origin.y});
        const pt2=view.toMap({x:event.x, y:event.y})
        const rings= [
          [pt1.x, pt1.y],
          [pt1.x, pt2.y],      
          [pt2.x, pt2.y],
          [pt2.x, pt1.y]
        ]
          const tempPolygon = new Polygon({
            hasz: false,
            hasm: false,
            rings: rings,
            spatialReference: view.spatialReference
          });
          const tempSymbol = {
            type: "simple-line",  // autocasts as new SimpleLineSymbol()
            color: [128,128,128],
            width: "5px",
            style: "solid"
          };
          const tempPolygonGraphic = new Graphic ({
            geometry: tempPolygon,
            symbol: tempSymbol
          });
          view.graphics.add(tempPolygonGraphic);
    
          if(event.action==="end"){
            view.graphics.removeAll();
          }
      }
    
    //TODO L805

    render() {
        return (<div id="viewContainer" style={{ width: '100vw', height: '100vh' }} className='full-screen-map' ref={this.mapRef}>
            <ArcticMapLoader loading={this.state.loading} />
        </div>);
    }

}
export default ArcticMapV4
