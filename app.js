// "use strict";
var Division = Backbone.Model.extend();
var Country = Backbone.Collection.extend({
    model: Division,
    code: "",
    setCountryCode: function(code) {
        this.code = code;
        this.count = 0;
        if(code) {
            this.fetchUnits();
            this.fetchDivisions();
        }
    },
    getCountryCode: function() {
        return this.code;
    },
    getDivisionLevel: function() {
        if(this.code == "np") return 3;
        else return 1;
    },
    fetchUnits: function() {
        var that = this;
        $.ajax({
            // url: "http://geotag.developmentcheck.org/"+that.getCountryCode()+"/units/"+that.getDivisionLevel(),
            url: "np.units.json",
            dataType:"json",
            cache: true,
            success: function(units) {
                that.units = {};
                $.each(units, function(k, val) {
                    var divlevel=val.ad_administrative_level;
                    var divname=val.ad_administrative_level_name;
                    that.units[parseInt(divlevel)]=divname;
                });
                that.count += 1;
                if(that.count == 2) {
                    //to make sure that both the fetches are done. Need to fix this.
                    that.trigger("collectionCompleted");
                }                
            },
            error: function(request, status, error) {
                console.log(error)
            }
        });
    },
    fetchDivisions: function() {
        var that = this;
        $.ajax({
            // url: "http://geotag.developmentcheck.org/"+that.getCountryCode()+"/divisions/"+that.getDivisionLevel(),
            url: "np.divisions.json",
            dataType:"json",
            cache: true,
            success: function(divisions) {
                that.reset();
                _.each(divisions, function(d) {
                    that.add({name: d.name, divisions: d.divisions})
                });
                that.count += 1;
                if(that.count == 2) {
                    //to make sure that both the fetches are done. Need to fix this.
                    that.trigger("collectionCompleted");
                }                
            },
            error: function(request, status, error) {
                console.log(error)
            }
        });
    }, 
    getDivisions1: function() {
        return this.models;
    },
    getDivisions2: function(locationModel) {
        return this.findWhere({name: locationModel.get("division1")}).get("divisions").data;
    },
    getDivisions3: function(locationModel) {
        return _.findWhere(this.getDivisions2(locationModel), {name: locationModel.get("division2")}).divisions.data;
    },
    getDivisions4: function(locationModel) {
        return _.findWhere(this.getDivisions3(locationModel), {name: locationModel.get("division3")}).divisions.data;
    },
    getUnit1: function() {
        return this.units[1];
    },
    getUnit2: function() {
        return this.units[2];
    },
    getUnit3: function() {
        return this.units[3];
    },
    getUnit4: function() {
        return this.units[4];
    },
});

var LocationModel = Backbone.Model.extend({
    defaults: {
        country: "",
        division1: "",
        division2: "",
        division3: "",
        division4: "",
        lat: "28.304380682962783",
        lng: "4.21875",
        zoom: 1
    },
    initialize: function() {
        this.on("change:country", function(){
            this.set("division1","");
            this.fetchGeoCode(this.get("country"));      
        });
        this.on("change:division1", function(){
            this.set("division2","");
            this.fetchGeoCode(this.get("division1"));
        });
        this.on("change:division2", function(){
            this.set("division3","");
            this.fetchGeoCode(this.get("division2"));
        });
        this.on("change:division3", function(){
            this.set("division4","");
            this.fetchGeoCode(this.get("division3"));
        });
        this.on("change:division4", function(){
            this.fetchGeoCode(this.get("division4"));
        });
    },
    fetchGeoCode: function(address) {
        if(address) {
            var self = this;
            $.ajax({
                url: "http://geotag.developmentcheck.org/"+self.get("country")+"/latlong/"+address,
                dataType:"jsonp",
                cache:true,
                success: function(result) {
                    if(result.success==1) {
                        self.set({lat: result.lat, lng: result.lng, zoom: parseInt(result.zoomlevel)});
                    }
                }
            });
        }
    },
    getGoogleMapLatLng: function() {
        return new google.maps.LatLng(this.get("lat"), this.get("lng"));
    },
    setLatLng: function(lat, lng) {
        this.set({lat: lat, lng: lng});
    }
});

