// ==UserScript==
// @name         WME BackEnd Data
// @namespace    https://github.com/thecre8r/
// @version      2018.12.28.00
// @description  Shows Hidden Attributes, AdPins, and Gas Prices for Applicable Places
// @include      https://www.waze.com/editor*
// @include      https://www.waze.com/*/editor*
// @include      https://beta.waze.com/editor*
// @include      https://beta.waze.com/*/editor*
// @exclude      https://www.waze.com/user/editor*
// @icon         data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><g><path fill="#78b0bf" d="M176 256c44.11 0 80-35.89 80-80s-35.89-80-80-80-80 35.89-80 80 35.89 80 80 80zm352-128H304c-8.84 0-16 7.16-16 16v144H64V80c0-8.84-7.16-16-16-16H16C7.16 64 0 71.16 0 80v352c0 8.84 7.16 16 16 16h32c8.84 0 16-7.16 16-16v-48h512v48c0 8.84 7.16 16 16 16h32c8.84 0 16-7.16 16-16V240c0-61.86-50.14-112-112-112z" class=""></path></g></svg>
// @author       The_Cre8r
// @require      https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// @license      GPLv3
// @connect      gapi.waze.com
// @grant        GM_xmlhttpRequest

// ==/UserScript==

/* global W */
/* global OL */
/* ecmaVersion 2017 */
/* global $ */
/* global I18n */
/* global _ */
/* global WazeWrap */
/* global require */

