/* ************************************************************************

   Copyright:

   License:

   Authors:

************************************************************************ */

/**
 */
qx.Class.define("mobilewx.page.Map",
{
  extend : qx.ui.mobile.page.NavigationPage,
  construct : function()
  {
    this.base(arguments);
    this.setTitle("Map");
  },
  members :
  {
    _mapUri : "http://openlayers.org/en/v3.1.1/build/ol.js",

    // overridden
    _initialize : function()
    {
      var me = this;
      this.base(arguments);
      this._loadMapLibrary();

      // Drawer
      var drawer = new qx.ui.mobile.container.Drawer();
      drawer.setOrientation("right");
      drawer.setTapOffset(100);

      // Button in drawer
      var button = new qx.ui.mobile.form.Button("Add radar");
      button.addListener("tap", function(e) {
        me.addRadarLayer();
      })
      drawer.add(button);
      drawer.show();

      // Options Button
      var fxButton = new qx.ui.mobile.navigationbar.Button("Options");
      fxButton.addListener("tap", function(e) {
        drawer.show();
      }, this);
      this.getRightContainer().add(fxButton);
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
      return mapContainer;
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
        me.map = new ol.Map(
        {
          target : 'map',
          layers : [new ol.layer.Tile( {
            source : new ol.source.MapQuest( {
              layer : 'sat'
            })
          })],
          view : new ol.View(
          {
            center : ol.proj.transform([-99, 40], 'EPSG:4326', 'EPSG:3857'),
            zoom : 4
          })
        });
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
      }.bind(this);
      req.open("GET", this._mapUri);
      req.send();
    },

    /**
    Add a radar layer ...
    */
    addRadarLayer : function()
    {
      var me = this;

      //      var tms_layer = new ol.layer.Tile( {

      //        source : new ol.source.XYZ( {

      //          url : 'http://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png'

      //        })

      //      });

      //      me.map.addLayer(tms_layer);
      var hazards = new ol.layer.Vector(
      {
        title : 'Hazards',
        source : new ol.source.GeoJSON(
        {
          url : '/mwp/data/iris/allhazard.geojson',
          projection : 'EPSG:3857'
        }),
        style : new ol.style.Style( {
          stroke : new ol.style.Stroke(
          {
            color : 'red',
            width : 2
          })
        })
      });
      me.map.addLayer(hazards);
    }
  }
});
