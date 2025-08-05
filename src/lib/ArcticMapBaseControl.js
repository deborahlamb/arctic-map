import React from "react";
import { geojsonToArcGIS } from '@terraformer/arcgis';
import ArcticMapButton from './ArcticMapButton';
import ArcticMapPanel from './ArcticMapPanel';
import ArcticMapControlArea from './ArcticMapControlArea';
import request from "@arcgis/core/request.js";
//import Zoom from "@arcgis/core/widgets/Zoom.js";
import Legend from "@arcgis/core/widgets/Legend.js";
import LayerList from "@arcgis/core/widgets/LayerList.js";
import BasemapGallery from "@arcgis/core/widgets/BasemapGallery.js";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";
import styles from './ArcticMap.css';


class ArcticMapBaseControl extends React.Component {
    static displayName = "ArcticMapBaseControl";
    constructor(props) {
        super(props)

       
        this.state = {
            //zoomControl: null,
            renderElements: [],
            canReset: this.props.reset !== undefined,

        }
        var self = this;
        //this.zoomControlDiv = document.createElement("div");
        this.layersDiv = document.createElement("div");
        this.legendDiv = document.createElement("div");
        
        //console.log("ABC_Props",self.props);

        self.props.view.on('click', (event) => {

            self.props.view.ui.remove(self.basemapGallery);

        });

        self.basemapGallery = new BasemapGallery({
            view: props.view
        })
        self.basemapGallery.watch('activeBasemap', function (newValue, oldValue, property, object) {
            //self.props.view.ui.remove(self.basemapGallery);
            //listen for key-up event
            var galleryItems = document.getElementsByClassName("esri-basemap-gallery__item");

            for(let i=0; i<galleryItems.length; i++){
                galleryItems[i].addEventListener('keyup', (event) => {
                    if(event.key === "Enter"){
                        self.props.view.ui.remove(self.basemapGallery);
                    }
                });
            }

        });

     /*         var zoom = new Zoom({
            view: props.view,
            container: self.zoomControlDiv,
            position: "top-left"
        })
        self.state.zoomControl = zoom;
     */        
        //this.props.hostDiv.appendChild(zoom);
        //props.view.ui.add(zoom, props.hostDiv);
        //self.state.children.push(self.zoomControlDiv);

        var legend = new Legend({
            view: props.view,
            container: self.legendDiv,
        });

        this.watchForLegendChanges(legend);

        var layerList = new LayerList({
            view: props.view,
            visibilityAppearance: "checkbox",
            dragEnabled: true,
            visibleElements: {
                errors: true
            },
            container: self.layersDiv,
            listItemCreatedFunction: (event) => {
                // only legend if imageFormat exist in TOC
                // labelsVisible:true
                var actions = [
                {
                    title: "Increase opacity",
                    className: "esri-icon-up",
                    id: "increase-opacity"
                },
                {
                    title: "Decrease opacity",
                    className: "esri-icon-down",
                    id: "decrease-opacity"
                }];
                
                const item = event.item;
                
                //console.log("item", item);
                
                //await item.layer.when();

                if (item.layer.imageFormat && item.parent) {
                        // make a request to the server to retrieve the layer image url
                        request(item.layer.url + "/legend", {
                            query: {
                                f: 'json'
                            },
                            responseType: "json"
                        }).then(function (response) {
                            //console.log("response",response);
                            var aDiv = document.createElement("div");

                            // build unique url for the legend symbol
                            for (let i = 0; i < response.data.layers.length; i++) {
                                var layerNum = i;

                                //console.log("iLayer", layerNum, response.data.layers[layerNum]); 
                                if (response.data.layers[layerNum].legend.length === 1){
                                    let img = document.createElement("img");
                                    img.contentType = "image/png";
                                    img.style.margin = "5px";
                                    img.width = response.data.layers[layerNum].legend[0].width;
                                    img.height = response.data.layers[layerNum].legend[0].height;
                                    img.src = 'data:image/png;base64,'+response.data.layers[layerNum].legend[0].imageData;
                                    //console.log("img", img);    
                                    // assign image to the sublayers in layerlist
                                    var para = document.createElement("P");
                                    para.style.margin = "5px";
                                    para.style.verticalAlign = "middle";
                                    var theLabel = response.data.layers[layerNum].layerName;
                                    var t =  document.createTextNode(theLabel);
                                    para.appendChild(img);
                                    para.appendChild(t);                                         
                                    aDiv.appendChild(para);
                                    item.panel = {
                                        className: "esri-icon-layer-list",
                                        content: [aDiv],
                                        open: false
                                    }
                                }
                                else if (response.data.layers[layerNum].legend.length > 1){
                                    for (let j = 0; j < response.data.layers[layerNum].legend.length; j++) {
                                        var legendNum = j;
                                        let img = document.createElement("img");
                                        img.contentType = "image/png";
                                        img.style.margin = "5px";
                                        img.width = response.data.layers[layerNum].legend[legendNum].width;
                                        img.height = response.data.layers[layerNum].legend[legendNum].height;
                                        img.src = 'data:image/png;base64,'+response.data.layers[layerNum].legend[legendNum].imageData;
                                        //console.log("img", img);
                                        var para = document.createElement("P");
                                        para.style.margin = "5px";
                                        para.style.verticalAlign = "middle";
                                        var theLabel = response.data.layers[layerNum].legend[legendNum].label;
                                        t =  document.createTextNode(theLabel);
                                        para.appendChild(img);
                                        para.appendChild(t);                                         
                                        aDiv.appendChild(para);
                                    }
                                    item.panel = {
                                        className: "esri-icon-layer-list",
                                        content: [aDiv],
                                        open: false
                                    }        
                                }

                            };
                    });
                }
                else if (item.layer.imageFormat) {
                    item.panel = {
                        content: 'legend',
                        open: false
                    }
                    item.panel.watch('open', (isOpen) => {
                        self.removeLegendDuplicateLabels();
                        //console.log("panel", item);
                        layerList.renderNow();
                    });
                }                    
                else {
                    //console.log("NotImageItem",item);
                    if (item.layer.labelsVisible === true) {
                        actions.unshift({
                            title: "Labels on/off",
                            className: "esri-icon-checkbox-checked",
                            id: "toggle-labels"
                        })
                    }
                    else if (item.layer.labelsVisible === false) {
                        actions.unshift({
                            title: "Labels on/off",
                            className: "esri-icon-checkbox-unchecked",
                            id: "toggle-labels"
                        })
                    }
                    if (self.canShowAttributeTable(item.layer.url)) {
                        actions.unshift({
                            title: "Open Attribute Table",
                            className: "esri-icon-table",
                            id: "open-attribute-table"
                        });
                        //actions.unshift({
                        //    title: "Open Map Service",
                        //    className: "esri-icon-launch-link-external",
                        //    id: "open-map-service"
                        //});
                    }
                }

                item.actionsSections = [ actions ];     
            }
        });
        //layerList.selectionEnabled = true;
        layerList.selectionMode = "single";

        reactiveUtils.watch(
            () => props.view.map.layers.filter((layer) => layer.visible).toArray(),
            (visibleLayers) => {
              // Do something with the visibleLayers Collection
              //console.log(visibleLayers);
              //layerList.viewModel._recompileList();
            }
          );
        this.watchForLayerListChanges(layerList);

        reactiveUtils.on(
            () => layerList,
            "trigger-action",
            (event) => {
                if (event.action.id === "toggle-labels") {
                    if (event.action.className === "esri-icon-checkbox-unchecked") {
                        event.action.className = "esri-icon-checkbox-checked";
                        event.item.layer.labelsVisible=true;
                    }
                    else {
                        event.action.className = "esri-icon-checkbox-unchecked";
                        event.item.layer.labelsVisible=false;
                    }
                }
                if (event.action.id === "increase-opacity") {
                    event.item.layer.opacity += 0.1;
                    event.item.layer.opacity >= 1 ? event.item.layer.opacity = 1:  event.item.layer.opacity;
                }
                if (event.action.id === "decrease-opacity") {
                    event.item.layer.opacity -= 0.1;
                    event.item.layer.opacity <= 0 ? event.item.layer.opacity = 0:  event.item.layer.opacity;
                }
                if (event.action.id === "open-attribute-table") {
                    //console.log("OpenAttributeTable");
                    self.props.openAttributesTable({
                        view: self.props.view,
                        url: event.item.layer.url,
                        title: event.item.layer.title,
                        fields: self.getAttributeTableLayerFields(event.item.layer.url),
                        hiddenFields: self.getAttributeTableLayerHiddenFields(event.item.layer.url)
                        });
                }
                if (event.action.id === "open-map-service") {
                    self.props.openMapService({
                        url: event.item.layer.url
                        });                    
                }
            });
        //self.state.view.ui.add(layerList, 'top-left')
        //var joined = self.state.renderElements.concat(self.zoomControlDiv);
        //this.state.renderElements = self.state.renderElements.concat(self.zoomControlDiv);
        //this.setState({ renderElements: self.state.renderElements.concat(self.zoomControlDiv) })
    }