var CountryFormView = Backbone.View.extend({
    el: "#country-form",
    events: {
        "change #country-name": "countrySelected",
        "change #division-1-select": "division1Selected",
        "change #division-2-select": "division2Selected",
        "change #division-3-select": "division3Selected",
        "change #division-4-select": "division4Selected",
    },
    initialize: function(options) {
        this.locationModel = options.locationModel;
        this.listenTo(this.collection, "collectionCompleted", this.collectionLoaded);
        _.bindAll(this, "countrySelected", "division1Selected", "division2Selected", "division3Selected", "division4Selected", "collectionLoaded");
    },
    countrySelected: function() {
        this.locationModel.set("country", this.$("#country-name option:selected").attr("id"));
        this.hideAllSelect("#division-1", "#division-2", "#division-3", "#division-4");   
        this.removeSelectOptions("#division-1", "#division-2", "#division-3", "#division-4");   
        var self = this;
        if(this.locationModel.get("country")) {
            this.collection.setCountryCode(this.locationModel.get("country"));
        }
    },
    collectionLoaded: function() {
        this.hideAllSelect("#division-1", "#division-2", "#division-3", "#division-4");
        this.removeSelectOptions("#division-1", "#division-2", "#division-3", "#division-4");
        this.showSelect("#division-1");
        this.$("#division-1-select").append("<option id=''>Select One</option>");
        _.each(this.collection.getDivisions1(), function(d) {
            this.$("#division-1-select").append("<option id='" + d.get("name") + "'>" + d.get("name") + "</option>");
        });
        this.$("#division-1 label").html(this.collection.getUnit1());
    },
    division1Selected: function() {
        this.hideAllSelect("#division-2", "#division-3", "#division-4");
        this.removeSelectOptions("#division-2", "#division-3", "#division-4");
        this.locationModel.set("division1", this.$("#division-1-select option:selected").attr("id"));
        var divisions2 = this.collection.getDivisions2(this.locationModel);
        if(divisions2 && divisions2.length) {
            this.showSelect("#division-2");
            this.$("#division-2-select").append("<option id=''>Select One</option>");
            _.each(divisions2, function(d) {
                this.$("#division-2-select").append("<option id='" + d.name + "'>" + d.name + "</option>");
            });
            this.$("#division-2 label").html(this.collection.getUnit2());
        }
    },
    division2Selected: function() {
        this.hideAllSelect("#division-3", "#division-4");
        this.removeSelectOptions("#division-3", "#division-4");
        this.locationModel.set("division2", this.$("#division-2-select option:selected").attr("id"));
        var divisions3 = this.collection.getDivisions3(this.locationModel);
        if(divisions3 && divisions3.length) {
            this.showSelect("#division-3");
            this.$("#division-3-select").append("<option id=''>Select One</option>");
            _.each(divisions3, function(d) {
                this.$("#division-3-select").append("<option id='" + d.name + "'>" + d.name + "</option>");
            });
            this.$("#division-3 label").html(this.collection.getUnit3());
        }
    },
    division3Selected: function() {
        this.hideAllSelect("#division-4");
        this.removeSelectOptions("#division-4");
        this.locationModel.set("division3", this.$("#division-3-select option:selected").attr("id"));
        var divisions4 = this.collection.getDivisions4(this.locationModel);
        if(divisions4 && divisions4.length) {
            this.showSelect("#division-4");
            this.$("#division-4-select").append("<option id=''>Select One</option>");
            _.each(divisions4, function(d) {
                this.$("#division-4-select").append("<option id='" + d.name + "'>" + d.name + "</option>");
            });
            this.$("#division-4 label").html(this.collection.getUnit4());
        }
    },
    division4Selected: function() {
        this.locationModel.set("division4", this.$("#division-4-select option:selected").attr("id"));
    },
    hideAllSelect: function() {
        _.each(arguments, function(selectElementId) {
            this.$(selectElementId).hide();
        });
    },
    showSelect: function() {
        _.each(arguments, function(selectElementId) {
            this.$(selectElementId).show();
        });
    },
    removeSelectOptions: function() {
        _.each(arguments, function(selectElementId) {
            this.$(selectElementId).find("option").remove();
        });
    }
});

var MapView = Backbone.View.extend({
    initialize: function(options) {
        this.locationModel = options.locationModel;
        this.listenTo(this.locationModel, "change", this.render);
        this.marker = null;
        var self = this;
        this.map = new google.maps.Map(document.getElementById("map"), {
            zoom: self.locationModel.get("zoom"),
            center: self.locationModel.getGoogleMapLatLng(),
            mapTypeId: google.maps.MapTypeId.ROADMAP
        });
        google.maps.event.addListener(this.map, "click", function(event) {
            setTimeout(function() {
                self.locationModel.set({"zoom": this.map.getZoom()});
                self.locationModel.setLatLng(event.latLng.A, event.latLng.F);
                self.render();
            }, 500);
        });
    },
    placeMarker: function() {
        if(this.marker) this.marker.setMap(null);
        this.marker = new google.maps.Marker({
            position: this.locationModel.getGoogleMapLatLng(),
            map: this.map
        });
    },
    render: function() {
        this.map.setZoom(this.locationModel.get("zoom"));
        this.map.panTo(this.locationModel.getGoogleMapLatLng());
        this.placeMarker();
    }
});
