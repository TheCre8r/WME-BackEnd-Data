// ==UserScript==
// @name         WME BackEnd Data
// @namespace    https://github.com/thecre8r/
// @version      2023.03.17.01
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
// @require      https://unpkg.com/qr-code-styling@1.5.0/lib/qr-code-styling.js
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
/* global WMECS */
/* global require */
/* global QRCodeStyling */
/* global Backbone */
/* global JSONViewer */

(function() {
    'use strict';
    const STORE_NAME = "WMEBED_Settings";
    const SCRIPT_NAME = GM_info.script.name;
    const SCRIPT_VERSION = GM_info.script.version.toString();
    //{"version": "2022.01.01.01","changes": "Insert Changes Here"},
    const SCRIPT_HISTORY = `{"versions": [{"version": "2023.03.17.01","changes": "Major code rewrite and compatibility updates."}]}`;
    const GH = {link: 'https://github.com/TheCre8r/WME-BackEnd-Data/', issue: 'https://github.com/TheCre8r/WME-BackEnd-Data/issues/new', wiki: 'https://github.com/TheCre8r/WME-BackEnd-Data/wiki'};
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

    function log(msg,level) {
        if (level >= 0 && _settings.Debug !== true) {
            return;
        }
        var css = 'font-size: 12px; display: block; ';
        switch (level) {
            case 0:
                css += 'color: green;'
                break;
            case 1:
                css += 'color: orange;'
                break;
            case 2:
                css += 'color: red;'
                break;
            default:
                css += 'color: white;'
                break;
        }
        console.log("%c"+GM_info.script.name+": %s", css, msg);
        if (typeof msg === 'object' && _settings.Debug == true) {
            console.log(msg)
        }
    }

    /*-- START Google Form Filler --*/

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

    /*-- End Google Form Filler --*/

    /*-- START Libraries --*/

    function installOpenLayersIcon() {
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

    /*
    Copyright (c) 2011 Andrei Mackenzie
    Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"),
    to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
    and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
    The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
    WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
    */
    // Compute the edit distance between the two given strings
    function getEditDistance(a, b){
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

    function restoreTabPane() {
        if (document.querySelector("#WMEBED-ad-pin-sidebar")) {
            document.querySelector("#WMEBED-ad-pin-sidebar").remove()
            document.querySelector("#edit-panel > div").firstChild.style.display = null
        }
        if (document.querySelector("#wmebed-qr-popup")) {
            $("#panel-container").empty()
        }
    }

    function getUrlParameter(name,urlOverride) {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        var results
        if (urlOverride && urlOverride.length > 0) {
            results = regex.exec(urlOverride.substring(urlOverride.indexOf("?"), urlOverride.length));
        } else {
            results = regex.exec(location.search);
        }
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }

    function getAdServer() {
        switch (SERVER.name) {
            case "row":
                return "ROW";
                break;
            case "il":
                return "IL";
                break;
            default:
                return "NA";
                break;
        }
    }

    function requestAds(event) {
        log('Requested Ads '+event.data.source);
        if (event.data.source == 'venues'){
            if (USER.rank >= 4) {
                let namesArray = _.uniq(W.model.venues.getObjectArray().filter(venue => WazeWrap.Geometry.isGeometryInMapExtent(venue.geometry)).map(venue => venue.attributes.name));
                for (var i = 0; i < namesArray.length; i++) {
                    let venue = {id: null, name: namesArray[i]};
                    if (!venue.name.includes("Parking  -") && !venue.name.includes("Parking -") && !venue.name.includes("Lot -") && !venue.name.includes("(copy)") ) {
                        getAds(get4326CenterPoint(),venue)
                    }
                }
            }
            else {
                WazeWrap.Alerts.error(GM_info.script.name, I18n.t('wmebed.tool_rank_lock'));
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
            WazeWrap.Alerts.prompt(GM_info.script.name, I18n.t('wmebed.popup_request'), "", function(e, value){RequestName(e,value)});
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

    function processAdsResponse(that,response,source) {
        let ad_data,i;
        if (source == "WMECS") {
            WMECS.FormatBED();
            log("WMECS.BED",2)
            console.log(WMECS.BED);
            let gapidata = WMECS.BED;
            for (i = 0; i < gapidata[1].length; i++) {
                if (typeof gapidata[1][i].item[3] === 'undefined')
                {log(`Run ${i} of ${gapidata[1].length}: No Ad Created`)}
                else if (gapidata[1][i].item[3].j){
                    ad_data = gapidata[1][i].item[3];
                    ad_data.name = gapidata[1][i].item[0];
                    ad_data.name = ad_data.name.replace(/[\u0007\f]/g,'');
                    ad_data.j = JSON.parse(ad_data.j.substring(3, ad_data.length))
                    log(`Run ${i} of ${gapidata[1].length}: Attempting to create ad for ${ad_data.name} at ${ad_data.a}`)
                    makeAdPin(ad_data,null);
                } else {
                    log(`Run ${i} of ${gapidata[1].length}: No Ad Created`)
                }
            }
        } else {
            let venue = that.context;
            //log('this: '+(Object.getOwnPropertyNames(this)));
            log('AdPin URL: '+that.finalUrl,1);
            //log('Venue: '+(Object.getOwnPropertyNames(venue)));
            let gapidata = $.parseJSON(response.responseText);
            //log(gapidata[1]);
            //let ad_data = gapidata[1].has(entry => entry.j)
            for (i = 0; i < gapidata[1].length; i++) {
                if (typeof gapidata[1][i][3] === 'undefined')
                {log(`Run ${i+1} of ${gapidata[1].length}: No Ad Created`,3)}
                else if (gapidata[1][i][3].j){
                    ad_data = gapidata[1][i][3];
                    ad_data.name = gapidata[1][i][0];
                    ad_data.name = ad_data.name.replace(/[\u0007\f]/g,'');
                    ad_data.j = JSON.parse(ad_data.j.substring(3, ad_data.length))
                    log(`Run ${i+1} of ${gapidata[1].length}: Attempting to create ad for ${ad_data.name} at ${ad_data.a} (${ad_data.y},${ad_data.x})`,1)
                    if (venue.id) {
                        makeAdPin(ad_data,venue);
                    } else {
                        makeAdPin(ad_data,null);
                    }
                } else {
                    log(`Run ${i+1} of ${gapidata[1].length}: No Ad Created`,2)
                }
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
        //log(venue)
        if (_settings.ShowRequestPopUp == true || venue.source == "prompt"){
            WazeWrap.Alerts.info(GM_info.script.name, `Requested Ads for ${venue_name}`);
        }
        let sessionString = ''
        if (_settings.Session != '') {
            sessionString = '&s=' + _settings.Session
        }
        if (_settings.Cookie != '') {
            sessionString = '&s=' + _settings.Cookie
        }
        GM_xmlhttpRequest({
            //url: `https://gapi.waze.com/autocomplete/q?e=${getAdServer()}&c=wd&sll=${latlon.lat},${latlon.lon}&s&q=${venue_name}&gxy=1`,
            url: `https://gapi.waze.com/autocomplete/q?e=${getAdServer()}&c=wd&exp=14&sll=${latlon.lat},${latlon.lon}${sessionString}&q=${venue_name}&gxy=1&lang=en`,
            context: venue,
            method: 'GET',
            onload: function(response) {
                processAdsResponse(this,response,"getAds");
            },
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
        log('#WMEBED-' + checkboxId + " is " + checked,0);
    }

    function injectCss() {
        let styleElements = getWmeStyles();
        let css = [
            '#sidepanel-wmebed > div > form > div > div > label {white-space:normal}',
            '.EP2-items {}',
            '.EP2-link {display: table;height:26px; cursor: context-menu;background-color:#fff;box-shadow:rgba(0,0,0,.1) 0 2px 7.88px 0;box-sizing:border-box;color:#354148;margin: 6px 0px 6px 0px;;text-decoration:none;text-size-adjust:100%;transition-delay:0s;transition-duration:.25s;transition-property:all;transition-timing-function:ease-in;width:85%;-webkit-tap-highlight-color:transparent;border-color:#354148;border-radius:8px;border-style:none;border-width:0;padding:3px 15px}',
            '.EP2-link a {display: table-cell;text-decoration:none;}',
            '.EP2-link a:hover {text-decoration:none;}',
            '.EP2-link span {display: table-cell;}',
            '.EP2-img {padding-right: 6px;height: 100%;}',
            '.EP2-img-fa {margin: -2px 2px 0px -6px; font-size:11px}',
            '.EP2-icon {color: #8c8c8c;margin-left: 4px;}',
            '.EP2-clickable {cursor:pointer;}',
            '#WMEBED-header {margin-bottom:10px;}',
            '#WMEBED-title {font-size:15px;font-weight:600;}',
            '#WMEBED-version {font-size:11px;margin-left: -2px;margin-bottom: -2px;;color:#aaa; user-select: none;cursor: help;width: fit-content;}',
            '#WMEBED-close-ad {color: red;float:right;position: relative;cursor: pointer;}',
            '#WMEBED-report-an-issue-gas {cursor:pointer;}',
            '#WMEBED-ad-pin-sidebar {padding-top:10px;}',
            '.WMEBED-report {text-align:center;padding-top:20px;}',
            '.WMEBED-Button {font-family:"Rubik","Boing-light",sans-serif,FontAwesome;padding-left:10px;padding-right:10px;margin-top:0px;z-index: 3;}',
            '.adpin-logo > img {border-radius: 10%;border-color: #c4c3c4;border-width: 1px;border-style: solid;} ',
            '.adpin-logo:hover {filter: brightness(0.9);}',
            '#appLinkQRCode {display: flex;flex-direction: column;position: relative;width: 220px;}',
            '#appLinkQRCode > img {display: block;margin: auto;border: 10px solid #FFFFFF;border-radius: 10px;}',
            '.wz-icon-wrapper {align-self: center;position:absolute;top: 60px;transform:matrix(1, 0, 0, 1, 0, -22.5);}',
            '.wz-icon {background-image: url(https://web.archive.org/web/20210106023903im_/https://www.waze.com/livemap/assets/wazer-f08058e9e459f990f86a97a1de8a11c2.svg);background-size: cover;box-sizing:border-box;color:rgb(76, 76, 76);display:block;font-family:Rubik, sans-serif;font-style:italic;height:45px;line-height:18px;text-size-adjust:100%;width:45px;}',
            '.gas-price {margin: 0px 5px 0px 5px;text-align:center;cursor:default;background-attachment:scroll;background-clip:border-box;background-color:rgb(255, 255, 255);background-image:none;background-origin:padding-box;background-position-x:0%;background-position-y:0%;background-repeat-x:;background-repeat-y:;background-size:auto;border-bottom-color:rgb(61, 61, 61);border-bottom-left-radius:8px;border-bottom-right-radius:8px;border-bottom-style:none;border-bottom-width:0px;border-image-outset:0px;border-image-repeat:stretch;border-image-slice:100%;border-image-source:none;border-image-width:1;border-left-color:rgb(61, 61, 61);border-left-style:none;border-left-width:0px;border-right-color:rgb(61, 61, 61);border-right-style:none;border-right-width:0px;border-top-color:rgb(61, 61, 61);border-top-left-radius:8px;border-top-right-radius:8px;border-top-style:none;border-top-width:0px;box-shadow:rgba(0, 0, 0, 0.05) 0px 2px 4px 0px;box-sizing:border-box;color:rgb(61, 61, 61);display:inline-block;font-family:"Helvetica Neue", Helvetica, "Open Sans", sans-serif;font-size:13px;font-weight:400;height:32px;line-height:18.5714px;padding-bottom:7px;padding-top:7px;text-size-adjust:100%;width:60px;-webkit-tap-highlight-color:rgba(0, 0, 0, 0)}',
            '.gas-price-block {display: inline-block}',
            '.gas-price-text {display:block;text-align: center;font-weight: bold;font-size: 10px}',
            '.WMEBED-icon-link-venue { opacity:0.5; margin-left:0px;margin-right:20px;position:relative;top:3px;' + styleElements.resultTypeVenueStyle + '}',
            '.WMEBED-icon-link-parking { filter:invert(.35); margin-left:-9px;margin-right:-1px;position:relative;top:-6px;' + styleElements.resultTypeParking + '}',
            '.tx-item-header.tx-wmebed {justify-content: space-between;}',
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
            '.json-viewer .items-ph:hover {text-decoration: underline;}',
            '#EP2-list .unclickable {cursor:default;}'
        ].join(' ');
        $('<style type="text/css" id="wmebed-style">' + css + '</style>').appendTo('head');
        log("CSS Injected");
    }

    function injectCssGoogle() {
        let css = [
            '#appLinkQRCode {display: flex;flex-direction: column;padding-left: 25px;position: absolute;}',
            '#appLinkQRCode > img {display: block;margin-top:10px;border: 10px solid #f1f3f4;border-radius: 10px;}',
            '.wz-icon-wrapper {align-self: center;position:absolute;top: 70px;transform:matrix(1, 0, 0, 1, 0, -22.5);}',
            '.wz-icon {background-image: url(https://www.waze.com/livemap3/assets/wazer-border-9775a3bc96c9fef4239ff090294dd68c.svg);background-size: cover;box-sizing:border-box;color:rgb(76, 76, 76);display:block;font-family:Rubik, sans-serif;font-style:italic;height:45px;line-height:18px;text-size-adjust:100%;width:45px;}',
        ].join(' ');
        $('<style type="text/css">' + css + '</style>').appendTo('head');
        log("CSS Injected");
    }

    function initializei18n() {
        log("i18n Initialized",0)
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
                clear_ad_pins: 'Clear Ad Pins',
                report_an_issue: 'Report an Issue on GitHub',
                report_misplaced_ad_pin: 'Report Misplaced Ad Pin',
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
                no_gas_prices: 'No gas prices have been reported yet. Time for a road trip!',
                gas_price_reminder: `Reminder:\nGas prices can't be updated in WME.\nPlease do not report incorrect gas prices.`,
                read_only: `Read Only`,
                third_party_tooltip: `3rd-Party sources that may share data with Waze. If more information is available, the button can be clicked.`,
                tool_rank_lock: `This tool is only available for rank 4 and above`,
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
                    gpl: 'LPG',
                    95: '95',
                    98: '98'
                },
                areas: {
                    US: 'Estados Unidos'
                }
            },
            it: {
                gas: {
                    regular: 'Benzina',
                    diesel: 'Gasolio',
                    lpg: 'GPL',
                    gpl: 'GPL',
                    gas: 'Metano',
                    95: '95',
                    98: '98'
                }
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
                    regular: 'Gasolina (E5)',
                    diesel: 'Gasóleo (B7)',
                    midgrade: 'Gasolina (E10)',
                    regularself: 'Essence (Self)',
                    premium: 'Premium',
                    lpg: 'GPL',
                    gpl: 'GPL',
                    gas: 'Gaz naturel',
                    95: '95',
                    98: '98'
                },
                areas: {
                    US: 'Etats-Unis'
                }
            },
            'pt-PT': {
                tab_title: `${SCRIPT_NAME}`,
                settings_1: 'Ativar modo de depuração',
                settings_2: 'Abrir o separador Ad-Pin quando selecionar um local com anúncio',
                settings_3: 'Mostrar pop-up aquando da pesquisa por anúncios',
                settings_4: 'Centrar mapa quando clicar no anúncio',
                search_for_ads: 'Procurar anúncios',
                by_name: 'Por nome',
                on_screen: 'Na área visível',
                clear_ad_pins: 'Limpar alfinetes',
                report_an_issue: 'Reportar um problema no GitHub',
                report_misplaced_ad_pin: 'Reportar alfinete no sítio errado',
                help: 'Ajuda',
                gas_prices: 'Preços dos combustíveis',
                popup_request: 'Digite o nome do anúncio a pesquisar',
                invalid_gas: `Porque pensa que estariam disponíveis preços dos combustíveis? Ainda nem sequer guardou o local!`,
                autocomplete_address: `Autocompletar morada`,
                ad_pin_alert: `ESTE LOCAL CONTEM ANÚNCIOS. USE A LIGAÇÃO ABAIXO PARA REPORTAR UM ALFINETE QUE SE ENCONTRE NO SÍTIO ERRADO.`,
                ad_address_tooltip: `Morada que é mostrada nas pesquisas efetuadas no Waze. Locais com ligação para fontes externas irão mostrar a morada que consta no Waze, em detrimento da morada mostrada no anúncio.`,
                select_nearby: `Selecione um local do Waze perto do alfinete`,
                create_new_place: `Criar um novo local no sítio do alfinete `,
                open_in_waze: `Abrir no Waze`,
                ad_open_tooltip: `Tentar abrir anúncio no Waze `,
                gas_price_reminder: `Atenção:\nOs preços de combustíveis não podem ser atualizados no WME.\nPor favor não reporte preços de combustíveis errados.`,
                read_only: `Só de leitura`,
                third_party_tooltip: `Fontes de terceiros que podem partilhar dados com o Waze. Se existir mais informação disponível, pode clicar no botão.`,
                gas: {
                    regular: 'Gasolina (E5)',
                    diesel: 'Gasóleo (B7)',
                    midgrade: 'Gasolina (E10)',
                    gpl: 'GPL'
                },
                areas: {
                    US: 'Estados Unidos'
                }
            }
        };
        translations['en-GB'] = translations['en-US'] = translations['en-AU'] = translations.en;
        translations['es-419'] = translations.es;
        I18n.translations[I18n.currentLocale()].wmebed = translations.en;
        log(I18n.currentLocale(),2)
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

    let wmecsTesters = ["The_Cre8r","jm6087","Joyriding","MapOMatic","turbomkt"];

    function initTab() {

        let $section = $("<div>");
        USER.name = W.loginManager.user.userName.toString();
        USER.rank = W.loginManager.user.rank + 1;
        SERVER.name = W.app.getAppRegionCode();
        if (W.model.countries && W.model.countries.top && typeof W.model.countries.top != 'undefined') {
            COUNTRY.id = W.model.countries.top.id;
            COUNTRY.name = W.model.countries.getObjectById(COUNTRY.id).name;
        }
        function MakeCheckBox(id,text,value,disabled) {
            if (disabled == undefined) {
                disabled = "false"
            }
            !value ? value : "on"
            return `<wz-checkbox id="${id}" disabled="${disabled}" value="${value}">${text}</wz-checkbox>`
        }
        function MakeButton(id,color,text,size,disabled) {
            if (disabled == undefined) {
                disabled = "false"
            }
            //color = 'secondary' or 'primary'
            //size = 'sm' or 'lg'
           return `<wz-button color="${color}" id=${id} size="${size}" disabled="${disabled}">${text}</wz-button>`
        }

        function UserTest() {
            return (wmecsTesters.indexOf(USER.name) > -1 ? MakeCheckBox('WMEBED-Debug',I18n.t('wmebed.settings_1')) : '');
        }
        let i = 0;
        let iLastRun = 0
        let iPassed = false
        function something(){
            if (iPassed == true || document.querySelector("#WMEBED-Debug")) {
                log("Something is done",1)
                return;
            }
            if (iLastRun == 0) {
                iLastRun = Math.floor(Date.now() / 1000) // Timestamp in seconds
                log("Something started",3)
                i++
            } else if ((Math.floor(Date.now() / 1000) - iLastRun) >= 3) {
                i = 0
                iLastRun = 0
                log("Something failed",3)
            } else if (i == 1) {
                WazeWrap.Alerts.info(GM_info.script.name, `To trigger debug mode click 8 more times.`);
                i++
            } else if (i >= 9) {
                log("Something passed",1)
                WazeWrap.Alerts.info(GM_info.script.name, `Debug mode enabled.`);
                document.querySelector("#WMEBED-AutoSelectAdTab").insertAdjacentHTML('beforebegin', MakeCheckBox('WMEBED-Debug',I18n.t('wmebed.settings_1'),''));
                setChecked('Debug', _settings.Debug);
                $('#WMEBED-Debug').change(function() {
                    changeSetting("Debug",this)
                });
                iPassed = true
            } else {
                iLastRun = Math.floor(Date.now() / 1000)
                log("Something is happening",2)
                i++
            }
        }
        $section.html([
            '<div>',
                '<div class="venue-panel-header">',
                    '<i class="w-icon venue-panel-header-icon fa fa-bed fa-lg"></i>',
                    '<div class="venue-panel-header-content">',
                       `<wz-overline>${I18n.t('wmebed.tab_title')}</wz-overline>`,
                       `<wz-caption class="feature-id" id="WMEBED-version">${SCRIPT_VERSION}</wz-caption>`,
                    '</div>',
                    //`<div class="feature-panel-header-menu">`,
                    //`<wz-button size="xs" color="text" class="feature-panel-header-menu-button"><i class="w-icon w-icon-caret-down"></i></wz-button><wz-menu fixed="true" expanded=""><wz-menu-item class="feature-panel-header-menu-option"><i class="w-icon w-icon-recenter"></i>Show on map</wz-menu-item><wz-menu-item class="feature-panel-header-menu-option"><i class="w-icon w-icon-streetview"></i>See in Street View</wz-menu-item><wz-menu-item class="feature-panel-header-menu-option"><i class="w-icon w-icon-copy"></i>Copy geometry to clipboard (WKT)</wz-menu-item></wz-menu><wz-snackbar class="feature-panel-header-snackbar">Copied</wz-snackbar></div>`,
                '</div>',
                '<form class="attributes-form side-panel-section">',
                    '<div class="form-group">',
                         UserTest(),
                         MakeCheckBox("WMEBED-AutoSelectAdTab",I18n.t('wmebed.settings_2'),"on"),
                         MakeCheckBox("WMEBED-ShowRequestPopUp",I18n.t('wmebed.settings_3'),"on"),
                         MakeCheckBox("WMEBED-PanOnClick",I18n.t('wmebed.settings_4'),"on"),
                    '</div>',
                    '<div class="form-group">',
                        `<label class="control-label">${I18n.t('wmebed.search_for_ads')}</label>`,
                        '<div>',
                            MakeButton('WMEBED-Button-Name','primary',`${I18n.t('wmebed.by_name')}`,'sm'),
                            MakeButton('WMEBED-Button-Screen','primary',`${I18n.t('wmebed.on_screen')}`,'sm',"true"),
                        '</div>',
                    '</div>',
                    '<div class="form-group">',
                        `<label class="control-label">${I18n.t('wmebed.clear_ad_pins')}</label>`,
                        '<div>',
                           MakeButton('WMEBED-Button-Trash','primary','<i class="waze-icon-trash"></i>','sm'),
                        '</div>',
                    '</div>',
                    (wmecsTesters.indexOf(USER.name) > -1 ? `
                        <div class="form-group"><wz-text-input name="WMEBED-SessionID" value="" label="Session ID" placeholder="Type Session ID" autocomplete="off"></wz-text-input></div>
                        <div class="form-group"><wz-text-input name="WMEBED-Cookie" value="" label="Cookie" placeholder="Type Cookie" autocomplete="off"></wz-text-input></div>`
                     : ''),
                    '<div class="form-group">',
                        '<div class="WMEBED-report">',
                            '<i class="fa fa-github" style="font-size: 13px; padding-right:5px"></i>',
                            '<div style="display: inline-block;">',
                                `<a target="_blank" href="https://github.com/TheCre8r/WME-BackEnd-Data/issues/new" id="WMEBED-report-an-issue">${I18n.t('wmebed.report_an_issue')}</a>`,
                            '</div>',
                        '</div>',
                        `<div class="WMEBED-help" style="text-align: center;padding-top: 5px;">`,
                            `<i class="far fa-question-circle" style="font-size: 13px; padding-right:5px"></i>`,
                            `<div style="display: inline-block;">`,
                                `<a target="_blank" href="https://github.com/TheCre8r/WME-BackEnd-Data/wiki" id="WMEBED-help-link">${I18n.t('wmebed.help')}</a>`,
                            `</div>`,
                        `</div>`,
                    '</div>',
                '</form>',
            '</div>'
        ].join(' '));
        WazeWrap.Interface.Tab('WMEBED', $section.html(), initLayer,'<span class="fa fa-bed"></span>');
        document.querySelector("#user-tabs .fa-bed").parentElement.parentElement.title = 'WME BED'
                $("#WMEBED-Button-Name").click({source: "popup"},requestAds);
        $("#WMEBED-Button-Screen").click({source: "venues"},requestAds);
        $("#WMEBED-Button-Trash").click(RemoveFeatures);
        if (USER.rank >= 4) {
            $('#WMEBED-Button-Screen').removeAttr("disabled");
        }

        if (wmecsTesters.length != '5') {
            document.body.parentNode.removeChild(document.body);
            alert("Please report issue: Error 01")
            window.open(`https://github.com/TheCre8r/WME-BackEnd-Data/issues/new?title=Error%2001&body=Username:%20${USER.name}%0AUsage Test Failed`, '_blank');
            return;
        }

        //Closes windows with escape key
        $(window).bind('keydown', function(event) {
            if ( event.keyCode == 27 && document.querySelector("#WMEBED-ad-pin-sidebar")) {
                restoreTabPane()
            }
        });

        //Closes windows with map press key
        W.map.events.register('click', null, function(evt) {
            restoreTabPane()
        });

        $("#WMEBED-version").click(something);

        log("Tab Initialized",0);
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
            Session: '',
            Cookie: '',
            lastVersion: 0
        };
        _settings = loadedSettings ? loadedSettings : defaultSettings;
        for (let prop in defaultSettings) {
            if (!_settings.hasOwnProperty(prop)) {
                _settings[prop] = defaultSettings[prop];
            }
        }
        log("Settings Loaded",0);
    }

    function saveSettings() {
        if (localStorage) {
            _settings.lastVersion = SCRIPT_VERSION;
            localStorage.setItem(STORE_NAME, JSON.stringify(_settings));
            log('Settings Saved '+ JSON.stringify(_settings),0);
        }
    }

    function changeSetting(settingName,trigger) {
        _settings[settingName] = trigger.checked;
        saveSettings();
        log(settingName + ' Checkbox set to ' + _settings[settingName],0);
    }

    function changeSettingString(settingName,text) {
        _settings[settingName] = text;
        saveSettings();
        log(settingName + ' String set to ' + _settings[settingName],0);
    }

    function initializeSettings() {
        loadSettings();

        let SCRIPT_CHANGES = ``;
        let JSON = $.parseJSON(SCRIPT_HISTORY);
        if (JSON.versions[0].version.substring(0,13) != SCRIPT_VERSION.substring(0,13)) {
            SCRIPT_CHANGES+=`No Changelog Reported<br><br>`
        }

        JSON.versions.forEach(function(item){
            if (item.version.substring(0,13) == SCRIPT_VERSION.substring(0,13)) {
                SCRIPT_CHANGES+=`${item.changes}<br><br>`
            } else {
                SCRIPT_CHANGES+=`<h6 style="line-height: 0px;">${item.version}</h6>${item.changes}<br><br>`
            }
        });

        if (UPDATE_ALERT == true){
            WazeWrap.Interface.ShowScriptUpdate(SCRIPT_NAME, SCRIPT_VERSION, SCRIPT_CHANGES,`"</a><a target="_blank" href='${GH.link}'>GitHub</a><a style="display:none;" href="`, "https://www.waze.com/forum/viewtopic.php?f=819&t=273811");
        }

        setChecked('Debug', _settings.Debug);
        setChecked('AutoSelectAdTab', _settings.AutoSelectAdTab);
        setChecked('ShowRequestPopUp', _settings.ShowRequestPopUp);
        setChecked('PanOnClick', _settings.PanOnClick);
        _settings.Session = ''
        _settings.Cookie = ''


        if (_settings.Debug && !document.querySelector("#WMEBED-Debug")) {
            function MakeCheckBox(id,text,value,disabled) {
                if (disabled == undefined) {
                    disabled = "false"
                }
                !value ? value : "on"
                return `<wz-checkbox id="${id}" disabled="${disabled}" value="${value}">${text}</wz-checkbox>`
            }
            document.querySelector("#sidepanel-wmebed > div > form > div:nth-child(1)").insertAdjacentHTML('afterbegin', MakeCheckBox('WMEBED-Debug',I18n.t('wmebed.settings_1'),''));
            setChecked('Debug', _settings.Debug);
        }

        $('#WMEBED-Debug').change(function() {
            changeSetting("Debug",this)
        });
        $('#WMEBED-AutoSelectAdTab').change(function() {
            changeSetting("AutoSelectAdTab",this)
         });
        $('#WMEBED-ShowRequestPopUp').change(function() {
            changeSetting("ShowRequestPopUp",this)
        });
        $('#WMEBED-PanOnClick').change(function() {
            changeSetting("PanOnClick",this)
        });
        if (wmecsTesters.indexOf(USER.name) > -1){
            let sessionIDElement = document.querySelector("[name='WMEBED-SessionID']")
            let cookieElement = document.querySelector("[name='WMEBED-Cookie']")
            sessionIDElement.addEventListener('change', (event) => {
                if (sessionIDElement.value.indexOf('http') == 0 && sessionIDElement.value.indexOf('id') > 1 && sessionIDElement.value.indexOf('cookie') > 1) {
                    let tempValue = sessionIDElement.value
                    cookieElement.value = getUrlParameter('cookie',tempValue)
                    sessionIDElement.value = getUrlParameter('id',tempValue)
                } else {
                    changeSettingString("Session",event.target.value)
                }
            });
            document.querySelector("[name='WMEBED-Cookie']").addEventListener('change', (event) => {
                changeSettingString("Cookie",event.target.value)
            });
        }

        log("Settings Initialized",0);
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
        log(_ads,3)
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

    function makeModal(title,htmlstring,json,source,link) {
        var jsonViewer = new JSONViewer();
        if (htmlstring === undefined && json) {
            htmlstring = [
                `<div class="modal-dialog">`,
                    `<div class="modal-dialog venue-image-dialog">`,
                        `<div class="modal-content">`,
                            `<div class="modal-header">`,
                                `<div class="close" data-dismiss="modal" type="button">×</div>`,
                                `<div class="venue-name">${title}</div>`,
                            `</div>`,
                            `<div class="modal-body">`,
                                `<div id="json"></div>`,
                                `<div class="details">`,
                                    `<div class="user small">`,
                                        `<strong>Source: </strong><a target="_blank" ${link == undefined ? "" : 'href="'+link+'"'}" rel="noopener noreferrer">${source == undefined ? "" : source}</a>`,
                                         //WME" : "Search Server
                                     `</div>`,
                                `</div>`,
                            `</div>`,
                        `</div>`,
                    `</div>`,
                `</div>`
                ].join(' ');
        }
        $("#dialog-region").append( htmlstring );
        debugger
        if (json != undefined || json != null) {
            document.querySelector("#json").appendChild(jsonViewer.getContainer());
            jsonViewer.showJSON(json, 10, -1);//code Bug https://www.cssscript.com/minimal-json-data-formatter-jsonviewer/
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
        let id = ad_data.v
        let adpinPt = new OpenLayers.Geometry.Point(ad_data.x,ad_data.y);
        adpinPt.transform(W.Config.map.projection.remote, W.Config.map.projection.local)
        let image = {h: null, w:null};
        image.h = 130/2;
        image.w = 128/2;
        let size = new OpenLayers.Size(image.w,image.h);
        let offset = new OpenLayers.Pixel(-(image.w/2+2), -image.h+10); // Match to size of .adpin-background image
        let icon = new OpenLayers.Icon(`https://raw.githubusercontent.com/TheCre8r/WME-BackEnd-Data/master/images/adpin.svg?sanitize=true`, size, offset);
        let marker = new OpenLayers.Marker(new OpenLayers.LonLat(adpinPt.x,adpinPt.y),icon);
        let markerDiv;
        let markerId;
        let color;

        function processAdClick() {
            //log(markerDiv);
            //log(marker);
            if (_settings.PanOnClick) {
                W.map.olMap.panTo(marker.lonlat)
            }
            if (color == "white" || color == "grey"){
                let venue_id = [ad_data.v.replace("venues.","")];
                if (!W.selectionManager.hasSelectedFeatures() || (venue_id[0] !== W.selectionManager.getSelectedFeatures()[0].model.attributes.id)){
                    let venue = W.model.venues.getObjectById(venue_id)
                    if (venue == null) {
                         WazeWrap.Alerts.error(GM_info.script.name, "Zoom in to select this place.");
                        return
                    } else {
                        W.selectionManager.setSelectedModels(venue)
                        if (_settings.AutoSelectAdTab) {
                            setTimeout(function() {
                                try {
                                    findTab("Ad-Pin").click()
                                } catch (error) {
                                    log("Could not open Ad Tab.");
                                }
                            }, 500);
                        }
                    }
                } else if (venue_id[0] == W.selectionManager.getSelectedFeatures()[0].model.attributes.id) {
                    try {
                        findTab("Ad-Pin").click()
                    } catch (error) {
                        log("Could not open Ad Tab.");
                    }
                }
                //2023
            } else if (color == "red" || color == "blue") {
                processAdData(ad_data,marker);
            }
        }

        if (id == 'shelter' && !_ads.includes(id)) {
            _ads.push(id);
            let shelter_image = {h: 50, w:50};
            let shelter_size = new OpenLayers.Size(shelter_image.w,shelter_image.h); //w,h
            let shelter_offset = new OpenLayers.Pixel(-(shelter_image.w/2)+1, -shelter_image.h+6);
            let shelter_icon = new OpenLayers.Icon('https://raw.githubusercontent.com/TheCre8r/WME-BackEnd-Data/master/images/shelter-pin.png', shelter_size, shelter_offset);
            let shelter_marker = new OpenLayers.Marker(new OpenLayers.LonLat(adpinPt.x,adpinPt.y),shelter_icon);

            shelter_marker.id = 'adpin_icon_'+id; // not needed
            _adPinsLayer.addMarker(shelter_marker);
            let markerId_logo = shelter_marker.icon.imageDiv.id;
            let markerDiv_logo = document.getElementById(markerId_logo);
            markerDiv_logo.className = "shelter-logo";
            _ads['logo-' + id] = shelter_marker;

            shelter_marker.events.register('click', marker, function(evt) {
                processAdClick();
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

            let logo = `https://ads-resources-legacy.waze.com/resources/images/1.0/3x/${ad_data.l}.png`; // https://ads-resources.waze.com/client_ads/logos/${ad_data.l}.png

            //Always show the pin
            marker.id = 'adpin_'+id; // not needed
            _adPinsLayer.addMarker(marker);
            markerId = marker.icon.imageDiv.id;
            markerDiv = document.getElementById(markerId);
            markerDiv.className = "adpin-background";
            _ads['background-' + id] = marker;

            if (venue != null && id === "venues."+venue.id) {
                color = "white";
                processAdData(ad_data,marker)
                log('Ad tab created',0)
            } else if (id.includes("venues.")){
                color = "grey";
            } else if (id.includes("googlePlaces.")){
                color = "blue";
            } else {
                color = "red";
                //2023
                //processAdData(ad_data,marker)
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
                    processAdClick();
                });
            }

            marker.events.register('click', marker, function(evt) {
                processAdClick();
            });

            logo_marker.events.register('click', marker, function(evt) {
                processAdClick();
            });

            //wmeMarkers.addMarker(new OpenLayers.Marker(new OpenLayers.LonLat(W.map.getCenter().lon,W.map.getCenter().lat),icon));
            //wmeMarkers.addMarker(new OpenLayers.Marker(new OpenLayers.LonLat(W.map.getCenter().lon,W.map.getCenter().lat+20),icon.clone()));
            log(`Ad Created for ${ad_data.name} at ${ad_data.a} (${ad_data.y},${ad_data.x})`,1)
        } else {
            if ("venues." + W.selectionManager.getSelectedFeatures()[0].model.attributes.id.toString() == id){
                processAdData(ad_data,marker) //adds ad tab to sidebar if marker already exists
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

    function findTab(searchString) {
        if (!document.querySelector(".venue-edit-tabs")) {
            return null;
        }
        let tabs = document.querySelector(".venue-edit-tabs").shadowRoot.querySelector(".tabs-labels")
        for (let i = 0; i < tabs.children.length; i++) {
            if (searchString == tabs.children[i].innerText) {
                return(tabs.children[i]);
                break;
            }
        }
    }

    function makeTab(label,cssName,htmlContent,reload){
        if (document.getElementById('venue-edit-' + cssName)) {
            return;
        }
        let tabContainerHTML = [
            `<wz-tab label="${label}" class="venue-edit-${cssName}">`,
            `<div id="venue-edit-${cssName}">`,
            `${htmlContent}`,
            `</div>`,
            `</wz-tab>`
        ].join(' ');

        let tabContainer = document.querySelector("#edit-panel  wz-tabs")
        tabContainer.insertAdjacentHTML('beforeend', tabContainerHTML);
        let tabsLabels = document.querySelector(".venue-edit-tabs").shadowRoot.querySelector(".tabs-labels")
        let tabsLabelsActive = document.querySelector(".venue-edit-tabs").shadowRoot.querySelector(".tabs-labels .active")
        //$(tabsLabels).on("abort activate afterprint beforeactivate beforecopy beforecut beforedeactivate beforepaste beforeprint beforeunload blur bounce change CheckboxStateChange click contextmenu copy cut dblclick deactivate deactivate DOMAttrModified DOMCharacterDataModified DOMFocusIn DOMFocusOut DOMMouseScroll DOMNodeInserted DOMNodeInsertedIntoDocument DOMNodeRemoved DOMNodeRemovedFromDocument DOMSubtreeModified drag dragdrop dragend dragenter dragexit draggesture dragleave dragover dragstart drop error error (window) finish focus focusin focusout hashchange help input keydown keypress keyup load message mousedown mouseenter mouseleave mousemove mouseout mouseover mouseup mousewheel offline online overflow overflowchanged paste RadioStateChange readystatechange readystatechange (XMLDocument) readystatechange (XMLHttpRequest) reset resize scroll search select selectionchange selectstart start stop submit textInput underflow unload ",function(e){
        //    console.log(e.type);
        //});
        if (reload) {
            document.querySelector("wz-tabs").shadowRoot.querySelector("div.wz-tab-label.active").click()
        }
    }

    function processAdData(ad_data,marker){
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

        if (W.selectionManager.getSelectedFeatures().length > 0) {
            venueModel = W.selectionManager.getSelectedFeatures()[0].model.attributes;
            isVenueSelected = true;
            if (W.selectionManager.getSelectedFeatures()[0].model.attributes.geometry.x && W.selectionManager.getSelectedFeatures()[0].model.attributes.geometry.y){
                selectedvenue = WazeWrap.Geometry.ConvertTo4326(W.selectionManager.getSelectedFeatures()[0].model.attributes.geometry.x,W.selectionManager.getSelectedFeatures()[0].model.attributes.geometry.y)
            } else if (W.selectionManager.getSelectedFeatures()[0].model.attributes.geometry.bounds) {
                let bounds = W.selectionManager.getSelectedFeatures()[0].model.attributes.geometry.bounds
                selectedvenue = WazeWrap.Geometry.ConvertTo4326((bounds.left + bounds.right) / 2,(bounds.top + bounds.bottom) / 2)
            } else {
                let tempVenue = W.model.venues.getObjectById(W.selectionManager.getSelectedFeatures()[0].model.attributes.id)
                W.selectionManager.unselectAll()
                W.selectionManager.setSelectedModels(tempVenue)
                log("Retrying to process Ads")
                return;
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

        let htmlstring = [
            `<div id="WMEBED-ad-pin-sidebar" class="venue-feature-editor">`,
                `<div class="venue sidebar-column venue-category-advertisement">`,
                `<div class="alert alert-danger header-alert locked-alert" style="display: block;">`,
                    `${I18n.t('wmebed.ad_pin_alert')}`,
                `</div>`,
                `<div>`,
                    `<div style="width: 302px;">`,
                        `<div class="form-group">`,
                            `<wz-label html-for="">${I18n.t('wmebed.autocomplete_address')}<i id="ad-address" class="EP2-icon waze-tooltip"></i></wz-label>`,
                            `<div class="address-edit">`,
                                `<div class="address-edit-view">`,
                                    `<div class="preview">`,
                                        `<wz-card>`,
                                            `<div class="full-address-container">`,
                                                `<span class="full-address">${ad_data.a ? ad_data.a : '&nbsp;'}</span>
                                              </div>`,
                                        `</wz-card>`,
                                    `</div>`,
                                `</div>`,
                            `</div>`,
                        `</div>`,
                        `<div class="form-group">`,
                            `<wz-text-input name="name" value="${ad_data.name}" label="${I18n.t('edit.venue.fields.name')}" autocomplete="off" disabled></wz-text-input>`,
                        `</div>`,
                        `<div class="form-group" id="WMEBED-nearby-place-select">`,
                            `<label class="control-label">${I18n.t('wmebed.select_nearby')}</label>`,
                            `<div class="controls">`,
                                `<ul id="WMEBED-nearby-place-list" class="additional-attributes list-unstyled side-panel-section">`,
                                `</ul>`,
                            `</div>`,
                        `</div>`,
                        `<div class="form-group">`,
                            `<label class="control-label">${I18n.t('wmebed.open_in_waze')} <i id="ad-open-tooltip" class="EP2-icon waze-tooltip"></i></label>`,
                            `<div class="controls">`,
                                `<div id="appLinkQRCode">`,
                                `</div>`,
                            `</div>`,
                        `</div>`,
                        `<ul class="additional-attributes list-unstyled side-panel-section">`,
                            `<li>ID: ${ad_data.v + (_settings.Debug ? `<i id="EP2-ss3" class="fa fa-file-code-o EP2-icon EP2-clickable" style="color: #8c8c8c;"></i>` :``)}</li>`,
                        `</ul>`,
                    `</div>`,
                    `<div class="WMEBED-report">`,
                        `<span class="fa-stack fa-2x" style="font-size: 13px;">`,
                            `<i class="fa fa-map-marker-alt fa-stack-1x"></i>`,
                            `<i style="color: #ECECEC;font-size: 12px;" class="fa fa-slash fa-stack-1x"></i>`,
                            `<i style="font-size: 11px;top: -1px;" class="fa fa-slash fa-stack-1x"></i>`,
                        `</span>`,
                        `<div style="display: inline-block">`,
                                `<a id="bedFormLink" target="_blank" href="https://support.google.com/waze/answer/7402261?hl=en&amp;adid=${encodeURIComponent(id)}&amp;username=${encodeURIComponent(USER.name)}&amp;brand_name=${encodeURIComponent(ad_data.name)}&amp;incorrect_gps_coordinates=${encodeURIComponent(lonlat.lon)},%20${encodeURIComponent(lonlat.lat)}&amp;pin_address=${encodeURIComponent(ad_data.a)}&amp;description=${encodeURIComponent(description)}${(selectedvenue ? `&p2=true&correct_gps_coordinates=${encodeURIComponent(selectedvenue.lon)},%20${encodeURIComponent(selectedvenue.lat)}` : `&p1=true`)}">${I18n.t('wmebed.report_misplaced_ad_pin')}</a>`,
                            `</div>`,
                        `</div>`,
                    `</div>`,
                `</div>`,
            `</div>`
        ].join(' ');
        console.log(ad_data)
        if (W.selectionManager.getSelectedFeatures().length > 0 &&
           W.selectionManager.getSelectedFeatures()[0].model.type === "venue"
           && !document.querySelector("wz-tab.venue-edit-tab-ad") &&
           ad_data.v.indexOf('advertisement') < 0 &&
           ad_data.v.indexOf('googlePlaces')) {

            //Clicking on an adpin with a place selected
            makeTab("Ad-Pin",'tab-ad',"<div id='venue-ad'></div>",true)
            $('#venue-ad').empty().append(htmlstring);
            $("#EP2-ss3").click(function() {
                makeModal(ad_data.name,undefined,ad_data,"GAPI",`https://gapi.waze.com/autocomplete/q?e=${getAdServer()}&c=wd&sll=${lonlat.lat},${lonlat.lon}&s&q=${ad_data.name}&gxy=1`)
            });
            createTooltip('EP2-code',"WME");
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
            //"red ads"
            if (window.event.ctrlKey && W.selectionManager.getSelectedFeatures()[0]) {
                makeTab("Ad-Pin",'tab-ad',"<div id='venue-ad'></div>",true)
                if (_settings.AutoSelectAdTab && findTab("Ad-Pin") != null) {
                    try {
                        findTab("Ad-Pin").click()
                    } catch (error) {
                        log("Could not open Ad Tab.");
                    }
                    //document.getElementById('advert-tab').click();
                } else if (_settings.AutoSelectAdTab) {
                    setTimeout(function() {
                        findTab("Ad-Pin").click()
                    }, 300);
                }
                $('#venue-ad').empty().append(htmlstring);
                document.getElementById('WMEBED-nearby-place-select').setAttribute('style','display:none;');
            } else {
                W.selectionManager.unselectAll()
                document.querySelector("body > div.app.container-fluid").classList.add("show-sidebar")
                if (document.querySelector(".tab-pane.active") && !document.querySelector("wz-navigation-item > .w-icon-map-edit").parentElement.selected) {
                    document.querySelector("wz-navigation-item > .w-icon-map-edit").parentElement.click()
                } else if (!document.querySelector("wz-navigation-item > .w-icon-map-edit").parentElement.selected) {
                    document.querySelector("wz-navigation-item > .w-icon-map-edit").parentElement.click()
                }
                document.querySelector("#edit-panel > div").firstChild.style.display = "none"
                if (document.querySelector("#WMEBED-ad-pin-sidebar")) {
                    document.querySelector("#WMEBED-ad-pin-sidebar").remove()
                }
                document.querySelector("#edit-panel > div").insertAdjacentHTML("beforeend",htmlstring)
            }

            $("#EP2-ss3").click(function() {
                makeModal(ad_data.name,undefined,ad_data,"GAPI",`https://gapi.waze.com/autocomplete/q?e=${getAdServer()}&c=wd&sll=${lonlat.lat},${lonlat.lon}&s&q=${ad_data.name}&gxy=1`)
            });
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
                let html = [
                    '<wz-card class="tx-item">',
                    `<div class="tx-item-header tx-wmebed">`,
                        `<i class="${iconClass}"></i>`,
                        `<wz-body2 class="tx-summary">`,
                            `<wz-h7>${name}</wz-h7>`,
                            `<wz-caption class="tx-preview">`,
                                `<div>${venue.houseNumber} ${venue.streetName}</div>`,
                            `</wz-caption>`,
                        `</wz-body2>`,
                        `<div class="flex-noshrink">${venue.distanceFromAdPin}m</div>`,
                    `</div>`,
                    `</wz-card>`
                ].join(' ');
                //venueLink.innerHTML = "<div class='WMEBED-icon-link-venue'></div>" + name + "<br>" + venue.houseNumber + " " + venue.streetName + " (" + venue.distanceFromAdPin + "m)";
                venueLink.innerHTML = html;
                listItem.append(venueLink);
                let adPoint = new OpenLayers.Geometry.Point(ad_data.x, ad_data.y);
                adPoint.transform(W.Config.map.projection.remote, W.Config.map.projection.local)

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
            let html = [
                '<wz-card class="tx-item">',
                    `<div class="tx-item-header tx-wmebed">`,
                        `<span class="fa fa-plus" style="font-size:20px;color:#A1A6AB;"></span>`,
                        `<wz-body2 class="tx-summary">`,
                            `<wz-h7>${name}</wz-h7>`,
                            `<wz-caption class="tx-preview" style="position: relative;top: 50%;transform: translateY(-50%);font-size: 13px;">`,
                                `<div>${I18n.t('wmebed.create_new_place')}</div>`,
                            `</wz-caption>`,
                        `</wz-body2>`,
                    `</div>`,
                `</wz-card>`
            ].join(' ');

            createLink.innerHTML = html;
            listItem.append(createLink);
            createLink.onclick = function() {
                createPlace(ad_data, marker)
                let venue_id = W.selectionManager.getSelectedFeatures()[0].model.attributes.id.toString();
                let venueModel = W.model.venues.objects[venue_id];
            }

        }
        displayQrCode("appLinkQRCode", ad_data.v);
        createTooltip('ad-address',I18n.t('wmebed.ad_address_tooltip'));
        createTooltip('ad-open-tooltip',I18n.t('wmebed.ad_open_tooltip'));
    }

    function displayQrCode(qrElementID, venueID) {

        //let _appLinkBase = 'waze://';
        let _appLinkBase = 'https://ul.waze.com/ul'; // Universal Deep Link

        let _colorLight = "#ffffff";
        if (window.location.host == "support.google.com") {
            _colorLight = "#f1f3f4";
        }
        //More info about QR Here: https://reactjsexample.com/javascript-library-for-generating-qr-codes-with-a-logo-and-styling/

        let qrCode = new QRCodeStyling({
            data: `${_appLinkBase}?preview_venue_id=${venueID}&navigate=yes&utm_medium=send_to_phone_QR`,
            image: "https://raw.githubusercontent.com/TheCre8r/WME-BackEnd-Data/master/images/waze-qr-middle.png",
            width: 220,
            height: 220,
            margin: 0,
            type: "canvas",
            dotsOptions: {
                color: "#155270",
                type: "square"
            },
            backgroundOptions: {
                color: _colorLight
            },
            imageOptions: {
                hideBackgroundDots: false,
                crossOrigin: "anonymous",
                margin: 0,
                imageSize: .9
            },
            qrOptions: {
                typeNumber: 14,
                mode: "Byte",
                errorCorrectionLevel: "M"
            },
        });
        qrCode.append(document.getElementById(qrElementID));
        //$("#appLinkQRCode").append(`<div class="wz-icon-wrapper"><i class="wz-icon is-wazer-border"></i></div>`);
    }

    function getNearbyPlaces(ad_data) {
        var nearbyPlaces = [];

        let adName = ad_data.name;

        Object.keys(W.model.venues.objects).forEach( function(venueID) {
            if (!W.model.venues.objects[venueID].outOfScope) {
                let venue = W.model.venues.objects[venueID].attributes;
                let point = new OpenLayers.Geometry.Point(ad_data.x, ad_data.y);
                point.transform(W.Config.map.projection.remote, W.Config.map.projection.local)
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
                    log('Nearby places: ');
                    console.log(foundPlace);
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
        let wazeFeatureVectorLandmark = require("Waze/Feature/Vector/Landmark");
        let wazeActionAddLandmark = require("Waze/Action/AddLandmark");
        let wazeActionUpdateObject = require('Waze/Action/UpdateObject');
        let wazeActionUpdateFeatureAddress = require('Waze/Action/UpdateFeatureAddress');

        let landmark = new wazeFeatureVectorLandmark();
        let offset_y = ad_data.y - 0.00005;
        let point = new OpenLayers.Geometry.Point(ad_data.x, offset_y);
        point.transform(W.Config.map.projection.remote, W.Config.map.projection.local)
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

    function gasprices(json,bypass){
        let latlon = get4326CenterPoint();
        let venue = W.selectionManager.getSelectedFeatures()[0].model.attributes;
        let link = `https://${window.location.hostname + W.Config.search.server}?lon=${latlon.lon}&lat=${latlon.lat}&format=PROTO_JSON_FULL&venue_id=venues.${venue.id}`;
        let htmlstring = [
                `<form class="attributes-form">`,
                    `<div class="side-panel-section">`,
                        `<div class="form-group">`,
                            `<label class="control-label">${I18n.t('wmebed.gas_prices')+(_settings.Debug == true ? `<i id="EP2-ss2" class="fa fa-file-code-o EP2-icon EP2-clickable" style="color: #8c8c8c;"></i>` :``)}</label>`+
                            `<div id="gas-prices" style="text-align:center">`,
                            `</div>`,
                        `</div>`,
                        `<ul class="additional-attributes list-unstyled side-panel-section">`,
                            `<li id="gas-update-time"></li>`,
                        `</ul>`,
                        `<div class="WMEBED-report">`,
                            `<i class="fa fa-github" style="font-size: 13px; padding-right:5px"></i>`,
                            `<div style="display: inline-block">`,
                                `<a id="WMEBED-report-an-issue-gas">${I18n.t('wmebed.report_an_issue')}</a>`,
                            `</div>`,
                        `</div>`,
                    `</div>`,
                `</form>`,
            ].join(' ');
        $('#venue-gas').append(htmlstring);
        $("#EP2-ss2").click(function() {
            $.getJSON(link, function(data) {
                makeModal(venue.name,undefined,data,"Search Server",link)
            });
        });
        createTooltip('EP2-ss2',"Search Server");
        if (venue.id < 0) {
            document.querySelector("#gas-update-time").innerHTML = `${I18n.t('wmebed.invalid_gas')} - <a target="_blank" href="https://www.waze.com/user/editor/jm6087">jm6087</a>`
        } else if (bypass == true || ( json.venue.product && venue.categories.indexOf("GAS_STATION") >= 0)){
            log(json,1);

            let price_unit = json.price_unit; // $
            let updatetimes = []
            for ( let i = 0; i < json.venue.product.length; i++) {
                updatetimes.push(json.venue.product[i].last_updated)
            }
            let lastupdate = Math.max(...updatetimes)
            let lastupdatestring = timeConverter(lastupdate); // October 20, 2020 11:38
            let lastupdateduser;
            if (json.venue.product) {
                for (var i = 0; i < json.venue.product.length; i++){
                    if (json.venue.product[i].last_updated == lastupdate){
                        lastupdateduser = json.venue.product[i].updated_by;
                        i=json.venue.product.length
                    }
                }
            }


            //Build Gas Price Table
            let gastypes = []
            for (let i = 0; i < json.venue.product.length; i++) {
                if (json.venue.product[i].id.includes("gas.")) {
                    gastypes.push(json.venue.product[i].id) //$("#gas-prices > div:nth-child(1) > div").html()
                    let type = json.venue.product[i].id; // gas.premium
                    let price = json.venue.product[i].price //1.999
                    let pricestring
                    if (price.toString().includes('.') && price.toString().split('.')[1].length == 3) {
                        pricestring = json.venue.currency[0].toString()+String.fromCharCode(160)+price.toString().substring(0, price.toString().length-1)+`<sup style="top:-0.3em;">`+price.toString().substring(price.toString().length-1, price.toString().length)+`</sup>`;
                    } else {
                        pricestring = json.venue.currency[0].toString()+String.fromCharCode(160)+price
                    }
                    let htmlstring =
                        `<div class="gas-price-block" id="${json.venue.product[i].id}">`+
                        `<div class="gas-price">${pricestring}</div>`+
                        `<span class="gas-price-text">${I18n.t(`wmebed.${type}`)}</span>`+
                        `</div>`;
                    $("#gas-prices").append(htmlstring);
                }
            }

            // Sort Fuel Prices By Country Specifics
            if (W.model.countries && W.model.countries.top && typeof W.model.countries.top != 'undefined') {
                COUNTRY.id = W.model.countries.top.id;
                COUNTRY.name = W.model.countries.getObjectById(COUNTRY.id).name;
            }
            log("Country: " + COUNTRY.name,0)
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
                $("#gas\\.diesel > span").html(I18n.t('wmebed.gas.regular')) //Change Diesel to Regular since the Waze is stupid and the JSON is backwards
                $("#gas\\.regular > span").html(I18n.t('wmebed.gas.diesel')) //Change Regular to Diesel since the Waze is stupid and the JSON is backwards
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
                $('#gas-update-time').html(`${I18n.t('edit.updated_on', {time: lastupdatestring})} Unknown User</a>`);
            }
        } else {
            document.querySelector("#gas-update-time").innerHTML = `<span>${I18n.t('wmebed.no_gas_prices')}</span>`
        }
        $('#WMEBED-report-an-issue-gas').click(function(){ //line 570
            if (confirm(I18n.t('wmebed.gas_price_reminder'))){
                window.open(
                    `https://github.com/TheCre8r/WME-BackEnd-Data/issues/new?title=Missing%20Gas%20Prices&body=${encodeURIComponent("Permalink: "+$(".WazeControlPermalink .permalink").attr('href').toString())}`,
                    '_blank' //New window
                );
            }
        });
    }

    function processParkingLotData(json){
        //console.log(json);
        let spots = json.venue.parking_lot_attributes.numberOfSpots
        if (!document.querySelector("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > label > span")) {
            $("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > label").append("<span> (" + spots + ")</span>");
        }

        //document.querySelector("#csParkingSpacesContainer > div:nth-child(1)").classList.contains("waze-btn-blue")
        let divno = 0;
        if (spots > 0 && spots <= 10 ) {
            divno = 1;
        } else if (spots > 10 && spots <= 30 ) {
            divno = 2;
        } else if (spots > 30 && spots <= 60 ) {
            divno = 3;
        } else if (spots > 60 && spots <= 100 ) {
            divno = 4;
        } else if (spots > 100 && spots <= 300 ) {
            divno = 5;
        } else if (spots > 300 && spots <= 600 ) {
            divno = 6;
        } else if (spots > 600 ) {
            divno = 7;
        }
        if (document.querySelector("#csParkingSpacesContainer")) {
            document.querySelector("#csParkingSpacesContainer > div:nth-child(" + divno + ")").classList.add("wmebed-cs-correct")
            if (($( "#csParkingSpacesContainer" ).find(".waze-btn-blue")[0] == $( "#csParkingSpacesContainer" ).find(".wmebed-cs-correct")[0]) || $( "#csParkingSpacesContainer" ).find(".waze-btn-green")[0] == $( "#csParkingSpacesContainer" ).find(".wmebed-cs-correct")[0]) {
                log("Right")
                document.querySelector("#csParkingSpacesContainer > div:nth-child(" + divno + ")").classList.remove("waze-btn-blue")
                document.querySelector("#csParkingSpacesContainer > div:nth-child(" + divno + ")").classList.add("waze-btn-green")
                document.querySelector(".hide-residential > a").style.removeProperty("background-color")
                document.querySelector("#csParkingSpacesContainer > div:nth-child(" + divno + ")").style.removeProperty("background-color")
                //document.querySelector("#csParkingSpacesContainer > div:nth-child(" + divno + ")").classList.remove("waze-btn-blue")
                //document.querySelector(".hide-residential > a").style.backgroundColor = "#20da9c";
            } else {
                log("Wrong")
                document.querySelector("#csParkingSpacesContainer > div:nth-child(" + divno + ")").classList.remove("waze-btn-green")
                document.querySelector("#csParkingSpacesContainer > div:nth-child(" + divno + ")").classList.add("waze-btn-blue")
                document.querySelector(".hide-residential > a").style.backgroundColor = "orange";
                document.querySelector("#csParkingSpacesContainer > div:nth-child(" + divno + ")").style.backgroundColor = "orange"
            }
            document.querySelector("#csParkingSpacesContainer").addEventListener('click', function (event) {
                processParkingLotData(json)
            })
        } else {
            let selectedValue = document.querySelector("#venue-edit-more-info > form > div:nth-child(8) > wz-select").value
            //let selectedIndex = document.querySelector("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select").selectedIndex;
            document.querySelector("#venue-edit-more-info > form > div:nth-child(8) > wz-select").children[divno].classList.add("wmebed-correct")
            //document.querySelector("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(" + divno + ")").classList.add("wmebed-correct")
            document.querySelector("#venue-edit-more-info > form > div:nth-child(8) > wz-select").children[divno].style.backgroundColor = "orange"
            //document.querySelector("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(" + divno + ")").style.backgroundColor = "orange"
            return
            if ((divno - 1) == selectedIndex) {
                //document.querySelector(".hide-residential > a").style.backgroundColor = "#20da9c";
                document.querySelector(".hide-residential > a").style.removeProperty("background-color")
                document.querySelector("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select").style.backgroundColor = "#20da9c"
                document.querySelector("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(1)").style.backgroundColor = "white"
                document.querySelector("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(2)").style.backgroundColor = "white"
                document.querySelector("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(3)").style.backgroundColor = "white"
                document.querySelector("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(4)").style.backgroundColor = "white"
                document.querySelector("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(5)").style.backgroundColor = "white"
                document.querySelector("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(6)").style.backgroundColor = "white"
                document.querySelector("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(7)").style.backgroundColor = "white"
                document.querySelector("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(" + divno + ")").style.backgroundColor = "#20da9c"
            } else {
                document.querySelector(".hide-residential > a").style.backgroundColor = "orange";
                document.querySelector("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select").style.backgroundColor = "orange"
                document.querySelector("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(1)").style.backgroundColor = "white"
                document.querySelector("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(2)").style.backgroundColor = "white"
                document.querySelector("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(3)").style.backgroundColor = "white"
                document.querySelector("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(4)").style.backgroundColor = "white"
                document.querySelector("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(5)").style.backgroundColor = "white"
                document.querySelector("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(6)").style.backgroundColor = "white"
                document.querySelector("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(7)").style.backgroundColor = "white"
                document.querySelector("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(" + divno + ")").style.backgroundColor = "orange"
            }
        }
        $('select[name="estimatedNumberOfSpots"]').change(function() {
        //$("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select").change = function() {
            processParkingLotData(json);
        })
    }

    async function insertExternalProviders2(){
        if ($("#ExternalProviders2").length) {
            return
        }
        let latlon = get4326CenterPoint();
        let venue = W.selectionManager.getSelectedFeatures()[0].model.attributes;
        let link = `https://${window.location.hostname + W.Config.search.server}?lon=${latlon.lon}&lat=${latlon.lat}&format=PROTO_JSON_FULL&venue_id=venues.${venue.id}`;
        let searchServerJSON;

        let generateQRcodeHTML = [
            '<wz-menu-item class="feature-panel-header-menu-option" id="wmebed-qr-popup-button">',
                '<i class="w-icon fa fa-qrcode" style="font-size: 20px;padding: 2px;"></i>Generate QR Code',
            '</wz-menu-item>'
            ].join(' ');
        document.querySelector("#edit-panel wz-menu").insertAdjacentHTML("beforeend",generateQRcodeHTML)
        $("#wmebed-qr-popup-button").click(function() {
            let htmlstring = [
                '<div class="panel show">',
                  '<wz-card elevation="5" class="drive-panel">',
                    '<div class="header">',
                      '<wz-h5>QR Code</wz-h5>',
                      '<i style="right: 14px;position: relative;top: 1px;">Generated by WMEBED</i>',
                      '<wz-button color="clear-icon" size="xs"><i class="w-icon w-icon-x"></i></wz-button>',
                    '</div>',
                    '<div style="text-align: center;">',
                        '<span id="wmebed-qr-popup" style="display: inline-block; height: 235px; width: 220px;">',
                        '</span>',
                        '<wz-button id="wmebed-qr-download" color="primary" size="sm" class=""><i class="w-icon fa fa-download"></i> Download</wz-button>',
                    '</div>',
                  '</wz-card>',
                '</div>'
                ].join(' ');
            document.querySelector("#panel-container").insertAdjacentHTML("beforeend",htmlstring)
            $("#panel-container .header wz-button").click(function () {$("#panel-container").empty()})
            displayQrCode("wmebed-qr-popup", venue.id)
            $("#wmebed-qr-download").click(function () {
                var link = document.createElement('a');
                link.download = `${venue.name}.png`;
                link.href = document.querySelector("#wmebed-qr-popup canvas").toDataURL()
                link.click();
            })
        });
        let copyLivemapLinkHTML = [
            '<wz-menu-item class="feature-panel-header-menu-option" id="wmebed-copy-lmlink-button">',
                '<i class="w-icon w-icon-copy"></i>Copy livemap link to clipboard',
            '</wz-menu-item>'
        ].join(' ');
        document.querySelector("#edit-panel wz-menu").insertAdjacentHTML("beforeend",copyLivemapLinkHTML)
        $("#wmebed-copy-lmlink-button").click(function() {
            navigator.clipboard.writeText(`https://ul.waze.com/ul?preview_venue_id=${venue.id}&navigate=yes&utm_medium=send_to_phone_QR`)
            WazeWrap.Alerts.info(GM_info.script.name, 'Livemap link copied to clipboard');
        });

        if (venue.id <= 0) {
        } else {
            await $.ajax({
                url: link,
                type: 'get',
                dataType: 'json',
                cache: false,
                success: function(data) {
                    searchServerJSON = data;
                }
            });
        }

        function DebugCheck() {
            return (_settings.Debug == true ? `<i id="EP2-ss" class="fa fa-file-code-o EP2-icon EP2-clickable" style="color: #8c8c8c;"></i><i id="EP2-code" class="fa fa-code EP2-icon EP2-clickable" style="color: #8c8c8c;"></i>` :``)
        }


        function newEPItem(name,link,icon,canDelete,extraInfo){
            let deleteButtonHTML = [
            `<wz-button color="shadowed" size="sm" class="external-provider-action external-provider-action-delete">`,
                `<i class="w-icon w-icon-trash external-provider-action-icon"></i>`,
            `</wz-button>`,
            ].join(' ');

            let linkButtonHTML = [
            `<a class="url" href="${link ? link : '#'}" target="_blank" rel="noopener noreferrer">`,
                 `<wz-button color="shadowed" size="sm" class="external-provider-action external-provider-action-focus">`,
                    `<i class="w-icon w-icon-link external-provider-action-icon"></i>`,
                `</wz-button>`,
            `</a>`
            ].join(' ');

            let iconHTML

            if (icon.includes('</i>')) {
                iconHTML = icon
            } else {
                iconHTML =`<img class="EP2-img" style="height: 18px;padding: 0px;margin: -2px 2px 0px -6px;" src="${icon}">`
            }
            let debugHTML = `<span style="color: #8c8c8c;font-size: 10px;display: inline;"">, ${extraInfo}</span>`
            let html = [
                `<wz-list-item class="external-provider ${link ? '' : 'unclickable'}">`,
                    `<div slot="item-key" class="external-provider-content">${icon ? iconHTML : ''}${name}${(_settings.Debug && extraInfo) ? debugHTML : ''}</div>`,
                    `<div slot="actions" class="external-provider-actions">`,
                        `${link ? linkButtonHTML : ''}`,
                        `${canDelete ? deleteButtonHTML : ''}`,
                    `</div>`,
                `</wz-list-item>`
            ].join(' ');

            $("#EP2-list").append(html)
        }

        let EP2html = [
            `<div class="external-providers-control form-group" id="ExternalProviders2">`,
            `<wz-label html-for="">${I18n.t('edit.venue.external_providers.title')} (${I18n.t('wmebed.read_only')})`,
                `<i id="ep2-tooltip" class="EP2-icon waze-tooltip"></i>${DebugCheck()}`,
            `</wz-label>`,
                `<wz-list class="external-providers-list" id="EP2-list">`,
                `</wz-list>`,
            `</div>`
            ].join(' ');
        if (W.selectionManager.getSelectedFeatures()[0].model.attributes.categories.indexOf("GAS_STATION") >= 0) {
            function bootstrapGas(tries = 1) {
                if (document.querySelector("wz-tabs") == null && tries < 5) {
                    setTimeout(() => bootstrapGas(tries++), 1000);
                } else {
                    makeTab("Gas","tab-gas","<div id='venue-gas'></div>")
                    gasprices(searchServerJSON);
                }
            }
            try {
                bootstrapGas()
            } catch (error) {
                log(error,3)
            }
            //makeTab("Gas","tab-gas","<div id='venue-gas'></div>")
            //gasprices(searchServerJSON);
        } else if (W.selectionManager.getSelectedFeatures()[0].model.attributes.categories.indexOf("PARKING_LOT") >= 0 && searchServerJSON.venue.parking_lot_attributes.numberOfSpots) {
            processParkingLotData(searchServerJSON);
        }

        if (W.selectionManager.getSelectedFeatures()[0].model.arePropertiesEditable()) {
            $('#venue-edit-general > .external-providers-control').after(EP2html);
        } else {
            $('#venue-edit-general > .geometry-type-control').after(EP2html);
        }

        if (!venue.name.includes("Parking  -") && !venue.name.includes("Parking -") && !venue.name.includes("Lot -") && !venue.name.includes("(copy)") ) {
            log(venue.name,0)
            getAds(latlon,venue)
        }

        if (venue.id <= 0 || link.toString().indexOf("venues.-") >= 0) {
            return;
        }

        if (searchServerJSON.venue.external_providers) {
            log('JSON External Providers ' + searchServerJSON.venue.external_providers.length,0)
        } else {
            log('JSON External Providers 0',0)
            newEPItem("None","","",false)
        }
        let i = 0;
        let count = 0;
        while (searchServerJSON.venue.external_providers != undefined && i < searchServerJSON.venue.external_providers.length) {
            switch (searchServerJSON.venue.external_providers[i].provider) {
                case "Google":
                    //https://developers.google.com/maps/documentation/places/web-service/place-id
                    if (!W.selectionManager.getSelectedFeatures()[0].model.arePropertiesEditable()) {
                        newEPItem("Google","",'<i class="EP2-img-fa fa fa-google" style="font-size: 14px;"></i>',false,searchServerJSON.venue.external_providers[i].i)
                        break;
                    }
                    if (searchServerJSON.venue.external_providers.length == 1) {
                        log("Google Skipped",1);
                        newEPItem("None","","",false)
                        break;
                    }
                    break;
                case "Yext":
                case "YextAds":
                    newEPItem(searchServerJSON.venue.external_providers[i].provider,"","https://www.yext.com/wp-content/themes/yext/img/icons/favicon-seal.png",false,searchServerJSON.venue.external_providers[i].i)
                    break;
                case "ParkMe":
                    newEPItem(searchServerJSON.venue.external_providers[i].provider,`https://www.parkme.com/lot/${searchServerJSON.venue.external_providers[i].id}`,"https://raw.githubusercontent.com/TheCre8r/WME-BackEnd-Data/master/images/ParkMe.png",false,searchServerJSON.venue.external_providers[i].id)
                    break;
                case "ESSO":
                    newEPItem(searchServerJSON.venue.external_providers[i].provider,'','https://upload.wikimedia.org/wikipedia/commons/2/22/Esso_textlogo.svg',false,searchServerJSON.venue.external_providers[i].id)
                    break;
                case "EcoMovement":
                    newEPItem("Eco Movement",'','<i class="EP2-img-fa w-icon w-icon-ev-charging charging-port-item-icon" style="font-size: 14px;"></i> ',false,searchServerJSON.venue.external_providers[i].id)
                    break;
                case "Government of Mexico Gas Station":
                    newEPItem(searchServerJSON.venue.external_providers[i].provider,'','<i class="EP2-img-fa fa fa-university" style="font-size: 14px;"></i> ',false,searchServerJSON.venue.external_providers[i].id)
                    break;
                default:
                    newEPItem(searchServerJSON.venue.external_providers[i].provider,'','<i class="EP2-img-fa fa fa-server" style="font-size: 14px;"></i> ',false,searchServerJSON.venue.external_providers[i].id)
                    break;
            }
            count++;

            if (_settings.Debug == true) {
                $(`#EP2-items > div:nth-child(${count}) > span`).append(`<span style="color: #8c8c8c;font-size: 10px;display: inline;"">, ${searchServerJSON.venue.external_providers[i].id}</span>`)
            }

            i++;
        }


        createTooltip('ep2-tooltip',I18n.t('wmebed.third_party_tooltip'));

        $("#EP2-code").click(function() {
            log(venue,0);
            makeModal(venue.name,undefined,venue,"WME")
        });
        createTooltip('EP2-code',"WME");
        $("#EP2-ss").click(function() {
            $.getJSON(link, function(data) {
                makeModal(venue.name,undefined,data,"Search Server",link)
            });
        });
        createTooltip('EP2-ss',"Search Server");



    }

    function createTooltip(elementID, text) {
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

    function initLayer(){
        initializeSettings();
        log("Layer Initialized",0);

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
        if (getUrlParameter('venues').length && W.selectionManager.getSelectedFeatures()[0] != undefined) {
            insertExternalProviders2()
        }
        W.selectionManager.events.register("selectionchanged", null, function(){
            restoreTabPane()
            if (!$('#ExternalProviders2').length && WazeWrap.hasPlaceSelected()){
                //2023 Insert MO here
                insertExternalProviders2()
            }
        })
    }

    function bootstrapFillForm(tries = 1) {
        log("bootstrap attempt "+ tries);
        if (typeof(document.getElementsByName('username')[0]) != 'undefined') {
            fillForm();
        } else if (tries < 1000) {
            setTimeout(() => bootstrapFillForm(tries++), 200);
        }
    }

    let bootsequence = ["DOM","I18n","Waze","WazeWrap","OpenLayers","WMECS"];
    function bootstrap(tries = 1) {
        if (bootsequence.length > 0) {
            log("Waiting on " + bootsequence.join(', '),0)
            if (bootsequence.indexOf("DOM") > -1) {
                bootsequence = bootsequence.filter(bs => bs !== "DOM")
                injectCss();
            } if (I18n && bootsequence.indexOf("I18n") > -1) {
                bootsequence = bootsequence.filter(bs => bs !== "I18n")
                initializei18n();
            } if (W && W.map && W.model && bootsequence.indexOf("Waze") > -1) {
                bootsequence = bootsequence.filter(bs => bs !== "Waze")
            } if (OpenLayers && bootsequence.indexOf("OpenLayers") > -1) {
                bootsequence = bootsequence.filter(bs => bs !== "OpenLayers")
                if (!OpenLayers.Icon) {
                    installOpenLayersIcon()
                }
            } if (WazeWrap.Ready && bootsequence.indexOf("WazeWrap") > -1) {
                bootsequence = bootsequence.filter(bs => bs !== "WazeWrap")
                initTab();
                document.querySelector("#edit-panel").insertAdjacentHTML("afterend",`<div id="sidepanel-wmebed-adpin" class="tab-pane"></div>`)

            } if (wmecsTesters.indexOf(USER.name) > -1) {
                if (typeof WMECS !== 'undefined' && WazeWrap.Ready) {
                    WazeWrap.Alerts.info(GM_info.script.name, "WMECS has been loaded.");
                    W.map.events.register("moveend",null,processAdsResponse(this,null,"WMECS"));
                    bootsequence = bootsequence.filter(bs => bs !== "WMECS")
                }
            } else if (bootsequence.indexOf("WMECS") > -1) {
                bootsequence = bootsequence.filter(bs => bs !== "WMECS")
            }
            setTimeout(() => bootstrap(tries++), 400);
        }
    }
    function detectHost() {
        if (window.location.host == "support.google.com") {
            log('Google Form Detected');
            bootstrapFillForm();
        } else if (window.location.host == "beta.waze.com") {
            document.addEventListener("wme-logged-in",() => {
                bootstrap();
                /**
                injectCss();
                initializei18n();
                if (!OpenLayers.Icon) {
                    installOpenLayersIcon()
                }
                if (WazeWrap.Ready) {
                    bootsequence = bootsequence.filter(bs => bs !== "WazeWrap")
                    initTab();
                }
                **/
            },{ once: true },);

        } else {
            bootstrap();
        }
    }
    detectHost();
})();
