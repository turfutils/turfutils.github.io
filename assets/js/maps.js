var map;
var ajaxRequest;
var points;
var plotlayers = [];

var progress = document.getElementById('progress');
var progressBar = document.getElementById('progress-bar');
var markers = L.markerClusterGroup({
    chunkedLoading: true,
    disableClusteringAtZoom: 16,
    maxClusterRadius: 40,
    spiderfyOnMaxZoom: true
});

var clusterIcon = L.divIcon({
    className: 'marker-cluster marker-cluster-small',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    html: '<div><span></span></div>'
});
var markerOptions = {'className': 'map_popup', autoPanPaddingTopLeft: [40, 5]};

var disable_load = 0;

function initmap() {
    ajaxRequest = getXmlHttpObject();
    if (ajaxRequest == null) {
        alert("This browser does not support HTTP Request");
        return;
    }

    // Map setup
    map = new L.Map('map_canvas', {
        fullscreenControl: true,
        fullscreenControlOptions: {
            position: 'topleft'
        }
    });
    map.on("locationerror", function(e){
       
    });

    var lc = L.control.locate({
        position: 'bottomright',
        strings: {
            title: "Min position",
            setView: "untilPanOrZoom"
        }
    }).addTo(map);

    // create the tile layer with correct attribution
    var osmUrl = '//kvmmap.se/hot/{z}/{x}/{y}.png';
    var osmAttrib = 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors';
    var osm = new L.TileLayer(osmUrl, {minZoom: 4, maxZoom: 17, attribution: osmAttrib});

    if (typeof mapFitBounds !== 'undefined') {
        //map.setView(new L.LatLng(mapStartLat, mapStartLng), 10);
        map.fitBounds(mapFitBounds);
    } else if (typeof mapStartLatLng !== 'undefined') {
        map.setView(mapStartLatLng, 15);
    } else {
        map.setView(new L.LatLng(59.324567, 18.07308), 5); // Most of Sweden
        // Find real location now
        lc.start();
    }
    map.addLayer(osm);

    askForPlots();
    map.on('moveend', onMapMove);
    map.on('autopanstart', onAutopanStart);
    
}

function getXmlHttpObject() {
    if (window.XMLHttpRequest) {
        return new XMLHttpRequest();
    }
    if (window.ActiveXObject) {
        return new ActiveXObject("Microsoft.XMLHTTP");
    }
    return null;
}

function askForPlots() {
    if (typeof askForPlots.oldLat1 === 'undefined') {
        askForPlots.oldLat1 = '0';
        askForPlots.oldLng2 = '0';
        askForPlots.oldZoom = 0;
    }
    // request the marker info with AJAX for the current bounds
    var bounds = map.getBounds();
    var zoom = map.getZoom();
    var minll = bounds.getSouthWest();
    var maxll = bounds.getNorthEast();
    var strLat1 = (minll.lat - 0.01).toFixed(2);
    var strLng1 = (minll.lng - 0.01).toFixed(2);
    var strLat2 = (maxll.lat + 0.01).toFixed(2);
    var strLng2 = (maxll.lng + 0.01).toFixed(2);
    // Only look for new data if we moved the window enough:
    if (strLat1 !== askForPlots.oldLat1 || strLng1 !== askForPlots.oldLng2 || zoom !== askForPlots.oldZoom) {
        askForPlots.oldLat1 = strLat1;
        askForPlots.oldLng2 = strLng1;
        askForPlots.oldZoom = zoom;
        var strUrl = base_url + 'api/test' + strLat1 + '/' + strLng1 + '/' + strLat2 + '/' + strLng2 + '/' + zoom.toFixed(1);
        ajaxRequest.onreadystatechange = stateChanged;
        ajaxRequest.open('GET', strUrl, true);
        ajaxRequest.send(null);
    }
}


/* Add points for clustering plugin */
function stateChanged() {
    if (ajaxRequest.readyState == 4) {
        if (ajaxRequest.status == 200) {
            if (ajaxRequest.responseText.length < 5) {
                return false;
            }
            points = eval("(" + ajaxRequest.responseText + ")");
            markers.clearLayers();

            var markerList = [];
            var marker;
            var content = '';
            for (i = 0; i < points.length; i++) {

                if (typeof points[i].MENU_TEXT !== 'undefined') {
                    content = "";
                    marker = L.marker(L.latLng(points[i].LAT, points[i].LNG), {title: points[i].NAME, alt: points[i].NAME});
                    marker.bindPopup(content, markerOptions);
                } else if (typeof points[i].BOUNDS !== 'undefined') {
                    marker = L.marker(L.latLng(points[i].LAT, points[i].LON), {icon: clusterIcon});
                    marker.BOUNDS = points[i].BOUNDS;
                } else {
                    content = "";
                    marker = L.marker(L.latLng(points[i].LAT, points[i].LON), {title: points[i].NAME, alt: points[i].NAME});
                    marker.bindPopup(content, markerOptions);
                }
                markerList.push(marker);
            }
            markers.addLayers(markerList);
            if (typeof points[0].BOUNDS !== 'undefined') {
                markers.on('click', function (a) {
                    if (typeof a.layer.BOUNDS !== 'undefined') {
                        map.fitBounds(a.layer.BOUNDS, {maxZoom: 16, animate: true, duration: 0.5, padding: [10, 10]});
                    }
                });
            }
            map.addLayer(markers);
        }
    }
}


function onMapMove(e) {
    if (disable_load === 1) {
        // Prevent popup disappearing on autopan
        disable_load = 0;
    } else {
        askForPlots();
    }
}

function onAutopanStart(e) {
    disable_load = 1;
}


var rad = function (x) {
    return x * Math.PI / 180;
};

var getDistance = function (p1, p2) {
    var R = 6378137; // Earth’s mean radius in meter
    var dLat = rad(p2.lat - p1.lat);
    var dLong = rad(p2.lng - p1.lng);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(rad(p1.lat)) * Math.cos(rad(p2.lat)) *
            Math.sin(dLong / 2) * Math.sin(dLong / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d; // returns the distance in meter
};

function nl2br(str, is_xhtml) {
    var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br ' + '/>' : '<br>';

    return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
}
