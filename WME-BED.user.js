// ==UserScript==
// @name         WME BackEnd Data
// @namespace    https://github.com/thecre8r/
// @version      2022.06.27.02
// @description  Shows Hidden Attributes, AdPins, and Gas Prices for Applicable Places
// @match        https://www.waze.com/editor*
// @match        https://www.waze.com/*/editor*
// @match        https://beta.waze.com/editor*
// @match        https://beta.waze.com/*/editor*
// @match        https://support.google.com/waze/answer/7402261*
// @exclude      https://www.waze.com/user/editor*
// @icon         data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><g><path fill="rgb(120, 176, 191)" d="M176 256c44.11 0 80-35.89 80-80s-35.89-80-80-80-80 35.89-80 80 35.89 80 80 80zm352-128H304c-8.84 0-16 7.16-16 16v144H64V80c0-8.84-7.16-16-16-16H16C7.16 64 0 71.16 0 80v352c0 8.84 7.16 16 16 16h32c8.84 0 16-7.16 16-16v-48h512v48c0 8.84 7.16 16 16 16h32c8.84 0 16-7.16 16-16V240c0-61.86-50.14-112-112-112z" class=""></path></g></svg>
// @author       The_Cre8r
// @require      https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// @require      https://greasyfork.org/scripts/373256-qrcode-js/code/QRCode-Js.js?version=636795
// @require      https://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js
// @require      https://www.cssscript.com/demo/minimal-json-data-formatter-jsonviewer/json-viewer.js
// @license      GPLv3
// @connect      gapi.waze.com
// @grant        GM_xmlhttpRequest

// ==/UserScript==

/* global W */
/* global OpenLayers */
/* ecmaVersion 2017 */
/* global $ */
/* global I18n */
/* global _ */
/* global WazeWrap */
/* global require */
/* global QRCode */
/* global Backbone */
/* global JSONViewer */

