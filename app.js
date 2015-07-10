var Division = Backbone.Model.extend();
var Country = Backbone.Collection.extend({
    model: Division,
    initialize: function() {
        this.fetchUnits();
        this.fetchDivisions();
    },
    fetchUnits: function() {
        var that = this;
        $.ajax({
            // url: "http://geotag.developmentcheck.org/"+that.name+"/units/"+fromDivision,
            url: 'np.units.json',
            dataType:'json',
            success: function(units) {
                // $.each(units, function(k, val) {
                //     var divlevel=val.ad_administrative_level;
                //     var divname=val.ad_administrative_level_name;
                //     that.units[parseInt(divlevel)]=divname;
                // });
            },
            error: function(request, status, error) {
                console.log(error)
                console.log(request.responseText);
            }
        });
    },
    fetchDivisions: function() {
        var that = this;
        var fromDivision = 3;
        $.ajax({
            // url: "http://geotag.developmentcheck.org/"+that.name+"/divisions/"+fromDivision,
            url: 'np.divisions-all.json',
            dataType:'json',
            success: function(divisions) {
                _.each(divisions, function(d) {
                    that.add({name: d.name, divisions: d.divisions})
                });
            }
        });
    }, 
    getDivisions1: function() {
        return this.models;
    },
    getDivisions2: function(locationModel) {
        return this.findWhere({name: locationModel.get('division1')}).get('divisions').data;
    },
    getDivisions3: function(division1Name, division2Name) {
        return _.findWhere(this.getDivisions2(locationModel), {name: locationModel.get('division2')}).divisions.data;
    },
    getDivisions4: function(division1Name, division2Name, division3Name) {
        return _.findWhere(this.getDivisions3(locationModel), {name: locationModel.get('division3')}).divisions.data;
    },
});

var LocationModel = Backbone.Model.extend({
    defaults: {
        country: '',
        division1: '',
        division2: '',
        division3: '',
        division4: '',
        lat: '28.304380682962783',
        lng: '4.21875',
        zoom: 1
    },
    initialize: function() {
        this.on('change:country', function(){
            this.set('division1','');
            this.fetchGeoCode('nepal');      
        });
        this.on('change:division1', function(){
            this.set('division2','');
            this.fetchGeoCode(this.get('division1'));
        });
        this.on('change:division2', function(){
            this.set('division3','');
            this.fetchGeoCode(this.get('division2'));
        });
        this.on('change:division3', function(){
            this.set('division4','');
            this.fetchGeoCode(this.get('division3'));
        });
        this.on('change:division4', function(){
            this.fetchGeoCode(this.get('division4'));
        });
    },
    fetchGeoCode: function(address) {
        var self = this;
        $.ajax({
            url: "http://geotag.developmentcheck.org/"+self.get('country')+"/latlong/"+address,
            dataType:'jsonp',
            cache:true,
            success: function(result) {
                if(result.success==1) {
                    self.set({lat: result.lat, lng: result.lng, zoom: parseInt(result.zoomlevel)});
                }
            }
        });
    },
    getGoogleMapLatLng: function() {
        return new google.maps.LatLng(this.get('lat'), this.get('lng'));
    },
    setLatLng: function(lat, lng) {
        this.set({lat: lat, lng: lng});
    }
});

var CountryFormView = Backbone.View.extend({
    el: '#country-form',
    events: {
        'change #country-name': 'countrySelected',
        'change #division-1': 'division1Selected',
        'change #division-2': 'division2Selected',
        'change #division-3': 'division3Selected',
        'change #division-4': 'division4Selected',
    },
    initialize: function(options) {
        this.locationModel = options.locationModel;
        _.bindAll(this, 'countrySelected', 'division1Selected', 'division2Selected', 'division3Selected', 'division4Selected');
    },
    countrySelected: function() {
        this.showFirstHideRestSelect('#division-1', '#division-2', '#division-3', '#division-4');   
        this.removeSelectOptions('#division-1', '#division-2', '#division-3', '#division-4');   
        this.locationModel.set('country', this.$('#country-name option:selected').attr('id'));
        _.each(this.collection.getDivisions1(), function(model) {
            this.$('#division-1').append("<option id='"+model.get('name')+"'>"+model.get('name')+"</option>");
        });
    },
    division1Selected: function() {
        this.showFirstHideRestSelect('#division-2', '#division-3', '#division-4');
        this.removeSelectOptions('#division-2', '#division-3', '#division-4');
        this.locationModel.set('division1', this.$('#division-1 option:selected').val());
        var divisions2 = this.collection.getDivisions2(this.locationModel);
        _.each(divisions2, function(d) {
            this.$('#division-2').append("<option id=''>"+d.name+"</option>");
        });
    },
    division2Selected: function() {
        this.showFirstHideRestSelect('#division-3', '#division-4');
        this.removeSelectOptions('#division-3', '#division-4');
        this.locationModel.set('division2', this.$('#division-2 option:selected').val());
        var divisions3 = this.collection.getDivisions3(this.locationModel);
        _.each(divisions3, function(d) {
            this.$('#division-3').append("<option id=''>"+d.name+"</option>");
        });
    },
    division3Selected: function() {
        this.showFirstHideRestSelect('#division-4');
        this.removeSelectOptions('#division-4');
        this.locationModel.set('division3', this.$('#division-3 option:selected').val());
        var divisions4 = this.collection.getDivisions4(this.locationModel);
        _.each(divisions4, function(d) {
            this.$('#division-4').append("<option id=''>"+d.name+"</option>");
        });
    },
    division4Selected: function() {
        var div1Name = this.$('#division-1 option:selected').val();
        var div2Name = this.$('#division-2 option:selected').val();
        var div3Name = this.$('#division-3 option:selected').val();
        var div4Name = this.$('#division-4 option:selected').val();
        this.locationModel.set('division4', div4Name);
    },
    removeSelectOptions: function() {
        _.each(arguments, function(selectElementId) {
            this.$(selectElementId).find('option').remove();
        });
    },
    showFirstHideRestSelect: function() {
        var firstSelectId = arguments[0];
        this.$(firstSelectId).show();

        var restSelectIds = Array.prototype.slice.call(arguments, 1)
        _.each(restSelectIds, function(selectElementId) {
            this.$(selectElementId).hide();
        });
    }
});

var MapView = Backbone.View.extend({
    initialize: function(options) {        
        this.locationModel = options.locationModel;
        this.listenTo(this.locationModel, 'change', this.render);
        this.marker = null;
        var self = this;
        this.map = new google.maps.Map(document.getElementById("map"), {
            zoom: self.locationModel.get('zoom'),
            center: self.locationModel.getGoogleMapLatLng(),
            mapTypeId: google.maps.MapTypeId.ROADMAP
        });
        google.maps.event.addListener(this.map, 'click', function(event) {
            setTimeout(function() { 
                self.locationModel.setLatLng(event.latLng.A, event.latLng.F);
                self.render();
            },500);
        });        
    },
    placeMarker: function() {
        if(this.marker) this.marker.setMap(null);
        this.marker = new google.maps.Marker({
            position: this.locationModel.getGoogleMapLatLng(),
            map:this.map
        });
    },
    render: function() {
        this.map.setZoom(this.locationModel.get('zoom'));
        this.map.panTo(this.locationModel.getGoogleMapLatLng());
        this.placeMarker();
    },
});