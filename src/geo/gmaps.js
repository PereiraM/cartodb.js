
// if google maps is not defined do not load the class
if(typeof(google) != "undefined" && typeof(google.maps) != "undefined") {

/**
* base layer for all leaflet layers
*/
var GMapsLayerView = function(layerModel, gmapsLayer, gmapsMap) {
  this.gmapsLayer = gmapsLayer;
  this.gmapsMap = gmapsMap;
  this.model = layerModel;
  this.model.bind('change', this._update, this);
};

_.extend(GMapsLayerView.prototype, Backbone.Events);
_.extend(GMapsLayerView.prototype, {

  /**
  * remove layer from the map and unbind events
  */
  remove: function() {
    this.gmapsMap.overlayMapTypes.removeAt(this.index);
    this.model.unbind(null, null, this);
    this.unbind();
  }

});

var GMapsPlainLayerView = function(layerModel, gmapsMap) {
  var layer = {
    tileSize: new google.maps.Size(256,256),
    maxZoom: 100,
    minZoom: 0,
    name:"plain layer",
    alt: "plain layer",
    getTile: function(coord, zoom, ownerDocument) {
      var div = document.createElement('div');
      div.style.width = this.tileSize.x;
      div.style.height = this.tileSize.y;
      div['background-color'] = this.color;
      return div;
    },
    color: layerModel.get('color')
  };
  GMapsLayerView.call(this, layerModel, layer, gmapsMap);
};

cdb.geo.GMapsPlainLayerView = GMapsPlainLayerView;

_.extend(GMapsPlainLayerView.prototype, GMapsLayerView.prototype, {
  _update: function() {
    this.gmapsLayer.color = this.model.get('color');
    google.maps.event.trigger(this.layer, 'updated');
  }
});




// TILED LAYER
var GMapsTiledLayerView = function(layerModel, gmapsMap) {
  var layer = new google.maps.ImageMapType({
    getTileUrl: function(tile, zoom) {
      var y = tile.y;
      var tileRange = 1 << zoom;
      if (y < 0 || y  >= tileRange) {
        return null;
      }
      var x = tile.x;
      if (x < 0 || x >= tileRange) {
        x = (x % tileRange + tileRange) % tileRange;
      }
      return this.urlPattern
                  .replace("{x}",x)
                  .replace("{y}",y)
                  .replace("{z}",zoom);
    },
    tileSize: new google.maps.Size(256, 256),
    opacity: 1.0,
    isPng: true,
    urlPattern: layerModel.get('urlTemplate'),
    maxZoom: 22,
    minZoom: 0,
    name: 'cartodb tiled layer'
  });
  GMapsLayerView.call(this, layerModel, layer, gmapsMap);
};

_.extend(GMapsTiledLayerView.prototype, GMapsLayerView.prototype, {
  _update: function() {
    this.gmapsLayer.urlPattern = this.model.get('urlTemplate');
  }
});

cdb.geo.GMapsTiledLayerView = GMapsTiledLayerView;

/**
* gmaps cartodb layer
*/

var GMapsCartoDBLayerView = function(layerModel, gmapsMap) {
  var self = this;

  _.bindAll(this, 'featureOut', 'featureOver', 'featureClick');

  var opts = _.clone(layerModel.attributes);

  opts.map =  gmapsMap;

  var // preserve the user's callbacks
  _featureOver  = opts.featureOver,
  _featureOut   = opts.featureOut,
  _featureClick = opts.featureClick;

  opts.featureOver  = function() {
    _featureOver  && _featureOver.apply(this, arguments);
    self.featureOver  && self.featureOver.apply(this, arguments);
  };

  opts.featureOut  = function() {
    _featureOut  && _featureOut.apply(this, arguments);
    self.featureOut  && self.featureOut.apply(this, arguments);
  };

  opts.featureClick  = function() {
    _featureClick  && _featureClick.apply(this, arguments);
    self.featureClick  && self.featureClick.apply(opts, arguments);
  };

  layer = new cdb.geo.CartoDBLayerGMaps(opts);
  GMapsLayerView.call(this, layerModel, layer, gmapsMap);
};

cdb.geo.GMapsCartoDBLayerView = GMapsCartoDBLayerView;


_.extend(GMapsCartoDBLayerView.prototype, GMapsLayerView.prototype, {

  _update: function() {
    _.extend(this.gmapsLayer.opts, this.model.attributes);
    this.gmapsLayer.update();
    //reset to update
    this.gmapsMap.overlayMapTypes.setAt(this.index, this.gmapsLayer);
  },

  remove: function() {
    GMapsLayerView.prototype.remove.call(this);
    this.layer.remove();
  },

  featureOver: function(e, latlon, pixelPos, data) {
    // dont pass gmaps LatLng
    this.trigger('featureOver', e, [latlon.lat(), latlon.lng()], pixelPos, data);
  },

  featureOut: function(e) {
    this.trigger('featureOut', e);
  },

  featureClick: function(e, latlon, pixelPos, data) {
    // dont pass leaflet lat/lon
    this.trigger('featureClick', e, [latlon.lat(), latlon.lng()], pixelPos, data);
  }

});

cdb.geo.GoogleMapsMapView = cdb.geo.MapView.extend({

  layerTypeMap: {
    "tiled": cdb.geo.GMapsTiledLayerView,
    "cartodb": cdb.geo.GMapsCartoDBLayerView,
    "plain": cdb.geo.GMapsPlainLayerView
  },

  initialize: function() {
    var self = this;

    cdb.geo.MapView.prototype.initialize.call(this);
    var center = this.map.get('center');
    this.map_googlemaps = new google.maps.Map(this.el, {
      center: new google.maps.LatLng(center[0], center[1]),
      zoom: 2,
      minZoom: this.map.get('minZoom'),
      maxZoom: this.map.get('maxZoom'),
      disableDefaultUI: true,
      mapTypeControl:false,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    });

    this._bindModel();
    this._addLayers();

    google.maps.event.addListener(this.map_googlemaps, 'center_changed', function() {
        var c = self.map_googlemaps.getCenter();
        self._setModelProperty({ center: [c.lat(), c.lng()] });
    });

    google.maps.event.addListener(this.map_googlemaps, 'zoom_changed', function() {
      self._setModelProperty({
        zoom: self.map_googlemaps.getZoom()
      });
    });

    this.map.layers.bind('add', this._addLayer, this);
    this.map.layers.bind('remove', this._removeLayer, this);
    this.map.layers.bind('reset', this._addLayers, this);

    this.projector = new cdb.geo.CartoDBLayerGMaps.Projector(this.map_googlemaps);

  },

  _setZoom: function(model, z) {
    this.map_googlemaps.setZoom(z);
  },

  _setCenter: function(model, center) {
    var c = new google.maps.LatLng(center[0], center[1]);
    this.map_googlemaps.setCenter(c);
  },

  _addLayer: function(layer, layers, opts) {
    var self = this;
    var lyr, layer_view;

    var layerClass = this.layerTypeMap[layer.get('type').toLowerCase()];

    if (layerClass) {
      layer_view = new layerClass(layer, this.map_googlemaps);
    } else {
      cdb.log.error("MAP: " + layer.get('type') + " can't be created");
    }

    this.layers[layer.cid] = layer_view;

    if (layer_view) {
      var idx = this.map.layers.length - 1;
      var isBaseLayer = this.map.layers.length === 1 || (opts && opts.index === 0);
      // set base layer
      if(isBaseLayer) {
        this.map_googlemaps.mapTypes.set('_baseLayer', layer_view.gmapsLayer);
        this.map_googlemaps.setMapTypeId('_baseLayer');
      } else {
        idx -= 1;
        self.map_googlemaps.overlayMapTypes.setAt(idx, layer_view.gmapsLayer);
      }
      layer_view.index = idx;
      this.trigger('newLayerView', layer_view, this);
    } else {
      cdb.log.error("layer type not supported");
    }
  },

  latLonToPixel: function(latlon) {
    return this.projector.latLngToPixel(new google.maps.LatLng(latlon[0], latlon[1]));
  },

  getSize: function() {
    return {
      x: this.$el.width(),
      y: this.$el.height()
    };
  },

  panBy: function(p) {
    var c = this.map.get('center');
    var pc = this.latLonToPixel(c);
    p.x += pc.x;
    p.y += pc.y;
    var ll = this.projector.pixelToLatLng(p);
    this.map.setCenter([ll.lat(), ll.lng()]);

  }

});

}