    canShowAttributeTable = (layerUrl) => {
        if (this.props.attributesTableLayers && this.props.attributesTableLayers.length > 0) {
            return this.props.attributesTableLayers.some((lyr) => {
                return lyr.url === layerUrl;
            });
        }
        return false;
    }

    getAttributeTableLayerFields = (layerUrl) => {
        if (this.props.attributesTableLayers && this.props.attributesTableLayers.length > 0) {
            const layer = this.props.attributesTableLayers.find((lyr) => {
                return lyr.url === layerUrl;
            });
            if (layer && layer.fields && layer.fields.length > 0) {
                return layer.fields;
            }
        }
        return [];
    }

    getAttributeTableLayerHiddenFields = (layerUrl) => {
        if (this.props.attributesTableLayers && this.props.attributesTableLayers.length > 0) {
            const layer = this.props.attributesTableLayers.find((lyr) => {
                return lyr.url === layerUrl;
            });
            if (layer && layer.hiddenFields && layer.hiddenFields.length > 0) {
                return layer.hiddenFields;
            }
        }
        return [];
    }

    handleShowBasemaps() {

    }

  /*     renderZoomcontrol() {
        
        return this.zoomControlDiv;
    }
 */
    basemapclick() {
        this.props.view.ui.add(this.basemapGallery, {
            position: 'bottom-right'
        })
        //this.setState({ hideBasemapButton: true })
        // self.state.view.ui.remove(self.basemapGallery);
    }