(function() {
    'use strict';
    localStorage.removeItem("WMEEP2_Settings");
    const STORE_NAME = "WMEBED_Settings";
    const SCRIPT_NAME = GM_info.script.name;
    const SCRIPT_VERSION = GM_info.script.version.toString();
    const UPDATE_ALERT = true;
    const USER = {name: null, rank:null};
    let SERVER = W.app.getAppRegionCode();

    let _settings = {};
    let _adPinsLayer;

    function log(msg) {
        console.log('WMEBED: ', msg);
    }

    function updateAlert() {
        log("Update Alert Ran");
        let versionChanges = [
            SCRIPT_NAME + ' v' + SCRIPT_VERSION + ' changes:',
            '- Initial Release'
        ].join('\n');
        if (localStorage === void 0) {
            return;
        }
        if (_settings.lastVersion !== SCRIPT_VERSION) {
            if (_settings.lastVersion){
                if (UPDATE_ALERT &&(_settings.lastVersion.match(/(\d+\.){2}\d+/)[0] !== SCRIPT_VERSION.match(/(\d+\.){2}\d+/)[0])) {
                    alert(versionChanges);
                }
            } else {
                alert(versionChanges);
            }
            _settings.lastVersion = SCRIPT_VERSION;
            saveSettings();
        }
    }

    function GetURLParameter(sParam)
    {
        var sPageURL = window.location.search.substring(1);
        var sURLVariables = sPageURL.split('&');
        for (var i = 0; i < sURLVariables.length; i++)
        {
            var sParameterName = sURLVariables[i].split('=');
            if (sParameterName[0] == sParam)
            {
                return sParameterName[1];
            }
        }
    }
    function getSearchServer() {
        if (SERVER == "row") {
            return "row-SearchServer";
        } else if (SERVER == "il") {
            return "il-SearchServer";
        } else {
            return "SearchServer";
        }
    }

    function requestAds(event) {
        log('Requested Ads '+event.data.source);
        if (event.data.source == 'venues'){
            let namesArray = _.uniq(W.model.venues.getObjectArray().filter(venue => WazeWrap.Geometry.isGeometryInMapExtent(venue.geometry)).map(venue => venue.attributes.name));
            log(namesArray);
        }
        else {
            let requestedName = prompt("Please enter the name of the requested ads");
            if (requestedName && requestedName.trim()) {
                let venue = {id: null, name: requestedName.trim()};
                log(`Searched for ${venue.name}`);
                getAds(get4326CenterPoint(),venue)
            }
        }
    }

    function processAdsResponse(res) {
        let venue = this.context;
        log('Venue: '+venue);
        let gapidata = $.parseJSON(res.responseText);
        log(gapidata);
        if (venue.id) {
            let ad_data = gapidata[1].find(entry => entry[3].v)[3];
            if (ad_data.v === "venues."+venue.id) {
                if (ad_data.j) {
                    ad_data.j = ad_data.j.substring(3, ad_data.length);
                    log($.parseJSON(ad_data.j));
                    log(`https://ads-resources-legacy.waze.com/resources/images/1.0/2x/${ad_data.l}.png`);
                    makeAdPin(ad_data.x, ad_data.y ,ad_data.l,"white")
                }
            }
			else if (ad_data.v.includes("venues.")) {
                if (ad_data.j) {
                    ad_data.j = ad_data.j.substring(3, ad_data.length);
                    log($.parseJSON(ad_data.j));
                    log(`https://ads-resources-legacy.waze.com/resources/images/1.0/2x/${ad_data.l}.png`);
                    makeAdPin(ad_data.x, ad_data.y ,ad_data.l,"grey")
                }
            }
            else if (ad_data.v.includes("googlePlaces.")) {
                if (ad_data.j) {
                    ad_data.j = ad_data.j.substring(3, ad_data.length);
                    log($.parseJSON(ad_data.j));
                    log(`https://ads-resources-legacy.waze.com/resources/images/1.0/2x/${ad_data.l}.png`);
                    makeAdPin(ad_data.x, ad_data.y ,ad_data.l,"blue")
                }
            }
            else {
                if (ad_data.j) {
                    ad_data.j = ad_data.j.substring(3, ad_data.length);
                    log($.parseJSON(ad_data.j));
                    log(`https://ads-resources-legacy.waze.com/resources/images/1.0/2x/${ad_data.l}.png`);
                    makeAdPin(ad_data.x, ad_data.y ,ad_data.l,"red")
                }
            }
        } else {
            let ad_data = gapidata[1].find(entry => entry[3].v)[3];
            if (ad_data.v.includes("venues.")) {
                if (ad_data.j) {
                    ad_data.j = ad_data.j.substring(3, ad_data.length);
                    log($.parseJSON(ad_data.j));
                    log(`https://ads-resources-legacy.waze.com/resources/images/1.0/2x/${ad_data.l}.png`);
                    makeAdPin(ad_data.x, ad_data.y ,ad_data.l,"white")
                }
            }
            else if (ad_data.v.includes("googlePlaces.")) {
                if (ad_data.j) {
                    ad_data.j = ad_data.j.substring(3, ad_data.length);
                    log($.parseJSON(ad_data.j));
                    log(`https://ads-resources-legacy.waze.com/resources/images/1.0/2x/${ad_data.l}.png`);
                    makeAdPin(ad_data.x, ad_data.y ,ad_data.l,"blue")
                }
            }
            else {
                if (ad_data.j) {
                    ad_data.j = ad_data.j.substring(3, ad_data.length);
                    log($.parseJSON(ad_data.j));
                    log(`https://ads-resources-legacy.waze.com/resources/images/1.0/2x/${ad_data.l}.png`);
                    makeAdPin(ad_data.x, ad_data.y ,ad_data.l,"red")
                }
            }
        }
    }

    function getAds(latlon,venue) {
       venue.name = venue.name.replace(/\([\w\W]+\)/,'');
        log('venue: '+venue.name)
        GM_xmlhttpRequest({
            url: `https://gapi.waze.com/autocomplete/q?e=NA&c=wd&sll=${latlon.lat},${latlon.lon}&s&q=${venue.name}&gxy=1`,
            context: venue,
            method: 'GET',
            onload: processAdsResponse,
            onerror: function(result) { log("error: "+ result.status) }
        })
    }

    function onAdPinLayerCheckboxChanged(checked) {
        _settings.AdPin = checked;
        saveSettings();
        _adPinsLayer.setVisibility(checked);
    }

    function setChecked(checkboxId, checked) {
        $('#WMEBED-' + checkboxId).prop('checked', checked);
        log('#WMEBED-' + checkboxId + " is " + checked);
    }

    function injectCss() {
        let css = [
            // formatting
            '#EP2-link {background-attachment:scroll;background-clip:border-box;background-color:rgb(255, 255, 255);background-image:none;background-origin:padding-box;background-position-x:0%;background-position-y:0%;background-repeat-x:;background-repeat-y:;background-size:auto;border-bottom-color:rgb(53, 65, 72);border-bottom-left-radius:8px;border-bottom-right-radius:8px;border-bottom-style:none;border-bottom-width:0px;border-image-outset:0px;border-image-repeat:stretch;border-image-slice:100%;border-image-source:none;border-image-width:1;border-left-color:rgb(53, 65, 72);border-left-style:none;border-left-width:0px;border-right-color:rgb(53, 65, 72);border-right-style:none;border-right-width:0px;border-top-color:rgb(53, 65, 72);border-top-left-radius:8px;border-top-right-radius:8px;border-top-style:none;border-top-width:0px;box-shadow:rgba(0, 0, 0, 0.1) 0px 2px 7.88233px 0px;box-sizing:border-box;color:rgb(53, 65, 72);cursor:pointer;display:inline;font-family:"Helvetica Neue", Helvetica, "Open Sans", sans-serif;font-size:13px;font-weight:400;height:30px;line-height:30px;padding-bottom:5px;padding-left:15px;padding-right:15px;padding-top:5px;text-align:center;text-decoration-color:rgb(53, 65, 72);text-decoration-line:none;text-decoration-style:solid;text-size-adjust:100%;transition-delay:0s;transition-duration:0.25s;transition-property:all;transition-timing-function:ease-in;width:auto;-webkit-tap-highlight-color:rgba(0, 0, 0, 0);}',
            '#EP2-img {padding-right: 6px;position: relative; top: -3px;}',
            '#EP2-img-fa {font-size:11px}',
            '#WMEBED-header {margin-bottom:10px;}',
            '#WMEBED-title {font-size:15px;font-weight:600;}',
            '#WMEBED-version {font-size:11px;margin-left:10px;color:#aaa;}',
            '.WMEBED-Button {font-family:"Open Sans",FontAwesome;padding-left:10px;padding-right:10px;margin-top:0px;z-index: 3;}',
            '.gas-price {text-align:center;background-attachment:scroll;background-clip:border-box;background-color:rgb(255, 255, 255);background-image:none;background-origin:padding-box;background-position-x:0%;background-position-y:0%;background-repeat-x:;background-repeat-y:;background-size:auto;border-bottom-color:rgb(61, 61, 61);border-bottom-left-radius:8px;border-bottom-right-radius:8px;border-bottom-style:none;border-bottom-width:0px;border-image-outset:0px;border-image-repeat:stretch;border-image-slice:100%;border-image-source:none;border-image-width:1;border-left-color:rgb(61, 61, 61);border-left-style:none;border-left-width:0px;border-right-color:rgb(61, 61, 61);border-right-style:none;border-right-width:0px;border-top-color:rgb(61, 61, 61);border-top-left-radius:8px;border-top-right-radius:8px;border-top-style:none;border-top-width:0px;box-shadow:rgba(0, 0, 0, 0.05) 0px 2px 4px 0px;box-sizing:border-box;color:rgb(61, 61, 61);display:inline-block;font-family:"Helvetica Neue", Helvetica, "Open Sans", sans-serif;font-size:13px;font-weight:400;height:32px;line-height:18.5714px;padding-bottom:7px;padding-left:10px;padding-right:10px;padding-top:7px;text-size-adjust:100%;width:60px;-webkit-tap-highlight-color:rgba(0, 0, 0, 0);'
        ].join(' ');
        $('<style type="text/css">' + css + '</style>').appendTo('head');
        $('<link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.6.1/css/all.css" integrity="sha384-gfdkjb5BdAXd+lj+gudLWI+BXq4IuLW5IT+brZEZsLFm++aCMlF1V92rMkPaX4PP" crossorigin="anonymous">').appendTo('head');
        log("CSS Injected");
    }


    function initTab() {
        let TESTERS = ["The_Cre8r","jm6087","DCLemur"];
        let $section = $("<div>");
        USER.name = W.loginManager.user.userName.toString();
        log (USER.name);
        function UserTest() {
            return (TESTERS.indexOf(USER.name) > -1 ? `<div class="controls-container"><input type="checkbox" id="WMEBED-Debug" value="on"><label for="WMEBED-Debug">Enable Debug Link</label></div>` : '');
        }
        $section.html([
            '<div>',
              '<div id="WMEBED-header">',
                `<span id="WMEBED-title">${SCRIPT_NAME}</span>`,
                `<span id="WMEBED-version">${SCRIPT_VERSION}</span>`,
              '</div>',
              '<form class="attributes-form side-panel-section">',
                '<div class="form-group">',
                  '<h6>On Screen AdPin Search Coming Soon...</h6>',
                  UserTest(),
                '</div>',
                '<div class="form-group">',
                  '<label class="control-label">Search for Ads</label>',
                  '<div>',
                    '<input type="button" id="WMEBED-Button-Name" value="By Name" class="btn btn-primary WMEBED-Button">',
                    '<input type="button" id="WMEBED-Button-Screen" title="Coming Soon" value="On Screen" class="btn btn-primary WMEBED-Button" disabled>',
                  '</div>',
                  '<div style="text-align:center; padding-top:20px">',
                    '<i class="fab fa-github" style="font-size: 13px; padding-right:5px"></i>',
                    '<div style="display: inline-block;">',
                      '<a target="_blank" href="https://github.com/TheCre8r/WME-BackEnd-Data/issues/new" id="WMEBED-report-an-issue">Report an Issue</a>',
                    '</div>',
                  '</div>',
                '</div>',
              '</form>',
            '</div>'
        ].join(' '));
        new WazeWrap.Interface.Tab('WMEBED', $section.html(), init);
        $('a[href$="#sidepanel-wmebed"]').html(`<i class="fas fa-bed"></i>`)
        $('a[href$="#sidepanel-wmebed"]').prop('title', 'WME BED');
        $("#WMEBED-Button-Name").click({source: "popup"},requestAds);
        $("#WMEBED-Button-Screen").click({source: "venues"},requestAds);
        if (USER.name == GM_info.script.author.toString()) {
            $('#WMEBED-Button-Screen').removeAttr("disabled");
        }
        log("Tab Initialized");
    }

    /*-- START SETTINGS --*/
    function loadSettings() {
        let loadedSettings = $.parseJSON(localStorage.getItem(STORE_NAME));
        let defaultSettings = {
            AdPin: true,
            Debug: false,
            lastVersion: 0
        };
        _settings = loadedSettings ? loadedSettings : defaultSettings;
        for (let prop in defaultSettings) {
            if (!_settings.hasOwnProperty(prop)) {
                _settings[prop] = defaultSettings[prop];
            }
        }
        log("Settings Loaded");
    }

    function saveSettings() {
        if (localStorage) {
            _settings.lastVersion = SCRIPT_VERSION;
            localStorage.setItem(STORE_NAME, JSON.stringify(_settings));
            log('Settings Saved '+ JSON.stringify(_settings));
        }
    }

    function initializeSettings() {
        loadSettings();
        updateAlert();
        setChecked('Debug', _settings.Debug);
        $('#WMEBED-Debug').change(function() {
            let settingName = "Debug";
            _settings[settingName] = this.checked;
            saveSettings();
            log(settingName + ' Checkbox');
            log(_settings[settingName]);
        });
        log("Settings Initialized");
    }

    /*-- END SETTINGS --*/

    function get4326CenterPoint() {
        let center = W.map.getCenter();
        let center4326 = WazeWrap.Geometry.ConvertTo4326(center.lon, center.lat);
        let lat = Math.round(center4326.lat * 1000000) / 1000000;
        let lon = Math.round(center4326.lon * 1000000) / 1000000;
        return new OL.LonLat(lon, lat);
    }

    function makeAdPin(x,y,logo,color) {
        log(`Make Ad Pin at https://www.waze.com/en-US/editor/?lon=${x}&lat=${y}&zoom=${W.map.zoom}`)

        let graphicUrl = `https://ads-resources-legacy.waze.com/resources/images/1.0/2x/${logo}.png`;
        log(graphicUrl);
        let adpinPt=new OL.Geometry.Point(x,y);
        adpinPt.transform(W.map.displayProjection, W.map.projection);
        //adpinPt.transform(W.map.projection, W.map.displayProjection);
        let point = new OL.Geometry.Point(adpinPt.x, adpinPt.y);
        let style = {strokeColor: color,
                     strokeWidth: '2',
                     strokeDashstyle: 'solid',
                     pointRadius: '15',
                     fillOpacity: '0'};
        let feature = new OL.Feature.Vector(point, {}, style);

        let adpinPtOffset1 = adpinPt.clone();
        let adpinPtOffset2 = adpinPt.clone();
        adpinPtOffset1.y += 20;
        //adpinPtOffset1.y += 16;
        adpinPtOffset2.y += 20;
        let marker1 = new OL.Feature.Vector(adpinPtOffset1, null, {
            strokeColor: color,
            fillColor: 'white',
            strokeWidth: '45',
            strokeDashstyle: 'solid',
            strokeDashstyle: 'dash',
            pointRadius: '4',
            fill: true,
            stroke: true,
            //externalGraphic:'https://www.waze.com/brands/static/images/animations/pin_icon2.png',
            //graphicWidth: 50,
            fillOpacity: '1'
        });
        let marker2 = new OL.Feature.Vector(adpinPtOffset2, null, {
            externalGraphic: graphicUrl,
            graphicWidth: 38,
            graphicHeight: 28,
            fillOpacity: 1
        });


        let lsLine1 = new OL.Geometry.LineString([adpinPt, adpinPtOffset1]);

        let lineFeature1 = new OL.Feature.Vector(lsLine1, {}, {
            strokeWidth: 3,
            strokeDashstyle: 'solid',
            strokeColor: 'white',
            strokeColor: color,
            // label: label,
            labelYOffset: 45,
            fontColor: 'white',
            fontWeight: 'bold',
            labelOutlineColor: "#000",
            labelOutlineWidth: 4,
            fontSize: '18'
        });

        _adPinsLayer.addFeatures([lineFeature1, feature, marker1, marker2]);
    }
    function getgasprice(link,type){
        //type = "gas.premium";
        //one day add <sup style="top:-0.3em;">9</sup> for the last nine
        if (link.toString().indexOf("venues.-") >= 0) {
            log("No Gas Prices since there is no venue")
            return `N/A`;
        }
        else {
        $.getJSON(link,function(data) {
            if (data.venue.changed_products){
                log (data.venue.changed_products);
                let changed_products = data.venue.changed_products.filter(function(i){return i.key == type;})[0];
                let cost = (changed_products && changed_products.value.price) ? data.venue.currency[0].toString()+String.fromCharCode(160)+changed_products.value.price : "N/A";
                type = type.replace(/\./,'-').toString();
                $('#'+type).text(cost);
                log (cost)
            } else if (data.venue.product) {
                log (data.venue.product);
                let product = data.venue.product.filter(function(i){return i.id == type;})[0];
                let cost = (product && product.price) ? data.venue.currency[0].toString()+String.fromCharCode(160)+product.price : "N/A";
                type = type.replace(/\./,'-').toString();
                $('#'+type).text(cost);
                log (cost)
            } else {
                type = type.replace(/\./,'-').toString();
                $('#'+type).text("N/A");
            }
        });
        }
    }

    function getlastupdate(link){
        let date;
        let user;
        let userid;
        if (link.toString().indexOf("venues.-") >= 0) {
            log("No gas update time since there is no venue")
            return `Why would you even think there are gas prices yet? You haven't even saved the place yet. - <a target="_blank" href="https://www.waze.com/user/editor/jm6087">jm6087</a>`;
        }
        else {
        $.getJSON(link,function(data) {
            if (data.venue.changed_products) {
                log("venue.changed_products")
                log(data.venue.changed_products)
                if (data.venue.changed_products.filter(function(i){return i.key == "gas.regular";})[0]) {
                    date = data.venue.changed_products.filter(function(i){return i.key == "gas.regular";})[0].value.updateTime;
                    user = data.venue.changed_products.filter(function(i){return i.key == "gas.regular";})[0].value.userName;
                    userid = data.venue.changed_products.filter(function(i){return i.key == "gas.regular";})[0].value.userId;
                } else {
                    date = data.venue.changed_products.filter(function(i){return i.key == "gas.95";})[0].value.updateTime;
                    user = data.venue.changed_products.filter(function(i){return i.key == "gas.95";})[0].value.userName;
                    userid = data.venue.changed_products.filter(function(i){return i.key == "gas.95";})[0].value.userId;
                }
                date = timeConverter(date);
                log (date)
                if (user && date){
                    $('#gas-update-time').html(`Updated: ${date} by <a target="_blank" href="https://www.waze.com/user/editor/${user}">${user}</a>`);
                } else {
                    $('#gas-update-time').html(`Updated: ${date} by ${userid} </a>`);
                }
            } else if (data.venue.product) {
                log (data.venue.product);
                if (data.venue.changed_products.filter(function(i){return i.key == "gas.regular";})[0]) {
                    date = data.venue.product.filter(function(i){return i.id == "gas.regular";})[0].last_updated;
                    user = data.venue.product.filter(function(i){return i.id == "gas.regular";})[0].updated_by;
                } else {
                    date = data.venue.product.filter(function(i){return i.id == "gas.95";})[0].last_updated;
                    user = data.venue.product.filter(function(i){return i.id == "gas.95";})[0].updated_by;
                }
                date = timeConverter(date);
                log (date)
                if (user && date){
                    $('#gas-update-time').html(`Updated: ${date} by <a target="_blank" href="https://www.waze.com/user/editor/${user}">${user}</a>`);
                } else {
                    $('#gas-update-time').html(`Updated: ${date} by Unknown User </a>`);
                }
            } else {
                $('#gas-update-time').html(`Updated: Never</a>`);
            }
        });
        }
    }
    function timeConverter(UNIX_timestamp){
        var a = new Date(UNIX_timestamp);
        var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        var year = a.getFullYear();
        var month = months[a.getMonth()];
        var date = a.getDate();
        var hour = a.getHours();
        var min = a.getMinutes();
        if (min.toString().length == 1) {
            min = "0" + min;
        }
        var sec = a.getSeconds();
        if (sec.toString().length == 1) {
            sec = "0" + sec;
        }
        //December 08, 2018
        var time = month + ' ' + date + ', ' + year + ' ' + hour + ':' + min;
        return time;
    }
    function insertExternalProviders2(){
        let latlon = get4326CenterPoint();
        let venue = W.selectionManager.getSelectedFeatures()[0].model.attributes;
        let link = `https://${window.location.hostname}/${getSearchServer()}/mozi?lon=${latlon.lon}&lat=${latlon.lat}&format=PROTO_JSON_FULL&venue_id=venues.${venue.id}`;
        //if (loadedsettings.debug)
        //    log("loadedsettings.debug " + loadedsettings.debug);
        function UserTest1() {
            return (_settings.Debug == true ? `target="_blank"` : '');
        }
        function UserTest2() {
            return (_settings.Debug == true ? `href=`+link : 'style="cursor: context-menu;"');
        }
        let $EP2 = $(`<div class="form-group" id="ExternalProviders2"><label class="control-label">External Providers (Read Only)</label><div id="EP2-items"><div id="EP2-txt"><a `+UserTest1()+` id="EP2-link" `+UserTest2()+`>None</a></div></div>`);
        if(W.selectionManager.getSelectedFeatures()[0].model.type === "venue") {
            if (W.selectionManager.getSelectedFeatures()[0].model.attributes.categories.indexOf("GAS_STATION") >= 0){
                getlastupdate(link)
                $('.tabs-container ul').append('<li><a data-toggle="tab" href="#landmark-gas"><i class="fas fa-gas-pump"></i></a></li>');
                if (SERVER == "usa") {
                    $('.landmark').find('.tab-content').append(
                        `<div class="tab-pane" id="landmark-gas">
                          <div>
                           <form class="attributes-form">
                           <div class="side-panel-section">
                             <div class="form-group">
                               <label class="control-label">Gas Prices</label>
                               <div style="text-align:center">
                                 <div style="display: inline-block;">
                                   <div class="gas-price" id="gas-regular">${getgasprice(link,"gas.regular")}</div>
                                   <span class="gas-price-text"style="display: block;text-align: center;font-weight: bold;font-size: 10px;">Regular</span>
                                 </div>
                                 <div style="display: inline-block;">
                                   <div class="gas-price" id="gas-midgrade">${getgasprice(link,"gas.midgrade")}</div>
                                   <span style="display: block;text-align: center;font-weight: bold;font-size: 10px;">Midgrade</span>
                                 </div>
                                 <div style="display: inline-block;">
                                   <div class="gas-price" id="gas-premium">${getgasprice(link,"gas.premium")}</div>
                                   <span style="display: block;text-align: center;font-weight: bold;font-size: 10px;">Premium</span>
                               </div>
                               <div style="display: inline-block;">
                                 <div class="gas-price" id="gas-diesel">${getgasprice(link,"gas.diesel")}</div>
                                 <span style="display: block;text-align: center;font-weight: bold;font-size: 10px;">Diesel</span>
                               </div>
                             </div>
                           </div>
                           <ul class="additional-attributes list-unstyled side-panel-section">
                             <li id="gas-update-time">${getlastupdate(link)}</li>
                           </ul>
                         </div>
                       </div>
                      </div>`
                );
                } else if (SERVER == "row") {
                    $('.landmark').find('.tab-content').append(
                        `<div class="tab-pane" id="landmark-gas">
                          <div>
                           <form class="attributes-form">
                           <div class="side-panel-section">
                             <div class="form-group">
                               <label class="control-label">Gas Prices</label>
                               <div style="text-align:center">
                                 <div style="display: inline-block;">
                                   <div class="gas-price" id="gas-95">${getgasprice(link,"gas.95")}</div>
                                   <span class="gas-price-text"style="display: block;text-align: center;font-weight: bold;font-size: 10px;">Super 95</span>
                                 </div>
                                 <div style="display: inline-block;">
                                   <div class="gas-price" id="gas-98">${getgasprice(link,"gas.98")}</div>
                                   <span style="display: block;text-align: center;font-weight: bold;font-size: 10px;">Super 98</span>
                                 </div>
                                 <div style="display: inline-block;">
                                   <div class="gas-price" id="gas-lpg">${getgasprice(link,"gas.lpg")}</div>
                                   <span style="display: block;text-align: center;font-weight: bold;font-size: 10px;">LPG</span>
                               </div>
                               <div style="display: inline-block;">
                                 <div class="gas-price" id="gas-diesel">${getgasprice(link,"gas.diesel")}</div>
                                   <span style="display: block;text-align: center;font-weight: bold;font-size: 10px;">Diesel</span>
                                 </div>
                               </div>
                             </div>
                             <ul class="additional-attributes list-unstyled side-panel-section">
                             <li id="gas-update-time">${getlastupdate(link)}</li>
                           </ul>
                         </div>
                       </div>
                      </div>`
                    );
                } else {
                    $('.landmark').find('.tab-content').append(
                        `<div class="tab-pane" id="landmark-gas">
                          <div>
                           <form class="attributes-form">
                           <div class="side-panel-section">
                             <div class="form-group">
                               <label class="control-label">Gas Prices</label>
                               <div style="text-align:center;padding-top:20px">
                               Gas Prices are not available in your area.<br />Press button below to help out!
                               <div style="text-align:center;padding-top:20px">
                                 <i class="fab fa-github" style="font-size: 13px; padding-right:5px"></i>
                                 <div style="display: inline-block">
                                   <a target="_blank" href="https://github.com/TheCre8r/WME-BackEnd-Data/issues/new?title=Missing%20Gas%20Prices&body=${encodeURIComponent("Permalink: "+$(".WMEFP-GLOBAL-PL").context.URL.toString())}" id="WMEBED-report-an-issue">Report an Issue</a>
                                 </div>
                               </div>
                             </div>
                           </ul>
                         </div>
                       </div>
                      </div>`
                    );
                }
            }
            let spot = $('#landmark-edit-general > form > div').length - 1;
            $('#landmark-edit-general > form > div:nth-child('+spot+')').after($EP2);
            log("Button Added");
            getAds(latlon,venue);
            if (link.toString().indexOf("venues.-") >= 0) {
                return;
            } else {
                $.getJSON(link, function(data) {
                    if (data.venue.external_providers) {
                        log('JSON External Providers ' + data.venue.external_providers.length)
                    } else {
                        log('JSON External Providers 0')
                    }
                    let i = 0;
                    let count = 0;
                    while (i < data.venue.external_providers.length) {
                        if (data.venue.external_providers[i].provider === "Google") {
                            log("Google Skipped");
                        } else {
                            count++;
                            if (count === 1) {
                                $("#EP2-link").text(data.venue.external_providers[i].provider);
                                if (data.venue.external_providers[i].provider == "Yext") {
                                    $("#EP2-link").prepend('<img id="EP2-img" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAYdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjEuM40k/WcAAAF+SURBVChTPY87T9xAFIXn7xGvH7BZEvGwPc4+gKy91mSBgjIpoSOioIiEUqRIlCIIgRQaFAUh0dBQJlRICEUiWTwPz9w7jEHKreZqzrnnO2S+PwqTMoxf31XcWrCPA6Dfbr73F4ZBUvw4vyBSillaeHTcpgXnUmvtFBNVtyjzUzbfzRE1sagrXrcH7Fk2bi30QPE/XE53WWew0ekzpWtrDUEEtPbz4XHg7mXj3b1Pk3sepWWQlFXz5wCAACJa0Eb7c90gHfnpSBj8fX3z7ftPa5STWYtEoWlQ0UolwjQPMtam+d9KOvP/HqQGsG5Hy5WI0qHj9eIh1wa1MU9+J2oMxhoNbboc0WKKMqH05a+rj18PEJ2uCSEOyL2/7B8FLqu3vvNh765SQZw/H6xLhwuqEblcCRBlpUfZ1AuKWN8LObu01oqZv7isH8kIlyJMVrzszUySQ1MVAWAipEcL/9Xqy35RgyHpSulnLKLl7b/qCdMNGPlua9uVDSk7OT17AAK+PGNnA1kxAAAAAElFTkSuQmCC">');
                                } else if (data.venue.external_providers[i].provider == "MapFuel") {
                                    $("#EP2-link").prepend('<i id="EP2-img-fa" class="fas fa-gas-pump" style="font-size: 13px;"></i> ');
                                } else if (data.venue.external_providers[i].provider == "WazeAds") {
                                    $("#EP2-link").prepend('<i id="EP2-img-fa" class="fas fa-ad" style="font-size: 14px;"></i> ');
                                } else {
                                    $("#EP2-link").prepend('<i id="EP2-img-fa" class="fas fa-vector-square" style="font-size: 14px;"></i> ');
                                }
                            } else {
                                $("#EP2-items").append(`<div id="EP2-txt"><a target="_blank" id="EP2-link" href="${link}"><i id="EP2-img-fa" class="fas fa-vector-square" style="font-size: 14px;"></i> ${data.venue.external_providers[i].provider}</a></div>`);
                            }
                        }
                        i++;
                    }
                });
            }
        }
    }

    function init(){
        log("Initializing");
        injectCss();
        initializeSettings();

        // Add the layer
        _adPinsLayer = new OL.Layer.Vector("wmeEpdLayerAdPins",{uniqueName: "__wmeEpdLayerAdPins"});
        W.map.addLayer(_adPinsLayer);
        _adPinsLayer.setVisibility(_settings.AdPin);

        // Add the layer checkbox to the Layers menu
        WazeWrap.Interface.AddLayerCheckbox('Places', 'Ad pins', _settings.AdPin, onAdPinLayerCheckboxChanged);

        let observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                for (let i = 0; i < mutation.addedNodes.length; i++) {
                    let addedNode = mutation.addedNodes[i];
                    // Only fire up if it's a node
                    //log("Observer Running "+ $(addedNode).attr('class'));
					//if (addedNode.nodeType === Node.ELEMENT_NODE && !$('#ExternalProviders2').length && addedNode.querySelector('div.external-providers-view') && WazeWrap.hasPlaceSelected()) {
                    if (addedNode.nodeType === Node.ELEMENT_NODE && !$('#ExternalProviders2').length && WazeWrap.hasPlaceSelected()) {
                        insertExternalProviders2();
                        log("Loaded insertExternalProviders2 "+ $(addedNode).attr('class'));
                    }
                }
            });
        });
        observer.observe(document.getElementById('edit-panel'), { childList: true, subtree: true });
    }

    function bootstrap(tries = 1) {
        log("bootstrap attempt "+ tries);
        if (W && W.map && W.model && W.loginManager.user && $ && WazeWrap.Ready) {
            initTab();
        } else if (tries < 1000) {
            setTimeout(() => bootstrap(tries++), 200);
        }
    }
    bootstrap();
})();
