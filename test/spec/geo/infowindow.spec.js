
describe("cdb.geo.ui.infowindow", function() {

  describe("model", function() {
    var model;
    beforeEach(function() {
      model = new cdb.geo.ui.InfowindowModel();
    });

    it("should allow adding an alternative name", function() {

      model.addField('the_name');
      model.addField('the_description');

      model.setAlternativeName('the_name', 'nombre');
      model.setAlternativeName('the_description', 'descripción');

      n = model.getAlternativeName('the_name');
      d = model.getAlternativeName('the_description');

      expect(n).toEqual("nombre");
      expect(d).toEqual("descripción");

    });

    it("should add a field", function() {
      expect(model.containsField('test')).toEqual(false);
      model.addField('test');
      model.addField('test2');
      expect(model.containsField('test')).toEqual(true);
      model.removeField('test');
      expect(model.containsField('test')).toEqual(false);
      expect(model.containsField('test2')).toEqual(true);
      model.clearFields();
      expect(model.containsField('test2')).toEqual(false);
    });

    it("should add a field in order", function() {
      model.addField('test', 1);
      model.addField('test2', 0);
      expect(model.get('fields')[0].name).toEqual('test2');
      expect(model.get('fields')[1].name).toEqual('test');
    });

    it("should allow modify field properties", function() {
      var spy = sinon.spy();
      model.addField('test');
      var t = model.getFieldProperty('test', 'title');
      expect(t).toEqual(true);
      model.bind('change:fields', spy);
      expect(spy.called).toEqual(false);
      model.setFieldProperty('test', 'title', false);
      t = model.getFieldProperty('test', 'title');
      expect(t).toEqual(false);
      expect(spy.called).toEqual(true);
    });

    it("should save and restore fields", function() {
      model.addField('test', 1);
      model.addField('test2', 0);
      model.addField('test3', 3);
      model.saveFields();
      expect(model.get('old_fields')).toEqual(model.get('fields'));
      model.clearFields();
      model.restoreFields();
      expect(model.get('old_fields')).toEqual(undefined);
      expect(model.get('fields')[0].name).toEqual('test2');
      expect(model.get('fields')[1].name).toEqual('test');
      expect(model.get('fields')[2].name).toEqual('test3');
    });
  });

  describe("view", function() {
    var model, view;

    beforeEach(function() {

      var container = $('<div>').css('height', '200px');

      map = new cdb.geo.Map();

      mapView = new cdb.geo.MapView({
        el: container,
        map: map
      });

      model = new cdb.geo.ui.InfowindowModel({
        fields: [
          { name: 'test1', position: 1, title: true},
          { name: 'test2', position: 2, title: true}
        ]
      });

      view = new cdb.geo.ui.Infowindow({
        model: model,
        mapView: mapView
      });

    });

    it("should add render when template changes", function() {
      spyOn(view, 'render');
      model.set('template', 'jaja');
      expect(view.render).toHaveBeenCalled()
    });

    it("should render without alternative_name set", function() {
      var template = '<div class="cartodb-popup">\
        <a href="#close" class="cartodb-popup-close-button close">x</a>\
         <div class="cartodb-popup-content-wrapper">\
           <div class="cartodb-popup-content">\
             <ul id="mylist"></ul>\
           </div>\
         </div>\
         <div class="cartodb-popup-tip-container"></div>\
      </div>';

      model.unset('alternative_names');
      model.set({
        content: {
          fields: [ { title:'test', value:true, position:0, index:0 } ]
        },
        template_name:'infowindow_light',
        template: template
      });

      console.log(model.toJSON());
      console.log(view.render().el);
      expect(view.render().$el.html().length).not.toBe(0);
    });

    it("should convert value to string when it is a number", function() {
      model.set({
        content: {
          fields: [{
              title: 'jamon1', value: 0, index:0
            }, {
              title: 'jamon2', value: 1, index:1
            }]
        },
        template_name: 'jaja'
      }, {silent: true});

      var render_fields = view._fieldsToString(model.attributes.content.fields, model.attributes.template_name);

      expect(render_fields[0].value).toEqual("0");
      expect(render_fields[1].value).toEqual("1");
    });

    it("should convert value to '' when it is undefined", function() {
      model.set({
        content: { fields: [{ title: 'jamon', value: undefined}] },
        template_name: 'jaja'
      }, {silent: true});

      var render_fields = view._fieldsToString(model.attributes.content.fields, model.attributes.template_name);
      expect(render_fields[0].value).toEqual('');
    });

    it("should convert value to '' when it is null", function() {
      model.set('content', { fields: [{ title: 'jamon', value: null}] }, {silent: true});

      var render_fields = view._fieldsToString(model.attributes.content.fields, model.attributes.template_name);
      expect(render_fields[0].value).toEqual('');
    });

    it("shouldn't convert the value if it is empty", function() {
      model.set('content', { fields: [{ title: 'jamon', value: ''}] }, {silent: true});

      var render_fields = view._fieldsToString(model.attributes.content.fields, model.attributes.template_name);
      expect(render_fields[0].value).toEqual('');
    });

    it("should leave a string as it is", function() {
      model.set('content', { fields: [{ title: 'jamon', value: "jamon is testing"}] }, {silent: true});

      var render_fields = view._fieldsToString(model.attributes.content.fields, model.attributes.template_name);
      expect(render_fields[0].value).toEqual("jamon is testing");
    });

    it("should convert value to string when it is a boolean", function() {
      model.set('content', { fields: [{ title: 'jamon1', value: false}, { title: 'jamon2', value: true}] }, {silent: true});

      var render_fields = view._fieldsToString(model.attributes.content.fields, model.attributes.template_name);

      expect(render_fields[0].value).toEqual("false");
      expect(render_fields[1].value).toEqual("true");
    });

    it("should be null when there isn't any field", function() {
      spyOn(view, 'render');
      model.set('fields', []);
      expect(view.render).not.toHaveBeenCalled();
      expect(view.$el.html()).toEqual('');
    });

  });


  describe("loading state", function() {
    var model, view;

    beforeEach(function() {

      var container = $('<div>').css('height', '200px');

      map = new cdb.geo.Map();

      mapView = new cdb.geo.MapView({
        el: container,
        map: map
      });

      model = new cdb.geo.ui.InfowindowModel({
        fields: [
          { value: 'Loading content...', index: null, title: null, type: 'loading'}
        ]
      });

      view = new cdb.geo.ui.Infowindow({
        model: model,
        mapView: mapView
      });

    });

    it("should show loading state", function() {
      spyOn(view, '_startSpinner');
      model.set({
        'template': 'jaja',
        'content': {
          fields: [
            { value: 'Loading content...', index: null, title: null, type: 'loading'}
          ]
        }
      });
      expect(view._startSpinner).toHaveBeenCalled();
    });

    it("should hide loading state", function() {
      model.set({
        'template': 'jaja',
        'content': {
          fields: [
            { value: 'Loading content...', index: null, title: null, type: 'loading'}
          ]
        }
      });

      spyOn(view, '_stopSpinner');
      model.set({
        'template': 'jaja',
        'content': {
          fields: [
            { value: 'Any kind of value', index: 0, title: 'TITLE'}
          ]
        }
      });
      expect(view._stopSpinner).toHaveBeenCalled();
    });

    it("shouldn't show the loader if there are several fields", function() {
      spyOn(view, '_stopSpinner');
      spyOn(view, '_startSpinner');
      model.set({
        'template': 'jaja',
        'content': {
          fields: [
            { value: 'Loading content...', index: null, title: null, type: 'loading'},
            { value: 'Loading content...', index: null, title: null, type: 'loading'}
          ]
        }
      });
      expect(view._stopSpinner).toHaveBeenCalled();
      expect(view._startSpinner).not.toHaveBeenCalled();
    });
  });


  describe("custom template", function() {
    var model, view;

    beforeEach(function() {

      var container = $('<div>').css('height', '200px');

      map = new cdb.geo.Map();

      mapView = new cdb.geo.MapView({
        el: container,
        map: map
      });

      model = new cdb.geo.ui.InfowindowModel({
        template: '<div>{{ test1 }}</div>',
        fields: [
          { title: 'test1', position: 1, value: "x" },
          { title: 'test2', position: 2, value: "b" }
        ]
      });

      view = new cdb.geo.ui.Infowindow({
        model: model,
        mapView: mapView
      });

    });

    it("should compile the template when changes", function() {
      view.compile = function() {};
      spyOn(view, 'compile');
      view.model.bind('change:template', view.compile);
      view.model.set('template', '<div>{{test1}}</div>');
      expect(view.compile).toHaveBeenCalled();
    });

    it("should render properly when there is only a field without title", function() {
      model.set({
        fields: [
          { name: 'test1', position: 0, title: false },
        ],
        content: {
          fields: [
            { title: 'test1', position: 0, value: 'jamon' },
          ]
        }
      });

      var new_view = new cdb.geo.ui.Infowindow({
        model: model,
        mapView: mapView
      });

      expect(new_view.render().$el.html()).toBe('<div>jamon</div>');
    });

    it("shouldn't sanitize the fields", function() {
      spyOn(view, '_sanitizeField');
      view.render();
      expect(view._sanitizeField).not.toHaveBeenCalled();
    });
  });
  

  describe("image template", function() {
    var model, view, container, fields, fieldsWithoutURL, url;

    beforeEach(function() {

      url = "http://assets.javierarce.com/lion.png";

      container = $('<div>').css('height', '200px');

      fields = [
        { title: 'test1', position: 1, value: url },
        { title: 'test2', position: 2, value: "b"}
      ];

      fieldsWithoutURL = [
        { title: 'test1', position: 1, value: "x" },
        { title: 'test2', position: 2, value: "b"}
      ];

      map = new cdb.geo.Map();

      mapView = new cdb.geo.MapView({
        el: container,
        map: map
      });

      model = new cdb.geo.ui.InfowindowModel({
        content: {
        fields: fields
        }
      });

      view = new cdb.geo.ui.Infowindow({
        model: model,
        mapView: mapView
      });

    });

    it("should get the cover url", function() {
      expect(view._getCoverURL()).toEqual(url);
    });

    it("should validate the cover url", function() {
      var url = view._getCoverURL();
      expect(view._isValidURL(url)).toEqual(true);
    });

    it("should detect if the infowindow has a cover", function() {
      model.set('template', '<div class="cartodb-popup header" data-cover="true"><div class="cover"></div></div>');
      expect(view._containsCover()).toEqual(true);
    });

    it("should append the image", function() {
      model.set('template', '<div class="cartodb-popup header" data-cover="true"><div class="cover"></div></div>');
      expect(view.$el.find("img").length).toEqual(1);
    });

    it("if the image is invalid it shouldn't append it", function() {
      model.set("content", { fields: fieldsWithoutURL });
      model.set('template', '<div class="cartodb-popup header" data-cover="true"><div class="cover"></div></div>');
      expect(view.$el.find("img").length).toEqual(0);
    });

    it("if the theme doesn't have cover don't append the image", function() {
      model.set("content", { fields: fields });
      model.set('template', '<div class="cover"></div>');
      expect(view.$el.find("img").length).toEqual(0);
    });

  });

});