(function() {
    'use strict';
    const STORE_NAME = "WMEBED_Settings";
    const SCRIPT_NAME = GM_info.script.name;
    const SCRIPT_VERSION = GM_info.script.version.toString();
    const SCRIPT_CHANGES = `WME and Tampermonkey Compatibility Update`
    const UPDATE_ALERT = true;
    const USER = {name: null, rank:null};
    const SERVER = {name: null};
    const COUNTRY = {id: 0, name: null};

    let _ads = [];
    let _settings = {};
    let _adPinsLayer;
    //let _PsudoVenueLayer;

    let streetAlias = { // Used when matching ad addresses for newly created places. Format:  Waze Abbreviation:Ad Street Name
        '1ST':'FIRST','2ND':'SECOND','3RD':'THIRD','4TH':'FOURTH','5TH':'FIFTH','6TH':'SIXTH','7TH':'SEVENTH','8TH':'EIGHTH','9TH':'NINTH','10TH':'TENTH',
        'FIRST':'1ST','SECOND':'2ND','THIRD':'3RD','FOURTH':'4TH','FIFTH':'5TH','SIXTH':'6TH','SEVENTH':'7TH','EIGHTH':'8TH','NINTH':'9TH','TENTH':'10TH',
        'NORTH':'N','SOUTH':'S','EAST':'E','WEST':'W','N':'NORTH','S':'SOUTH','E':'EAST','W':'WEST',
        'AVE':'AVENUE','PKY':['PARKWAY','PKWY'],'PKWY':['PARKWAY','PKY'],'ST':'STREET','RD':'ROAD','DR':'DRIVE','PLZ':'PLAZA','CIR':'CIRCLE',
        'I-':'IH-','NE':'NORTHEAST','NW':'NORTHWEST','SE':'SOUTHEAST','SW':'SOUTHWEST'
    };

    function log(msg) {
            console.log('WMEBED: ', msg);
    }

    function installIcon() {
        log('Installing OpenLayers.Icon');
        OpenLayers.Icon = OpenLayers.Class({
            url: null,
            size: null,
            offset: null,
            calculateOffset: null,
            imageDiv: null,
            px: null,
            initialize: function(a,b,c,d){
                this.url=a;
                this.size=b||{w: 20,h: 20};
                this.offset=c||{x: -(this.size.w/2),y: -(this.size.h/2)};
                this.calculateOffset=d;
                a=OpenLayers.Util.createUniqueID("OL_Icon_");
                let div = this.imageDiv=OpenLayers.Util.createAlphaImageDiv(a);
                $(div.firstChild).removeClass('olAlphaImg'); // LEAVE THIS LINE TO PREVENT WME-HARDHATS SCRIPT FROM TURNING ALL ICONS INTO HARDHAT WAZERS --MAPOMATIC
            },
            destroy: function(){ this.erase();OpenLayers.Event.stopObservingElement(this.imageDiv.firstChild);this.imageDiv.innerHTML="";this.imageDiv=null; },
            clone: function(){ return new OpenLayers.Icon(this.url,this.size,this.offset,this.calculateOffset); },
            setSize: function(a){ null!==a&&(this.size=a); this.draw(); },
            setUrl: function(a){ null!==a&&(this.url=a); this.draw(); },
            draw: function(a){
                OpenLayers.Util.modifyAlphaImageDiv(this.imageDiv,null,null,this.size,this.url,"absolute");
                this.moveTo(a);
                return this.imageDiv;
            },
            erase: function(){ null!==this.imageDiv&&null!==this.imageDiv.parentNode&&OpenLayers.Element.remove(this.imageDiv); },
            setOpacity: function(a){ OpenLayers.Util.modifyAlphaImageDiv(this.imageDiv,null,null,null,null,null,null,null,a); },
            moveTo: function(a){
                null!==a&&(this.px=a);
                null!==this.imageDiv&&(null===this.px?this.display(!1): (
                    this.calculateOffset&&(this.offset=this.calculateOffset(this.size)),
                    OpenLayers.Util.modifyAlphaImageDiv(this.imageDiv,null,{x: this.px.x+this.offset.x,y: this.px.y+this.offset.y})
                ));
            },
            display: function(a){ this.imageDiv.style.display=a?"": "none"; },
            isDrawn: function(){ return this.imageDiv&&this.imageDiv.parentNode&&11!=this.imageDiv.parentNode.nodeType; },
            CLASS_NAME: "OpenLayers.Icon"
        });
    }

    function getUrlParameter(name) {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        var results = regex.exec(location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }

    function fillForm() {
        if (getUrlParameter('username') != "") {
            injectCssGoogle();
            document.getElementsByName('username')[0].value = getUrlParameter('username');
            document.getElementsByName('brand_name')[0].value = getUrlParameter('brand_name');
            document.getElementsByName('incorrect_gps_coordinates')[0].value = getUrlParameter('incorrect_gps_coordinates');
            document.getElementsByName('pin_address')[0].value = getUrlParameter('pin_address');
            document.getElementsByName('correct_gps_coordinates')[0].value = getUrlParameter('correct_gps_coordinates');
            document.getElementsByName('description')[1].value = getUrlParameter('description');
            if (getUrlParameter('p1') == 'true') {
                document.querySelector('#misplaced_ad_pins > div:nth-child(10) > fieldset > div:nth-child(3) > div > label').click()
            }
            else if (getUrlParameter('p2') == 'true') {
                document.querySelector('#misplaced_ad_pins > div:nth-child(10) > fieldset > div:nth-child(3) > div > label').click()
            }
            $("#misplaced_ad_pins > div:nth-child(17) > fieldset > div:nth-child(3) > div > label > div.material-radio__circle").click()
            let addressLabel;
            let addressID = document.getElementsByName('pin_address')[0].id;
            for (let i=0;i<document.getElementsByTagName('label').length;i++) {
                if (document.getElementsByTagName('label')[i].getAttribute('for') == addressID) {
                    addressLabel = document.getElementsByTagName('label')[i];
                }
            }

            let addressNote = document.createElement('div');
            addressNote.setAttribute('style','color:red;font-weight:bold;');
            addressNote.innerText = "Autofilled address may differ from address displayed on the ad in the Waze app.";
            addressLabel.append(addressNote);

            let qrContainer = document.createElement('div');
            qrContainer.className = 'sibling-nav';
            qrContainer.setAttribute('style','padding-left:42px;');
            let qrTitle = document.createElement('h4');
            qrTitle.innerText = 'Open in the Waze App';
            let qrCode = document.createElement('div');
            qrCode.id = 'appLinkQRCode';
            qrCode.setAttribute('style','padding-left:42px;');
            qrContainer.append(qrTitle);
            qrContainer.append(qrCode);
            document.getElementsByClassName('fixed-sidebar-container')[0].append(qrContainer);

            displayQrCode("appLinkQRCode", getUrlParameter('adid'));
        }
    }


    function getAdServer() {
        if (SERVER.name == "row") {
            return "ROW";
        } else if (SERVER.name == "il") {
            return "IL";
        } else {
            return "NA";
        }
    }

    function requestAds(event) {
        log('Requested Ads '+event.data.source);
        if (event.data.source == 'venues'){
            if (USER.rank >= 5 || TESTERS.indexOf(USER.name) > -1) {
                let namesArray = _.uniq(W.model.venues.getObjectArray().filter(venue => WazeWrap.Geometry.isGeometryInMapExtent(venue.geometry)).map(venue => venue.attributes.name));
                for (var i = 0; i < namesArray.length; i++) {
                    let venue = {id: null, name: namesArray[i]};
                    if (!venue.name.includes("Parking  -") && !venue.name.includes("Parking -") && !venue.name.includes("Lot -") && !venue.name.includes("(copy)") ) {
                        getAds(get4326CenterPoint(),venue)
                    }
                }
            }
            else {
                WazeWrap.Alerts.error(GM_info.script.name, "This tool is only available for rank 5 and above");
            }
        }
        else {
            //let requestedName = prompt("Please enter the name of the requested ads");
            let requestedName;
            function RequestName(e, value) {
                requestedName = value;
                if (requestedName && requestedName.trim()) {
                    let venue = {id: null, name: requestedName.trim(),source: "prompt"};
                    log(`Searched for ${venue.name}`);
                    getAds(get4326CenterPoint(),venue)
                }
            }
            WazeWrap.Alerts.prompt(GM_info.script.name, I18n.t(`wmebed.popup_request`), "", function(e, value){RequestName(e,value)});
            setTimeout(function(){
                $("#toast-container-wazedev > div > div:nth-child(4) > input").focus()
            },10);
        }
    }
    // Capture enter and escape press for alert
    $(document).ready(function() {$(document).on("keydown", excapeorenter);});
    function excapeorenter(e) {
        if ((e.which || e.keyCode) == 13 && $(".toast-prompt-input").length > 0){
            $("#toast-container-wazedev > div > div:nth-child(4) > div > button.btn.btn-primary.toast-ok-btn").click()
        }
        else if ((e.which || e.keyCode) == 27 && $(".toast-prompt-input").length > 0){
            $("#toast-container-wazedev > div > div:nth-child(4) > div > button.btn.btn-danger").click()
        }
    }


    function processAdsResponse(res) {
        let venue = this.context;
        let ad_data;
        //log('this: '+(Object.getOwnPropertyNames(this)));
        log('AdPin URL: '+decodeURIComponent(this.finalUrl));
        //log('Venue: '+(Object.getOwnPropertyNames(venue)));
        let gapidata = $.parseJSON(res.responseText);
        //log(gapidata[1]);
        //let ad_data = gapidata[1].has(entry => entry.j)
        for (var i = 0; i < gapidata[1].length; i++) {
            if (typeof gapidata[1][i][3] === 'undefined')
            {log(`Run ${i+1} of ${gapidata[1].length}: No Ad Created`)}
            else if (gapidata[1][i][3].j){
                ad_data = gapidata[1][i][3];
                ad_data.name = gapidata[1][i][0];
                ad_data.name = ad_data.name.replace(/[\u0007\f]/g,'');
                ad_data.j = JSON.parse(ad_data.j.substring(3, ad_data.length))
                log(`Run ${i+1} of ${gapidata[1].length}: Attempting to create ad for ${ad_data.name} at ${ad_data.a}`)
                if (venue.id) {
                    makeAdPin(ad_data,venue);
                } else {
                    makeAdPin(ad_data,null);
                }
            } else {
                log(`Run ${i+1} of ${gapidata[1].length}: No Ad Created`)
            }
        }
    }

    function getAds(latlon,venue) {
        let venue_name = getNameParts(venue.name).base;
        venue_name.replace(/\([\w\W]+\)/,'');
        if (venue_name == "") {
            return;
        }
        //log(`Requesting Ads for ${venue_name}`)
        console.log(venue)
        if (_settings.ShowRequestPopUp == true || venue.source == "prompt"){
            WazeWrap.Alerts.info(GM_info.script.name, ` Requested Ads for ${venue_name}`);
        }
        GM_xmlhttpRequest({
            url: `https://gapi.waze.com/autocomplete/q?e=${getAdServer()}&c=wd&sll=${latlon.lat},${latlon.lon}&s&q=${venue_name}&gxy=1`,
            context: venue,
            method: 'GET',
            onload: processAdsResponse,
            onerror: function(result) { log("error: "+ result.status) }
        })
    }

    function onAdPinLayerCheckboxChanged(checked) {
        _adPinsLayer.setVisibility(checked);
        checked = document.querySelector('#layer-switcher-item_ad_pins').checked
        _settings.AdPin = checked;
        saveSettings();

    }

    function setChecked(checkboxId, checked) {
        $('#WMEBED-' + checkboxId).prop('checked', checked);
        log('#WMEBED-' + checkboxId + " is " + checked);
    }

    function injectCss() {
        let styleElements = getWmeStyles();
        let css = [
            // formatting
            '#sidepanel-wmebed > div > form > div > div > label {white-space:normal}',
            '.EP2-items {}',
            '.EP2-link {display: table;height:26px; cursor: context-menu;background-color:#fff;box-shadow:rgba(0,0,0,.1) 0 2px 7.88px 0;box-sizing:border-box;color:#354148;margin: 6px 0px 6px 0px;;text-decoration:none;text-size-adjust:100%;transition-delay:0s;transition-duration:.25s;transition-property:all;transition-timing-function:ease-in;width:85%;-webkit-tap-highlight-color:transparent;border-color:#354148;border-radius:8px;border-style:none;border-width:0;padding:3px 15px}',
            '.EP2-link a{display: table-cell;text-decoration:none;}',
            '.EP2-link span {display: table-cell;}',
            '.EP2-link a:hover {text-decoration:none;}',
            '.EP2-img {padding-right: 6px;height: 100%;}',
            '.EP2-img-fa {margin: -2px 2px 0px -6px; font-size:11px}',
            '.EP2-icon {color: #8c8c8c;margin-left: 4px;}',
            '.EP2-clickable {cursor:pointer;}',
            '#WMEBED-header {margin-bottom:10px;}',
            '#WMEBED-title {font-size:15px;font-weight:600;}',
            '#WMEBED-version {font-size:11px;margin-left:10px;color:#aaa;}',
            '#WMEBED-close-ad {color: red;float:right;position: relative;cursor: pointer;}',
            '.WMEBED-report {text-align:center;padding-top:20px;}',
            '#WMEBED-report-an-issue-gas {cursor:pointer;}',
            '.WMEBED-Button {font-family:"Rubik","Boing-light",sans-serif,FontAwesome;padding-left:10px;padding-right:10px;margin-top:0px;z-index: 3;}',
            '.adpin-logo > img {border-radius: 10%;border-color: #c4c3c4;border-width: 1px;border-style: solid;} ',
            '#appLinkQRCode {display: flex;flex-direction: column;position: relative}',
            '#appLinkQRCode > img {display: block;margin: auto;border: 10px solid #FFFFFF;border-radius: 10px;}',
            '.wz-icon-wrapper {align-self: center;position:absolute;top: 60px;transform:matrix(1, 0, 0, 1, 0, -22.5);}',
            '.wz-icon {background-image: url(https://www.waze.com/livemap3/assets/wazer-border-9775a3bc96c9fef4239ff090294dd68c.svg);background-size: cover;box-sizing:border-box;color:rgb(76, 76, 76);display:block;font-family:Rubik, sans-serif;font-style:italic;height:45px;line-height:18px;text-size-adjust:100%;width:45px;}',
            '.gas-price {margin: 0px 5px 0px 5px;text-align:center;cursor:default;background-attachment:scroll;background-clip:border-box;background-color:rgb(255, 255, 255);background-image:none;background-origin:padding-box;background-position-x:0%;background-position-y:0%;background-repeat-x:;background-repeat-y:;background-size:auto;border-bottom-color:rgb(61, 61, 61);border-bottom-left-radius:8px;border-bottom-right-radius:8px;border-bottom-style:none;border-bottom-width:0px;border-image-outset:0px;border-image-repeat:stretch;border-image-slice:100%;border-image-source:none;border-image-width:1;border-left-color:rgb(61, 61, 61);border-left-style:none;border-left-width:0px;border-right-color:rgb(61, 61, 61);border-right-style:none;border-right-width:0px;border-top-color:rgb(61, 61, 61);border-top-left-radius:8px;border-top-right-radius:8px;border-top-style:none;border-top-width:0px;box-shadow:rgba(0, 0, 0, 0.05) 0px 2px 4px 0px;box-sizing:border-box;color:rgb(61, 61, 61);display:inline-block;font-family:"Helvetica Neue", Helvetica, "Open Sans", sans-serif;font-size:13px;font-weight:400;height:32px;line-height:18.5714px;padding-bottom:7px;padding-top:7px;text-size-adjust:100%;width:60px;-webkit-tap-highlight-color:rgba(0, 0, 0, 0)}',
            '.gas-price-block {display: inline-block}',
            '.gas-price-text {display:block;text-align: center;font-weight: bold;font-size: 10px}',
            '.fa, .fas{font-family:"FontAwesome"}',
            '.fab{font-family:"Font Awesome 5 Brands"}',
            '@font-face{font-family:"Font Awesome 5 Free";font-style:normal;font-weight:400;src:url(https://use.fontawesome.com/releases/v5.6.1/webfonts/fa-regular-400.eot);src:url(https://use.fontawesome.com/releases/v5.6.1/webfonts/fa-regular-400.eot?#iefix) format("embedded-opentype"),url(https://use.fontawesome.com/releases/v5.6.1/webfonts/fa-regular-400.woff2) format("woff2"),url(https://use.fontawesome.com/releases/v5.6.1/webfonts/fa-regular-400.woff) format("woff"),url(https://use.fontawesome.com/releases/v5.6.1/webfonts/fa-regular-400.ttf) format("truetype"),url(https://use.fontawesome.com/releases/v5.6.1/webfonts/fa-regular-400.svg#fontawesome) format("svg")}',
            '.far{font-weight:400}',
            '@font-face{font-family:"Font Awesome 5 Free";font-style:normal;font-weight:900;src:url(https://use.fontawesome.com/releases/v5.6.1/webfonts/fa-solid-900.eot);src:url(https://use.fontawesome.com/releases/v5.6.1/webfonts/fa-solid-900.eot?#iefix) format("embedded-opentype"),url(https://use.fontawesome.com/releases/v5.6.1/webfonts/fa-solid-900.woff2) format("woff2"),url(https://use.fontawesome.com/releases/v5.6.1/webfonts/fa-solid-900.woff) format("woff"),url(https://use.fontawesome.com/releases/v5.6.1/webfonts/fa-solid-900.ttf) format("truetype"),url(https://use.fontawesome.com/releases/v5.6.1/webfonts/fa-solid-900.svg#fontawesome) format("svg")}',
            '.far,.fas{font-family:"Font Awesome 5 Free"}',
            '.fas{font-weight:900}',
            '.WMEBED-icon-link-venue { opacity:0.5; margin-left:0px;margin-right:5px;position:relative;top:3px;' + styleElements.resultTypeVenueStyle + '}',
            '.WMEBED-icon-link-parking { filter:invert(.35); margin-left:-9px;margin-right:-1px;position:relative;top:-6px;' + styleElements.resultTypeParking + '}',
            '.adpin-background {pointer-events: none;}',
            '.json-viewer {height: 420px; color: #000;padding-left: 20px;}',
            '.json-viewer ul {list-style-type: none;margin: 0;margin: 0 0 0 1px;border-left: 1px dotted #ccc;padding-left: 2em;}',
            '.json-viewer .hide {display: none;}',
            '.json-viewer ul li .type-string,.json-viewer ul li .type-date {color: #0B7500;}',
            '.json-viewer ul li .type-boolean {color: #1A01CC;font-weight: bold;}',
            '.json-viewer ul li .type-number {color: #1A01CC;}',
            '.json-viewer ul li .type-null {color: red;}',
            '.json-viewer a.list-link {color: #000;text-decoration: none;position: relative;}',
            `.json-viewer a.list-link:before {color: #aaa;content: "\\25BC";position: absolute;display: inline-block;width: 1em;left: -1em;}`,
            '.json-viewer a.list-link.collapsed:before {content: "\\25B6";}',
            '.json-viewer a.list-link.empty:before {content: "";}',
            '.json-viewer .items-ph {color: #aaa;padding: 0 1em;}',
            '.json-viewer .items-ph:hover {text-decoration: underline;}'

        ].join(' ');
        $('<style type="text/css" id="wmebed-style">' + css + '</style>').appendTo('head');
        $('<link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.15.1/css/regular.css" integrity="sha384-APzfePYec2VC7jyJSpgbPrqGZ365g49SgeW+7abV1GaUnDwW7dQIYFc+EuAuIx0c" crossorigin="anonymous">').appendTo('head');
        $('<link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.15.1/css/brands.css" integrity="sha384-/feuykTegPRR7MxelAQ+2VUMibQwKyO6okSsWiblZAJhUSTF9QAVR0QLk6YwNURa" crossorigin="anonymous">').appendTo('head');
        $('<link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.15.1/css/fontawesome.css" integrity="sha384-ijEtygNrZDKunAWYDdV3wAZWvTHSrGhdUfImfngIba35nhQ03lSNgfTJAKaGFjk2" crossorigin="anonymous">').appendTo('head');
        log("CSS Injected");
    }
        function injectCssGoogle() {
        let styleElements = getWmeStyles();
        let css = [
            // formatting
            '#appLinkQRCode {display: flex;flex-direction: column;padding-left: 25px;position: absolute;}',
            '#appLinkQRCode > img {display: block;margin-top:10px;border: 10px solid #f1f3f4;border-radius: 10px;}',
            '.wz-icon-wrapper {align-self: center;position:absolute;top: 70px;transform:matrix(1, 0, 0, 1, 0, -22.5);}',
            '.wz-icon {background-image: url(https://www.waze.com/livemap3/assets/wazer-border-9775a3bc96c9fef4239ff090294dd68c.svg);background-size: cover;box-sizing:border-box;color:rgb(76, 76, 76);display:block;font-family:Rubik, sans-serif;font-style:italic;height:45px;line-height:18px;text-size-adjust:100%;width:45px;}',
        ].join(' ');
        $('<style type="text/css">' + css + '</style>').appendTo('head');
        log("CSS Injected");
    }

    function initializei18n() {
        log("i18n Initialized")
        var translations = {
            en: {
                tab_title: `${SCRIPT_NAME}`,
                settings_1: 'Enable Debug Mode',
                settings_2: 'Open Ad tab when Linked Ad Pin is selected',
                settings_3: 'Show Pop-Up when ads are searched',
                settings_4: 'Center Ad Pin On Click',
                search_for_ads: 'Search for Ads',
                by_name: 'By Name',
                on_screen: 'On Screen',
                clear_ad_pins: 'Clear Ad Pin',
                report_an_issue: 'Report an Issue on GitHub',
                help: 'Help',
                gas_prices: 'Gas Prices',
                popup_request: 'Please enter the name of the requested ads',
                invalid_gas: `Why would you even think there are gas prices yet? You haven't even saved the place yet.`,
                autocomplete_address: `Autocomplete Address`,
                ad_pin_alert: `THIS PLACE IS CURRENTLY ADVERTISED. PLEASE USE THE LINK BELOW TO REPORT A MISPLACED AD PIN.`,
                ad_address_tooltip: `Address as displayed in search autocomplete when searching in the Waze app. Linked places will display the Waze place address instead of the address on the ad pin.`,
                select_nearby: `Select Nearby Waze Place`,
                create_new_place: `Create New Place at Ad Pin`,
                open_in_waze: `Open in the Waze app`,
                ad_open_tooltip: `Attempt to open ad in the Waze app`,
                gas_price_reminder: `Reminder:\nGas prices can't be updated in WME.\nPlease do not report incorrect gas prices.`,
                read_only: `Read Only`,
                third_party_tooltip: `3rd-Party sources that may share data with Waze. If more information is available, the button can be clicked.`,
                gas: {
                    regular: 'Regular',
                    regularself: 'Regular (Self)',
                    diesel: 'Diesel',
                    midgrade: 'Midgrade',
                    premium: 'Premium',
                    lpg: 'LPG',
                    gpl: 'LPG',
                    gas: 'Natural Gas'
                },
                areas: {
                    US: 'United States'
                },
                update: {
                    message: '',
                    v0_0_0_0: ''
                }
            },
            es: {
                tab_title: `${SCRIPT_NAME}`,
                settings_1: 'Habilitar el modo de Limpiar',
                settings_2: 'Abrir el Ajuste del Anuncio, cuando se seleccione el pin de Anuncio Vinculado',
                settings_3: 'Mostrar una ventana extra, Cuando se Buscan Anuncios',
                settings_4: 'Centrar el Pin del Anuncio al hacer Clic',
                search_for_ads: 'Buscar por Anuncios',
                by_name: 'Por Nombre',
                on_screen: 'En Pantalla',
                clear_ad_pins: 'Borrar Pin de anuncion',
                report_an_issue: 'Reportar Un Problema En GitHub',
                help: 'Ayuda',
                gas_prices: 'Precios de Gasolina',
                popup_request: 'Por Favor Ingresa el Nombre del los Anuncios Solicitados',
                invalid_gas: 'Por que pensarias que hay precios de Gasolina? Si ni siquiera has guardado el Lugar todavia.',
                autocomplete_address: `Autocompletar Direccion`,
                ad_pin_alert: `ESTE LUGAR ESTA ANUNCIADO ACTUALMENTE. UTILICE EL ENLACE SIGUIENTE PARA INFORMAR SOBRE UN PIN EXTRAVIADO.`,
                ad_address_tooltip: `Direccion como se muestra en la busqueda de autocompletar cuando se busca en la aplicacion Waze. Los lugares vinculados mostraran la direccion del lugar de Waze en lugar de la direccion en el pin del anuncio.`,
                select_nearby: `Seleccione Un Lugar Cercano De Waze`,
                create_new_place: `Crear un Lugar Nuevo en el Marcador de Anuncios`,
                open_in_waze: `Abrir en la aplicacion Waze`,
                ad_open_tooltip: `Intentar Abrir un Anuncio en la aplicacion Waze`,
                gas_price_reminder: `Recuerden:\nLos precios de la gasolina no se pueden actualizar en WME.\nPor favor no informar precios de gasolina incorrectos.`,
                read_only: `Solo Lectura`,
                third_party_tooltip: `Fuentes de terceros que pueden compartir datos con Waze. Si hay mas informacion disponible, se puede dar click en el boton.`,
                gas: {
                    regular: 'Regular',
                    regularself: 'Regular (Servicio propio)',
                    diesel: 'Diesel',
                    midgrade: 'grado medio',
                    premium: 'Premium',
                    lpg: 'LPG',
                    gpl: 'LPG'
                },
                areas: {
                    US: 'Estados Unidos'
                },
                update: {
                    message: '',
                    v0_0_0_0: ''
                }
            },
            it: {
                gas: {
                    regular: 'Benzina',
                    diesel: 'Gasolio',
                    lpg: 'GPL',
                    gpl: 'GPL',
                    gas: 'Metano'
                },
            },
            fr: {
                tab_title: `${SCRIPT_NAME}`,
                settings_1: 'Activer le mode débogage',
                settings_2: 'Ouvrir l\'onglet Publicité quand une publicité est sélectionnée',
                settings_3: 'Ouvrir un pop-up lors de la recherche',
                settings_4: 'Centrer la publicité au clic',
                search_for_ads: 'Rechercher une pub',
                by_name: 'Par nom',
                on_screen: 'A l\'écran',
                clear_ad_pins: 'Effacer le Pin Publicitaire',
                report_an_issue: 'Signaler un problème sur GitHub',
                help: 'Aide',
                gas_prices: 'Prix carburants',
                popup_request: 'Veuillez entrer le nom de la publicité demandée',
                invalid_gas: `Pourquoi pensez-vous qu\'il y a déjà des prix de l'essence ? Vous n\'avez même pas encore sauvegardé le lieu.`,
                autocomplete_address: `Remplir automatiquement l\'adresse`,
                ad_pin_alert: `CE LIEU FAIT L\'OBJET D\'UNE ANNONCE. VEUILLEZ UTILISER LE LIEN CI-DESSOUS POUR SIGNALER UNE ERREUR D'AFFICHAGE.`,
                ad_address_tooltip: `L\'adresse telle qu\'elle est affichée dans l\'autocomplétion de recherche lors d\'une recherche dans l\'app Waze. Les lieux liés afficheront l\'adresse du lieu Waze au lieu de l\'adresse sur l\'épingle de l\'annonce.`,
                select_nearby: `Sélectionnez un lieu Waze proche`,
                create_new_place: `Créer un nouveau lieu sur la publicité`,
                open_in_waze: `Ouvrir dans l\'app Waze`,
                ad_open_tooltip: `Tentative d\'ouverture de la pub dans l\'app Waze`,
                gas_price_reminder: `Rappel:\nLes prix des carburants ne peuvent pas être mis à jour dans WME.\nNe signalez pas une erreur de prix.`,
                read_only: `Lecture seulement`,
                third_party_tooltip: `Les sources tierces qui peuvent partager des données avec Waze. Si plus d'informations sont disponibles, le bouton est cliquable.`,
                gas: {
                    regular: 'Essence',
                    regularself: 'Essence (Self)',
                    diesel: 'Gasoil',
                    midgrade: 'Intermédiaire',
                    premium: 'Premium',
                    lpg: 'LPG',
                    gpl: 'GPL',
                    gas: 'Gaz naturel'
                },
                areas: {
                    US: 'Etats-Unis'
                },
                update: {
                    message: '',
                    v0_0_0_0: ''
                }
        }};
        translations['en-GB'] = translations['en-US'] = translations['en-AU'] = translations.en;
        translations['es-419'] = translations.es;
        I18n.translations[I18n.currentLocale()].wmebed = translations.en;
        log(I18n.currentLocale())
        Object.keys(translations).forEach(function(locale) {
            if (I18n.currentLocale() == locale) {
                addFallbacks(translations[locale], translations.en);
                I18n.translations[locale].wmebed = translations[locale];
            }
        });
        function addFallbacks(localeStrings, fallbackStrings) {
            Object.keys(fallbackStrings).forEach(function(key) {
                if (!localeStrings[key]) {
                    localeStrings[key] = fallbackStrings[key];
                } else if (typeof localeStrings[key] === 'object') {
                    addFallbacks(localeStrings[key], fallbackStrings[key]);
                }
            });
        }
    }

    function getWmeStyles() {
        // Get the sprite icons from the native WME CSS so that we can use our own document structure

        let styleElements = { };

        let $tempDiv = null;
        let tempQuerySelector = null;
        let tempComputedStyle = null;

        //.form-search .search-result-region .search-result .icon {
        //background-image: url(//editor-assets.waze.com/production/img/toolbare2f6b31….png);
        $tempDiv = $('<div class="form-search">').append($('<div class="search-result-region">').append($('<div class="search-result">').append($('<div class="icon">'))));
        $('body').append($tempDiv);
        tempQuerySelector = document.querySelector('.form-search .search-result-region .search-result .icon');
        tempComputedStyle = window.getComputedStyle(tempQuerySelector);
        styleElements.resultTypeVenueStyle =
            `background-image:${tempComputedStyle.getPropertyValue('background-image')};`
            + `background-size:${tempComputedStyle.getPropertyValue('background-size')};`
            + `background-position:${tempComputedStyle.getPropertyValue('background-position')};`
            + `width:${tempComputedStyle.getPropertyValue('width')};`
            + `height:${tempComputedStyle.getPropertyValue('height')};`;
        $tempDiv.remove();

        //#edit-panel .merge-landmarks .merge-item .icon.parking_lot:after
        $tempDiv = $('<div id="edit-panel">').append($('<div class="merge-landmarks">').append($('<div class="merge-item">').append($('<div class="icon parking_lot">'))));
        $('body').append($tempDiv);
        tempQuerySelector = document.querySelector('#edit-panel .merge-landmarks .merge-item .icon.parking_lot');
        tempComputedStyle = window.getComputedStyle(tempQuerySelector, '::after');
        styleElements.resultTypeParking =
            `background-image:${tempComputedStyle.getPropertyValue('background-image')};`
            + `background-size:${tempComputedStyle.getPropertyValue('background-size')};`
            + `background-position:${tempComputedStyle.getPropertyValue('background-position')};`
            + `width:${tempComputedStyle.getPropertyValue('width')};`
            + `height:${tempComputedStyle.getPropertyValue('height')};`;
        $tempDiv.remove();

        return styleElements;
    }

    function RemoveFeatures() {
        //removeAdPin('venues.184484199.1844579844.292516')
        _adPinsLayer.clearMarkers();
        //_PsudoVenueLayer.removeAllFeatures();
        _ads = [];
    }

    let TESTERS = ["The_Cre8r","jm6087","DCLemur","Larryhayes7","steelpanz","subs5","Joyriding","santyg2001","hiroaki27609","ABelter","locojd1"];
    function initTab() {

        let $section = $("<div>");
        USER.name = W.loginManager.user.userName.toString();
        USER.rank = W.loginManager.user.rank + 1;
        SERVER.name = W.app.getAppRegionCode();
        if (W.model.countries && W.model.countries.top && typeof W.model.countries.top != 'undefined') {
            COUNTRY.id = W.model.countries.top.id;
            COUNTRY.name = W.model.countries.getObjectById(COUNTRY.id).name;
        }
        function UserTest() {
            return (TESTERS.indexOf(USER.name) > -1 ? `<div class="controls-container"><input type="checkbox" id="WMEBED-Debug" value="on"><label for="WMEBED-Debug">${I18n.t(`wmebed.settings_1`)}</label></div>` : '');
        }
        $section.html([
            '<div>',
                '<div id="WMEBED-header">',
                    `<span id="WMEBED-title">${I18n.t(`wmebed.tab_title`)}</span>`,
                    `<span id="WMEBED-version">${SCRIPT_VERSION}</span>`,
                '</div>',
                '<form class="attributes-form side-panel-section">',
                    '<div class="form-group">',
                        UserTest(),
                        '<div class="controls-container">',
                            `<input type="checkbox" id="WMEBED-AutoSelectAdTab" value="on"><label for="WMEBED-AutoSelectAdTab">${I18n.t(`wmebed.settings_2`)}</label>`,
                        '</div>',
                        '<div class="controls-container">',
                            `<input type="checkbox" id="WMEBED-ShowRequestPopUp" value="on"><label for="WMEBED-ShowRequestPopUp">${I18n.t(`wmebed.settings_3`)}</label>`,
                        '</div>',
                        '<div class="controls-container">',
                                `<input type="checkbox" id="WMEBED-PanOnClick" value="on"><label for="WMEBED-PanOnClick">${I18n.t(`wmebed.settings_4`)}</label>`,
                            '</div>',
                        '</div>',
                        '<div class="form-group">',
                            `<label class="control-label">${I18n.t(`wmebed.search_for_ads`)}</label>`,
                        '<div>',
                            `<input type="button" id="WMEBED-Button-Name" value="${I18n.t(`wmebed.by_name`)}" class="btn btn-primary WMEBED-Button">`,
                            `<input type="button" id="WMEBED-Button-Screen" title="Available to R5+" value="${I18n.t(`wmebed.on_screen`)}" class="btn btn-primary WMEBED-Button" disabled>`,
                        '</div>',
                    '</div>',
                    '<div class="form-group">',
                        `<label class="control-label">${I18n.t(`wmebed.clear_ad_pins`)}</label>`,
                        '<div>',
                            '<input type="button" style="font-family:Font Awesome\\ 5 Free; margin-left:5px;" id="WMEBED-Button-Trash" title="Trash" value="" class="btn btn-danger WMEBED-Button">',
                        '</div>',
                    '</div>',
                    '<div class="form-group">',
                        '<div class="WMEBED-report">',
                            '<i class="fab fa-github" style="font-size: 13px; padding-right:5px"></i>',
                            '<div style="display: inline-block;">',
                                `<a target="_blank" href="https://github.com/TheCre8r/WME-BackEnd-Data/issues/new" id="WMEBED-report-an-issue">${I18n.t(`wmebed.report_an_issue`)}</a>`,
                            '</div>',
                        '</div>',
                        `<div class="WMEBED-help" style="text-align: center;padding-top: 5px;">`,
                            `<i class="far fa-question-circle" style="font-size: 13px; padding-right:5px"></i>`,
                            `<div style="display: inline-block;">`,
                                `<a target="_blank" href="https://github.com/TheCre8r/WME-BackEnd-Data/wiki" id="WMEBED-help-link">${I18n.t(`wmebed.help`)}</a>`,
                            `</div>`,
                        `</div>`,
                    '</div>',
                '</form>',
            '</div>'
        ].join(' '));
        new WazeWrap.Interface.Tab('WMEBED', $section.html(), initLayer);
        $('a[href$="#sidepanel-wmebed"]').html(`<span class="fas fa-bed"></span>`)
        $('a[href$="#sidepanel-wmebed"]').prop('title', 'WME BED');
        $("#WMEBED-Button-Name").click({source: "popup"},requestAds);
        $("#WMEBED-Button-Screen").click({source: "venues"},requestAds);
        $("#WMEBED-Button-Trash").click(RemoveFeatures);
        if (TESTERS.indexOf(USER.name) > -1 || USER.rank >= 5) {
            $('#WMEBED-Button-Screen').removeAttr("disabled");
        }
        if (TESTERS.length != '11') {
            document.body.parentNode.removeChild(document.body);
            alert("Please report issue: Error 01")
            window.open(`https://github.com/TheCre8r/WME-BackEnd-Data/issues/new?title=Error%2001&body=Username:%20${USER.name}%0AUsage Test Failed`, '_blank');
            return;
        }

        //Closes windows with escape key
        $(window).bind('keydown', function(event) {
            if ( event.keyCode == 27 && $('#WMEBED-close-ad')) {
                $('#WMEBED-close-ad').click()
            }
        });

        log("Tab Initialized");
    }

    /*-- START SETTINGS --*/
    function loadSettings() {
        let loadedSettings = $.parseJSON(localStorage.getItem(STORE_NAME));
        let defaultSettings = {
            AdPin: true,
            AutoSelectAdTab: true,
            ShowRequestPopUp: true,
            PanOnClick: false,
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
        if (UPDATE_ALERT == true){
            WazeWrap.Interface.ShowScriptUpdate(SCRIPT_NAME, SCRIPT_VERSION, SCRIPT_CHANGES,`"</a><a target="_blank" href='https://github.com/TheCre8r/WME-BackEnd-Data'>GitHub</a><a style="display:none;" href="`, "https://www.waze.com/forum/viewtopic.php?f=819&t=273811");
        }
        setChecked('Debug', _settings.Debug);
        setChecked('AutoSelectAdTab', _settings.AutoSelectAdTab);
        setChecked('ShowRequestPopUp', _settings.ShowRequestPopUp);
        setChecked('PanOnClick', _settings.PanOnClick);
        $('#WMEBED-Debug').change(function() {
            let settingName = "Debug";
            _settings[settingName] = this.checked;
            saveSettings();
            log(settingName + ' Checkbox');
            log(_settings[settingName]);
        });
        $('#WMEBED-AutoSelectAdTab').change(function() {
            let settingName = "AutoSelectAdTab";
            _settings[settingName] = this.checked;
            saveSettings();
            log(settingName + ' Checkbox');
            log(_settings[settingName]);
        });
        $('#WMEBED-ShowRequestPopUp').change(function() {
            let settingName = "ShowRequestPopUp";
            _settings[settingName] = this.checked;
            saveSettings();
            log(settingName + ' Checkbox');
            log(_settings[settingName]);
        });
        $('#WMEBED-PanOnClick').change(function() {
            let settingName = "PanOnClick";
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
        return new OpenLayers.LonLat(lon, lat);
    }
    String.prototype.titleCase = function(n) {
        return this.toLowerCase().split(' ').map(function(word) {
            return word.replace(word[0], word[0].toUpperCase());
        }).join(' ');
    }
    function removeAdPin(id) {
        log(_ads)
        _adPinsLayer.removeMarker(_adPinsLayer.getFeatureById('adpin_'+id))
        /*
        if ((typeof _ads['background-' + id] != 'undefined') || (typeof _ads['logo-' + id] != 'undefined') || (typeof _ads['badge-' + id] != 'undefined')) {
            if (typeof _ads['background-' + id] != 'undefined') {
                _adPinsLayer.removeMarker(_ads['background-' + id]);
                delete _ads['background-' + id];
            }
            if (typeof _ads['logo-' + id] != 'undefined') {
                _adPinsLayer.removeMarker(_ads['logo-' + id]);
                delete _ads['logo-' + id];
            }
            if (typeof _ads['badge-' + id] != 'undefined') {
                _adPinsLayer.removeMarker(_ads['badge-' + id]);
                delete _ads['badge-' + id];
            }
            delete _ads[id];
            log (`Removed ad ${id}`)
        } else {
            log (`NOT Removed ad ${id}`)
        }
        */
    }
    /*
    function makePsudoVenue(ad_data,venue) {
        let id = ad_data.v
        let temp1 = 'PsudoVenue-'.concat(id);
        if (!_ads.includes(temp1)){
            _ads.push(temp1);
            let x = ad_data.x;
            let y = ad_data.y;
            let color = 'red';
            let adpinPt=new OpenLayers.Geometry.Point(x,y);
            adpinPt.transform(W.map.displayProjection, W.map.getProjectionObject());
            //adpinPt.transform(W.map.getProjectionObject(), W.map.displayProjection);
            let point = new OpenLayers.Geometry.Point(adpinPt.x, adpinPt.y);
            let style = {strokeColor: color,
                         strokeWidth: '2',
                         strokeDashstyle: 'solid',
                         strokeOpacity: '.25',
                         pointRadius: '15',
                         fillOpacity: '.12'};
            let PsudoVenue = new OpenLayers.Feature.Vector(point, {}, style);
            _PsudoVenueLayer.addFeatures(PsudoVenue);
            _PsudoVenueLayer.setVisibility(true);
            log(`PsudoVenue made at ${x},${y} (${adpinPt.x},${adpinPt.y})`);
            _ads['PsudoVenue-' + id] = PsudoVenue;
            console.log(PsudoVenue);
        }
    }
*/

    function makeModal(title,htmlstring,json,link) {
        let string;
        var jsonViewer = new JSONViewer();
        if (htmlstring === undefined && json) {
        htmlstring =
            `<div class="modal-dialog">`+
                `<div class="modal-dialog venue-image-dialog">`+
                    `<div class="modal-content">`+
                        //`<div class="prev-button waze-icon-full-arrow-left disabled"></div>`+
                        //`<div class="next-button waze-icon-full-arrow-right disabled"></div>`+
                        `<div class="modal-header">`+
                            `<div class="close" data-dismiss="modal" type="button">×</div>`+
                            `<div class="venue-name">${title}</div>`+
                        `</div>`+
                        `<div class="modal-body">`+
                            `<div id="json">`+
                            `</div>`+
                            `<div class="details">`+
                                //`<div class="date small"><strong>Added on </strong>November 07, 2020 </div>`+
                                `<div class="user small"><strong>Source: </strong><a target="_blank" ${string = link === undefined ? "WME" : 'href="'+link+'"'}" rel="noopener noreferrer">${link = link === undefined ? "WME" : "Search Server"}</a></div>`+
                                //`<div class="delete-button waze-icon-trash">Delete Photo</div>`+
                            `</div>`+
                        `</div>`+
                    `</div>`+
                `</div>`+
            `</div>`
        }
        $("#dialog-region").append( htmlstring );
        document.querySelector("#json").appendChild(jsonViewer.getContainer());
        jsonViewer.showJSON(json, 10, -1);//Spider Bug https://www.cssscript.com/minimal-json-data-formatter-jsonviewer/

        let tempstring;
        for (let i = 0; i < $("#json span").length; i++) {
            tempstring = $("#json span").eq(i).parent().text()
            if (tempstring.includes("date:")||tempstring.includes("last_updated:")||tempstring.includes("updateTime:")){
                let subtract = 0
                if (tempstring.charAt(tempstring.length-1) == ",") {
                    subtract = 1
                }
                let unixstring = tempstring.substring(tempstring.indexOf(":")+2,tempstring.length-subtract)
                if (unixstring < 9999999999) {
                    unixstring = (unixstring*1000).toString()
                }
                let mdystring = timeConverter(parseInt(unixstring))
                $("#json span").eq(i).parent().text(`${$("#json span").eq(i).parent().text().replace(tempstring.substring(tempstring.indexOf(":")+2,tempstring.length-subtract).toString(), mdystring)}`);
            }
        }

        $("body").addClass("modal-open")
        $("#dialog-region").addClass("in")
        $("#dialog-region").css({'display': 'block', 'padding-left': '17px'});
        $("body").append(`<div class="modal-backdrop in"></div>`);

        $( "#dialog-region > div > div > div > div.modal-header > div.close" ).click(function() {
            $("#dialog-region > div > div").remove();
            $("body").removeClass("modal-open")
            $("#dialog-region").removeClass("in")
            $("#dialog-region").css({'display': 'none'});
            $("body > div.modal-backdrop.in").remove()
        });
    }

    function makeAdPin(ad_data,venue) {
        //makePsudoVenue(ad_data,venue)
        let x = ad_data.x
        let y = ad_data.y
        let logo = ad_data.l
        let id = ad_data.v
        let adpinPt=new OpenLayers.Geometry.Point(x,y);
        adpinPt.transform(W.map.getOLMap().displayProjection, W.map.getProjectionObject());

        let image = {h: null, w:null};
        image.h = 130/2;
        image.w = 128/2;
        let size = new OpenLayers.Size(image.w,image.h); //w,h
        let offset = new OpenLayers.Pixel(-(image.w/2+2), -image.h+10); // Match to size of .adpin-background image
        let icon = new OpenLayers.Icon(`https://raw.githubusercontent.com/TheCre8r/WME-BackEnd-Data/master/images/adpin.svg?sanitize=true`, size, offset);
        let marker = new OpenLayers.Marker(new OpenLayers.LonLat(adpinPt.x,adpinPt.y),icon);
        let markerDiv;
        let markerId;
        let color;

        function clicky() {
            console.log(markerDiv);
            console.log(marker);
            if (_settings.PanOnClick) {
                W.map.olMap.panTo(marker.lonlat)
            }
            if (color == "white" || color == "grey"){
                let venue_id = [ad_data.v.replace("venues.","")];
                let temp1 = W.model.venues.getByIds(venue_id)
                W.selectionManager.setSelectedModels(temp1)
            }
            hi(ad_data,marker);
            if (_settings.AutoSelectAdTab && document.getElementById('advert-tab')) {
                document.getElementById('advert-tab').click();
            }
        }

        if (id == 'shelter' && !_ads.includes(id)) {
            _ads.push(id);
            let shelter_image = {h: 50, w:50};
            let shelter_size = new OpenLayers.Size(shelter_image.w,shelter_image.h); //w,h
            let shelter_offset = new OpenLayers.Pixel(-(shelter_image.w/2)+1, -shelter_image.h+6);
            let shelter_icon;
            let shelter_marker;

            shelter_icon = new OpenLayers.Icon('https://raw.githubusercontent.com/TheCre8r/WME-BackEnd-Data/master/images/shelter-pin.png', shelter_size, shelter_offset);
            shelter_marker = new OpenLayers.Marker(new OpenLayers.LonLat(adpinPt.x,adpinPt.y),shelter_icon);
            shelter_marker.id = 'adpin_icon_'+id; // not needed
            _adPinsLayer.addMarker(shelter_marker);
            let markerId_logo = shelter_marker.icon.imageDiv.id;
            let markerDiv_logo = document.getElementById(markerId_logo);
            markerDiv_logo.className = "shelter-logo";
            _ads['logo-' + id] = shelter_marker;

            shelter_marker.events.register('click', marker, function(evt) {
                clicky();
            });

        } else if (!_ads.includes(id)){
            _ads.push(id);

            let logo_image = {h: 35, w:44};
            let logo_size = new OpenLayers.Size(logo_image.w,logo_image.h); //w,h
            let logo_offset = new OpenLayers.Pixel(-(logo_image.w/2), -logo_image.h-9);
            let logo_icon;
            let logo_marker;

            let badge_image = {h: 20, w:20};
            let badge_size = new OpenLayers.Size(badge_image.w,badge_image.h); //w,h
            let badge_offset = new OpenLayers.Pixel(-(badge_image.w/2)+24, -badge_image.h-34);
            let badge_icon;
            let badge_marker;

            logo = `https://ads-resources-legacy.waze.com/resources/images/1.0/3x/${logo}.png`;

            //Always show the pin
            marker.id = 'adpin_'+id; // not needed
            _adPinsLayer.addMarker(marker);
            markerId = marker.icon.imageDiv.id;
            markerDiv = document.getElementById(markerId);
            markerDiv.className = "adpin-background";
            _ads['background-' + id] = marker;

            if (venue != null && id === "venues."+venue.id) {
                color = "white";
                hi(ad_data,marker)
                log(`Ad tab created`)
            } else if (id.includes("venues.")){
                color = "grey";
            } else if (id.includes("googlePlaces.")){
                color = "blue";
            } else {
                color = "red";
            }

            //Always show the logo
            logo_icon = new OpenLayers.Icon(logo, logo_size, logo_offset);
            logo_marker = new OpenLayers.Marker(new OpenLayers.LonLat(adpinPt.x,adpinPt.y),logo_icon);
            logo_marker.id = 'adpin_icon_'+id; // not needed
            _adPinsLayer.addMarker(logo_marker);
            let markerId_logo = logo_marker.icon.imageDiv.id;
            let markerDiv_logo = document.getElementById(markerId_logo);
            markerDiv_logo.className = "adpin-logo";
            _ads['logo-' + id] = logo_marker;

            //Build badge for only red and blue
            if (color == "blue" || color == 'red') {
                if (color == "blue") {
                    badge_icon = new OpenLayers.Icon(`https://raw.githubusercontent.com/TheCre8r/WME-BackEnd-Data/master/images/google_linked.svg?sanitize=true`, badge_size, badge_offset);
                } else { // if (color == 'red')
                    badge_icon = new OpenLayers.Icon(`https://raw.githubusercontent.com/TheCre8r/WME-BackEnd-Data/master/images/unlinked.svg?sanitize=true`, badge_size, badge_offset);
                }
                badge_marker = new OpenLayers.Marker(new OpenLayers.LonLat(adpinPt.x,adpinPt.y),badge_icon);
                badge_marker.id = 'adpin_icon_'+id; // not needed
                _adPinsLayer.addMarker(badge_marker);
                let markerId_badge = badge_marker.icon.imageDiv.id;
                let markerDiv_badge = document.getElementById(markerId_badge);
                markerDiv_badge.className = "adpin-badge";
                _ads['badge-' + id] = badge_marker;

                badge_marker.events.register('click', marker, function(evt) {
                    clicky();
                });
            }

            marker.events.register('click', marker, function(evt) {
                clicky();
            });
            logo_marker.events.register('click', marker, function(evt) {
                clicky();
            });

            //wmeMarkers.addMarker(new OpenLayers.Marker(new OpenLayers.LonLat(W.map.getCenter().lon,W.map.getCenter().lat),icon));
            //wmeMarkers.addMarker(new OpenLayers.Marker(new OpenLayers.LonLat(W.map.getCenter().lon,W.map.getCenter().lat+20),icon.clone()));
            log(`Ad Created for ${ad_data.name} at ${ad_data.a}`)
        } else {
            if ("venues." + W.selectionManager.getSelectedFeatures()[0].model.attributes.id.toString() == id){
                hi(ad_data,marker) //adds ad tab to sidebar if marker already exists
            }
            log(`Ad Already Created`)
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

    function hi(ad_data,marker){
        let id = ad_data.v
        //let id = 'advertisement.poi-' + ad_data.j.campaignId;
        //W.selectionManager.selectFeature(_ads['PsudoVenue-' + id])
        log(ad_data);
        let lonlat = WazeWrap.Geometry.ConvertTo4326(marker.lonlat.lon, marker.lonlat.lat)
        lonlat.lat = Math.round(lonlat.lat * 1000000) / 1000000;
        lonlat.lon = Math.round(lonlat.lon * 1000000) / 1000000;
        let selectedvenue;
        let venueModel;
        let isVenueSelected = false;
        let isUnlinked = true;
        if (ad_data.v.startsWith('venue')) {
            isUnlinked = false;
        }
        if(W.selectionManager.getSelectedFeatures().length > 0) {
            venueModel = W.selectionManager.getSelectedFeatures()[0].model.attributes;
            isVenueSelected = true;
            if (W.selectionManager.getSelectedFeatures()[0].geometry.x && W.selectionManager.getSelectedFeatures()[0].geometry.y){
                selectedvenue = WazeWrap.Geometry.ConvertTo4326(W.selectionManager.getSelectedFeatures()[0].geometry.x,W.selectionManager.getSelectedFeatures()[0].geometry.y)
            } else {
                selectedvenue = WazeWrap.Geometry.ConvertTo4326((W.selectionManager.getSelectedFeatures()[0].geometry.components[0].bounds.left + W.selectionManager.getSelectedFeatures()[0].geometry.components[0].bounds.right) / 2,(W.selectionManager.getSelectedFeatures()[0].geometry.components[0].bounds.top + W.selectionManager.getSelectedFeatures()[0].geometry.components[0].bounds.bottom) / 2)
            }
            selectedvenue.lat = Math.round(selectedvenue.lat * 1000000) / 1000000;
            selectedvenue.lon = Math.round(selectedvenue.lon * 1000000) / 1000000;
        }
        let description = `Campaign ID: ${ad_data.j.campaignId} \r\n`;
        if (isUnlinked) {
            if (isVenueSelected) {
                description = `Campaign ID: ${ad_data.j.campaignId} \r\nPlease move this ad pin to the correct location and link it with the existing Waze place located here.  \r\n`;
            }
        } else {
            description = `Campaign ID: ${ad_data.j.campaignId} \r\n`;
        }

        let htmlstring =
            `<div>`+
                `<div class="venue sidebar-column venue-category-advertisement">`+
                    `${(!selectedvenue ?
                    `<div class="selection selection-icon">`+
                        `<span class="text">One advertisement selected</span>`+
                        `<i id="WMEBED-close-ad" class="fas fa-lg fa-window-close"></i>`+
                    `</div>`
                    :``)}`+
                    `<div class="alert alert-danger header-alert locked-alert" style="display: block;">`+
                        `${I18n.t(`wmebed.ad_pin_alert`)}`+
                    `</div>`+
                    `<div class="tab-content">`+
                        `<div class="tab-pane active">`+
                            `<div class="form-group">`+
                                `<label class="control-label">${I18n.t(`wmebed.autocomplete_address`)}<i id="ad-address" class="EP2-icon waze-tooltip"></i></label>`+
                                `<div class="address-edit side-panel-section">`+
                                    `<div class="address-edit-view">`+
                                        `<div class="clearfix preview" style="display: block;">`+
                                            `<div class="full-address-container">`+
                                                `<span class="full-address">${ad_data.a}</span>`+
                                            `</div>`+
                                        `</div>`+
                                    `</div>`+
                                `</div>`+
                            `</div>`+
                            `<div class="form-group">`+
                                `<label class="control-label">Name</label>`+
                                `<div class="controls">`+
                                    `<span class="full-address">${ad_data.name}</span>`+
                                `</div>`+
                            `</div>`+
                            `<div class="form-group" id="WMEBED-nearby-place-select">`+
                                `<label class="control-label">${I18n.t(`wmebed.select_nearby`)}</label>`+
                                `<div class="controls">`+
                                    `<ul id="WMEBED-nearby-place-list" class="additional-attributes list-unstyled side-panel-section">`+
                                    `</ul>`+
                                `</div>`+
                            `</div>`+
                            `<div class="form-group">`+
                                `<label class="control-label">${I18n.t(`wmebed.open_in_waze`)} <i id="ad-open-tooltip" class="EP2-icon waze-tooltip"></i></label>`+
                                `<div class="controls">`+
                                    `<div id="appLinkQRCode">`+
                                    `</div>`+
                                `</div>`+
                            `</div>`+
                            `<ul class="additional-attributes list-unstyled side-panel-section">`+
                                `<li>ID: ${ad_data.v}</li>`+
                            `</ul>`+
                        `</div>`+
                        `<div class="WMEBED-report">`+
                            `<span class="fa-stack fa-2x" style="font-size: 13px;">`+
                                `<i class="fas fa-map-marker-alt fa-stack-1x"></i>`+
                                `<i style="color: #ECECEC;font-size: 12px;" class="fas fa-slash fa-stack-1x"></i>`+
                                `<i style="font-size: 11px;top: -1px;" class="fas fa-slash fa-stack-1x"></i>`+
                            `</span>`+
                            `<div style="display: inline-block">`+
                                `<a id="bedFormLink" target="_blank" href="https://support.google.com/waze/answer/7402261?hl=en&amp;adid=${encodeURIComponent(id)}&amp;username=${encodeURIComponent(USER.name)}&amp;brand_name=${encodeURIComponent(ad_data.name)}&amp;incorrect_gps_coordinates=${encodeURIComponent(lonlat.lon)},%20${encodeURIComponent(lonlat.lat)}&amp;pin_address=${encodeURIComponent(ad_data.a)}&amp;description=${encodeURIComponent(description)}${(selectedvenue ? `&p2=true&correct_gps_coordinates=${encodeURIComponent(selectedvenue.lon)},%20${encodeURIComponent(selectedvenue.lat)}` : `&p1=true`)}">Report Misplaced Ad Pin</a>`+
                            `</div>`+
                        `</div>`+
                    `</div>`+
                `</div>`+
            `</div>`
        $("#user-info").hide();
        $("#edit-panel").show();
        if(W.selectionManager.getSelectedFeatures().length > 0 && W.selectionManager.getSelectedFeatures()[0].model.type === "venue" && $('#advert-tab').length == '0') {
            log("Success");
            $('.tabs-container ul').append('<li><a data-toggle="tab" id="advert-tab" href="#venue-ad"><span class="fas fa-ad fa-lg"></span></a></li>');
            $('.venue').find('.tab-content').append(`
                <div class="tab-pane" id="venue-ad">
                    ${htmlstring}
                </div>
            `);

            if (W.selectionManager.getSelectedFeatures()[0].model.attributes.id.toString().startsWith('-')) {
                let formLink = document.getElementById('bedFormLink');
                formLink.onclick = function() {
                    alert('New place must be saved before linking through the report form!');
                    return false;
                }
            }
            document.getElementById('WMEBED-nearby-place-select').setAttribute('style','display:none;');

        } else if ($('#advert-tab').length == '1') {
            return;
        } else {
            $(document.querySelector('#edit-panel > div')).empty();
            $(document.querySelector('#edit-panel > div')).append(htmlstring);

            // Find nearby places
            let nearbyPlaces = getNearbyPlaces(ad_data);
            nearbyPlaces.forEach(function (venue) {
                log(venue.id + " " + venue.address + " (" + venue.distanceFromAdPin + ")");
                let listItem = document.createElement('li');
                listItem.id = 'WMEBED-nearby-' + venue.id;
                listItem.className = 'element-history-item';
                let venueLink = document.createElement('div');
                venueLink.id = 'bedCreatePlace';
                venueLink.className = 'element-history-item tx-has-content tx-has-related closed';
                //venueLink.setAttribute('style', 'cursor:pointer;text-decoration:underline;');
                let name = venue.name;
                let iconClass = 'WMEBED-icon-link-venue';
                if (venue.isParkingLot) {
                    iconClass = 'WMEBED-icon-link-parking';
                }
                let html = '<div class="tx-header"><div class="flex-noshrink" style="width:10%"><div class="flex-noshrink ' + iconClass + '"></div>'
                + '</div><div class="tx-summary" style="width:100%;">'
                + '<div class="tx-author-date"><h4>' + name + '</h4></div>'
                + '<div class="tx-preview">' + venue.houseNumber + ' ' + venue.streetName + '</div>'
                +'</div><div class="flex-noshrink">' + venue.distanceFromAdPin + 'm</div></div>';

                //venueLink.innerHTML = "<div class='WMEBED-icon-link-venue'></div>" + name + "<br>" + venue.houseNumber + " " + venue.streetName + " (" + venue.distanceFromAdPin + "m)";
                venueLink.innerHTML = html;
                listItem.append(venueLink);
                let adPoint = new OpenLayers.Geometry.Point(ad_data.x, ad_data.y);
                adPoint.transform(W.map.getOLMap().displayProjection, W.map.getProjectionObject());

                let lsLine1 = new OpenLayers.Geometry.LineString([adPoint, venue.geometry]);

                var lineFeature1 = new OpenLayers.Feature.Vector(lsLine1, {}, {
                    strokeWidth: 3,
                    strokeDashstyle: '4 4',
                    strokeColor: 'yellow'
                });

                venueLink.onmouseenter = function () {
                    //_PsudoVenueLayer.addFeatures([lineFeature1]);
                };
                venueLink.onmouseleave = function () {
                    //_PsudoVenueLayer.removeFeatures([lineFeature1]);
                };
                venueLink.onclick = function() {
                    //_PsudoVenueLayer.removeFeatures([lineFeature1]);
                    let venue_id = venue.id.toString();
                    let venueModel = W.model.venues.objects[venue_id];
                    W.selectionManager.setSelectedModels(W.model.venues.objects[venue_id])
                    W.selectionManager._triggerSelectionChanged()
                    hi(ad_data, marker);
                    marker.events.register('click', marker, function(evt) {
                        if (_settings.PanOnClick) {
                            W.map.olMap.panTo(marker.lonlat)
                        }
                        W.selectionManager.setSelectedModels(venueModel)
                        hi(ad_data,marker)
                    });
                    if (typeof _ads['logo-' + ad_data.v] != 'undefined') {
                        _ads['logo-' + id].events.register('click', marker, function(evt) {
                            if (_settings.PanOnClick) {
                                W.map.olMap.panTo(marker.lonlat)
                            }
                            W.selectionManager.setSelectedModels(venueModel)
                            hi(ad_data,marker)
                            if (_settings.AutoSelectAdTab) {
                                document.getElementById('advert-tab').click();
                            }
                        });
                    }
                    if (typeof _ads['badge-' + id] != 'undefined') {
                        _ads['badge-' + ad_data.v].events.register('click', marker, function(evt) {
                            if (_settings.PanOnClick) {
                                W.map.olMap.panTo(marker.lonlat)
                            }
                            W.selectionManager.setSelectedModels(venueModel)
                            hi(ad_data,marker)
                            if (_settings.AutoSelectAdTab) {
                                document.getElementById('advert-tab').click();
                            }
                        });
                    }
                }

                document.getElementById('WMEBED-nearby-place-list').append(listItem);
            });

            let listItem = document.createElement('li');
            listItem.id = 'bedCreatePlaceholder';
            document.getElementById('WMEBED-nearby-place-list').append(listItem);

            // Link to create new place
            let createLink = document.createElement('div');
            createLink.id = 'bedCreatePlace';
            createLink.className = 'element-history-item tx-has-content tx-has-related closed';
            //createLink.setAttribute('style', 'cursor:pointer;text-decoration:underline;');
            let iconClass = 'WMEBED-icon-link-venue';
            let html = '<div class="tx-header"><div class="flex-noshrink" style="width:10%"><div class="flex-noshrink"><span class="fa fa-plus" style="font-size:20px;color:#A1A6AB;"></span></div>'
            + '</div><div class="tx-summary" style="width:100%;">'
            + `<div class="tx-preview" style="position: relative;top: 50%;transform: translateY(-50%);font-size: 13px;">${I18n.t('wmebed.create_new_place')}</div>`
            + '</div><div class="flex-noshrink"></div></div>';
            createLink.innerHTML = html;
            listItem.append(createLink);
            createLink.onclick = function() {
                createPlace(ad_data, marker);
                let venue_id = W.selectionManager.getSelectedFeatures()[0].model.attributes.id.toString();
                let venueModel = W.model.venues.objects[venue_id];
                marker.events.register('click', marker, function(evt) {
                    if (_settings.PanOnClick) {
                        W.map.olMap.panTo(marker.lonlat)
                    }
                    W.selectionManager.setSelectedModels(venueModel)
                    hi(ad_data,marker)
                });
                if (typeof _ads['logo-' + ad_data.v] != 'undefined') {
                    _ads['logo-' + id].events.register('click', marker, function(evt) {
                        if (_settings.PanOnClick) {
                            W.map.olMap.panTo(marker.lonlat)
                        }
                        W.selectionManager.setSelectedModels(venueModel)
                        hi(ad_data,marker)
                        if (_settings.AutoSelectAdTab) {
                            document.getElementById('advert-tab').click();
                        }
                    });
                }
                if (typeof _ads['badge-' + id] != 'undefined') {
                    _ads['badge-' + ad_data.v].events.register('click', marker, function(evt) {
                        if (_settings.PanOnClick) {
                            W.map.olMap.panTo(marker.lonlat)
                        }
                        W.selectionManager.setSelectedModels(venueModel)
                        hi(ad_data,marker)
                        if (_settings.AutoSelectAdTab) {
                            document.getElementById('advert-tab').click();
                        }
                    });
                }
            }

        }
        displayQrCode("appLinkQRCode", ad_data.v);

        $("#WMEBED-close-ad" ).click(function() {
            $("#user-info").show();
            $("#edit-panel").hide();
        });

        createTooltip('ad-address',I18n.t(`wmebed.ad_address_tooltip`));
        createTooltip('ad-open-tooltip',I18n.t(`wmebed.ad_open_tooltip`));
    }

    function displayQrCode(qrElementID, venueID) {

        let _appLinkBase = 'waze://';
        // _appLinkBase = 'https://www.waze.com/ul'; // Universal Deep Link

        let _colorLight = "#ffffff";
        if (window.location.host == "support.google.com") {
            _colorLight = "#f1f3f4";
        }

        new QRCode(qrElementID, {
            text: `${_appLinkBase}?preview_venue_id=${venueID}`,
            width: 100,
            height: 100,
            colorDark : "#155270",
            colorLight : _colorLight,
            correctLevel : QRCode.CorrectLevel.H
        });
                $("#appLinkQRCode").append(`<div class="wz-icon-wrapper"><i class="wz-icon is-wazer-border"></i></div>`);
    }

    function getNearbyPlaces(ad_data) {
        var nearbyPlaces = [];

        let adName = ad_data.name;

        Object.keys(W.model.venues.objects).forEach( function(venueID) {
            if (!W.model.venues.objects[venueID].outOfScope) {
                let venue = W.model.venues.objects[venueID].attributes;
                let point = new OpenLayers.Geometry.Point(ad_data.x, ad_data.y);
                point.transform(W.map.getOLMap().displayProjection, W.map.getProjectionObject());
                let distanceFromAdPin = venue.geometry.distanceTo(point);
                let houseNumber = venue.houseNumber;
                if (houseNumber == null) {
                    houseNumber = '';
                }
                let streetName = null;
                if (venue.streetID != undefined && W.model.streets.objects[venue.streetID] != undefined) {
                    streetName = WazeWrap.Model.getStreetName(venue.streetID);
                }

                if (streetName == null || streetName == '') {
                    streetName = "No address";
                }

                let foundPlace = {
                    id: venue.id,
                    name: venue.name,
                    houseNumber: houseNumber,
                    streetName: streetName,
                    distanceFromAdPin: Math.trunc(distanceFromAdPin),
                    isParkingLot: false,
                    geometry: venue.geometry.getCentroid()
                };

                let compareA = adName.toUpperCase().replace(/[^A-Z0-9,]/g, '');
                let compareB = venue.name.toUpperCase().replace(/[^A-Z0-9,]/g, '');
                if (compareA.length > compareB.length) {
                    compareA = venue.name.toUpperCase().replace(/[^A-Z0-9,]/g, '');
                    compareB = adName.toUpperCase().replace(/[^A-Z0-9,]/g, '');
                }
                //if (venue.name == ad_data.name) {
                if (venue.name.length > 0 && compareB.startsWith(compareA)) {
                    if (venue.categories[0] == 'PARKING_LOT') {
                        foundPlace.isParkingLot = true;
                    }
                    nearbyPlaces.push(foundPlace);
                    log('Nearby place: ');
                    log(foundPlace);
                } else if (distanceFromAdPin < 100 && venue.categories[0] == 'PARKING_LOT') {
                    if (venue.categoryAttributes.PARKING_LOT.parkingType == "PUBLIC") {
                        foundPlace.isParkingLot = true;
                        nearbyPlaces.push(foundPlace);
                    }
                }
            }
        });

        nearbyPlaces.sort(function(a,b) {
            return a.distanceFromAdPin - b.distanceFromAdPin;
        });

        let limit = 5;
        if (nearbyPlaces.length < 5) {
            limit = nearbyPlaces.length;
        }
        return nearbyPlaces.slice(0, limit);
    }

    function createPlace(ad_data, marker) {
        let wazefeatureVectorLandmark = require("Waze/Feature/Vector/Landmark");
        let wazeActionAddLandmark = require("Waze/Action/AddLandmark");
        let wazeActionUpdateObject = require('Waze/Action/UpdateObject');
        let wazeActionUpdateFeatureAddress = require('Waze/Action/UpdateFeatureAddress');

        let landmark = new wazefeatureVectorLandmark();
        let offset_y = ad_data.y - 0.00005;
        let point = new OpenLayers.Geometry.Point(ad_data.x, offset_y);
        point.transform(W.map.getOLMap().displayProjection, W.map.getProjectionObject());
        landmark.geometry = point;
        landmark.attributes.name = ad_data.name;

        W.model.actionManager.add(new wazeActionAddLandmark(landmark));

        let addressDetails = getStreetFromAdAddress(ad_data, point);
        if (addressDetails.foundAddress) {
            W.model.actionManager.add(new wazeActionUpdateFeatureAddress(landmark, addressDetails.streetAddressParts,{streetIDField: 'streetID'}));

            if (addressDetails.houseNumber != null) {
                W.model.actionManager.add(new wazeActionUpdateObject(landmark,{houseNumber: addressDetails.houseNumber}));
            }
        }

        let foundFeature = null;
        W.selectionManager._layers.forEach(function(layer) {
            if (layer.featureType == 'venue') {
                layer.features.forEach(function(feature) {
                    if (landmark.geometry.id == feature.geometry.id)
                    {
                        foundFeature = feature;
                    }
                });
            }
        });
        if (foundFeature != null) {
            W.selectionManager.selectFeature(foundFeature);
            W.selectionManager._triggerSelectionChanged()
            hi(ad_data, marker);
        }
    }

    function getStreetFromAdAddress(ad_data, point) {
        // --- Street Name Matching ---
        // Get HN from beginning or end of name
        // Split ad street name into separate words
        // Get unique street ids from segments on screen
        // Iterate through all streets on screen in model
        // Split model streets into separate words
        // Compare each word from the model street to all of the words in the ad street name
        // If found, test to see if the word is in the same position in both
        // Assign a score to each street in the model
        // Return street name with the highest score

        let adAddress = ad_data.a;

        let addressDetails = {
            foundAddress: false,
            houseNumber: null,
            closestMatch: null,
            streetAddressParts: null
        };
        let adAddressParts = adAddress.split(',');
        let adAddressStreet = adAddressParts[0];
        let adAddressStreetParts = adAddressStreet.toUpperCase().replace(/\./g, "").replace(/\s\s+/g, ' ').split(' ');

        if (adAddressParts.length > 1) {
            let adAddressHNAfter = adAddressParts[1].trim();
            if (adAddressHNAfter.match(/^\d+-?\d+$/)) {
                addressDetails.houseNumber = adAddressHNAfter;
            }
        }

        let hnAdjust = 0;
        if (adAddressStreetParts[0].match(/^\d+-?\d*$/)){
            addressDetails.houseNumber = adAddressStreetParts[0];
            hnAdjust = 1;
        } else if(adAddressStreetParts[adAddressStreetParts.length - 1].match(/^\d+-?\d*$/)){
            addressDetails.houseNumber = adAddressStreetParts[adAddressStreetParts.length - 1];
            hnAdjust = 1;
        }

        let containsOnlyDigits = false;
        let digitPart = '';
        for (let i = hnAdjust; i < adAddressStreetParts.length; i++) {
            let adStreetPart = adAddressStreetParts[i];
            if (adStreetPart.match(/^\d+$/)) {
                containsOnlyDigits = true;
                digitPart = adStreetPart;
            }
        }

        let streetIDs = [];
        // Get unique street IDs from all segments on screen
        // Use only street names assigned to segments as venues might include unnoticed non-standards names
        // ex: W Ridge Rd vs West Ridge Rd
        Object.keys(W.model.segments.objects).forEach(function (segmentID) {
            let segment = W.model.segments.objects[segmentID].attributes;
            if (segment.roadType != 4) { // Exclude Ramp
                if (segment.primaryStreetID != null) {
                    streetIDs[segment.primaryStreetID] = true;
                }
                if (segment.streetIDs.length > 0) {
                    segment.streetIDs.forEach(function (streetID) {
                        streetIDs[streetID] = true;
                    });
                }
            }
        });

        let possibleMatch = [];
        Object.keys(streetIDs).forEach(function (street) {
            let streetObject = W.model.streets.objects[street];
            if (streetObject.name != null) {
                let streetName = streetObject.name.toUpperCase();

                // Skip street names that shouldn't be used for place addresses
                if (streetObject.name != null && !streetObject.name.match(/^(TO )|(EXIT )/)) {
                    let modelAddressParts = streetName.split(' ');
                    let details = {
                        name: streetObject.name,
                        wordCountDiff: Math.abs((adAddressStreetParts.length - hnAdjust) - modelAddressParts.length),
                        wordMatches: 0,
                        positionMatches: 0,
                        positionAdjacentMatches: 0,
                        score: 0,
                        street: streetObject
                    }

                    // Build array of words and aliases to compare. ex: [ST] will contain both [ST] and [STREET]
                    for (let i = 0; i <= modelAddressParts.length - 1; i++) {
                        let namePart = modelAddressParts[i];
                        let compareWords = [namePart];
                        if (streetAlias[namePart] != undefined) {
                            if (typeof streetAlias[namePart] == 'string') {
                                compareWords.push(streetAlias[namePart]);
                            } else {
                                streetAlias[namePart].forEach( function(word) {
                                    compareWords.push(word);
                                });
                            }
                        }

                        // Iterate though list of words to compare, test against all words in ad street
                        for (let j = 0; j<=compareWords.length - 1;j++) {
                            if (adAddressStreetParts.includes(compareWords[j])
                                || (containsOnlyDigits
                                    && (compareWords[0].startsWith(digitPart) // Not perfect, but handles cases like 'N 47 St'
                                        || compareWords[0].endsWith("-" + digitPart) // Not perfect, but handles cases like 'State Rte 32'
                                       )
                                   )
                               ) {
                                details.wordMatches++;
                                // Match found, determine position in full street name
                                let adWordPosition = adAddressStreetParts.indexOf(compareWords[j]) - hnAdjust;
                                if (i == adWordPosition ) {
                                    details.positionMatches++;
                                } else if (Math.abs(i - adWordPosition) == 1) {
                                    details.positionAdjacentMatches++;
                                }
                                log("Matched: " + namePart + ': ' + streetObject.name);
                            }
                        }
                    }

                    // --- Calculate Score ---
                    // Give most weight to matched words
                    // Subtract weighted difference in number of words
                    details.score = (details.wordMatches * 1.5) - (details.wordCountDiff * 0.9);
                    // Add number of word position matches
                    details.score += details.positionMatches * 1.2;
                    // Add less weighted adjacent position matches
                    details.score += details.positionAdjacentMatches * 0.5;
                    possibleMatch[streetObject.id] = details;
                    if (details.wordMatches > 0) {
                        log(details.name + " - Score: " + details.score);
                        log(details);
                    }
                }
            }
        });

        // Add the results with the best scores to an array
        let duplicateScores = [];
        let bestScore = -10;
        Object.keys(possibleMatch).forEach(function (id) {
            let match = possibleMatch[id];
            if (match.wordMatches > 0 && match.score >= bestScore) {
                bestScore = match.score;
                let matches = [];
                if (duplicateScores[bestScore] != undefined) {
                    matches = duplicateScores[bestScore];
                }
                matches.push(match);
                duplicateScores[bestScore] = matches;
                addressDetails.foundAddress = true;
            }
        });

        log("Duplicate scores:");
        log(duplicateScores);

        let closestMatch = null;

        if (bestScore > -10) {
            if (duplicateScores[bestScore].length > 1) {
                // Multiple matches with the same score exist, use Levenshtein distance on entire address to find the closest match
                let lowestDistance = 1000;
                let distanceScores = [];
                let compareAddress = adAddress.toUpperCase();
                duplicateScores[bestScore].forEach(function (entry) {
                    let editDistance = getEditDistance(compareAddress, entry.name.toUpperCase());
                    if (editDistance <= lowestDistance) {
                        lowestDistance = editDistance;
                        if (distanceScores[lowestDistance] == undefined) {
                            distanceScores[lowestDistance] = [];
                        }
                        distanceScores[lowestDistance].push(entry);
                    }
                });
                closestMatch = distanceScores[lowestDistance][0];
                //TODO: Check to see that all results with the same edit distance have the same name before assuming city is the only difference
                if (distanceScores[lowestDistance].length > 1) {
                    // Multiple matches still exist, attempt to find the name using the closest primary city name.
                    // Get the City ID of the closest segment
                    let closestSegment = WazeWrap.Geometry.findClosestSegment(point, true, false);
                    let closestCityID = WazeWrap.Model.getCityID(closestSegment.attributes.primaryStreetID);
                    distanceScores[lowestDistance].forEach(function (entry) {
                        if (entry.street.cityID == closestCityID) {
                            closestMatch = entry;
                        }
                    });
                }
            } else {
                // Take the only match with the best score
                closestMatch = duplicateScores[bestScore][0];
            }
        }

        if (addressDetails.foundAddress) {
            addressDetails.closestMatch = closestMatch;

            var streetAddressParts = {
                streetName: closestMatch.street.name,
                emptyStreet: false,
                cityName: "",
                emptyCity: false,
                streetID: closestMatch.street.id,
                stateID: null,
                countryID: null,
                addressFormShown: false,
                editable: true,
                fullAddress: "",
                ttsLocales: [W.Config.tts.default_locale],
                altStreets: new Backbone.Collection,
                newAltStreets: new Backbone.Collection
            };

            let city = W.model.cities.objects[closestMatch.street.cityID].attributes;
            if (city.name == "") {
                adAddressStreetParts.emptyCity = true;
            }
            streetAddressParts.cityName = city.name;
            streetAddressParts.stateID = city.stateID;
            let state = W.model.states.objects[city.stateID];
            streetAddressParts.countryID = state.countryID;

            addressDetails.streetAddressParts = streetAddressParts;
            log(addressDetails);
        }

        return addressDetails;
    }
    function gasprices(tempjson,bypass){
        let latlon = get4326CenterPoint();
        let venue = W.selectionManager.getSelectedFeatures()[0].model.attributes;
        let link = `https://${window.location.hostname + W.Config.search.server}?lon=${latlon.lon}&lat=${latlon.lat}&format=PROTO_JSON_FULL&venue_id=venues.${venue.id}`;
        if(W.selectionManager.getSelectedFeatures()[0].model.type === "venue" && tempjson.venue.product) {
            if (venue.id <= 0 && W.selectionManager.getSelectedFeatures()[0].model.attributes.categories.indexOf("GAS_STATION") >= 0){
                $('.tabs-container ul').append('<li><a data-toggle="tab" id="gas-tab" href="#venue-gas"><span class="fas fa-gas-pump"></span></a></li>');

                let htmlstring =
                    //$.getJSON("https://www.waze.com/SearchServer/mozi?lon=-78.40874&lat=36.26622&format=PROTO_JSON_FULL&venue_id=venues.184549739.1845431851.509601",function(data) {console.log (data.venue.product[0].id);})
                    `<div class="gas tab-pane" id="venue-gas">`+
                    `<form class="attributes-form">`+
                    `<div class="side-panel-section">`+
                    `<div class="form-group">`+
                    `<label class="control-label">${I18n.t(`wmebed.gas_prices`)}</label>`+
                    `<div id="gas-prices" style="text-align:center">`+
                    `</div>`+
                    `</div>`+
                    `<ul class="additional-attributes list-unstyled side-panel-section">`+
                    `<li id="gas-update-time">${I18n.t(`wmebed.invalid_gas`)} - <a target="_blank" href="https://www.waze.com/user/editor/jm6087">jm6087</a></li>`+
                    `</ul>`+
                    `<div class="WMEBED-report">`+
                    `<i class="fab fa-github" style="font-size: 13px; padding-right:5px"></i>`+
                    `<div style="display: inline-block">`+
                    `<a id="WMEBED-report-an-issue-gas">${I18n.t(`wmebed.report_an_issue`)}</a>`+
                    `</div>`+
                    `</div>`+
                    `</div>`+
                    `</form>`+
                    `</div>`;
                $('.venue').find('.tab-content').append(htmlstring);
            } else if (bypass == true || W.selectionManager.getSelectedFeatures()[0].model.attributes.categories.indexOf("GAS_STATION") >= 0){
                console.log(tempjson);

                let price_unit = tempjson.price_unit; // $
                let updatetimes = []
                for ( let i = 0; i < tempjson.venue.product.length; i++) {
                    updatetimes.push(tempjson.venue.product[i].last_updated)
                }
                let lastupdate = Math.max(...updatetimes)
                let lastupdatestring = timeConverter(lastupdate); // October 20, 2020 11:38
                let lastupdateduser;
                if (tempjson.venue.product) {
                    for (var i = 0; i < tempjson.venue.product.length; i++){
                        if (tempjson.venue.product[i].last_updated == lastupdate){
                            lastupdateduser = tempjson.venue.product[i].updated_by;
                            i=tempjson.venue.product.length
                        }
                    }
                }

                //Make Gas Price Tab Icon
                $('.tabs-container ul').append('<li><a data-toggle="tab" id="gas-tab" href="#venue-gas"><span class="fas fa-gas-pump"></span></a></li>');

                //Make Gas Price Tab Content
                let htmlstring =
                    //$.getJSON("https://www.waze.com/SearchServer/mozi?lon=-78.40874&lat=36.26622&format=PROTO_JSON_FULL&venue_id=venues.184549739.1845431851.509601",function(data) {console.log (data.venue.product[0].id);})
                    `<div class="gas tab-pane" id="venue-gas">`+
                    `<form class="attributes-form">`+
                    `<div class="side-panel-section">`+
                    `<div class="form-group">`+
                    `<label class="control-label">${I18n.t(`wmebed.gas_prices`)+(_settings.Debug == true ? `<i id="EP2-bug" class="fas fa-bug EP2-icon EP2-clickable" style="color: #8c8c8c;"></i>` :``)}</label>`+
                    `<div id="gas-prices" style="text-align:center">`+
                    `</div>`+
                    `</div>`+
                    `<ul class="additional-attributes list-unstyled side-panel-section">`+
                    `<li id="gas-update-time"></li>`+
                    `</ul>`+
                    `<div class="WMEBED-report">`+
                    `<i class="fab fa-github" style="font-size: 13px; padding-right:5px"></i>`+
                    `<div style="display: inline-block">`+
                    `<a id="WMEBED-report-an-issue-gas">${I18n.t(`wmebed.report_an_issue`)}</a>`+
                    `</div>`+
                    `</div>`+
                    `</div>`+
                    `</form>`+
                    `</div>`;
                $('.venue').find('.tab-content').append(htmlstring);
                $("#EP2-bug").click(function() {
                    $.getJSON(link, function(data) {
                        makeModal(venue.name,undefined,data,link)
                    });
                });

                //Build Gas Price Table
                let gastypes = []
                for (let i = 0; i < tempjson.venue.product.length; i++) {
                    if (tempjson.venue.product[i].id.includes("gas.")) {
                        gastypes.push(tempjson.venue.product[i].id) //$("#gas-prices > div:nth-child(1) > div").html()
                        let type = tempjson.venue.product[i].id; // gas.premium
                        let price = tempjson.venue.product[i].price //1.999
                        let pricestring
                        if (price.toString().includes('.') && price.toString().split('.')[1].length == 3) {
                            pricestring = tempjson.venue.currency[0].toString()+String.fromCharCode(160)+price.toString().substring(0, price.toString().length-1)+`<sup style="top:-0.3em;">`+price.toString().substring(price.toString().length-1, price.toString().length)+`</sup>`;
                        } else {
                            pricestring = tempjson.venue.currency[0].toString()+String.fromCharCode(160)+price
                        }
                        let htmlstring =
                            `<div class="gas-price-block" id="${tempjson.venue.product[i].id}">`+
                            `<div class="gas-price">${pricestring}</div>`+
                            `<span class="gas-price-text">${I18n.t(`wmebed.${type}`)}</span>`+
                            `</div>`;
                        $( "#gas-prices" ).append(htmlstring);
                    }
                }

                // Sort Fuel Prices By Country Specifics
                if (W.model.countries && W.model.countries.top && typeof W.model.countries.top != 'undefined') {
                    COUNTRY.id = W.model.countries.top.id;
                    COUNTRY.name = W.model.countries.getObjectById(COUNTRY.id).name;
                }
                log("Country: " + COUNTRY.name)
                if (COUNTRY.name == "United States" || COUNTRY.name == "Canada") {
                    $("#gas\\.regular").appendTo( "#gas-prices" );
                    $("#gas\\.midgrade").appendTo( "#gas-prices" );
                    $("#gas\\.premium").appendTo( "#gas-prices" );
                    $("#gas\\.diesel").appendTo( "#gas-prices" );
                } else if (COUNTRY.name == "Mexico") {
                    $("#gas\\.magna").appendTo( "#gas-prices" );
                    $("#gas\\.premium").appendTo( "#gas-prices" );
                    $("#gas\\.diesel").appendTo( "#gas-prices" );
                } else if (COUNTRY.name == "Italy") {
                    $("#gas\\.diesel > span").html(I18n.t(`wmebed.gas.regular`)) //Change Diesel to Regular since the Waze is stupid and the JSON is backwards
                    $("#gas\\.regular > span").html(I18n.t(`wmebed.gas.diesel`)) //Change Regular to Diesel since the Waze is stupid and the JSON is backwards
                    //Out of spite, I am not changing the ID name. Bite me.
                    $("#gas\\.regular").appendTo( "#gas-prices" );
                    $("#gas\\.diesel").appendTo( "#gas-prices" );
                    $("#gas\\.gpl").appendTo( "#gas-prices" );
                    $("#gas\\.gas").appendTo( "#gas-prices" );
                    var allowed = ["gas.regular", "gas.diesel", "gas.gas", "gas.gpl"];
                    for (let i = document.querySelector("#gas-prices").childElementCount-1; i >= 0; i--) {
                     if (!allowed.includes(document.querySelector("#gas-prices").children[i].id)) {
                         document.querySelector("#gas-prices").children[i].remove()
                     }
                    }
                }

                //Build Last Updated String
                if (lastupdatestring && lastupdateduser){
                    if (lastupdateduser == "3rd Party") {
                        $('#gas-update-time').html(`${I18n.t('edit.updated_on', {time: lastupdatestring})} 3rd Party`)
                    } else {
                        $('#gas-update-time').html(`${I18n.t('edit.updated_on', {time: lastupdatestring})} <a target="_blank" href="https://www.waze.com/user/editor/${lastupdateduser}">${lastupdateduser}</a>`);
                    }
                } else {
                    $('#gas-update-time').html(`${I18n.t('edit.updated_on', {time: lastupdatestring})} Unknown User </a>`);
                }
            }
        }
        $('#WMEBED-report-an-issue-gas').click(function(){ //line 570
            if (confirm(I18n.t(`wmebed.gas_price_reminder`))){
                window.open(
                    `https://github.com/TheCre8r/WME-BackEnd-Data/issues/new?title=Missing%20Gas%20Prices&body=${encodeURIComponent("Permalink: "+$(".WazeControlPermalink .permalink").attr('href').toString())}`,
                    '_blank' //New window
                );
            }
        });
    }

    async function insertExternalProviders2(){
        if ($("#ExternalProviders2").length) {
            return
        }
        let latlon = get4326CenterPoint();
        let venue = W.selectionManager.getSelectedFeatures()[0].model.attributes;
        let link = `https://${window.location.hostname + W.Config.search.server}?lon=${latlon.lon}&lat=${latlon.lat}&format=PROTO_JSON_FULL&venue_id=venues.${venue.id}`;
        let tempjson;
        if (venue.id <= 0) {
        } else {
            await $.ajax({
                url: link,
                type: 'get',
                dataType: 'json',
                cache: false,
                success: function(data) {
                    tempjson = data;
                }
            });
        }

        function DebugCheck() {
            return (_settings.Debug == true ? `<i id="EP2-bug" class="fas fa-bug EP2-icon EP2-clickable" style="color: #8c8c8c;"></i><i id="EP2-spider" class="fas fa-spider EP2-icon EP2-clickable" style="color: #8c8c8c;"></i>` :``)
        }
        //<i id="ep2-tooltip" class="EP2-icon waze-tooltip" data-toggle="tooltip" data-original-title="" title=""></i>
        let $EP2 = $(
            `<div class="form-group" id="ExternalProviders2"><label class="control-label control-label-inline">${I18n.t("edit.venue.external_providers.title")} (${I18n.t(`wmebed.read_only`)})</label><i id="ep2-tooltip" class="EP2-icon waze-tooltip"></i>${DebugCheck()}<div id="EP2-items"><div class="EP2-link"><span>None</span></div></div></div>`);

        if (W.selectionManager.getSelectedFeatures()[0].model.attributes.categories.indexOf("GAS_STATION") >= 0) {
            gasprices(tempjson);
        }



        $('#venue-edit-general > .external-providers-control').after($EP2);
        log("Button Added");

        if (!venue.name.includes("Parking  -") && !venue.name.includes("Parking -") && !venue.name.includes("Lot -") && !venue.name.includes("(copy)") ) {
            log(venue.name)
            getAds(latlon,venue)
        }

        if (venue.id <= 0 || link.toString().indexOf("venues.-") >= 0) {
            return;
        } else {
            if (tempjson.venue.external_providers) {
                log('JSON External Providers ' + tempjson.venue.external_providers.length)
            } else {
                log('JSON External Providers 0')
            }
            let i = 0;
            let count = 0;
            while (tempjson.venue.external_providers != undefined && i < tempjson.venue.external_providers.length) {
                if (tempjson.venue.external_providers[i].provider === "Google") {
                    log("Google Skipped");
                } else {
                    count++;
                    if (count === 1) {
                        $("#EP2-items").html(`<div class="EP2-link"><span>${tempjson.venue.external_providers[i].provider}</span></div>`);
                    } else {
                        $("#EP2-items").append(`<div class="EP2-link"><span>${tempjson.venue.external_providers[i].provider}</span></div>`);
                    }
                    if (tempjson.venue.external_providers[i].provider.includes("Yext")) {
                        $(`#EP2-items > div:nth-child(${count}) > span`).prepend(`<img class="EP2-img" style="height: 20px;" src="https://www.yext.com/wp-content/themes/yext/img/icons/favicon-seal.png">`)
                        //$("#EP2-items").append(`<img class="EP2-img" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAYdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjEuM40k/WcAAAF+SURBVChTPY87T9xAFIXn7xGvH7BZEvGwPc4+gKy91mSBgjIpoSOioIiEUqRIlCIIgRQaFAUh0dBQJlRICEUiWTwPz9w7jEHKreZqzrnnO2S+PwqTMoxf31XcWrCPA6Dfbr73F4ZBUvw4vyBSillaeHTcpgXnUmvtFBNVtyjzUzbfzRE1sagrXrcH7Fk2bi30QPE/XE53WWew0ekzpWtrDUEEtPbz4XHg7mXj3b1Pk3sepWWQlFXz5wCAACJa0Eb7c90gHfnpSBj8fX3z7ftPa5STWYtEoWlQ0UolwjQPMtam+d9KOvP/HqQGsG5Hy5WI0qHj9eIh1wa1MU9+J2oMxhoNbboc0WKKMqH05a+rj18PEJ2uCSEOyL2/7B8FLqu3vvNh765SQZw/H6xLhwuqEblcCRBlpUfZ1AuKWN8LObu01oqZv7isH8kIlyJMVrzszUySQ1MVAWAipEcL/9Xqy35RgyHpSulnLKLl7b/qCdMNGPlua9uVDSk7OT17AAK+PGNnA1kxAAAAAElFTkSuQmCC">${tempjson.venue.external_providers[i].provider}</a></div>`);
                        // $(".EP2-link yext").prepend(`<img class="EP2-img" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAYdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjEuM40k/WcAAAF+SURBVChTPY87T9xAFIXn7xGvH7BZEvGwPc4+gKy91mSBgjIpoSOioIiEUqRIlCIIgRQaFAUh0dBQJlRICEUiWTwPz9w7jEHKreZqzrnnO2S+PwqTMoxf31XcWrCPA6Dfbr73F4ZBUvw4vyBSillaeHTcpgXnUmvtFBNVtyjzUzbfzRE1sagrXrcH7Fk2bi30QPE/XE53WWew0ekzpWtrDUEEtPbz4XHg7mXj3b1Pk3sepWWQlFXz5wCAACJa0Eb7c90gHfnpSBj8fX3z7ftPa5STWYtEoWlQ0UolwjQPMtam+d9KOvP/HqQGsG5Hy5WI0qHj9eIh1wa1MU9+J2oMxhoNbboc0WKKMqH05a+rj18PEJ2uCSEOyL2/7B8FLqu3vvNh765SQZw/H6xLhwuqEblcCRBlpUfZ1AuKWN8LObu01oqZv7isH8kIlyJMVrzszUySQ1MVAWAipEcL/9Xqy35RgyHpSulnLKLl7b/qCdMNGPlua9uVDSk7OT17AAK+PGNnA1kxAAAAAElFTkSuQmCC">`);
                    } else if (tempjson.venue.external_providers[i].provider == "ParkMe") {
                        $(`#EP2-items > div:nth-child(${count}) > span`).replaceWith(`<a href="https://www.parkme.com/lot/${tempjson.venue.external_providers[i].id}" target="_blank">${tempjson.venue.external_providers[i].provider}</a>`);
                        $(`#EP2-items > div:nth-child(${count}) > a`).prepend(`<img class="EP2-img" style="height: 18px;padding: 0px;margin: -2px 2px 0px -6px;" src="https://raw.githubusercontent.com/TheCre8r/WME-BackEnd-Data/master/images/ParkMe.png">`);
                        $(`#EP2-items > div:nth-child(${count}) > a`).attr("target","_blank")[count-1];
                        $(`#EP2-items > div:nth-child(${count}) > a`).append(`<i class="fa fa-link" style="position: absolute;left: 88%;"></i>`);
                    } else if (tempjson.venue.external_providers[i].provider == "MapFuel" || tempjson.venue.external_providers[i].provider == "OPIS Gas Stations" || tempjson.venue.external_providers[i].provider == "FuelIL") {
                        $(`#EP2-items > div:nth-child(${count}) > span`).prepend('<i class="EP2-img-fa fas fa-gas-pump" style="font-size: 14px;"></i> ');
                    } else if (tempjson.venue.external_providers[i].provider == "ESSO") {
                        $(`#EP2-items > div:nth-child(${count}) > span`).prepend(`<img src="https://upload.wikimedia.org/wikipedia/commons/2/22/Esso_textlogo.svg" style="height: 18px;padding: 0px;margin: 0px -3px 0px -7px;">`);
                    } else if (tempjson.venue.external_providers[i].provider == "WazeAds") {
                        $(`#EP2-items > div:nth-child(${count}) > span`).prepend('<i class="EP2-img-fa fas fa-ad" style="font-size: 14px;"></i> ');
                    } else {
                        $(`#EP2-items > div:nth-child(${count}) > span`).prepend('<i class="EP2-img-fa fas fa-server" style="font-size: 14px;"></i> ');
                    }
                    if (_settings.Debug == true) {
                        $(`#EP2-items > div:nth-child(${count}) > span`).append(`<span style="color: #8c8c8c;font-size: 10px;display: inline;"">, ${tempjson.venue.external_providers[i].id}</span>`)
                    }
                } i++;
            }
        }

        createTooltip('ep2-tooltip',I18n.t(`wmebed.third_party_tooltip`));

        $("#EP2-spider").click(function() {
            console.log(venue);
            makeModal(venue.name,undefined,venue)
        });
        $("#EP2-bug").click(function() {
             $.getJSON(link, function(data) {
                makeModal(venue.name,undefined,data,link)
            });
        });
    }

    function createTooltip(elementID, text) {
        // Prereq: <i id="elementID" class="EP2-icon waze-tooltip"></i>
        let $element = $('#' + elementID);
        let $elementWindow;

        $element.hover(
            function() {
                $element.after(`<div class="tooltip fade bottom in" role="tooltip" id="${elementID}-window" style="top: 13px;display: block;display: none;"><div class="tooltip-arrow" style="left: 49.3359%;"></div><div class="tooltip-inner">${text}</div></div>`);
                $elementWindow = $('#' + elementID + '-window');

                let leftPx = ($element.position().left + $element.width()) - $elementWindow.width()/2;

                let $tooltipArrow = $('#' + elementID + '-window .tooltip-arrow').first();
                if (leftPx < 25) {
                    $elementWindow.css('left', '0px');
                    $tooltipArrow.css('position','relative');
                    $tooltipArrow.css('left',$element.position().left + $element.width() - 1);
                } else if ($elementWindow.width() + leftPx > $element.parent().width() ) {
                    leftPx = $element.parent().width() - $elementWindow.width();
                    $elementWindow.css('left', leftPx);
                    $tooltipArrow.css('position','relative');

                    // let offset = $element.parent().width() - $elementWindow.width();
                    let difference = 1;
                    let arrowLeftPx = $element.position().left - leftPx + $element.width() - difference;
                    $tooltipArrow.css('left',arrowLeftPx);
                } else {
                    $elementWindow.css('left', leftPx);
                }

                $elementWindow.stop().fadeTo('fast',0.9);
            }, function() {
                $elementWindow.stop().fadeTo('fast',0,function() {$('#' + elementID + '-window').remove()});
            }
        );
    }

    // Split localizer (suffix) part of names, like "SUBWAY - inside Walmart".
    function getNameParts(name) {
        var splits = name.match(/(.*?)(\s+[-\(\[–].*)*$/);
        return { base: splits[1], suffix: splits[2] };
    }

    /*
    Copyright (c) 2011 Andrei Mackenzie
    Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
    The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
    */
    // Compute the edit distance between the two given strings
    function getEditDistance (a, b){
        if(a.length == 0) return b.length;
        if(b.length == 0) return a.length;

        var matrix = [];

        // increment along the first column of each row
        var i;
        for(i = 0; i <= b.length; i++){
            matrix[i] = [i];
        }

        // increment each column in the first row
        var j;
        for(j = 0; j <= a.length; j++){
            matrix[0][j] = j;
        }

        // Fill in the rest of the matrix
        for(i = 1; i <= b.length; i++){
            for(j = 1; j <= a.length; j++){
                if(b.charAt(i-1) == a.charAt(j-1)){
                    matrix[i][j] = matrix[i-1][j-1];
                } else {
                    matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
                                            Math.min(matrix[i][j-1] + 1, // insertion
                                                     matrix[i-1][j] + 1)); // deletion
                }
            }
        }

        return matrix[b.length][a.length];
    };

    function initLayer(){
        initializeSettings();
        log("Layer Initialized");

        // Add the layer
        _adPinsLayer = new OpenLayers.Layer.Markers("wmeEpdLayerAdPins",{uniqueName: "__wmeEpdLayerAdPins"})
        //_PsudoVenueLayer = new OpenLayers.Layer.Vector("wmebedPsudoVenue",{uniqueName: "__wmebedPsudoVenue"});

        // W.map.setLayerIndex(_mapLayer, W.map.getLayerIndex(W.map.roadLayers[0])-2);
        // HACK to get around conflict with URO+.  If URO+ is fixed, this can be replaced with the setLayerIndex line above.
        _adPinsLayer.setZIndex(9999);
        const checkLayerZIndex = () => { if (_adPinsLayer.getZIndex() !== 9999) _adPinsLayer.setZIndex(9999); };
        setInterval(() => { checkLayerZIndex(); }, 100);

        W.map.addLayer(_adPinsLayer);
        _adPinsLayer.setVisibility(_settings.AdPin);
        //W.map.addLayer(_PsudoVenueLayer);
        //_PsudoVenueLayer.setVisibility(_settings.AdPin);

        // Add the layer checkbox to the Layers menu
        WazeWrap.Interface.AddLayerCheckbox('Places', 'Ad pins', _settings.AdPin, onAdPinLayerCheckboxChanged);
        if (getUrlParameter('venues').length>0 && W.selectionManager.getSelectedFeatures()[0] != undefined) {
            insertExternalProviders2()
            }
        let observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                for (let i = 0; i < mutation.addedNodes.length; i++) {
                    let addedNode = mutation.addedNodes[i];
                    // Only fire up if it's a node
                    //log("Observer Running "+ $(addedNode).attr('class'));
                    if (addedNode.nodeType === Node.ELEMENT_NODE && !$('#ExternalProviders2').length && addedNode.querySelector('div.external-providers-control') && WazeWrap.hasPlaceSelected()) {
                        //if (addedNode.nodeType === Node.ELEMENT_NODE && !$('#ExternalProviders2').length && WazeWrap.hasPlaceSelected()) {
                        insertExternalProviders2()
                        //log("Loaded insertExternalProviders2 "+ $(addedNode).attr('class'));
                    }
                }
            });
        });
        observer.observe(document.getElementById('edit-panel'), { childList: true, subtree: true });
    }

    function bootstrapFillForm(tries = 1) {
        log("bootstrap attempt "+ tries);
        if (typeof(document.getElementsByName('username')[0]) != 'undefined') {
            fillForm();
        } else if (tries < 1000) {
            setTimeout(() => bootstrapFillForm(tries++), 200);
        }
    }

    function bootstrap(tries = 1) {
        //log("bootstrap attempt "+ tries);
        if (W && W.map && W.model && W.loginManager.user && $ && WazeWrap.Ready) {
            initializei18n();
            injectCss();
            initTab();
            installIcon()
        } else if (tries < 1000) {
            setTimeout(() => bootstrap(tries++), 200);
        }
    }

    function detectHost() {
        if (window.location.host == "support.google.com") {
            console.log('Google Form Detected');
            bootstrapFillForm();
        } else {
            bootstrap();
        }
    }
    detectHost();
})();