    watchForLegendChanges = (legend) => {
        
        this.getGroupLayerSymbology(legend);

        //console.log("legendLayers", legend.view.map.layers)
        legend.watch('activeLayerInfos.length', (len) => {
            this.removeLegendDuplicateLabels();
        });
        legend.view.watch('stationary', (stationary) => {
            if (stationary) {
                this.removeLegendDuplicateLabels();
            }
        });
        legend.view.map.layers.on("after-changes", (event) => {
            legend.view.map.layers.forEach((layer) => {
                //console.log("layer", layer);
                if (layer.allSublayers) {
                    layer.allSublayers.forEach((subLayer) => {
                        subLayer.watch('visible', (visible) => {
                            this.removeLegendDuplicateLabels();
                        });
                    });
                }
                layer.watch('visible', (visible) => {
                    this.removeLegendDuplicateLabels();
                });
            });
        });
    }

    watchForLayerListChanges = (layerList) => {
        layerList.view.map.layers.on("after-changes", (event) => {
            //console.log("viewModel",layerList.viewModel);
            const viewModel = layerList.viewModel;
        });
    }

    removeLegendDuplicateLabels = () => {
        setTimeout(() => {
            const elements = document.getElementsByClassName("esri-legend__layer-body");
            //console.log("elements", elements);
            for (let i = 0; i < elements.length; i++) {
                if (elements[i].childNodes && elements[i].childNodes.length > 2) {
                    const element = elements[i];
                    let label = "";
                    for (let i = 0; i < element.childNodes.length; i++) {
                        const childNodeI = element.childNodes[i];
                        for (let k = i + 1; k < element.childNodes.length; k++) {
                            const childNodeK = element.childNodes[k];
                            if (element.childNodes[i].innerText == element.childNodes[k].innerText) {
                                childNodeK.classList.add("arctic-map-hidden");
                            }
                        }
                    }                                        
                    for (let index = 0; index < element.childNodes.length; index++) {
                        const childNode = element.childNodes[index];
                        if (childNode.childNodes.length === 2) {
                            const innerText = childNode.childNodes[1].innerText;
                            if (innerText && innerText === label && innerText !== '\t') {
                                if (!childNode.classList.contains("arctic-map-hidden")) {
                                  childNode.classList.add("arctic-map-hidden");
                                }
                            }
                            label = innerText;
                        }
                    }
                }
            }
        }, 2000);
    }

    getGroupLayerSymbology = (legend) => {
        const elements = document.getElementsByClassName("esri-legend__layer-body");
        //console.log("elements", elements);
        for (let index = 0; index < elements.length; index++) {
            const childNode = elements.childNodes[index];
            //console.log("childNode", childNode.innerText);
        }
        legend.view.map.layers.forEach((layer) => {
        if (layer.type==="group") {
            //console.log("groupLayer", layer);
        }
        });
    }

    render() {
        return (
            <div >

                    <ArcticMapPanel  esriicon='layer-list' title='Legend' ontoggle={this.removeLegendDuplicateLabels.bind(this)}>
                        <div ref={(e) => { e && e.appendChild(this.legendDiv) }} />
                    </ArcticMapPanel>
                    <ArcticMapPanel esriicon='collection' title='Layers' >
                    <p>Toggle visibility of each data layer.</p><p>Click, drag and drop layers to reorder.</p>
                        {this.state.canReset &&
                            <p><a href="#" style={{ color: '#71A3AF', textDecoration: 'none' }} onClick={this.props.reset}>
                                <span style={{ height: "10px", width: "10px", marginRight: '10px', color: 'black' }} aria-hidden className="esri-icon esri-icon-trash" ></span>
                                Reset to Default Data Visibility</a></p>
                        }
                        <div ref={(e) => { e && e.appendChild(this.layersDiv) }} />
                    </ArcticMapPanel>
                    <ArcticMapButton esriicon='basemap' title='Basemaps' onclick={this.basemapclick.bind(this)} />

            </div>

        )

    }
}

export default ArcticMapBaseControl;
