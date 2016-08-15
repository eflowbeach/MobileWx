/* ************************************************************************

   Copyright:

   License:

   Authors:

************************************************************************ */

/*global qx*/

/*global ol*/

/*global mobileedd*/

/**
 */
qx.Class.define("mobileedd.page.Map",
{
  extend : qx.ui.mobile.page.NavigationPage,
  type : "singleton",
  properties :
  {
    jsonpRoot : {
      init : ""  //https://dev.nids.noaa.gov/~jwolfe/edd/edd/source/resource/edd/"

      //init : "https://preview.weather.gov/edd/resource/edd/"
    },
    mapUri : {
      init : ""  //resource/mobileedd/ol-debug.js"

      //init : "resource/mobileedd/ol.js"
    },
    ready : {
      init : false
    },
    basemap : {
      init : "ESRI Gray"
    },
    myPosition :
    {
      init : null,
      nullable : true
    }
  },
  construct : function()
  {
    this.base(arguments);
    this.setTitle("Mobile EDD");
    var me = this;
    if (window.location.hostname.indexOf('preview.w') !== -1)
    {
      me.setJsonpRoot("https://preview.weather.gov/edd/resource/edd/");
      me.setMapUri("resource/mobileedd/ol.js");
    } else
    {
      me.setJsonpRoot("https://dev.nids.noaa.gov/~jwolfe/edd/edd/source/resource/edd/");
      me.setMapUri("resource/mobileedd/ol-debug.js");
    }
    this.bus = qx.event.message.Bus.getInstance();
    var busyIndicator = new qx.ui.mobile.dialog.BusyIndicator("Please wait...");
    this.busyPopup = new qx.ui.mobile.dialog.Popup(busyIndicator);
    this.sigMap =
    {
      "Warning" : "W",
      "Watch" : "A",
      "Advisory" : "Y",
      "Statement" : "S"
    }
    this.hazardMap =
    {
      "Air Stagnation" : "AS",
      "Areal Flood" : "FA",
      "Ashfall" : "AF",
      "Avalanche" : "AV",
      "Beach Hazards" : "BH",
      "Blizzard" : "BZ",
      "Blowing Dust" : "DU",
      "Blowing Snow" : "BS",
      "Brisk Wind" : "BW",
      "Coastal Flood" : "CF",
      "Dense Fog" : "FG",
      "Dense Smoke" : "SM",
      "Dust Storm" : "DS",
      "Excessive Heat" : "EH",
      "Extreme Cold" : "EC",
      "Extreme Wind" : "EW",
      "Fire Weather" : "FW",
      "Flash Flood" : "FF",
      "Flood" : "FL",
      "Freeze" : "FZ",
      "Freezing Fog" : "ZF",
      "Freezing Rain" : "ZR",
      "Freezing Spray" : "UP",
      "Frost" : "FR",
      "Gale" : "GL",
      "Hard Freeze" : "HZ",
      "Hazardous Seas" : "SE",
      "Heat" : "HT",
      "Heavy Sleet" : "HP",
      "Heavy Snow" : "HS",
      "High Surf" : "SU",
      "High Wind" : "HW",
      "Hurricane" : "HU",
      "Hurricane Force Wind" : "HF",
      "Hydrologic" : "HY",
      "Ice Accretion" : "UP",
      "Ice Storm" : "IS",
      "Inland Hurricane" : "HI",
      "Inland Hurricane Wind" : "HI",
      "Inland Tropical Storm" : "TI",
      "Lake Effect Snow" : "LE",
      "Lake Effect Snow and " : "LB",
      "Lake Wind" : "LW",
      "Lakeshore Flood" : "LS",
      "Low Water" : "LO",
      "Marine" : "MA",
      "Marine Dense Fog" : "MF",
      "Radiological Hazard" : "RH",
      "Red Flag" : "FW",
      "Rip Currents" : "RP",
      "Severe Thunderstorm" : "SV",
      "Sleet" : "IP",
      "Small Craft" : "SC",
      "Small Craft for Hazardous Seas" : "SW",
      "Small Craft for Rough Bar" : "RB",
      "Small Craft for Winds" : "SI",
      "Snow" : "SN",
      "Snow and Blowing Snow" : "SB",
      "Storm" : "SR",
      "Tornado" : "TO",
      "Tropical Storm" : "TR",
      "Tsunami" : "TS",
      "Typhoon" : "TY",
      "Volcanic Ashfall" : "AF",
      "Volcano" : "VO",
      "Wind" : "WI",
      "Wind Chill" : "WC",
      "Winter Storm" : "WS",
      "Winter Weather" : "WW"
    };
  },
  members :
  {
    // overridden
    _initialize : function()
    {
      var me = this;
      this.base(arguments);
      this._loadMapLibrary();

      // me.drawer
      me.drawer = new qx.ui.mobile.container.Drawer();
      me.drawer.setOrientation("right");
      me.drawer.setTapOffset(0);

      // me.drawer.show();
      me.ready = false;
      me.drawer.addListener("changeVisibility", function(e) {
        me.ready = true;
      })
      var scroll = new qx.ui.mobile.container.Scroll();
      var scrollContainer = new qx.ui.mobile.container.Composite();
      scroll.add(scrollContainer);
      me.drawer.add(scroll);

      /**
       * Radar Container
       */
      var composite = new qx.ui.mobile.container.Composite();
      composite.addCssClass("hboxPad");
      composite.setLayout(new qx.ui.mobile.layout.HBox());
      me.radarToggleButton = new qx.ui.mobile.form.ToggleButton(false, "Hide", "Show");
      me.radarToggleButton.addListener("changeValue", function(e)
      {
        var radarClass = mobileedd.Radar.getInstance();
        if (e.getData())
        {
          radarClass.start();
          me.radarContainer.setVisibility("visible");
          me.radarLegendContainer.setVisibility('visible')
        } else
        {
          me.loopControl.setValue(false);
          radarClass.stop();
          me.radarContainer.setVisibility("excluded");
          me.radarLegendContainer.setVisibility('excluded')
        }
        radarClass.toggleVisibility(e.getData());
      });
      var radarLabel = new qx.ui.mobile.basic.Label("Radar: ");
      radarLabel.addCssClass("menuLabels");
      composite.add(radarLabel, {
        flex : 1
      });
      composite.add(me.radarToggleButton);
      scrollContainer.add(composite);

      /**
       * Radar Loop Timer
       * - Add a listener for the timer. This switches frames on the map
       */
      me.loopTimer = new qx.event.Timer(500);
      me.loopTimer.addListener("interval", function(e)
      {
        if (!me.loopControl.getValue()) {
          me.loopTimer.stop();
        }
        var currentIndex = me.radarLoopSlider.getValue();

        // Delay on last frame
        if (currentIndex == me.radarLoopSlider.getMaximum())
        {
          me.loopTimer.stop();
          setTimeout(function() {
            // If it stops during the delay be sure to stop it again and don't show a new frame
            if (!me.loopControl.getValue()) {
              me.loopTimer.stop();
            } else {
              me.radarLoopSlider.setValue(me.radarLoopSlider.getMinimum());
              me.loopTimer.start();
            }
          }, 1000);
        } else
        {
          me.radarLoopSlider.setValue(me.radarLoopSlider.getValue() + 1);
        }
      });

      /**
       * Radar Container
       */
      me.radarContainer = new qx.ui.mobile.container.Composite();
      me.radarContainer.setLayout(new qx.ui.mobile.layout.VBox());

      // Loop
      var radarLoopComposite = new qx.ui.mobile.container.Composite();
      radarLoopComposite.setLayout(new qx.ui.mobile.layout.HBox());
      me.loopControl = new qx.ui.mobile.form.ToggleButton(false, "Yes", "No");
      me.loopControl.addListener("changeValue", function(e)
      {
        var bool = e.getData();
        if (bool)
        {
          me.loopTimer.start();
          me.radarToggleButton.setValue(true);
        } else
        {
          me.loopTimer.stop();
        }
      });
      var loopLabel = new qx.ui.mobile.basic.Label("Loop Radar: ");
      loopLabel.addCssClass("loopLabel");
      radarLoopComposite.add(loopLabel, {
        flex : 1
      });
      radarLoopComposite.add(me.loopControl);
      me.radarContainer.add(radarLoopComposite);

      // Long loop

      // Loop
      var radarLoopComposite = new qx.ui.mobile.container.Composite();
      radarLoopComposite.setLayout(new qx.ui.mobile.layout.HBox());
      me.longLoop = new qx.ui.mobile.form.ToggleButton(false, "Yes", "No");
      me.longLoop.addListener("changeValue", function(e)
      {
        var bool = e.getData();
        if (bool) {
          mobileedd.Radar.getInstance().setFrames(20)
        } else {
          mobileedd.Radar.getInstance().setFrames(5)
        }
      });
      var loopLabel = new qx.ui.mobile.basic.Label("Long Loop: ");
      loopLabel.addCssClass("loopLabel");
      radarLoopComposite.add(loopLabel, {
        flex : 1
      });
      radarLoopComposite.add(me.longLoop);
      me.radarContainer.add(radarLoopComposite);

      // Radar Loop Slider
      var radarLoopSliderComposite = new qx.ui.mobile.container.Composite();
      radarLoopSliderComposite.setLayout(new qx.ui.mobile.layout.HBox());
      me.radarLoopSlider = new qx.ui.mobile.form.Slider().set(
      {
        minimum : 0,
        maximum : 4,
        step : 1
      });
      me.radarLoopSlider.addListener("changeValue", function(e)
      {
        var radarMrms = mobileedd.Radar.getInstance();
        radarMrms.setSliderIndex(e.getData());
      }, this);
      radarLoopSliderComposite.add(me.radarLoopSlider, {
        flex : 1
      });
      me.radarContainer.add(radarLoopSliderComposite);

      /**
       * Radar Time Label
       */
      var radarTimeComposite = new qx.ui.mobile.container.Composite();
      me.radarTimeLabel = new qx.ui.mobile.basic.Label();
      radarTimeComposite.setLayout(new qx.ui.mobile.layout.HBox().set( {
        alignX : "center"
      }));
      radarTimeComposite.add(me.radarTimeLabel);
      me.radarTimeLabel.addCssClass("timeLabel");
      me.radarContainer.add(radarTimeComposite);
      scrollContainer.add(me.radarContainer);

      //   var spacer = new qx.ui.mobile.container.Composite();

      //   spacer.addCssClass("thinseparator");

      // scrollContainer.add(spacer)

      // var separator = new qx.ui.mobile.form.Button("");

      // separator.addCssClass("separator");

      // scrollContainer.add(separator);

      /**
      * Hazards Container
      */
      var composite = new qx.ui.mobile.container.Composite();
      composite.addCssClass("hboxPad");
      composite.setLayout(new qx.ui.mobile.layout.HBox());
      var hazardsLabel = new qx.ui.mobile.basic.Label("Hazards: ");
      composite.add(hazardsLabel, {
        flex : 1
      });
      hazardsLabel.addCssClass("menuLabels");
      me.hazardRequestTimer = new qx.event.Timer(0);  //1000 * 60);
      me.hazardRequestTimer.addListener("interval", function(e)
      {
        me.hazardRequestTimer.setInterval(1000 * 20);
        if (me.getReady()) {
          me.hazardRequest.send();
        }
      });
      me.hazardToggleButton = new qx.ui.mobile.form.ToggleButton(false, "Hide", "Show");
      me.hazardToggleButton.addListener("changeValue", function(e)
      {
        if (typeof me.hazardLayer == "undefined") {
          me.addHazardsLayer();
        }
        me.hazardLayer.setVisible(e.getData());
        if (e.getData())
        {
          me.hazardRequestTimer.start();
          me.showAllComposite.setVisibility("visible");
          me.showHazardLabelComposite.setVisibility("visible");
        } else
        {
          me.hazardRequestTimer.stop();
          me.showAllComposite.setVisibility("excluded");
          me.showHazardLabelComposite.setVisibility("excluded");
        }
      }, this);
      composite.add(me.hazardToggleButton);
      scrollContainer.add(composite);

      /**
           * Longfuse Container
           */
      me.showAllComposite = new qx.ui.mobile.container.Composite();

      // me.showAllComposite.addCssClass("hboxPad");
      me.showAllComposite.setLayout(new qx.ui.mobile.layout.HBox());
      var hazardsLabel = new qx.ui.mobile.basic.Label("Show All: ");
      hazardsLabel.addCssClass("loopLabel");
      me.showAllComposite.add(hazardsLabel, {
        flex : 1
      });

      // hazardsLabel.addCssClass("menuLabels");
      me.longfuseButton = new qx.ui.mobile.form.ToggleButton(false, "Yes", "No");
      me.longfuseButton.addListener("changeValue", function(e)
      {
        var url = me.getJsonpRoot() + "hazards/getShortFusedHazards.php";
        if (me.longfuseButton.getValue()) {
          url += "?all=t";
        }
        me.hazardRequest.setUrl(url);
        me.hazardRequest.send();
      }, this);
      me.showAllComposite.add(me.longfuseButton);
      scrollContainer.add(me.showAllComposite);

      //   var spacer = new qx.ui.mobile.container.Composite();

      //   spacer.addCssClass("thinseparator");

      // scrollContainer.add(spacer)

      /**
        * Longfuse - Show Label
        */
      me.showHazardLabelComposite = new qx.ui.mobile.container.Composite();

      //me.showHazardLabelComposite.addCssClass("hboxPad");
      me.showHazardLabelComposite.setLayout(new qx.ui.mobile.layout.HBox());
      var showHazardLabel = new qx.ui.mobile.basic.Label("Show Label: ");
      showHazardLabel.addCssClass("loopLabel");
      me.showHazardLabelComposite.add(showHazardLabel, {
        flex : 1
      });

      // showHazardLabel.addCssClass("menuLabels");
      me.showLongFuseLabelButton = new qx.ui.mobile.form.ToggleButton(false, "Yes", "No");
      me.showLongFuseLabelButton.addListener("changeValue", function(e) {
        if (me.hazardLayer.getSource() !== null) {
          me.hazardLayer.getSource().dispatchEvent('change');
        }
      }, this);
      me.showHazardLabelComposite.add(me.showLongFuseLabelButton);
      scrollContainer.add(me.showHazardLabelComposite);
      var spacer = new qx.ui.mobile.container.Composite();
      spacer.addCssClass("thinseparator");
      scrollContainer.add(spacer)

      /**
       * Background
       * */
      var bgButton = new qx.ui.mobile.form.Button("Change Background Map", "mobileedd/images/map_icon.png");
      bgButton.addListener("tap", function(e)
      {
        var option_names = [];
        me.BasemapOptions.forEach(function(obj) {
          option_names.push(obj.get('name'));
        });

        //mobileedd.page.Map.getInstance().terrain.get('name')]
        var model = new qx.data.Array(option_names.sort());
        var menu = new qx.ui.mobile.dialog.Menu(model);
        menu.show();
        menu.addListener("changeSelection", function(evt)
        {
          var selectedItem = evt.getData().item;
          me.setBasemap(selectedItem);
          me.setBasemapByName(selectedItem);
          me.drawer.hide();
        }, this);
      }, this);
      scrollContainer.add(bgButton);

      /**
            * Travel Hazards
            */
      var travelButton = new qx.ui.mobile.form.Button("Weather Travel Hazards", "mobileedd/images/slipperyroad.png");
      travelButton.addListener("tap", function(e)
      {
        qx.core.Init.getApplication().getRouting().executeGet("/travelhazards");
        me.drawer.hide();
      }, this);
      scrollContainer.add(travelButton);

      /**
       * Share
       */
      var shareButton = new qx.ui.mobile.form.Button("Generate Web Link", "mobileedd/images/url.png");
      shareButton.addListener("tap", function(e)
      {
        var composite = new qx.ui.mobile.container.Composite();
        composite.setLayout(new qx.ui.mobile.layout.VBox());
        var popup = new qx.ui.mobile.dialog.Popup();
        var form = new qx.ui.mobile.form.Form();
        var tf = new qx.ui.mobile.form.TextArea();
        tf.setValue(this.makeUrl());
        form.add(tf, "Web Link: ");
        composite.add(new qx.ui.mobile.form.renderer.Single(form))
        var widget = new qx.ui.mobile.form.Button("Go to Link");
        widget.addListener("tap", function() {
          window.location = this.makeUrl();
        }, this);
        composite.add(widget);
        var widget = new qx.ui.mobile.form.Button("Close");
        widget.addListener("tap", function() {
          popup.hide();
        }, this);
        composite.add(widget);
        popup.add(composite);
        popup.show();
      }, this);
      scrollContainer.add(shareButton);

      /**
      * Close
      * */
      var closeButton = new qx.ui.mobile.form.Button("Close");
      closeButton.addListener("tap", function(e)
      {
        me.drawer.hide();
        me.map.updateSize();
      }, this);
      scrollContainer.add(closeButton, {
        flex : 1
      });

      // Menu Button
      var menuButton = new qx.ui.mobile.navigationbar.Button("Menu");
      menuButton.addListener("tap", function(e) {
        me.drawer.show();
      }, this);
      this.getRightContainer().add(menuButton);

      // Radar Time
      var weekday = new Array(7);
      weekday[0] = "Sun";
      weekday[1] = "Mon";
      weekday[2] = "Tue";
      weekday[3] = "Wed";
      weekday[4] = "Thu";
      weekday[5] = "Fri";
      weekday[6] = "Sat";
      me.bus.subscribe("edd.view.radar.time", function(e)
      {
        var myDate = e.getData();
        var dateString = me.formatDate(myDate) + ' ' + weekday[myDate.getDay()] + ' ' + myDate.getMonth() + '/' + myDate.getDate() + '/' + myDate.getFullYear();
        me.radarTimeLabel.setValue('<b>' + dateString + '</b>');
        me.descriptionLabel.setValue('<b>Radar - ' + dateString + '</b>');
      }, this);
    },

    /**
     * Generate a url
     */
    makeUrl : function()
    {
      var me = this;
      var url = document.location.href;
      if (url.indexOf("?") > -1) {
        url = url.substr(0, url.indexOf("?"));
      }
      url = decodeURIComponent(url).replace('#/', '').replace('#', '');
      url += '?lr=';
      url += me.loopControl.getValue() ? 'T' : 'F';
      url += '&r=';
      url += me.radarToggleButton.getValue() ? 'T' : 'F';
      url += '&rll=';
      url += me.longLoop.getValue() ? 'T' : 'F';
      url += '&ah=';
      url += me.longfuseButton.getValue() ? 'T' : 'F';
      url += '&lh=';
      url += me.showLongFuseLabelButton.getValue() ? 'T' : 'F';
      url += '&h=';
      url += me.hazardToggleButton.getValue() ? 'T' : 'F';
      url += '&z=';
      url += me.map.getView().getZoom();
      url += '&ll=';
      url += ol.proj.transform(me.map.getView().getCenter(), 'EPSG:3857', 'EPSG:4326').toString();
      url += '&bm=';
      url += me.getBasemap()
      return url;
    },
    setUrlParams : function()
    {
      var me = this;

      // Check for params
      if (this.getURLParameter('lr') == null) {
        return;
      }

      // Set view
      var z = me.getURLParameter('z');
      var ll = me.getURLParameter('ll').split(',');
      var newView = new ol.View(
      {
        zoom : z,
        center : ol.proj.transform([Number(ll[0]), Number(ll[1])], 'EPSG:4326', 'EPSG:3857')
      })
      me.map.setView(newView);

      // Set Basemap
      var bm = me.setBasemapByName(me.getURLParameter('bm'));

      // Toggle buttons
      var bool = me.getURLParameter('lr') == "T" ? true : false;
      me.loopControl.setValue(bool);
      var bool = me.getURLParameter('r') == "T" ? true : false;
      me.radarToggleButton.setValue(bool);
      var bool = me.getURLParameter('rll') == "T" ? true : false;
      me.longLoop.setValue(bool);
      var bool = me.getURLParameter('ah') == "T" ? true : false;
      me.longfuseButton.setValue(bool);
      var bool = me.getURLParameter('lh') == "T" ? true : false;
      me.showLongFuseLabelButton.setValue(bool);
      var bool = me.getURLParameter('h') == "T" ? true : false;
      me.hazardToggleButton.setValue(bool);
    },

    /**
     * Format the Radar Date
     */
    formatDate : function(date)
    {
      var hours = date.getHours();
      var minutes = date.getMinutes();
      var ampm = hours >= 12 ? 'pm' : 'am';
      hours = hours % 12;
      hours = hours ? hours : 12;  // the hour '0' should be '12'
      minutes = minutes < 10 ? '0' + minutes : minutes;
      var strTime = hours + ':' + minutes + ' ' + ampm;
      return strTime;
    },

    // overridden
    _createScrollContainer : function()
    {
      // MapContainer
      var layout = new qx.ui.mobile.layout.VBox().set(
      {
        alignX : "center",
        alignY : "middle"
      });
      var mapContainer = new qx.ui.mobile.container.Composite(layout);
      mapContainer.setId("map");
      mapContainer.addCssClass("map");

      //   var travel = new qx.ui.mobile.form.Button("Hello World");

      // //mapContainer.setId("travelButton");

      //   mapContainer.addCssClass("travelButton");

      // mapContainer.add(travel);
      return mapContainer;
    },

    // overridden
    _createContent : function()
    {
      var me = this;

      // Disable menu for Windows Phone 8.
      if (navigator.userAgent.match(/IEMobile\/10\.0/)) {
        return null;
      }

      // Radar Label on map
      var menuContainer = new qx.ui.mobile.container.Composite();
      menuContainer.setId("mapMenu");
      me.radarLegendContainer = new qx.ui.mobile.container.Composite();
      me.descriptionLabel = new qx.ui.mobile.basic.Label("");
      me.radarLegendContainer.add(me.descriptionLabel);
      var image = new qx.ui.mobile.basic.Image("resource/mobileedd/images/legend/radar.png");
      me.radarLegendContainer.add(image);
      menuContainer.add(me.radarLegendContainer);
      return menuContainer;
    },

    /**
     * Loads JavaScript library which is needed for the map.
     */
    _loadMapLibrary : function()
    {
      var me = this;
      var req = new qx.bom.request.Script();
      req.onload = function()
      {
        me.defaultView = new ol.View(
        {
          center : ol.proj.transform([-99, 40], 'EPSG:4326', 'EPSG:3857'),
          zoom : 4
        });

        // Firefox never triggers geolocation fail
        setTimeout(function() {
          if (me.map.getView().getCenter() == null) {
            me.map.setView(me.defaultView);
          }
        }, 3000);

        // Background Maps
        me.terrain = new ol.layer.Tile(
        {
          name : "Stamen Terrain",
          source : new ol.source.Stamen( {
            layer : 'terrain'
          })
        });
        me.lite = new ol.layer.Tile(
        {
          name : "Stamen Lite",
          source : new ol.source.Stamen( {
            layer : 'toner-lite'
          })
        });
        var attribution = new ol.Attribution( {
          html : 'Tiles &copy; <a href="http://services.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer">ArcGIS</a>'
        });
        me.natgeo = new ol.layer.Tile(
        {
          name : "ESRI Nat Geo",
          source : new ol.source.XYZ(
          {
            attributions : [attribution],
            url : 'https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}'
          })
        });

        // ESRI Dark
        var source = new ol.source.XYZ(
        {
          attributions : [attribution],
          url : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
        });

        // Application ready after tiles load
        source.once('tileloadend', function(event)
        {
          me.setReady(true);
          me.setUrlParams();
        });
        var attribution = new ol.Attribution( {
          html : 'Tiles &copy; <a href="http://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer">ArcGIS</a>'
        });
        me.esridark = new ol.layer.Tile(
        {
          name : "ESRI Gray",
          source : source
        });
        var attribution = new ol.Attribution( {
          html : 'Tiles &copy; <a href="http://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer">ArcGIS</a>'
        });
        me.esridark_reference = new ol.layer.Tile(
        {
          name : "ESRI Gray Reference",
          source : new ol.source.XYZ( {
            url : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
          })
        });
        me.esrilite = new ol.layer.Tile(
        {
          name : "ESRI Light Gray",
          source : new ol.source.XYZ(
          {
            attributions : [attribution],
            url : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
          })
        });
        var attribution = new ol.Attribution( {
          html : 'Tiles &copy; <a href="http://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer">ArcGIS</a>'
        });
        me.esrilite_reference = new ol.layer.Tile(
        {
          name : "ESRI Light Gray Reference",
          source : new ol.source.XYZ( {
            url : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
          })
        });
        var source = new ol.source.TileJSON(
        {
          url : 'https://api.tiles.mapbox.com/v3/mapbox.world-bright.json',
          crossOrigin : 'anonymous'
        });
        me.mapboxWorldbright = new ol.layer.Tile(
        {
          name : "Mapbox World Bright",
          source : source
        });

        // var source = new ol.source.TileJSON(

        // {

        //   url : 'https://api.tiles.mapbox.com/v3/mapbox.world-black.json',

        //   crossOrigin : 'anonymous'

        // });

        // me.mapboxWorldDark = new ol.layer.Tile(

        // {

        //   name : "Mapbox World Black",

        //   source : source

        // });
        me.BasemapOptions = [me.terrain, me.lite, me.natgeo, me.esridark, me.esrilite, me.mapboxWorldbright];  //, me.mapboxWorldDark];

        // The map
        me.map = new ol.Map(
        {
          target : 'map',
          controls : ol.control.defaults().extend([new ol.control.ScaleLine( {
            units : 'us'
          })]),
          layers : [me.esridark, me.esridark_reference],
          view : new ol.View( {
            zoom : 6
          })
        });
        me.map.on("click", function(e)
        {
          // Default load value is visible, so listen for a change event on drawer visibility then set ready
          if (me.drawer.getVisibility() == "visible" && me.ready) {
            return;
          }
          me.handleMapClick(e);
        });
        var proj1 = ol.proj.get("EPSG:3857");
        var geolocation = new ol.Geolocation(
        {
          projection : proj1,
          tracking : true
        });

        // Handle geolocation error.
        geolocation.on('error', function(error) {
          me.map.setView(me.defaultView);
        });
        geolocation.on('change', function(evt) {
          me.setMyPosition(geolocation.getPosition());
        });
        geolocation.once('change', function(evt)
        {
          me.map.getView().setCenter(me.getMyPosition());

          // add Icon
          var iconFeature = new ol.Feature( {
            geometry : new ol.geom.Point(geolocation.getPosition())
          });
          var iconStyle = new ol.style.Style( {
            image : new ol.style.Icon(
            {
              anchor : [12, 24],
              anchorXUnits : 'pixels',
              anchorYUnits : 'pixels',
              src : 'resource/mobileedd/images/map-marker-icon.png'
            })
          });
          iconFeature.setStyle(iconStyle);
          var vectorSource = new ol.source.Vector( {
            features : [iconFeature]
          });
          var vectorLayer = new ol.layer.Vector(
          {
            name : "Marker",
            source : vectorSource
          });
          me.map.addLayer(vectorLayer);
        });

        // Orientation
        var deviceOrientation = new ol.DeviceOrientation();

        // tilt the map
        deviceOrientation.on(['change:beta', 'change:gamma'], function(event)
        {
          var center = view.getCenter();
          var resolution = view.getResolution();
          var beta = event.target.getBeta() || 0;
          var gamma = event.target.getGamma() || 0;
          center[0] -= resolution * gamma * 25;
          center[1] += resolution * beta * 25;
          view.setCenter(view.constrainCenter(center));
        });
        me.radarToggleButton.setValue(true);
        me.hazardToggleButton.setValue(true);
        var styleArray = [new ol.style.Style( {
          stroke : new ol.style.Stroke(
          {
            color : '#717171',
            width : 3
          })
        })];
        var vector = new ol.layer.Vector(
        {
          name : "U.S. States",
          source : new ol.source.Vector(
          {
            url : 'resource/mobileedd/data/us-states.json',
            format : new ol.format.TopoJSON()
          }),
          style : function(feature, resolution) {
            return feature.getId() !== undefined ? styleArray : null;
          }
        });
        me.map.addLayer(vector);

        // Add state overlay

        //me.addStatesLayer();
      }.bind(this);
      req.open("GET", this.getMapUri());
      req.send();
    },

    /**
      Add a state  layer ...
      */
    addStatesLayer : function()
    {
      var me = this;
      var tms_layer = new ol.layer.Tile(
      {
        name : 'US States',
        source : new ol.source.XYZ( {
          url : 'http://ridgewms.srh.noaa.gov/c/tc.py/1.0.0/state/{z}/{x}/{y}.png'
        }),
        opacity : 0.8
      });
      me.map.addLayer(tms_layer);
    },

    /**
     * Handle the hazard click
     */
    handleMapClick : function(e)
    {
      var me = this;
      var items = [];
      var hazards = [];
      var travelSegment = [];
      var travelPoint = [];
      me.map.forEachFeatureAtPixel(e.pixel, function(feature, layer)
      {
        if (layer.get('name') == "Hazards") {
          hazards.push(feature);
        }
        if (layer.get('name') == "Travel Hazards Segments") {
          travelSegment.push(feature);
        }
        if (layer.get('name') == "Travel Hazards Points") {
          travelPoint.push(feature);
        }
      });
      hazards.forEach(function(obj)
      {
        var htype = obj.get('warn_type');
        var hsig = 'Warning';
        if (typeof htype == "undefined")
        {
          htype = obj.get('phenomenon');
          hsig = obj.get('significance');
        }
        items.push(htype + ' ' + hsig + ' - #' + obj.get('etn'));
      });
      travelSegment.forEach(function(obj, index) {
        items.push('Travel Hazard Segment - #' + index);
      })
      travelPoint.forEach(function(obj, index) {
        items.push('Travel Hazard Point - #' + index);
      })
      items.push("Set Travel Origin");

      // Handle Waypoints
      if (typeof mobileedd.page.PageTravelHazards.getInstance().waypoints !== "undefined") {
        mobileedd.page.PageTravelHazards.getInstance().waypoints.forEach(function(obj, index) {
          items.push("Set Travel Waypoint #" + (Number(index) + 1));
        })
      } else {
        items.push("Set Travel Waypoint #1");
      }
      items.push("Set Travel Destination");

      // Cancel
      items.push("Cancel");
      var model = new qx.data.Array(items);
      var menu = new qx.ui.mobile.dialog.Menu(model);
      menu.show();
      menu.addListenerOnce("changeSelection", function(evt)
      {
        var selectedIndex = evt.getData().index;
        var selectedItem = evt.getData().item;
        if (selectedItem == "Set Travel Destination")
        {
          var ll = ol.proj.transform(e.coordinate, 'EPSG:3857', 'EPSG:4326');
          mobileedd.page.PageTravelHazards.getInstance().setDestination(ll);
          qx.core.Init.getApplication().getRouting().executeGet("/travelhazards");
          return;
        }
        if (selectedItem == "Set Travel Origin")
        {
          var ll = ol.proj.transform(e.coordinate, 'EPSG:3857', 'EPSG:4326');
          mobileedd.page.PageTravelHazards.getInstance().setOrigin(ll);
          qx.core.Init.getApplication().getRouting().executeGet("/travelhazards");
          return;
        }
        if (selectedItem.indexOf("Set Travel Waypoint") !== -1)
        {
          var indexToChange = selectedItem.split('#')[1] - 1;
          var ll = ol.proj.transform(e.coordinate, 'EPSG:3857', 'EPSG:4326');
          mobileedd.page.PageTravelHazards.getInstance().setWaypoint(ll, indexToChange);
          qx.core.Init.getApplication().getRouting().executeGet("/travelhazards");

          // var ll = ol.proj.transform(e.coordinate, 'EPSG:3857', 'EPSG:4326');

          // mobileedd.page.PageTravelHazards.getInstance().setDestination(ll);
          return;
        }
        if (selectedItem == "Cancel") {
          return;
        }
        if (selectedItem.indexOf("Travel Hazard S") != -1) {
          travelSegment.forEach(function(obj, index) {
            if (selectedItem.split('#')[1] == index)
            {
              qx.core.Init.getApplication().getRouting().executeGet("/travelsample");
              var text = new qx.event.message.Message("edd.travelsample");
              text.setData(travelSegment[index]);
              me.bus.dispatch(text);
            }
          })
        }
        if (selectedItem.indexOf("Travel Hazard P") != -1) {
          travelPoint.forEach(function(obj, index) {
            if (selectedItem.split('#')[1] == index)
            {
              qx.core.Init.getApplication().getRouting().executeGet("/travelsample");
              var text = new qx.event.message.Message("edd.travelsample");
              text.setData(travelPoint[index]);
              me.bus.dispatch(text);
            }
          })
        }
        var hsplit = selectedItem.split(' - ');
        var htype1 = hsplit[0];
        var hetn = hsplit[1].replace('#', '');
        hazards.forEach(function(feature)
        {
          var htype = feature.get('warn_type');
          var hsig = 'Warning';
          if (typeof htype == "undefined")
          {
            htype = feature.get('phenomenon');
            hsig = feature.get('significance');
          }
          if (htype + ' ' + hsig == htype1 && feature.get('etn') == hetn)
          {
            var wfo = feature.get('office').substr(1, 4);
            var phenom = feature.get('phenomenon').length == 2 ? feature.get('phenomenon') : me.hazardMap[feature.get('phenomenon')];
            var eventid = feature.get('etn').replace(/ /g, '');
            var sig = (typeof feature.get('significance') == "undefined") ? 'W' : me.sigMap[feature.get('significance')];
            var url = me.getJsonpRoot() + 'getWarningText.php';
            url += '?year=' + new Date(feature.get('end') * 1000).getFullYear();
            url += '&wfo=' + wfo;
            url += '&phenomena=' + phenom;
            url += '&eventid=' + eventid;
            url += '&significance=' + sig;
            var hazardTextRequest = new qx.io.request.Jsonp();
            hazardTextRequest.setUrl(url);
            hazardTextRequest.setCallbackParam('callback');
            hazardTextRequest.addListenerOnce("success", function(e)
            {
              qx.core.Init.getApplication().getRouting().executeGet("/hazardtext");
              var text = new qx.event.message.Message("edd.hazard");
              var html = '';
              if ((phenom == "TO" | phenom == "SV" | phenom == "FF") && sig == 'W') {
                html += '<img style="width: 100%;" src="https://www.weather.gov/images/crh/impact/K' + wfo + "_" + phenom + "_" + eventid + "_" + feature.get('end') + '.png">';
              }
              html += e.getTarget().getResponse().data[0].report;
              text.setData(html);
              me.bus.dispatch(text);
              me.busyPopup.hide();
            }, this);
            hazardTextRequest.send();
            me.busyPopup.show();
          }
        });
      }, this);
    },

    /**
      Add a hazards layer ...
      */
    addHazardsLayer : function()
    {
      var me = this;
      me.hazardLayer = new ol.layer.Vector(
      {
        name : "Hazards",
        source : null,  // vectorSource,
        style : function(feature, resolution)
        {
          var color;
          var fg = 'white';
          var label = '';

          // Better colors for short-fused hazards
          if (feature.get('phenomenon') == "SV" || me.hazardMap[feature.get('phenomenon')] == "SV" && feature.get('significance') == "Warning")
          {
            color = 'yellow';
            fg = 'black';
          } else if (feature.get('phenomenon') == "TO" || me.hazardMap[feature.get('phenomenon')] == "TO" && feature.get('significance') == "Warning") {
            color = 'red';
          } else if (feature.get('phenomenon') == "FF" || me.hazardMap[feature.get('phenomenon')] == "FF" && feature.get('significance') == "Warning") {
            color = 'green';
          } else if (feature.get('phenomenon') == "MA" || me.hazardMap[feature.get('phenomenon')] == "MA" && feature.get('significance') == "Warning") {
            color = '#29E8EF';
          } else {
            color = feature.get('color');
          }



          // Show the hazard text
          if (me.showLongFuseLabelButton.getValue()) {
            if (me.longfuseButton.getValue()) {
              label = feature.get('phenomenon') + '\n' + feature.get('significance');
            } else {
              var key = Object.keys(me.hazardMap).filter(function(key) {
                return me.hazardMap[key] === feature.get('phenomenon')
              })[0];
              label = key + '\n' + 'Warning';
            }
          }
          var contrast = getContrast50(color);
          var textStroke = new ol.style.Stroke(
          {
            color : contrast,
            width : 5
          });
          var textFill = new ol.style.Fill( {
            color : color
          });
          return [new ol.style.Style(
          {
            stroke : new ol.style.Stroke(
            {
              color : color,
              width : 5
            }),
            text : new ol.style.Text(
            {
              font : '20px Calibri,sans-serif',
              text : label,
              fill : textFill,
              stroke : textStroke
            })
          })];
        }
      });
      me.map.addLayer(me.hazardLayer);

      // Hazard Request
      me.hazardRequest = new qx.io.request.Jsonp();
      var url = me.getJsonpRoot() + "hazards/getShortFusedHazards.php";
      if (me.longfuseButton.getValue()) {
        url += "?all=t";
      }
      me.hazardRequest.setUrl(url);
      me.hazardRequest.setCallbackParam('callback');
      me.hazardRequest.addListener("success", function(e)
      {
        var data = e.getTarget().getResponse();
        var features = new ol.format.GeoJSON().readFeatures(data, {
          featureProjection : 'EPSG:3857'
        });
        var vectorSource = new ol.source.Vector((
        {
          projection : 'EPSG:3857',
          features : features
        }));
        if (me.hazardLayer.getSource() !== null) {
          me.hazardLayer.getSource().clear();
        }
        me.hazardLayer.setSource(vectorSource);
      }, this);
    },

    /**
     * Get the map
     */
    getMap : function() {
      return this.map;
    },
    getCenter : function() {
      if (typeof ol != "undefined") {
        return ol.proj.transform(this.map.getView().getCenter(), 'EPSG:3857', 'EPSG:4326');
      } else {
        return null;
      }
    },
    setBasemapByName : function(selectedItem)
    {
      var me = this;
      var layers = me.map.getLayers();

      // Remove current layer
      me.BasemapOptions.forEach(function(obj) {
        if (obj.get('name') == layers.getArray()[0].get('name'))
        {
          // Hide/Remove the reference too
          me.esridark_reference.setVisible(false);
          me.esrilite_reference.setVisible(false);
          me.map.removeLayer(obj);
        }
      });
      me.BasemapOptions.forEach(function(obj)
      {
        // Add the reference too
        if (obj.get('name') == selectedItem) {
          layers.insertAt(0, obj);
        }
        if (selectedItem == "ESRI Gray") {
          me.esridark_reference.setVisible(true);
        } else if (selectedItem == "ESRI Light Gray")
        {
          var loaded = false;
          layers.getArray().forEach(function(obj) {
            if (obj.get('name') == "ESRI Light Gray Reference") {
              loaded = true;
            }
          });
          if (!loaded) {
            //me.map.addLayer()
            layers.insertAt(1, me.esrilite_reference);
          }
          me.esrilite_reference.setVisible(true);
        }

      });
    },

    /**
     * Get a layer by name
     */
    getLayerByName : function(name)
    {
      var me = this;
      var match = null;
      me.map.getLayers().getArray().forEach(function(obj) {
        // console.log(obj.get('name'), name);
        if (obj.get('name') == name) {
          match = obj;
        }
      });
      return match;
    },

    /**
    Set opacity of a layer by name
    */
    setOpacity : function(name, opacity)
    {
      var me = this;
      me.map.getLayers().forEach(function(layer) {
        if (layer.get('name') == name) {
          layer.setOpacity(opacity);
        }
      });
    },

    // From: http://stackoverflow.com/questions/11582512/how-to-get-url-parameters-with-javascript/11582513#11582513
    getURLParameter : function(name) {
      return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [null, ''])[1].replace(/\+/g, '%20')) || null;
    }
  }
});
