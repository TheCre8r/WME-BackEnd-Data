// ==UserScript==
// @name         WME BackEnd Data
// @namespace    https://github.com/thecre8r/
// @version      2026.02.28.01
// @description  Shows Hidden Attributes, Ad Pins, and Gas Prices for Applicable Places
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
// @require      https://www.cssscript.com/demo/minimal-json-data-formatter-jsonviewer/json-viewer.js
// @license      GPLv3
// @connect      gapi.waze.com
// @connect      www.waze.com
// @connect      beta.waze.com
// @connect      raw.githubusercontent.com
// @grant        GM_xmlhttpRequest
// ==/UserScript==
/* global W, getWmeSdk, OpenLayers, I18n, _, WazeWrap, WMECS, require, QRCodeStyling, Backbone, JSONViewer */

(() => {
  var SCRIPT_NAME = GM_info.script.name;
  var SCRIPT_ID = SCRIPT_NAME.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "-").toLowerCase();
  var SCRIPT_VERSION = (GM_info?.script?.version ?? "0.0.0").toString();
  var SCRIPT_AUTHOR = GM_info?.script?.author ?? "The_Cre8r";
  var SCRIPT_SHORT_NAME = "WMEBED";
  var STORE_NAME = `${SCRIPT_SHORT_NAME}_Settings`;
  var GH = {
    link: "https://github.com/TheCre8r/WME-BackEnd-Data/",
    issue: "https://github.com/TheCre8r/WME-BackEnd-Data/issues/new",
    wiki: "https://github.com/TheCre8r/WME-BackEnd-Data/wiki"
  };
  var DOWNLOAD_URL = "https://raw.githubusercontent.com/TheCre8r/WME-BackEnd-Data/master/WME-BED.user.js";
  var GAPI_AUTOCOMPLETE_URL = "https://gapi.waze.com/autocomplete/q";
  var icons = {
    bed: "fa fa-bed",
    github: "fa fa-github",
    help: "w-icon w-icon-query-fill",
    qrcode: "fa fa-qrcode",
    download: "fa fa-download",
    wme: "w-icon w-icon-map-edit",
    livemap: "w-icon w-icon-map",
    "search-server": "fa fa-server"
  };
  var adsFeatures = false;
  var streetAlias = {
    "1ST": "FIRST",
    "2ND": "SECOND",
    "3RD": "THIRD",
    "4TH": "FOURTH",
    "5TH": "FIFTH",
    "6TH": "SIXTH",
    "7TH": "SEVENTH",
    "8TH": "EIGHTH",
    "9TH": "NINTH",
    "10TH": "TENTH",
    "FIRST": "1ST",
    "SECOND": "2ND",
    "THIRD": "3RD",
    "FOURTH": "4TH",
    "FIFTH": "5TH",
    "SIXTH": "6TH",
    "SEVENTH": "7TH",
    "EIGHTH": "8TH",
    "NINTH": "9TH",
    "TENTH": "10TH",
    "NORTH": "N",
    "SOUTH": "S",
    "EAST": "E",
    "WEST": "W",
    "N": "NORTH",
    "S": "SOUTH",
    "E": "EAST",
    "W": "WEST",
    "AVE": "AVENUE",
    "PKY": ["PARKWAY", "PKWY"],
    "PKWY": ["PARKWAY", "PKY"],
    "ST": "STREET",
    "RD": "ROAD",
    "DR": "DRIVE",
    "PLZ": "PLAZA",
    "CIR": "CIRCLE",
    "I-": "IH-",
    "NE": "NORTHEAST",
    "NW": "NORTHWEST",
    "SE": "SOUTHEAST",
    "SW": "SOUTHWEST"
  };
  var debugState = null;
  function setLogDebugState(state) {
    debugState = state;
  }
  function isDebugEnabled() {
    return debugState ? debugState() === true : false;
  }
  function log(msg, level) {
    if (level !== void 0 && level >= 0 && !isDebugEnabled()) {
      return;
    }
    let css = "font-size: 12px; display: block; ";
    switch (level) {
      case 0:
        css += "color: green;";
        break;
      case 1:
        css += "color: orange;";
        break;
      case 2:
        css += "color: red;";
        break;
      default:
        css += "color: white;";
        break;
    }
    console.log(`%c${SCRIPT_NAME}: %s`, css, msg);
    if (typeof msg === "object" && isDebugEnabled()) {
      console.log(msg);
    }
  }
  function getWmeStyles() {
    let styleElements = {};
    let $tempDiv = null;
    let tempQuerySelector = null;
    let tempComputedStyle = null;
    $tempDiv = document.createElement("div");
    $tempDiv.className = "form-search";
    const searchRegion = document.createElement("div");
    searchRegion.className = "search-result-region";
    const searchResult = document.createElement("div");
    searchResult.className = "search-result";
    const icon = document.createElement("div");
    icon.className = "icon";
    searchResult.append(icon);
    searchRegion.append(searchResult);
    $tempDiv.append(searchRegion);
    document.body.append($tempDiv);
    tempQuerySelector = document.querySelector(".form-search .search-result-region .search-result .icon");
    tempComputedStyle = window.getComputedStyle(tempQuerySelector);
    styleElements.resultTypeVenueStyle = `background-image:${tempComputedStyle.getPropertyValue("background-image")};background-size:${tempComputedStyle.getPropertyValue("background-size")};background-position:${tempComputedStyle.getPropertyValue("background-position")};width:${tempComputedStyle.getPropertyValue("width")};height:${tempComputedStyle.getPropertyValue("height")};`;
    $tempDiv.remove();
    $tempDiv = document.createElement("div");
    $tempDiv.id = "edit-panel";
    const mergeLandmarks = document.createElement("div");
    mergeLandmarks.className = "merge-landmarks";
    const mergeItem = document.createElement("div");
    mergeItem.className = "merge-item";
    const parkingIcon = document.createElement("div");
    parkingIcon.className = "icon parking_lot";
    mergeItem.append(parkingIcon);
    mergeLandmarks.append(mergeItem);
    $tempDiv.append(mergeLandmarks);
    document.body.append($tempDiv);
    tempQuerySelector = document.querySelector("#edit-panel .merge-landmarks .merge-item .icon.parking_lot");
    tempComputedStyle = window.getComputedStyle(tempQuerySelector, "::after");
    styleElements.resultTypeParking = `background-image:${tempComputedStyle.getPropertyValue("background-image")};background-size:${tempComputedStyle.getPropertyValue("background-size")};background-position:${tempComputedStyle.getPropertyValue("background-position")};width:${tempComputedStyle.getPropertyValue("width")};height:${tempComputedStyle.getPropertyValue("height")};`;
    $tempDiv.remove();
    return styleElements;
  }
  function injectCss() {
    let styleElements = getWmeStyles();
    const adPinSidebarId2 = `${SCRIPT_SHORT_NAME}-ad-pin-sidebar`;
    const reportClass3 = `${SCRIPT_SHORT_NAME}-report`;
    const buttonClass = `${SCRIPT_SHORT_NAME}-Button`;
    const linkVenueClass = `${SCRIPT_SHORT_NAME}-icon-link-venue`;
    const linkParkingClass = `${SCRIPT_SHORT_NAME}-icon-link-parking`;
    let css = [
      "#sidepanel-wmebed > div > form > div > div > label {white-space:normal}",
      ".EP2-items {}",
      ".EP2-link {display: table;height:26px; cursor: context-menu;background-color:#fff;box-shadow:rgba(0,0,0,.1) 0 2px 7.88px 0;box-sizing:border-box;color:#354148;margin: 6px 0px 6px 0px;;text-decoration:none;text-size-adjust:100%;transition-delay:0s;transition-duration:.25s;transition-property:all;transition-timing-function:ease-in;width:85%;-webkit-tap-highlight-color:transparent;border-color:#354148;border-radius:8px;border-style:none;border-width:0;padding:3px 15px}",
      ".EP2-link a {display: table-cell;text-decoration:none;}",
      ".EP2-link a:hover {text-decoration:none;}",
      ".EP2-link span {display: table-cell;}",
      ".EP2-img {margin-right: 6px;padding-right: 0;height: 100%;}",
      ".EP2-img-fa {margin: -2px 2px 0px -6px; font-size:11px}",
      ".EP2-icon {color: var(--content_p2);margin-left: 4px;font-size: 18px;}",
      ".EP2-clickable {cursor:pointer;}",
      `#${SCRIPT_SHORT_NAME}-header {margin-bottom:10px;}`,
      `#${SCRIPT_SHORT_NAME}-title {font-size:15px;font-weight:600;}`,
      `#${SCRIPT_SHORT_NAME}-version {font-size:11px;margin-left: -2px;margin-bottom: -2px;;color:#aaa; user-select: none;cursor: help;width: fit-content;}`,
      `#${SCRIPT_SHORT_NAME}-close-ad {color: red;float:right;position: relative;cursor: pointer;}`,
      `#${SCRIPT_SHORT_NAME}-report-an-issue-gas {cursor:pointer;}`,
      `#${adPinSidebarId2} {padding-top:10px;}`,
      `.${reportClass3} {text-align:center;padding-top:20px;}`,
      `.${buttonClass} {font-family:"Rubik","Boing-light",sans-serif,FontAwesome;padding-left:10px;padding-right:10px;margin-top:0px;z-index: 3;}`,
      ".adpin-logo > img {border-radius: 10%;border-color: #c4c3c4;border-width: 1px;border-style: solid;} ",
      ".adpin-logo:hover {filter: brightness(0.9);}",
      "#appLinkQRCode {display: flex;flex-direction: column;position: relative;width: 220px;}",
      "#appLinkQRCode > img {display: block;margin: auto;border: 10px solid #FFFFFF;border-radius: 10px;}",
      ".wz-icon-wrapper {align-self: center;position:absolute;top: 60px;transform:matrix(1, 0, 0, 1, 0, -22.5);}",
      ".wz-icon {background-image: url(https://web.archive.org/web/20200213002954/https://www.waze.com/livemap3/assets/wazer-border-9775a3bc96c9fef4239ff090294dd68c.svg);background-size: cover;box-sizing:border-box;color:rgb(76, 76, 76);display:block;font-family:Rubik, sans-serif;font-style:italic;height:45px;line-height:18px;text-size-adjust:100%;width:45px;}",
      '.gas-price {margin: 0px 5px 0px 5px;text-align:center;cursor:default;background-attachment:scroll;background-clip:border-box;background-color:rgb(255, 255, 255);background-image:none;background-origin:padding-box;background-position-x:0%;background-position-y:0%;background-repeat-x:;background-repeat-y:;background-size:auto;border-bottom-color:rgb(61, 61, 61);border-bottom-left-radius:8px;border-bottom-right-radius:8px;border-bottom-style:none;border-bottom-width:0px;border-image-outset:0px;border-image-repeat:stretch;border-image-slice:100%;border-image-source:none;border-image-width:1;border-left-color:rgb(61, 61, 61);border-left-style:none;border-left-width:0px;border-right-color:rgb(61, 61, 61);border-right-style:none;border-right-width:0px;border-top-color:rgb(61, 61, 61);border-top-left-radius:8px;border-top-right-radius:8px;border-top-style:none;border-top-width:0px;box-shadow:rgba(0, 0, 0, 0.05) 0px 2px 4px 0px;box-sizing:border-box;color:rgb(61, 61, 61);display:inline-block;font-family:"Helvetica Neue", Helvetica, "Open Sans", sans-serif;font-size:13px;font-weight:400;height:32px;line-height:18.5714px;padding-bottom:7px;padding-top:7px;text-size-adjust:100%;width:60px;-webkit-tap-highlight-color:rgba(0, 0, 0, 0)}',
      ".gas-price-block {display: inline-block}",
      ".gas-price-text {display:block;text-align: center;font-weight: bold;font-size: 10px}",
      `.${linkVenueClass} { opacity:0.5; margin-left:0px;margin-right:20px;position:relative;top:3px;` + (styleElements.resultTypeVenueStyle ?? "") + "}",
      `.${linkParkingClass} { filter:invert(.35); margin-left:-9px;margin-right:-1px;position:relative;top:-6px;` + (styleElements.resultTypeParking ?? "") + "}",
      ".tx-item-header.tx-wmebed {justify-content: space-between;}",
      ".adpin-background {pointer-events: none;}",
      ".json-viewer {height: 420px; color: #000;padding-left: 20px;}",
      ".json-viewer ul {list-style-type: none;margin: 0;margin: 0 0 0 1px;border-left: 1px dotted #ccc;padding-left: 2em;}",
      ".json-viewer .hide {display: none;}",
      ".json-viewer ul li .type-string,.json-viewer ul li .type-date {color: #0B7500;}",
      ".json-viewer ul li .type-boolean {color: #1A01CC;font-weight: bold;}",
      ".json-viewer ul li .type-number {color: #1A01CC;}",
      ".json-viewer ul li .type-null {color: red;}",
      ".json-viewer a.list-link {color: #000;text-decoration: none;position: relative;}",
      `.json-viewer a.list-link:before {color: #aaa;content: "\\25BC";position: absolute;display: inline-block;width: 1em;left: -1em;}`,
      '.json-viewer a.list-link.collapsed:before {content: "\\25B6";}',
      '.json-viewer a.list-link.empty:before {content: "";}',
      ".json-viewer .items-ph {color: #aaa;padding: 0 1em;}",
      ".json-viewer .items-ph:hover {text-decoration: underline;}",
      "#EP2-list .unclickable {cursor:default;}",
      ".wmebed-dialog-close {margin-left:auto;background:transparent;border:0;font-size:20px;line-height:1;cursor:pointer;color:var(--content_p2);}",
      ".wmebed-dialog-body {padding-top:4px;}",
      ".wmebed-native-dialog {border:0;border-radius:10px;padding:0;max-width:80vw;min-width:320px;box-shadow:0 12px 40px rgba(0,0,0,0.25);}",
      ".wmebed-native-dialog::backdrop {background: rgba(0,0,0,0.45);}",
      ".wmebed-dialog-header {display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid rgba(0,0,0,0.08);background:#fff;}",
      ".wmebed-dialog-title {font-size:16px;font-weight:600;color:#2b2b2b;flex:1;}",
      ".wmebed-dialog-content {padding:12px 16px;background:#fff;max-height:70vh;overflow:auto;}"
    ].join(" ");
    const style = document.createElement("style");
    style.id = "wmebed-style";
    style.textContent = css;
    document.head.append(style);
    log("CSS Injected");
  }
  function injectCssGoogle() {
    let css = [
      "#appLinkQRCode {display: flex;flex-direction: column;padding-left: 25px;position: absolute;}",
      "#appLinkQRCode > img {display: block;margin-top:10px;border: 10px solid #f1f3f4;border-radius: 10px;}",
      ".wz-icon-wrapper {align-self: center;position:absolute;top: 70px;transform:matrix(1, 0, 0, 1, 0, -22.5);}",
      ".wz-icon {background-image: url(https://web.archive.org/web/20200213002954/https://www.waze.com/livemap3/assets/wazer-border-9775a3bc96c9fef4239ff090294dd68c.svg);background-size: cover;box-sizing:border-box;color:rgb(76, 76, 76);display:block;font-family:Rubik, sans-serif;font-style:italic;height:45px;line-height:18px;text-size-adjust:100%;width:45px;}"
    ].join(" ");
    const style = document.createElement("style");
    style.textContent = css;
    document.head.append(style);
    log("CSS Injected");
  }
  function getUrlParameter(name2, urlOverride) {
    name2 = name2.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    const regex = new RegExp("[\\?&]" + name2 + "=([^&#]*)");
    let results;
    if (urlOverride && urlOverride.length > 0) {
      results = regex.exec(urlOverride.substring(urlOverride.indexOf("?"), urlOverride.length));
    } else {
      results = regex.exec(location.search);
    }
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  }
  function createTooltip(elementID, text, placement = "bottom") {
    const element = document.getElementById(elementID);
    if (!element || !element.parentElement) return;
    let tooltip = null;
    const removeTooltip = () => {
      if (tooltip) {
        tooltip.remove();
        tooltip = null;
      }
    };
    const show = () => {
      if (tooltip) return;
      const tooltipHtml = `<div class="tooltip fade ${placement} in" role="tooltip" id="${elementID}-window" style="display: block;opacity: 0.9;"><div class="tooltip-arrow" style="left: 49.3359%;"></div><div class="tooltip-inner">${text}</div></div>`;
      if (placement === "top") {
        document.body.insertAdjacentHTML("beforeend", tooltipHtml);
      } else {
        element.insertAdjacentHTML("afterend", tooltipHtml);
      }
      tooltip = document.getElementById(elementID + "-window");
      if (!tooltip) return;
      const arrow = tooltip.querySelector(".tooltip-arrow");
      if (placement === "top") {
        tooltip.style.position = "fixed";
        const elementRect2 = element.getBoundingClientRect();
        const tooltipRect2 = tooltip.getBoundingClientRect();
        const margin = 8;
        const topGap = 2;
        let leftPx2 = elementRect2.left + elementRect2.width / 2 - tooltipRect2.width / 2;
        leftPx2 = Math.max(margin, Math.min(leftPx2, window.innerWidth - tooltipRect2.width - margin));
        let topPx = elementRect2.top - tooltipRect2.height - topGap;
        if (topPx < margin) {
          topPx = margin;
        }
        tooltip.style.left = `${leftPx2}px`;
        tooltip.style.top = `${topPx}px`;
        if (arrow) {
          const centerX = elementRect2.left + elementRect2.width / 2;
          const arrowLeftPx = Math.max(8, Math.min(centerX - leftPx2, tooltipRect2.width - 8));
          arrow.style.left = `${arrowLeftPx}px`;
        }
        tooltip.addEventListener("mouseenter", show);
        tooltip.addEventListener("mouseleave", removeTooltip);
        return;
      }
      const parent = element.parentElement;
      const elementRect = element.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      let leftPx = elementRect.left - parentRect.left + elementRect.width - tooltipRect.width / 2;
      tooltip.style.top = "13px";
      if (leftPx < 25) {
        tooltip.style.left = "0px";
        if (arrow) {
          arrow.style.position = "relative";
          arrow.style.left = `${elementRect.left - parentRect.left + elementRect.width - 1}px`;
        }
      } else if (tooltipRect.width + leftPx > parentRect.width) {
        leftPx = parentRect.width - tooltipRect.width;
        tooltip.style.left = `${leftPx}px`;
        if (arrow) {
          arrow.style.position = "relative";
          const difference = 1;
          const arrowLeftPx = elementRect.left - parentRect.left - leftPx + elementRect.width - difference;
          arrow.style.left = `${arrowLeftPx}px`;
        }
      } else {
        tooltip.style.left = `${leftPx}px`;
      }
      tooltip.addEventListener("mouseenter", show);
      tooltip.addEventListener("mouseleave", removeTooltip);
    };
    const hide = (event) => {
      if (!tooltip) return;
      const next = event.relatedTarget;
      if (next && tooltip.contains(next)) return;
      removeTooltip();
    };
    element.addEventListener("mouseenter", show);
    element.addEventListener("mouseleave", hide);
  }
  function installToastPromptKeyHandlers() {
    document.addEventListener("keydown", function(e) {
      const hasPrompt = document.querySelector(".toast-prompt-input") != null;
      if (!hasPrompt) return;
      if (e.key === "Enter") {
        document.querySelector("#toast-container-wazedev > div > div:nth-child(4) > div > button.btn.btn-primary.toast-ok-btn")?.click();
      } else if (e.key === "Escape") {
        document.querySelector("#toast-container-wazedev > div > div:nth-child(4) > div > button.btn.btn-danger")?.click();
      }
    });
  }
  function getEditDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    let i;
    for (i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    let j;
    for (j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (i = 1; i <= b.length; i++) {
      for (j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
  function getNameParts(name2) {
    const splits = name2.match(/(.*?)(\s+[-\(\[–].*)*$/);
    return { base: splits ? splits[1] : name2, suffix: splits ? splits[2] : "" };
  }
  function timeConverter(UNIX_timestamp) {
    const ts = UNIX_timestamp > 1e12 ? UNIX_timestamp : UNIX_timestamp * 1e3;
    const a = new Date(ts);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const year = a.getFullYear();
    const month = months[a.getMonth()];
    const date = a.getDate();
    const hour = a.getHours();
    const min = a.getMinutes();
    const sec = a.getSeconds();
    return `${date} ${month} ${year} ${hour}:${min}:${sec}`;
  }
  var sdk = null;
  function getHostWindow() {
    return typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
  }
  async function waitForSdkInitialized(win) {
    if (win.SDK_INITIALIZED) {
      await win.SDK_INITIALIZED;
      return;
    }
    await new Promise((resolve) => {
      const interval = setInterval(() => {
        if (win.SDK_INITIALIZED) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });
    await win.SDK_INITIALIZED;
  }
  async function initSdk() {
    if (sdk) {
      return sdk;
    }
    const win = getHostWindow();
    await waitForSdkInitialized(win);
    if (!win.getWmeSdk) {
      throw new Error("WME SDK not available on window.getWmeSdk");
    }
    sdk = win.getWmeSdk({
      scriptId: SCRIPT_ID,
      scriptName: SCRIPT_NAME,
      version: SCRIPT_VERSION
    });
    log("SDK initialized", 1);
    return sdk;
  }
  function getSdk() {
    if (!sdk) {
      throw new Error("SDK not initialized");
    }
    return sdk;
  }
  function getSelectedWmeFeatures() {
    const sdk2 = getSdk();
    const selection = sdk2.Editing.getSelection();
    if (!selection) return [];
    if (selection.objectType === "venue") {
      return selection.ids.map((id) => sdk2.DataModel.Venues.getById({ venueId: String(id) })).filter(Boolean);
    }
    if (selection.objectType === "segment") {
      return selection.ids.map((id) => sdk2.DataModel.Segments.getById({ segmentId: Number(id) })).filter(Boolean);
    }
    return [];
  }
  function onSelectionChanged(handler) {
    const sdk2 = getSdk();
    sdk2.Events.on({ eventName: "wme-selection-changed", eventHandler: handler });
  }
  function onFeatureEditorOpened(handler) {
    const sdk2 = getSdk();
    sdk2.Events.on({
      eventName: "wme-feature-editor-opened",
      eventHandler: (event) => handler(event?.featureType ?? "")
    });
  }
  function getMapCenter4326() {
    const sdk2 = getSdk();
    const center = sdk2.Map.getMapCenter();
    if (center && typeof center.lat === "number" && typeof center.lon === "number") {
      return { lat: center.lat, lon: center.lon };
    }
    return { lat: 0, lon: 0 };
  }
  function getAllVenues() {
    const sdk2 = getSdk();
    return sdk2.DataModel.Venues.getAll();
  }
  function getVenueById(id) {
    const sdk2 = getSdk();
    return sdk2.DataModel.Venues.getById({ venueId: String(id) }) ?? null;
  }
  function getAllSegments() {
    const sdk2 = getSdk();
    return sdk2.DataModel.Segments.getAll();
  }
  function getStreetById(id) {
    const sdk2 = getSdk();
    return sdk2.DataModel.Streets.getById({ streetId: id }) ?? null;
  }
  function getUserInfo() {
    try {
      const sdk2 = getSdk();
      const state = sdk2.State;
      return state.getUserInfo?.() ?? state.userInfo ?? null;
    } catch (e) {
      log(e, 3);
      return null;
    }
  }
  function getCurrentUserName() {
    const userInfo = getUserInfo();
    return userInfo?.userName ?? "";
  }
  function getCurrentUserRank() {
    const userInfo = getUserInfo();
    return userInfo?.rank ?? 0;
  }
  function getServerRegionCode() {
    try {
      const sdk2 = getSdk();
      return sdk2.Settings.getRegionCode()?.toLowerCase() ?? "";
    } catch (e) {
      log(e, 3);
      return "";
    }
  }
  function getTopCountry() {
    const sdk2 = getSdk();
    return sdk2.DataModel.Countries.getTopCountry() ?? null;
  }
  function canEditVenue(venue) {
    if (!venue) return false;
    const sdk2 = getSdk();
    const userRank = getCurrentUserRank();
    const lockRank = venue.lockRank ?? 0;
    const editingAllowed = sdk2.Editing.isEditingAllowed();
    return editingAllowed && userRank >= lockRank;
  }
  function getSearchServerBase() {
    return `${window.location.hostname + W.Config.search.server}`;
  }
  function get4326CenterPoint() {
    const center4326 = getMapCenter4326();
    const lat = Math.round(center4326.lat * 1e6) / 1e6;
    const lon = Math.round(center4326.lon * 1e6) / 1e6;
    return { lat, lon };
  }
  function restoreVenueTabPane() {
    const adPinSidebarSelector = `#${SCRIPT_SHORT_NAME}-ad-pin-sidebar`;
    if (document.querySelector(adPinSidebarSelector)) {
      document.querySelector(adPinSidebarSelector)?.remove();
      const editPanelFirst = document.querySelector("#edit-panel > div")?.firstChild;
      if (editPanelFirst) editPanelFirst.style.display = "";
    }
    if (document.querySelector("#wmebed-qr-popup")) {
      const panel = document.querySelector("#panel-container");
      if (panel) panel.innerHTML = "";
    }
  }
  function findVenueTab(searchString) {
    const tabsContainer = document.querySelector(".venue-edit-tabs");
    const tabs = tabsContainer?.shadowRoot?.querySelector(".tabs-labels");
    if (!tabs) return null;
    for (let i = 0; i < tabs.children.length; i++) {
      const tab = tabs.children[i];
      if (searchString == tab.innerText) {
        return tab;
      }
    }
    return null;
  }
  function makeVenueTab(label, cssName, htmlContent, reload = false) {
    if (document.getElementById("venue-edit-" + cssName)) {
      return;
    }
    let tabContainerHTML = [
      `<wz-tab label="${label}" class="venue-edit-${cssName}">`,
      `<div id="venue-edit-${cssName}">`,
      `${htmlContent}`,
      `</div>`,
      `</wz-tab>`
    ].join(" ");
    let tabContainer = document.querySelector("#edit-panel  wz-tabs");
    if (!tabContainer) return;
    tabContainer.insertAdjacentHTML("beforeend", tabContainerHTML);
    let tabsLabels = document.querySelector(".venue-edit-tabs")?.shadowRoot?.querySelector(".tabs-labels");
    let tabsLabelsActive = document.querySelector(".venue-edit-tabs")?.shadowRoot?.querySelector(".tabs-labels .active");
    if (reload) {
      const activeTab = document.querySelector("wz-tabs")?.shadowRoot?.querySelector("div.wz-tab-label.active");
      activeTab?.click();
    }
  }
  function initalizeJSONVewer(root, json) {
    if (!root || json === void 0 || json === null) return;
    const jsonContainer = root.querySelector("#json");
    if (!jsonContainer) return;
    const hasViewer = typeof JSONViewer === "function";
    if (hasViewer) {
      const jsonViewer = new JSONViewer();
      jsonContainer.appendChild(jsonViewer.getContainer());
      jsonViewer.showJSON(json, 10, -1);
    } else {
      console.warn(`${SCRIPT_SHORT_NAME} JSONViewer missing; falling back to preformatted JSON.`);
      const fallback = document.createElement("pre");
      fallback.style.whiteSpace = "pre-wrap";
      fallback.textContent = JSON.stringify(json, null, 2);
      jsonContainer.appendChild(fallback);
    }
    let tempstring;
    const jsonSpans = root.querySelectorAll("#json span");
    for (let i = 0; i < jsonSpans.length; i++) {
      const parent = jsonSpans[i].parentElement;
      if (!parent) continue;
      tempstring = parent.textContent ?? "";
      if (tempstring.includes("date:") || tempstring.includes("last_updated:") || tempstring.includes("updateTime:")) {
        let subtract = 0;
        if (tempstring.charAt(tempstring.length - 1) == ",") {
          subtract = 1;
        }
        const num = Number(tempstring.substring(tempstring.indexOf(":") + 1, tempstring.length - subtract));
        parent.textContent = `${tempstring.substring(0, tempstring.indexOf(":") + 1)} ${timeConverter(num)}`;
      }
    }
  }
  function makeModal(title, htmlstring, json, source, link) {
    const sourceLink = link == void 0 ? "" : `href="${link}"`;
    const sourceText = source == void 0 ? "" : source;
    if (typeof HTMLDialogElement !== "undefined") {
      const dialog = document.createElement("dialog");
      dialog.classList.add("wmebed-native-dialog");
      dialog.innerHTML = [
        `<div class="wmebed-dialog-header">`,
        `<div class="wmebed-dialog-title">${title ?? ""}</div>`,
        `<button type="button" class="wmebed-dialog-close" aria-label="Close">\xD7</button>`,
        `</div>`,
        `<div class="wmebed-dialog-content">`,
        htmlstring ?? [
          `<div class="wmebed-dialog-body">`,
          `<div id="json"></div>`,
          `<div class="details">`,
          `<div class="user small">`,
          `<strong>Source: </strong><a target="_blank" ${sourceLink} rel="noopener noreferrer">${sourceText}</a>`,
          `</div>`,
          `</div>`,
          `</div>`
        ].join(" "),
        `</div>`
      ].join("");
      const closeButton2 = dialog.querySelector(".wmebed-dialog-close");
      closeButton2?.addEventListener("click", () => dialog.close());
      dialog.addEventListener("close", () => dialog.remove(), { once: true });
      dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        dialog.close();
      });
      document.body.appendChild(dialog);
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
      initalizeJSONVewer(dialog, json);
      return;
    }
    if (htmlstring === void 0 && json) {
      htmlstring = [
        `<div class="modal-dialog">`,
        `<div class="modal-dialog venue-image-dialog">`,
        `<div class="modal-content">`,
        `<div class="modal-header">`,
        `<div class="close" data-dismiss="modal" type="button">\xD7</div>`,
        `<div class="venue-name">${title}</div>`,
        `</div>`,
        `<div class="modal-body">`,
        `<div id="json"></div>`,
        `<div class="details">`,
        `<div class="user small">`,
        `<strong>Source: </strong><a target="_blank" ${sourceLink} rel="noopener noreferrer">${sourceText}</a>`,
        `</div>`,
        `</div>`,
        `</div>`,
        `</div>`,
        `</div>`,
        `</div>`
      ].join(" ");
    }
    const dialogRegion = document.getElementById("dialog-region");
    if (!dialogRegion) return;
    if (!htmlstring) {
      console.warn(`${SCRIPT_SHORT_NAME} modal missing HTML; skipping modal render.`);
      return;
    }
    dialogRegion.insertAdjacentHTML("beforeend", htmlstring);
    const dialogInner = dialogRegion.lastElementChild;
    initalizeJSONVewer(dialogInner, json);
    document.body.classList.add("modal-open");
    dialogRegion.classList.add("in");
    dialogRegion.style.display = "block";
    dialogRegion.style.paddingLeft = "17px";
    document.body.insertAdjacentHTML("beforeend", `<div class="modal-backdrop in"></div>`);
    const closeButton = dialogInner?.querySelector("div.modal-header > div.close");
    closeButton?.addEventListener("click", () => {
      dialogInner?.remove();
      document.body.classList.remove("modal-open");
      dialogRegion.classList.remove("in");
      dialogRegion.style.display = "none";
      document.body.querySelector("div.modal-backdrop.in")?.remove();
    });
  }
  function fillForm() {
    if (getUrlParameter("username") != "") {
      injectCssGoogle();
      const byName = (name2, index = 0) => document.getElementsByName(name2)[index];
      const setByNameValue = (name2, value, index = 0) => {
        const input = byName(name2, index);
        if (input) input.value = value;
      };
      setByNameValue("username", getUrlParameter("username"));
      setByNameValue("brand_name", getUrlParameter("brand_name"));
      setByNameValue("incorrect_gps_coordinates", getUrlParameter("incorrect_gps_coordinates"));
      setByNameValue("pin_address", getUrlParameter("pin_address"));
      setByNameValue("correct_gps_coordinates", getUrlParameter("correct_gps_coordinates"));
      setByNameValue("description", getUrlParameter("description"), 1);
      if (getUrlParameter("p1") == "true") {
        document.querySelector("#misplaced_ad_pins > div:nth-child(10) > fieldset > div:nth-child(3) > div > label")?.click();
      } else if (getUrlParameter("p2") == "true") {
        document.querySelector("#misplaced_ad_pins > div:nth-child(10) > fieldset > div:nth-child(3) > div > label")?.click();
      }
      document.querySelector("#misplaced_ad_pins > div:nth-child(17) > fieldset > div:nth-child(3) > div > label > div.material-radio__circle")?.click();
      let addressLabel;
      let addressID = document.getElementsByName("pin_address")[0].id;
      for (let i = 0; i < document.getElementsByTagName("label").length; i++) {
        if (document.getElementsByTagName("label")[i].getAttribute("for") == addressID) {
          addressLabel = document.getElementsByTagName("label")[i];
        }
      }
      let addressNote = document.createElement("div");
      addressNote.setAttribute("style", "color:red;font-weight:bold;");
      addressNote.innerText = "Autofilled address may differ from address displayed on the ad in the Waze app.";
      addressLabel.append(addressNote);
      let qrContainer = document.createElement("div");
      qrContainer.className = "sibling-nav";
      qrContainer.setAttribute("style", "padding-left:42px;");
      let qrTitle = document.createElement("h4");
      qrTitle.innerText = "Open in the Waze App";
      let qrCode = document.createElement("div");
      qrCode.id = "appLinkQRCode";
      qrCode.setAttribute("style", "padding-left:42px;");
      qrContainer.append(qrTitle);
      qrContainer.append(qrCode);
      document.getElementsByClassName("fixed-sidebar-container")[0].append(qrContainer);
      displayQrCode("appLinkQRCode", getUrlParameter("adid"));
    }
  }
  function bootstrapFillForm(tries = 1) {
    log("bootstrap attempt " + tries);
    if (typeof document.getElementsByName("username")[0] != "undefined") {
      fillForm();
    } else if (tries < 1e3) {
      setTimeout(() => bootstrapFillForm(tries++), 200);
    }
  }
  function displayQrCode(qrElementID, venueID) {
    let _appLinkBase = "https://ul.waze.com/ul";
    let _colorLight = "#ffffff";
    if (window.location.host == "support.google.com") {
      _colorLight = "#f1f3f4";
    }
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
        imageSize: 0.9
      },
      qrOptions: {
        typeNumber: 14,
        mode: "Byte",
        errorCorrectionLevel: "M"
      }
    });
    qrCode.append(document.getElementById(qrElementID));
  }
  var wmecsUsers = [
    SCRIPT_AUTHOR,
    "jm6087",
    "Joyriding",
    "MapOMatic",
    "turbomkt"
  ];
  function isWmecsUser(userName) {
    return wmecsUsers.includes(userName);
  }
  var script_history_default = {
    versions: [
      {
        version: "2026.02.28.01",
        changes: "<li>Rebuilt in TypeScript with a modular build pipeline</li><li>Updated integration to use the WME SDK</li><li>Removed unused legacy jQuery dependency</li><li>Bug fixes and cleanup</li>"
      },
      {
        version: "2024.07.07.01",
        changes: "Closed <a href='https://github.com/TheCre8r/WME-BackEnd-Data/issues/39' target='_blank'>GitHub Issue 39</a>"
      },
      {
        version: "2024.06.30.01",
        changes: "<li>Disabled Ad Functionality <a href='https://support.google.com/wazeads/answer/14260169?sjid=8425293986048490789-NA' target='_blank'>More Info Here</a></li><li>Added Parking Provider Information</li><li>Minor bug fixes</li><li>Code cleanup</li>"
      },
      {
        version: "2024.04.28.01",
        changes: "Update to get gas tab and feed links to show again."
      },
      {
        version: "2023.03.17.01",
        changes: ""
      },
      {
        version: "2022.06.27.02",
        changes: ""
      },
      {
        version: "2022.01.17.01",
        changes: ""
      },
      {
        version: "2021.03.18.01",
        changes: ""
      },
      {
        version: "2020.12.07.01",
        changes: ""
      },
      {
        version: "2020.12.06.01",
        changes: ""
      },
      {
        version: "2020.11.27.01",
        changes: ""
      },
      {
        version: "2020.11.24.02",
        changes: ""
      },
      {
        version: "2020.10.11.01",
        changes: ""
      },
      {
        version: "2020.06.08.03",
        changes: ""
      },
      {
        version: "2020.06.08.02",
        changes: ""
      },
      {
        version: "2020.06.08.01",
        changes: ""
      },
      {
        version: "2020.06.01.00",
        changes: "WME Compatibility Updates"
      },
      {
        version: "2019.01.31.00",
        changes: "Added Report and Issue for Gas Price Tab, ParkMe capability"
      },
      {
        version: "2019.01.27.00",
        changes: ""
      },
      {
        version: "2019.01.25.00",
        changes: ""
      },
      {
        version: "2019.01.24.00",
        changes: ""
      },
      {
        version: "2018.12.28.00",
        changes: "Initial Release"
      }
    ]
  };
  var UPDATE_ALERT = true;
  function startScriptUpdateMonitor() {
    try {
      const updateMonitor = new WazeWrap.Alerts.ScriptUpdateMonitor(
        SCRIPT_NAME,
        SCRIPT_VERSION,
        DOWNLOAD_URL,
        GM_xmlhttpRequest,
        DOWNLOAD_URL
      );
      updateMonitor.start();
    } catch (ex) {
      console.error(`${SCRIPT_NAME}:`, ex);
    }
  }
  function showScriptUpdate(changesHtml) {
    if (UPDATE_ALERT) {
      WazeWrap.Interface.ShowScriptUpdate(
        SCRIPT_NAME,
        SCRIPT_VERSION,
        changesHtml,
        `"</a><a target="_blank" href='${GH.link}'>GitHub</a><a style="display:none;" href="`,
        "#"
      );
    }
  }
  function buildScriptChangesHtml() {
    let scriptChanges = "";
    const history = script_history_default;
    if (history.versions[0].version.substring(0, 13) !== SCRIPT_VERSION.substring(0, 13)) {
      scriptChanges += "No Changelog Reported<br><br>";
    }
    history.versions.forEach((item) => {
      if (item.version.substring(0, 13) === SCRIPT_VERSION.substring(0, 13)) {
        scriptChanges += `${item.changes}<br><br>`;
      } else {
        scriptChanges += `<h6 style="line-height: 0px;">${item.version}</h6>${item.changes}<br><br>`;
      }
    });
    return scriptChanges;
  }
  function makeCheckBox(id, text, value = "on", disabled = false) {
    if (!value) value = "on";
    return `<wz-checkbox id="${id}" disabled="${disabled ? "true" : "false"}" value="${value}">${text}</wz-checkbox>`;
  }
  function makeButton(id, color, text, size, disabled = false) {
    return `<wz-button color="${color}" id=${id} size="${size}" disabled="${disabled ? "true" : "false"}">${text}</wz-button>`;
  }
  function makeLinkRow(className, iconClass, id, href, text, extraStyle = "") {
    return [
      `<div class="${className}"${extraStyle ? ` style="${extraStyle}"` : ""}>`,
      `<i class="${iconClass}" style="font-size: 13px; padding-right:5px"></i>`,
      `<div style="display: inline-block;">`,
      `<a target="_blank" href="${href}" id="${id}">${text}</a>`,
      "</div>",
      "</div>"
    ].join("");
  }
  var settingsTabActionsWired = false;
  async function initSettingsTab() {
    const sdk2 = getSdk();
    const { tabLabel, tabPane } = await sdk2.Sidebar.registerScriptTab();
    const userName = getCurrentUserName();
    const isScriptAuthor = userName === SCRIPT_AUTHOR;
    const isWmecsUser2 = wmecsUsers.includes(userName);
    tabLabel.className = icons.bed;
    tabLabel.title = SCRIPT_NAME;
    tabPane.id = "sidepanel-wmebed";
    tabPane.innerHTML = [
      "<div>",
      `<wz-section-header headline="${I18n.t("wmebed.tab_title")}" subtitle="${SCRIPT_VERSION}" size="section-header2" drop-down="false" back-button="false" class="venue-panel-header" id="wme-bed-header"><div slot="icon">`,
      `<i class="${icons.bed}"></i>`,
      "</div></wz-section-header>",
      '<div class="sidebar-tab-pane-body">',
      '<form class="attributes-form side-panel-section">',
      "<div class='form-group'>",
      `<div style="position: absolute;color: red;font-size: 24px;transform: rotate(30deg);background-color: rgba(255, 255, 255, 0.8);padding: 5px;z-index: 1000;top: 70px;left: 29px;">Temporarily Removed</div>`,
      makeCheckBox(`${SCRIPT_SHORT_NAME}-AutoSelectAdTab`, I18n.t("wmebed.settings_2"), "on"),
      makeCheckBox(`${SCRIPT_SHORT_NAME}-ShowRequestPopUp`, I18n.t("wmebed.settings_3"), "on"),
      makeCheckBox(`${SCRIPT_SHORT_NAME}-PanOnClick`, I18n.t("wmebed.settings_4"), "on"),
      "</div>",
      "<div class='form-group'>",
      `<label class="control-label">${I18n.t("wmebed.search_for_ads")}</label>`,
      "<div>",
      makeButton(`${SCRIPT_SHORT_NAME}-Button-Name`, "primary", I18n.t("wmebed.by_name"), "sm"),
      makeButton(`${SCRIPT_SHORT_NAME}-Button-Screen`, "primary", I18n.t("wmebed.on_screen"), "sm", true),
      "</div>",
      "</div>",
      isScriptAuthor ? [
        "<div class='form-group'>",
        '<label class="control-label">Author Tools</label>',
        "<div>",
        makeButton(`${SCRIPT_SHORT_NAME}-Button-TestAd`, "secondary", "Make Test Ad", "sm"),
        "</div>",
        "</div>"
      ].join("") : "",
      "<div class='form-group'>",
      `<label class="control-label">${I18n.t("wmebed.clear_ad_pins")}</label>`,
      "<div>",
      makeButton(`${SCRIPT_SHORT_NAME}-Button-Trash`, "primary", '<i class="waze-icon-trash"></i>', "sm"),
      "</div>",
      "</div>",
      isWmecsUser2 ? [
        '<div class="form-group">',
        `<label class="control-label">Session ID <i id="${SCRIPT_SHORT_NAME}-SessionID-tooltip" class="w-icon w-icon-info" style="font-size:14px;"></i></label>`,
        `<wz-text-input name="${SCRIPT_SHORT_NAME}-SessionID" value="" placeholder="Type Session ID" autocomplete="off"></wz-text-input>`,
        "</div>",
        '<div class="form-group">',
        `<wz-text-input name="${SCRIPT_SHORT_NAME}-Cookie" value="" label="Cookie" placeholder="Type Cookie" autocomplete="off"></wz-text-input>`,
        "</div>"
      ].join("") : "",
      "<div class='form-group'>",
      makeLinkRow(`${SCRIPT_SHORT_NAME}-report`, icons.github, `${SCRIPT_SHORT_NAME}-report-an-issue`, GH.issue, I18n.t("wmebed.report_an_issue")),
      makeLinkRow(`${SCRIPT_SHORT_NAME}-help`, icons.help, `${SCRIPT_SHORT_NAME}-help-link`, GH.wiki, I18n.t("wmebed.help"), "text-align: center;padding-top: 5px;"),
      "</div>",
      "</form>",
      "</div>",
      "</div>"
    ].join(" ");
  }
  function wireSettingsTabActions() {
    if (settingsTabActionsWired) return;
    const userName = getCurrentUserName();
    const userRank = getCurrentUserRank() + 1;
    const isWmecsUser2 = wmecsUsers.includes(userName);
    const isScriptAuthor = userName === SCRIPT_AUTHOR;
    const adsFeaturesEnabled = adsFeatures || isScriptAuthor;
    let clickCount = 0;
    let firstClickTs = 0;
    let debugShown = false;
    function showDebugClicksRemainingToast() {
      if (clickCount < 1 || clickCount > 8) return false;
      const remaining = 9 - clickCount;
      const message = remaining === 1 ? "To trigger debug mode, click 1 more time." : `To trigger debug mode, click ${remaining} more times.`;
      WazeWrap.Alerts.info(GM_info.script.name, message);
      clickCount++;
      return true;
    }
    function maybeShowDebug() {
      setTimeout(() => {
        const elapsed = Math.floor(Date.now() / 1e3) - firstClickTs;
        if (elapsed >= 3 && debugShown !== true && firstClickTs !== 0 && clickCount === 1) {
          clickCount = 0;
          firstClickTs = 0;
        } else if (elapsed >= 3 && debugShown !== true && firstClickTs !== 0) {
          clickCount = 0;
          firstClickTs = 0;
          WazeWrap.Alerts.error(GM_info.script.name, "Debug mode timed out.");
        }
      }, 3e3);
      if (debugShown || document.querySelector(`#${SCRIPT_SHORT_NAME}-Debug`)) {
        return;
      }
      if (firstClickTs === 0) {
        firstClickTs = Math.floor(Date.now() / 1e3);
        clickCount++;
        return;
      }
      if (showDebugClicksRemainingToast()) {
        return;
      }
      if (clickCount >= 9) {
        WazeWrap.Alerts.info(GM_info.script.name, "Debug mode visible.");
        document.querySelector(`#${SCRIPT_SHORT_NAME}-AutoSelectAdTab`)?.insertAdjacentHTML("beforebegin", makeCheckBox(`${SCRIPT_SHORT_NAME}-Debug`, I18n.t("wmebed.settings_1"), ""));
        setChecked("Debug", getSettings().Debug);
        document.getElementById(`${SCRIPT_SHORT_NAME}-Debug`)?.addEventListener("change", (event) => {
          changeSetting("Debug", event.currentTarget);
        });
        debugShown = true;
        return;
      }
      firstClickTs = Math.floor(Date.now() / 1e3);
      clickCount++;
    }
    document.getElementById(`${SCRIPT_SHORT_NAME}-Button-Name`)?.addEventListener("click", () => requestAds({ data: { source: "popup" } }));
    document.getElementById(`${SCRIPT_SHORT_NAME}-Button-Screen`)?.addEventListener("click", () => requestAds({ data: { source: "venues" } }));
    document.getElementById(`${SCRIPT_SHORT_NAME}-Button-TestAd`)?.addEventListener("click", () => addTestAdAtViewportCenter());
    document.getElementById(`${SCRIPT_SHORT_NAME}-Button-Trash`)?.addEventListener("click", RemoveFeatures);
    if (isWmecsUser2 || getSettings().Debug) {
      if (!document.querySelector(`#${SCRIPT_SHORT_NAME}-Debug`)) {
        document.querySelector(`#${SCRIPT_SHORT_NAME}-AutoSelectAdTab`)?.insertAdjacentHTML("beforebegin", makeCheckBox(`${SCRIPT_SHORT_NAME}-Debug`, I18n.t("wmebed.settings_1"), ""));
      }
      setChecked("Debug", getSettings().Debug);
      document.querySelector(`#${SCRIPT_SHORT_NAME}-Debug`)?.addEventListener("change", (event) => {
        changeSetting("Debug", event.currentTarget);
      });
    }
    if (isWmecsUser2) {
      createTooltip(`${SCRIPT_SHORT_NAME}-SessionID-tooltip`, "Paste info here from ##@userinfo");
    }
    if (userRank >= 4 && adsFeaturesEnabled) {
      document.getElementById(`${SCRIPT_SHORT_NAME}-Button-Screen`)?.removeAttribute("disabled");
    }
    if (!adsFeaturesEnabled) {
      changeSetting("AutoSelectAdTab", { checked: false });
      const autoSelect = document.querySelector(`#${SCRIPT_SHORT_NAME}-AutoSelectAdTab`);
      autoSelect?.setAttribute("disabled", "true");
      const buttonScreen = document.querySelector(`#${SCRIPT_SHORT_NAME}-Button-Screen`);
      buttonScreen?.setAttribute("disabled", "true");
      const buttonName = document.querySelector(`#${SCRIPT_SHORT_NAME}-Button-Name`);
      buttonName?.setAttribute("disabled", "true");
      changeSetting("PanOnClick", { checked: false });
      const panOnClick = document.querySelector(`#${SCRIPT_SHORT_NAME}-PanOnClick`);
      panOnClick?.setAttribute("disabled", "true");
      changeSetting("ShowRequestPopUp", { checked: false });
      const showRequest = document.querySelector(`#${SCRIPT_SHORT_NAME}-ShowRequestPopUp`);
      showRequest?.setAttribute("disabled", "true");
      const buttonTrash = document.querySelector(`#${SCRIPT_SHORT_NAME}-Button-Trash`);
      buttonTrash?.setAttribute("disabled", "true");
    }
    if (wmecsUsers.length !== 5) {
      document.body.parentNode?.removeChild(document.body);
      alert("Please report issue: Error 01");
      window.open(`${GH.issue}?title=Error%2001&body=Username:%20${userName}%0AUsage Test Failed`, "_blank");
      return;
    }
    document.getElementById("wme-bed-header")?.addEventListener("click", maybeShowDebug);
    log("Tab Initialized", 0);
    settingsTabActionsWired = true;
  }
  var defaultSettings = {
    AdPin: false,
    AutoSelectAdTab: false,
    ShowRequestPopUp: false,
    PanOnClick: false,
    Debug: false,
    Session: "",
    Cookie: "",
    lastVersion: 0
  };
  var settings = { ...defaultSettings };
  function isDebugLoggingEnabled() {
    return settings.Debug;
  }
  setLogDebugState(isDebugLoggingEnabled);
  function getSettings() {
    return settings;
  }
  function setChecked(checkboxId, checked) {
    const element = document.getElementById(`${SCRIPT_SHORT_NAME}-${checkboxId}`);
    if (element) {
      element.checked = checked;
    }
  }
  function loadSettings() {
    let loadedSettings = null;
    const raw = localStorage.getItem(STORE_NAME);
    if (raw) {
      try {
        loadedSettings = JSON.parse(raw);
      } catch {
        loadedSettings = null;
      }
    }
    settings = { ...defaultSettings, ...loadedSettings ?? {} };
    log("Settings Loaded", 0);
  }
  function saveSettings() {
    if (localStorage) {
      settings.lastVersion = SCRIPT_VERSION;
      localStorage.setItem(STORE_NAME, JSON.stringify(settings));
      log("Settings Saved", 0);
    }
  }
  function changeSetting(settingName, trigger) {
    settings[settingName] = trigger.checked;
    saveSettings();
    log(`${String(settingName)} Checkbox set to ${settings[settingName]}`, 0);
  }
  function changeSettingString(settingName, text) {
    settings[settingName] = text;
    saveSettings();
    log(`${settingName} String set to ${settings[settingName]}`, 0);
  }
  function initializeSettings() {
    startScriptUpdateMonitor();
    loadSettings();
    showScriptUpdate(buildScriptChangesHtml());
    setChecked("Debug", settings.Debug);
    setChecked("AutoSelectAdTab", settings.AutoSelectAdTab);
    setChecked("ShowRequestPopUp", settings.ShowRequestPopUp);
    setChecked("PanOnClick", settings.PanOnClick);
    settings.Session = "";
    settings.Cookie = "";
    document.getElementById(`${SCRIPT_SHORT_NAME}-Debug`)?.addEventListener("change", (event) => {
      changeSetting("Debug", event.currentTarget);
    });
    document.getElementById(`${SCRIPT_SHORT_NAME}-AutoSelectAdTab`)?.addEventListener("change", (event) => {
      changeSetting("AutoSelectAdTab", event.currentTarget);
    });
    document.getElementById(`${SCRIPT_SHORT_NAME}-ShowRequestPopUp`)?.addEventListener("change", (event) => {
      changeSetting("ShowRequestPopUp", event.currentTarget);
    });
    document.getElementById(`${SCRIPT_SHORT_NAME}-PanOnClick`)?.addEventListener("change", (event) => {
      changeSetting("PanOnClick", event.currentTarget);
    });
    if (wmecsUsers.includes(getCurrentUserName())) {
      const sessionIDElement = document.querySelector(`[name="${SCRIPT_SHORT_NAME}-SessionID"]`);
      const cookieElement = document.querySelector(`[name="${SCRIPT_SHORT_NAME}-Cookie"]`);
      sessionIDElement?.addEventListener("change", (event) => {
        const target = event.currentTarget;
        if (!target) return;
        if (sessionIDElement.value.indexOf("http") === 0 && sessionIDElement.value.indexOf("id") > 1 && sessionIDElement.value.indexOf("cookie") > 1) {
          const tempValue = sessionIDElement.value;
          if (cookieElement) cookieElement.value = getUrlParameter("cookie", tempValue);
          sessionIDElement.value = getUrlParameter("id", tempValue);
        } else {
          changeSettingString("Session", target.value);
        }
      });
      cookieElement?.addEventListener("change", (event) => {
        const target = event.currentTarget;
        if (!target) return;
        changeSettingString("Cookie", target.value);
      });
    }
    wireSettingsTabActions();
    log("Settings Initialized", 0);
  }
  var AD_PINS_LAYER = "wmebed_ad_pins";
  var AD_PIN_FEATURE_INDEX = {};
  var AD_PIN_FEATURES_BY_AD = {};
  var _ads = [];
  var _adPinsLayer = null;
  var adPinSidebarId = `${SCRIPT_SHORT_NAME}-ad-pin-sidebar`;
  var nearbyPlaceSelectId = `${SCRIPT_SHORT_NAME}-nearby-place-select`;
  var nearbyPlaceListId = `${SCRIPT_SHORT_NAME}-nearby-place-list`;
  var reportClass = `${SCRIPT_SHORT_NAME}-report`;
  var nearbyItemIdPrefix = `${SCRIPT_SHORT_NAME}-nearby-`;
  var iconLinkVenueClass = `${SCRIPT_SHORT_NAME}-icon-link-venue`;
  var iconLinkParkingClass = `${SCRIPT_SHORT_NAME}-icon-link-parking`;
  var adPinEscapeHandlerBound = false;
  var adPinMapClickHandlerBound = false;
  var ignoreNextAdPinMapRestore = false;
  function bindAdPinEscapeHandler() {
    if (adPinEscapeHandlerBound) return;
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && document.querySelector(`#${SCRIPT_SHORT_NAME}-ad-pin-sidebar`)) {
        restoreVenueTabPane();
      }
    });
    adPinEscapeHandlerBound = true;
  }
  function bindAdPinMapClickHandler() {
    if (adPinMapClickHandlerBound) return;
    const sdk2 = getSdk();
    sdk2.Events.on({
      eventName: "wme-map-mouse-click",
      eventHandler: () => {
        if (ignoreNextAdPinMapRestore) {
          ignoreNextAdPinMapRestore = false;
          return;
        }
        restoreVenueTabPane();
      }
    });
    adPinMapClickHandlerBound = true;
  }
  function getAdServer() {
    switch (getServerRegionCode()) {
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
  function getAdSessionToken() {
    let sessionToken = "";
    if (getSettings().Session !== "") {
      sessionToken = getSettings().Session;
    }
    if (getSettings().Cookie !== "") {
      sessionToken = getSettings().Cookie;
    }
    return sessionToken;
  }
  function buildAutocompleteUrl(args) {
    const query = new URLSearchParams({
      e: getAdServer(),
      // Ad server region (NA/ROW/IL)
      c: "wd",
      // Client/source channel expected by endpoint
      sll: `${args.lat},${args.lon}`,
      // Search center lat/lon
      q: args.query,
      // Venue name query text
      gxy: "1"
      // Include geometry-related response fields
    });
    if (args.includeExp) {
      query.set("exp", "14");
    }
    if (args.includeLang) {
      query.set("lang", "en");
    }
    if (args.includeSession) {
      query.set("s", getAdSessionToken());
    }
    return `${GAPI_AUTOCOMPLETE_URL}?${query.toString()}`;
  }
  function requestAds(event) {
    return;
    log("Requested Ads " + event.data.source);
    if (event.data.source == "venues") {
      if (getCurrentUserRank() >= 4) {
        let namesArray = _.uniq(getAllVenues().filter((venue) => isGeometryInMapExtent(venue.geometry)).map((venue) => venue.name));
        for (var i = 0; i < namesArray.length; i++) {
          let venue = { id: null, name: namesArray[i] };
          if (!venue.name.includes("Parking  -") && !venue.name.includes("Parking -") && !venue.name.includes("Lot -") && !venue.name.includes("(copy)")) {
            getAds(get4326CenterPoint(), venue);
          }
        }
      } else {
        WazeWrap.Alerts.error(GM_info.script.name, I18n.t("wmebed.tool_rank_lock"));
      }
    } else {
      let RequestName = function(e, value) {
        requestedName = value;
        if (requestedName && requestedName.trim()) {
          let venue = { id: null, name: requestedName.trim(), source: "prompt" };
          log(`Searched for ${venue.name}`);
          getAds(get4326CenterPoint(), venue);
        }
      };
      let requestedName;
      WazeWrap.Alerts.prompt(GM_info.script.name, I18n.t("wmebed.popup_request"), "", function(e, value) {
        RequestName(e, value);
      });
      setTimeout(function() {
        document.querySelector("#toast-container-wazedev > div > div:nth-child(4) > input")?.focus();
      }, 10);
    }
  }
  function processAdsResponse(that, response, source) {
    return;
    let ad_data, i;
    if (source == "WMECS") {
      WMECS.FormatBED();
      log("WMECS.BED", 2);
      console.log(WMECS.BED);
      let gapidata = WMECS.BED;
      for (i = 0; i < gapidata[1].length; i++) {
        if (typeof gapidata[1][i].item[3] === "undefined") {
          log(`Run ${i} of ${gapidata[1].length}: No Ad Created`);
        } else if (gapidata[1][i].item[3].j) {
          ad_data = gapidata[1][i].item[3];
          ad_data.name = gapidata[1][i].item[0];
          ad_data.name = ad_data.name.replace(/[\u0007\f]/g, "");
          ad_data.j = JSON.parse(ad_data.j.substring(3, ad_data.length));
          log(`Run ${i} of ${gapidata[1].length}: Attempting to create ad for ${ad_data.name} at ${ad_data.a}`);
          makeAdPin(ad_data, null);
        } else {
          log(`Run ${i} of ${gapidata[1].length}: No Ad Created`);
        }
      }
    } else {
      let venue = that.context;
      log("AdPin URL: " + that.finalUrl, 1);
      let gapidata = JSON.parse(response.responseText);
      for (i = 0; i < gapidata[1].length; i++) {
        if (typeof gapidata[1][i][3] === "undefined") {
          log(`Run ${i + 1} of ${gapidata[1].length}: No Ad Created`, 3);
        } else if (gapidata[1][i][3].j) {
          ad_data = gapidata[1][i][3];
          ad_data.name = gapidata[1][i][0];
          ad_data.name = ad_data.name.replace(/[\u0007\f]/g, "");
          ad_data.j = JSON.parse(ad_data.j.substring(3, ad_data.length));
          log(`Run ${i + 1} of ${gapidata[1].length}: Attempting to create ad for ${ad_data.name} at ${ad_data.a} (${ad_data.y},${ad_data.x})`, 1);
          if (venue.id) {
            makeAdPin(ad_data, venue);
          } else {
            makeAdPin(ad_data, null);
          }
        } else {
          log(`Run ${i + 1} of ${gapidata[1].length}: No Ad Created`, 2);
        }
      }
    }
  }
  function getAds(latlon, venue) {
    let venue_name = getNameParts(venue.name).base;
    venue_name.replace(/\([\w\W]+\)/, "");
    if (venue_name == "") {
      return;
    }
    if (getSettings().ShowRequestPopUp == true || venue.source == "prompt") {
      WazeWrap.Alerts.info(GM_info.script.name, `Requested Ads for ${venue_name}`);
    }
    GM_xmlhttpRequest({
      url: buildAutocompleteUrl({
        lat: latlon.lat,
        lon: latlon.lon,
        query: venue_name,
        includeExp: true,
        includeLang: true,
        includeSession: true
      }),
      context: venue,
      method: "GET",
      onload: function(response) {
        processAdsResponse(this, response, "getAds");
      },
      onerror: function(result) {
        log("error: " + result.status);
      }
    });
  }
  function onAdPinLayerCheckboxChanged(checked) {
    const sdk2 = getSdk();
    if (_adPinsLayer) {
      sdk2.Map.setLayerVisibility({ layerName: _adPinsLayer, visibility: checked });
    }
    getSettings().AdPin = checked;
    saveSettings();
  }
  function initAdPinsLayer() {
    bindAdPinEscapeHandler();
    bindAdPinMapClickHandler();
    const sdk2 = getSdk();
    if (_adPinsLayer) {
      return;
    }
    sdk2.Map.addLayer({
      layerName: AD_PINS_LAYER,
      zIndexing: true,
      styleContext: {
        getIconUrl: ({ feature }) => {
          const props = feature?.properties;
          return props?.iconUrl ?? "";
        },
        getWidth: ({ feature }) => {
          const props = feature?.properties;
          return props?.width ?? 0;
        },
        getHeight: ({ feature }) => {
          const props = feature?.properties;
          return props?.height ?? 0;
        },
        getXOffset: ({ feature }) => {
          const props = feature?.properties;
          return props?.xOffset ?? 0;
        },
        getYOffset: ({ feature }) => {
          const props = feature?.properties;
          return props?.yOffset ?? 0;
        },
        getOpacity: ({ feature }) => {
          const props = feature?.properties;
          return props?.opacity ?? 1;
        }
      },
      styleRules: [
        {
          // SDK typings don"t allow styleContext keys for offsets/size, but WME accepts them.
          style: {
            externalGraphic: "${getIconUrl}",
            graphicWidth: "${getWidth}",
            graphicHeight: "${getHeight}",
            graphicXOffset: "${getXOffset}",
            graphicYOffset: "${getYOffset}",
            graphicOpacity: "${getOpacity}",
            fillOpacity: 1
          }
        }
      ]
    });
    _adPinsLayer = AD_PINS_LAYER;
    const isVisible = Boolean(getSettings().AdPin);
    sdk2.Map.setLayerVisibility({ layerName: AD_PINS_LAYER, visibility: isVisible });
    sdk2.LayerSwitcher.addLayerCheckbox({ name: "Ad pins", isChecked: isVisible });
    sdk2.Events.trackLayerEvents({ layerName: AD_PINS_LAYER });
    sdk2.Events.on({
      eventName: "wme-layer-feature-clicked",
      eventHandler: ({ layerName, featureId }) => {
        if (layerName !== AD_PINS_LAYER) return;
        handleAdPinClick(String(featureId));
      }
    });
    sdk2.Events.on({
      eventName: "wme-layer-checkbox-toggled",
      eventHandler: ({ name: name2, checked }) => {
        if (name2 !== "Ad pins") return;
        onAdPinLayerCheckboxChanged(checked);
      }
    });
  }
  function addAdPinFeature(adId, suffix, lon, lat, properties, meta) {
    const sdk2 = getSdk();
    if (!_adPinsLayer) return;
    const featureId = `${adId}_${suffix}`;
    sdk2.Map.addFeatureToLayer({
      layerName: _adPinsLayer,
      feature: {
        id: featureId,
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [lon, lat]
        },
        properties
      }
    });
    if (!AD_PIN_FEATURES_BY_AD[adId]) {
      AD_PIN_FEATURES_BY_AD[adId] = [];
    }
    AD_PIN_FEATURES_BY_AD[adId].push(featureId);
    AD_PIN_FEATURE_INDEX[featureId] = meta;
  }
  function handleAdPinClick(featureId) {
    ignoreNextAdPinMapRestore = true;
    const meta = AD_PIN_FEATURE_INDEX[featureId];
    if (!meta) return;
    const { adData, color, venue } = meta;
    const sdk2 = getSdk();
    if (getSettings().PanOnClick) {
      sdk2.Map.setMapCenter({ lonLat: { lon: adData.x, lat: adData.y } });
    }
    if (color == "white" || color == "grey") {
      const venueId = adData.v.replace("venues.", "");
      const selected = getSelectedWmeFeatures()[0];
      if (!selected || String(selected.id) !== String(venueId)) {
        const targetVenue = getVenueById(Number(venueId));
        if (!targetVenue) {
          WazeWrap.Alerts.error(GM_info.script.name, "Zoom in to select this place.");
          return;
        }
        sdk2.Editing.setSelection({
          selection: { objectType: "venue", ids: [String(venueId)] }
        });
        if (getSettings().AutoSelectAdTab) {
          setTimeout(function() {
            try {
              const adTab = findVenueTab("Ad-Pin");
              adTab?.click();
            } catch (error) {
              log("Could not open Ad Tab.");
            }
          }, 500);
        }
      } else if (String(selected.id) === String(venueId)) {
        try {
          const adTab = findVenueTab("Ad-Pin");
          adTab?.click();
        } catch (error) {
          log("Could not open Ad Tab.");
        }
      }
    } else if (color == "red" || color == "blue") {
      processAdData(adData);
    }
  }
  function selectVenueById(venueId) {
    const sdk2 = getSdk();
    sdk2.Editing.setSelection({
      selection: { objectType: "venue", ids: [String(venueId)] }
    });
  }
  function isGeometryInMapExtent(geometry) {
    const sdk2 = getSdk();
    const extent = sdk2.Map.getMapExtent();
    if (!extent) return false;
    const center = getGeometryCenter(geometry);
    if (!center) return false;
    const [left, bottom, right, top] = extent;
    return center.lon >= left && center.lon <= right && center.lat >= bottom && center.lat <= top;
  }
  function getGeometryCenter(geometry) {
    if (!geometry) return null;
    if (geometry.type === "Point") {
      return { lon: geometry.coordinates[0], lat: geometry.coordinates[1] };
    }
    if (geometry.type === "Polygon" && geometry.coordinates?.[0]?.length) {
      const coords = geometry.coordinates[0];
      let sumLon = 0;
      let sumLat = 0;
      coords.forEach(([lon, lat]) => {
        sumLon += lon;
        sumLat += lat;
      });
      return { lon: sumLon / coords.length, lat: sumLat / coords.length };
    }
    return null;
  }
  function haversineMeters(a, b) {
    const toRad = (deg) => deg * Math.PI / 180;
    const R = 6371e3;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function makeAdPin(ad_data, venue) {
    initAdPinsLayer();
    let id = ad_data.v;
    let color;
    if (id == "shelter" && !_ads.includes(id)) {
      _ads.push(id);
      addAdPinFeature(
        id,
        "shelter",
        ad_data.x,
        ad_data.y,
        {
          iconUrl: "https://raw.githubusercontent.com/TheCre8r/WME-BackEnd-Data/master/images/shelter-pin.png",
          width: 50,
          height: 50,
          xOffset: -(50 / 2) + 1,
          yOffset: -50 + 6
        },
        { adData: ad_data, color: "blue", venue }
      );
      return;
    }
    if (!_ads.includes(id)) {
      _ads.push(id);
      const backgroundProps = {
        iconUrl: `https://raw.githubusercontent.com/TheCre8r/WME-BackEnd-Data/master/images/adpin.svg?sanitize=true`,
        width: 64,
        height: 65,
        xOffset: -(64 / 2 + 2),
        yOffset: -65 + 10
      };
      const logoProps = {
        iconUrl: `https://ads-resources-legacy.waze.com/resources/images/1.0/3x/${ad_data.l}.png`,
        width: 44,
        height: 35,
        xOffset: -(44 / 2),
        yOffset: -35 - 9
      };
      const badgePropsBase = {
        width: 20,
        height: 20,
        xOffset: -(20 / 2) + 24,
        yOffset: -20 - 34
      };
      if (venue != null && id === "venues." + venue.id) {
        color = "white";
        processAdData(ad_data);
        log("Ad tab created", 0);
      } else if (id.includes("venues.")) {
        color = "grey";
      } else if (id.includes("googlePlaces.")) {
        color = "blue";
      } else {
        color = "red";
      }
      addAdPinFeature(id, "background", ad_data.x, ad_data.y, backgroundProps, { adData: ad_data, color, venue });
      addAdPinFeature(id, "logo", ad_data.x, ad_data.y, logoProps, { adData: ad_data, color, venue });
      if (color == "blue" || color == "red") {
        const badgeProps = {
          ...badgePropsBase,
          iconUrl: color == "blue" ? `https://raw.githubusercontent.com/TheCre8r/WME-BackEnd-Data/master/images/google_linked.svg?sanitize=true` : `https://raw.githubusercontent.com/TheCre8r/WME-BackEnd-Data/master/images/unlinked.svg?sanitize=true`
        };
        addAdPinFeature(id, "badge", ad_data.x, ad_data.y, badgeProps, { adData: ad_data, color, venue });
      }
      log(`Ad Created for ${ad_data.name} at ${ad_data.a} (${ad_data.y},${ad_data.x})`, 1);
    } else {
      const selected = getSelectedWmeFeatures()[0];
      if (selected && "venues." + String(selected.id) == id) {
        processAdData(ad_data);
      }
      log(`Ad Already Created`);
    }
  }
  function processAdData(ad_data) {
    let id = ad_data.v;
    log(ad_data);
    let lonlat = { lat: ad_data.y, lon: ad_data.x };
    lonlat.lat = Math.round(lonlat.lat * 1e6) / 1e6;
    lonlat.lon = Math.round(lonlat.lon * 1e6) / 1e6;
    let selectedvenue;
    let venueModel;
    let isVenueSelected = false;
    let isUnlinked = true;
    if (ad_data.v.startsWith("venue")) {
      isUnlinked = false;
    }
    if (getSelectedWmeFeatures().length > 0) {
      venueModel = getSelectedWmeFeatures()[0];
      isVenueSelected = true;
      selectedvenue = getGeometryCenter(venueModel.geometry);
      if (!selectedvenue && venueModel?.id) {
        const tempVenue = getVenueById(Number(venueModel.id));
        if (!tempVenue) {
          log("Retrying to process Ads");
          return;
        }
        selectedvenue = getGeometryCenter(tempVenue.geometry);
      }
      if (selectedvenue) {
        selectedvenue.lat = Math.round(selectedvenue.lat * 1e6) / 1e6;
        selectedvenue.lon = Math.round(selectedvenue.lon * 1e6) / 1e6;
      }
    }
    let description = `Campaign ID: ${ad_data.j.campaignId} \r
`;
    if (isUnlinked) {
      if (isVenueSelected) {
        description = `Campaign ID: ${ad_data.j.campaignId} \r
Please move this ad pin to the correct location and link it with the existing Waze place located here.  \r
`;
      }
    } else {
      description = `Campaign ID: ${ad_data.j.campaignId} \r
`;
    }
    let htmlstring = [
      `<div id="${adPinSidebarId}" class="venue-feature-editor">`,
      `<div class="venue sidebar-column venue-category-advertisement">`,
      `<div class="alert alert-danger header-alert locked-alert" style="display: block;">`,
      `${I18n.t("wmebed.ad_pin_alert")}`,
      `</div>`,
      `<div>`,
      `<div style="width: 302px;">`,
      `<div class="form-group">`,
      `<wz-label html-for="">${I18n.t("wmebed.autocomplete_address")}<i id="ad-address" class="EP2-icon w-icon w-icon-info"></i></wz-label>`,
      `<div class="address-edit">`,
      `<div class="address-edit-view">`,
      `<div class="preview">`,
      `<wz-card>`,
      `<div class="full-address-container">`,
      `<span class="full-address">${ad_data.a ? ad_data.a : "&nbsp;"}</span>
                        </div>`,
      `</wz-card>`,
      `</div>`,
      `</div>`,
      `</div>`,
      `</div>`,
      `<div class="form-group">`,
      `<wz-text-input name="name" value="${ad_data.name}" label="${I18n.t("edit.venue.fields.name")}" autocomplete="off" disabled></wz-text-input>`,
      `</div>`,
      `<div class="form-group" id="${nearbyPlaceSelectId}">`,
      `<label class="control-label">${I18n.t("wmebed.select_nearby")}</label>`,
      `<div class="controls">`,
      `<ul id="${nearbyPlaceListId}" class="additional-attributes list-unstyled side-panel-section">`,
      `</ul>`,
      `</div>`,
      `</div>`,
      `<div class="form-group">`,
      `<label class="control-label">${I18n.t("wmebed.open_in_waze")} <i id="ad-open-tooltip" class="EP2-icon w-icon w-icon-info"></i></label>`,
      `<div class="controls">`,
      `<div id="appLinkQRCode">`,
      `</div>`,
      `</div>`,
      `</div>`,
      `<ul class="additional-attributes list-unstyled side-panel-section">`,
      `<li>ID: ${ad_data.v + (getSettings().Debug ? `<i id="EP2-ss3" class="${icons["search-server"]} EP2-icon EP2-clickable" style="color: #8c8c8c;"></i>` : ``)}</li>`,
      `</ul>`,
      `</div>`,
      `<div class="${reportClass}">`,
      `<span class="fa-stack fa-2x" style="font-size: 13px;">`,
      `<i class="fa fa-map-marker-alt fa-stack-1x"></i>`,
      `<i style="color: #ECECEC;font-size: 12px;" class="fa fa-slash fa-stack-1x"></i>`,
      `<i style="font-size: 11px;top: -1px;" class="fa fa-slash fa-stack-1x"></i>`,
      `</span>`,
      `<div style="display: inline-block">`,
      `<a id="bedFormLink" target="_blank" href="https://support.google.com/waze/answer/7402261?hl=en&amp;adid=${encodeURIComponent(id)}&amp;username=${encodeURIComponent(getCurrentUserName())}&amp;brand_name=${encodeURIComponent(ad_data.name)}&amp;incorrect_gps_coordinates=${encodeURIComponent(lonlat.lon)},%20${encodeURIComponent(lonlat.lat)}&amp;pin_address=${encodeURIComponent(ad_data.a)}&amp;description=${encodeURIComponent(description)}${selectedvenue ? `&p2=true&correct_gps_coordinates=${encodeURIComponent(selectedvenue.lon)},%20${encodeURIComponent(selectedvenue.lat)}` : `&p1=true`}">${I18n.t("wmebed.report_misplaced_ad_pin")}</a>`,
      `</div>`,
      `</div>`,
      `</div>`,
      `</div>`,
      `</div>`
    ].join(" ");
    console.log(ad_data);
    const sdk2 = getSdk();
    const selection = sdk2.Editing.getSelection();
    if (getSelectedWmeFeatures().length > 0 && selection?.objectType === "venue" && !document.querySelector("wz-tab.venue-edit-tab-ad") && ad_data.v.indexOf("advertisement") < 0 && ad_data.v.indexOf("googlePlaces")) {
      if (!document.getElementById("sidepanel-wmebed-adpin")) {
        document.querySelector("#edit-panel")?.insertAdjacentHTML(
          "afterend",
          `<div id="sidepanel-wmebed-adpin" class="tab-pane"></div>`
        );
      }
      makeVenueTab("Ad-Pin", "tab-ad", '<div id="venue-ad"></div>', true);
      const venueAd = document.getElementById("venue-ad");
      if (venueAd) {
        venueAd.innerHTML = "";
        venueAd.insertAdjacentHTML("beforeend", htmlstring);
      }
      document.getElementById("EP2-ss3")?.addEventListener("click", function() {
        makeModal(ad_data.name, void 0, ad_data, "GAPI", buildAutocompleteUrl({
          lat: lonlat.lat,
          lon: lonlat.lon,
          query: ad_data.name,
          includeSession: true
        }));
      });
      createTooltip("EP2-code", "WME");
      if (String(getSelectedWmeFeatures()[0].id).startsWith("-")) {
        let formLink = document.getElementById("bedFormLink");
        formLink.onclick = function() {
          alert("New place must be saved before linking through the report form!");
          return false;
        };
      }
      document.getElementById(nearbyPlaceSelectId)?.setAttribute("style", "display:none;");
    } else if (document.querySelectorAll("#advert-tab").length == 1) {
      return;
    } else {
      const ctrlKey = window.event?.ctrlKey ?? false;
      if (ctrlKey && getSelectedWmeFeatures()[0]) {
        if (!document.getElementById("sidepanel-wmebed-adpin")) {
          document.querySelector("#edit-panel")?.insertAdjacentHTML(
            "afterend",
            `<div id="sidepanel-wmebed-adpin" class="tab-pane"></div>`
          );
        }
        makeVenueTab("Ad-Pin", "tab-ad", '<div id="venue-ad"></div>', true);
        if (getSettings().AutoSelectAdTab && findVenueTab("Ad-Pin") != null) {
          try {
            const adTab = findVenueTab("Ad-Pin");
            adTab?.click();
          } catch (error) {
            log("Could not open Ad Tab.");
          }
        } else if (getSettings().AutoSelectAdTab) {
          setTimeout(function() {
            const adTab = findVenueTab("Ad-Pin");
            adTab?.click();
          }, 300);
        }
        const venueAd = document.getElementById("venue-ad");
        if (venueAd) {
          venueAd.innerHTML = "";
          venueAd.insertAdjacentHTML("beforeend", htmlstring);
        }
        document.getElementById(nearbyPlaceSelectId)?.setAttribute("style", "display:none;");
      } else {
        const sdk3 = getSdk();
        sdk3.Editing.clearSelection();
        document.querySelector("body > div.app.container-fluid").classList.add("show-sidebar");
        const mapEditIcon = document.querySelector("wz-navigation-item > .w-icon-map-edit");
        const mapEditItem = mapEditIcon?.parentElement;
        if (mapEditItem && "selected" in mapEditItem) {
          if (document.querySelector(".tab-pane.active") && !mapEditItem.selected) {
            mapEditItem.click();
          } else if (!mapEditItem.selected) {
            mapEditItem.click();
          }
        }
        const editPanelInner = document.querySelector("#edit-panel > div");
        const editPanelFirst = editPanelInner?.firstChild;
        if (editPanelFirst) {
          editPanelFirst.style.display = "none";
        }
        if (document.querySelector(`#${adPinSidebarId}`)) {
          document.querySelector(`#${adPinSidebarId}`)?.remove();
        }
        document.querySelector("#edit-panel > div").insertAdjacentHTML("beforeend", htmlstring);
      }
      document.getElementById("EP2-ss3")?.addEventListener("click", function() {
        makeModal(ad_data.name, void 0, ad_data, "GAPI", buildAutocompleteUrl({
          lat: lonlat.lat,
          lon: lonlat.lon,
          query: ad_data.name,
          includeSession: true
        }));
      });
      let nearbyPlaces = getNearbyPlaces(ad_data);
      nearbyPlaces.forEach(function(venue) {
        log(venue.id + " " + venue.address + " (" + venue.distanceFromAdPin + ")");
        let listItem2 = document.createElement("li");
        listItem2.id = nearbyItemIdPrefix + venue.id;
        listItem2.className = "element-history-item";
        let venueLink = document.createElement("div");
        venueLink.id = "bedCreatePlace";
        venueLink.className = "element-history-item tx-has-content tx-has-related closed";
        let name2 = venue.name;
        let iconClass2 = iconLinkVenueClass;
        if (venue.isParkingLot) {
          iconClass2 = iconLinkParkingClass;
        }
        let html2 = [
          '<wz-card class="tx-item">',
          `<div class="tx-item-header tx-wmebed">`,
          `<i class="${iconClass2}"></i>`,
          `<wz-body2 class="tx-summary">`,
          `<wz-h7>${name2}</wz-h7>`,
          `<wz-caption class="tx-preview">`,
          `<div>${venue.houseNumber} ${venue.streetName}</div>`,
          `</wz-caption>`,
          `</wz-body2>`,
          `<div class="flex-noshrink">${venue.distanceFromAdPin}m</div>`,
          `</div>`,
          `</wz-card>`
        ].join(" ");
        venueLink.innerHTML = html2;
        listItem2.append(venueLink);
        venueLink.onmouseenter = function() {
        };
        venueLink.onmouseleave = function() {
        };
        venueLink.onclick = function() {
          let venue_id = venue.id.toString();
          selectVenueById(venue_id);
        };
        document.getElementById(nearbyPlaceListId)?.append(listItem2);
      });
      let listItem = document.createElement("li");
      listItem.id = "bedCreatePlaceholder";
      document.getElementById(nearbyPlaceListId)?.append(listItem);
      let createLink = document.createElement("div");
      createLink.id = "bedCreatePlace";
      createLink.className = "element-history-item tx-has-content tx-has-related closed";
      let iconClass = iconLinkVenueClass;
      let html = [
        '<wz-card class="tx-item">',
        `<div class="tx-item-header tx-wmebed">`,
        `<span class="fa fa-plus" style="font-size:20px;color:#A1A6AB;"></span>`,
        `<wz-body2 class="tx-summary">`,
        `<wz-h7>${name}</wz-h7>`,
        `<wz-caption class="tx-preview" style="position: relative;top: 50%;transform: translateY(-50%);font-size: 13px;">`,
        `<div>${I18n.t("wmebed.create_new_place")}</div>`,
        `</wz-caption>`,
        `</wz-body2>`,
        `</div>`,
        `</wz-card>`
      ].join(" ");
      createLink.innerHTML = html;
      listItem.append(createLink);
      createLink.onclick = function() {
        createPlace(ad_data);
      };
    }
    displayQrCode("appLinkQRCode", ad_data.v);
    createTooltip("ad-address", I18n.t("wmebed.ad_address_tooltip"));
    createTooltip("ad-open-tooltip", I18n.t("wmebed.ad_open_tooltip"));
  }
  function getNearbyPlaces(ad_data) {
    var nearbyPlaces = [];
    let adName = ad_data.name;
    const sdk2 = getSdk();
    const venues = getAllVenues();
    venues.forEach((venue) => {
      const center = getGeometryCenter(venue.geometry);
      if (!center) {
        return;
      }
      const distanceFromAdPin = haversineMeters({ lat: ad_data.y, lon: ad_data.x }, center);
      const address = sdk2.DataModel.Venues.getAddress({ venueId: String(venue.id) });
      const houseNumber = address?.houseNumber ?? "";
      let streetName = address?.street?.name ?? "";
      const streetId = address?.street?.id;
      if (!streetName && streetId != null) {
        const street = getStreetById(streetId);
        streetName = street?.name ?? "";
      }
      if (!streetName) {
        streetName = "No address";
      }
      let foundPlace = {
        id: venue.id,
        name: venue.name,
        houseNumber,
        streetName,
        distanceFromAdPin: Math.trunc(distanceFromAdPin),
        isParkingLot: false,
        geometry: center
      };
      let compareA = adName.toUpperCase().replace(/[^A-Z0-9,]/g, "");
      let compareB = venue.name.toUpperCase().replace(/[^A-Z0-9,]/g, "");
      if (compareA.length > compareB.length) {
        compareA = venue.name.toUpperCase().replace(/[^A-Z0-9,]/g, "");
        compareB = adName.toUpperCase().replace(/[^A-Z0-9,]/g, "");
      }
      if (venue.name.length > 0 && compareB.startsWith(compareA)) {
        if (venue.categories[0] == "PARKING_LOT") {
          foundPlace.isParkingLot = true;
        }
        nearbyPlaces.push(foundPlace);
        log("Nearby places: ");
        console.log(foundPlace);
      } else if (distanceFromAdPin < 100 && venue.categories[0] == "PARKING_LOT") {
        const parkingType = sdk2.DataModel.Venues.ParkingLot.getParkingLotType({ venueId: String(venue.id) });
        if (parkingType == "PUBLIC") {
          foundPlace.isParkingLot = true;
          nearbyPlaces.push(foundPlace);
        }
      }
    });
    nearbyPlaces.sort(function(a, b) {
      return a.distanceFromAdPin - b.distanceFromAdPin;
    });
    let limit = 5;
    if (nearbyPlaces.length < 5) {
      limit = nearbyPlaces.length;
    }
    return nearbyPlaces.slice(0, limit);
  }
  function createPlace(ad_data) {
    const sdk2 = getSdk();
    const categories = sdk2.DataModel.Venues.getVenueMainCategories?.() ?? [];
    const fallbackCategory = categories.find((c) => c.localizedName?.toLowerCase?.().includes("other")) ?? categories[0];
    if (!fallbackCategory?.id) {
      log("No venue category available for createPlace");
      return;
    }
    const offsetY = ad_data.y - 5e-5;
    const venueId = sdk2.DataModel.Venues.addVenue({
      category: fallbackCategory.id,
      geometry: { type: "Point", coordinates: [ad_data.x, offsetY] }
    });
    sdk2.DataModel.Venues.updateVenue({ venueId: String(venueId), name: ad_data.name });
    let addressDetails = getStreetFromAdAddress(ad_data);
    if (addressDetails.foundAddress) {
      sdk2.DataModel.Venues.updateAddress({
        venueId: String(venueId),
        streetId: addressDetails.streetId ?? void 0,
        houseNumber: addressDetails.houseNumber ?? void 0
      });
    }
    sdk2.Editing.setSelection({
      selection: { objectType: "venue", ids: [String(venueId)] }
    });
  }
  function getStreetFromAdAddress(ad_data) {
    let adAddress = ad_data.a;
    let addressDetails = {
      foundAddress: false,
      houseNumber: null,
      closestMatch: null,
      streetId: null
    };
    let adAddressParts = adAddress.split(",");
    let adAddressStreet = adAddressParts[0];
    let adAddressStreetParts = adAddressStreet.toUpperCase().replace(/\./g, "").replace(/\s\s+/g, " ").split(" ");
    if (adAddressParts.length > 1) {
      let adAddressHNAfter = adAddressParts[1].trim();
      if (adAddressHNAfter.match(/^\d+-?\d+$/)) {
        addressDetails.houseNumber = adAddressHNAfter;
      }
    }
    let hnAdjust = 0;
    if (adAddressStreetParts[0].match(/^\d+-?\d*$/)) {
      addressDetails.houseNumber = adAddressStreetParts[0];
      hnAdjust = 1;
    } else if (adAddressStreetParts[adAddressStreetParts.length - 1].match(/^\d+-?\d*$/)) {
      addressDetails.houseNumber = adAddressStreetParts[adAddressStreetParts.length - 1];
      hnAdjust = 1;
    }
    let containsOnlyDigits = false;
    let digitPart = "";
    for (let i = hnAdjust; i < adAddressStreetParts.length; i++) {
      let adStreetPart = adAddressStreetParts[i];
      if (adStreetPart.match(/^\d+$/)) {
        containsOnlyDigits = true;
        digitPart = adStreetPart;
      }
    }
    let streetIDs = [];
    getAllSegments().forEach(function(segment) {
      if (segment.roadType != 4) {
        if (segment.primaryStreetId != null) {
          streetIDs[segment.primaryStreetId] = true;
        }
        if (segment.alternateStreetIds?.length > 0) {
          segment.alternateStreetIds.forEach(function(streetID) {
            streetIDs[streetID] = true;
          });
        }
      }
    });
    let possibleMatch = [];
    Object.keys(streetIDs).forEach(function(street) {
      let streetObject = getStreetById(Number(street));
      if (streetObject && streetObject.name != null) {
        let streetName = streetObject.name.toUpperCase();
        if (streetObject.name != null && !streetObject.name.match(/^(TO )|(EXIT )/)) {
          let modelAddressParts = streetName.split(" ");
          let details = {
            name: streetObject.name,
            wordCountDiff: Math.abs(adAddressStreetParts.length - hnAdjust - modelAddressParts.length),
            wordMatches: 0,
            positionMatches: 0,
            positionAdjacentMatches: 0,
            score: 0,
            street: streetObject
          };
          for (let i = 0; i <= modelAddressParts.length - 1; i++) {
            let namePart = modelAddressParts[i];
            let compareWords = [namePart];
            if (streetAlias[namePart] != void 0) {
              if (typeof streetAlias[namePart] == "string") {
                compareWords.push(streetAlias[namePart]);
              } else {
                streetAlias[namePart].forEach(function(word) {
                  compareWords.push(word);
                });
              }
            }
            for (let j = 0; j <= compareWords.length - 1; j++) {
              if (adAddressStreetParts.includes(compareWords[j]) || containsOnlyDigits && (compareWords[0].startsWith(digitPart) || compareWords[0].endsWith("-" + digitPart))) {
                details.wordMatches++;
                let adWordPosition = adAddressStreetParts.indexOf(compareWords[j]) - hnAdjust;
                if (i == adWordPosition) {
                  details.positionMatches++;
                } else if (Math.abs(i - adWordPosition) == 1) {
                  details.positionAdjacentMatches++;
                }
                log("Matched: " + namePart + ": " + streetObject.name);
              }
            }
          }
          details.score = details.wordMatches * 1.5 - details.wordCountDiff * 0.9;
          details.score += details.positionMatches * 1.2;
          details.score += details.positionAdjacentMatches * 0.5;
          possibleMatch[streetObject.id] = details;
          if (details.wordMatches > 0) {
            log(details.name + " - Score: " + details.score);
            log(details);
          }
        }
      }
    });
    let duplicateScores = [];
    let bestScore = -10;
    Object.keys(possibleMatch).forEach(function(id) {
      let match = possibleMatch[id];
      if (match.wordMatches > 0 && match.score >= bestScore) {
        bestScore = match.score;
        let matches = [];
        if (duplicateScores[bestScore] != void 0) {
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
        let lowestDistance = 1e3;
        let distanceScores = [];
        let compareAddress = adAddress.toUpperCase();
        duplicateScores[bestScore].forEach(function(entry) {
          let editDistance = getEditDistance(compareAddress, entry.name.toUpperCase());
          if (editDistance <= lowestDistance) {
            lowestDistance = editDistance;
            if (distanceScores[lowestDistance] == void 0) {
              distanceScores[lowestDistance] = [];
            }
            distanceScores[lowestDistance].push(entry);
          }
        });
        closestMatch = distanceScores[lowestDistance][0];
      } else {
        closestMatch = duplicateScores[bestScore][0];
      }
    }
    if (addressDetails.foundAddress) {
      addressDetails.closestMatch = closestMatch;
      addressDetails.streetId = closestMatch.street.id;
      log(addressDetails);
    }
    return addressDetails;
  }
  function initAdsLayer() {
    log("Layer Initialized", 0);
    if (adsFeatures || getCurrentUserName() === SCRIPT_AUTHOR) {
      initAdPinsLayer();
    }
  }
  function RemoveFeatures() {
    const sdk2 = getSdk();
    if (_adPinsLayer) {
      sdk2.Map.removeAllFeaturesFromLayer({ layerName: _adPinsLayer });
    }
    Object.keys(AD_PIN_FEATURES_BY_AD).forEach((key) => delete AD_PIN_FEATURES_BY_AD[key]);
    Object.keys(AD_PIN_FEATURE_INDEX).forEach((key) => delete AD_PIN_FEATURE_INDEX[key]);
    _ads = [];
  }
  function addTestAdAtViewportCenter() {
    const center = getMapCenter4326();
    const adData = {
      v: `googlePlaces.test-${Date.now()}`,
      x: center.lon,
      y: center.lat,
      l: "00000000",
      name: "TEST AD PIN",
      a: "Viewport Center",
      j: { campaignId: "TEST" }
    };
    makeAdPin(adData, null);
  }
  function initVenueDropdownItems(headerMenu, venue) {
    if (!headerMenu || !venue) return;
    if (!document.getElementById("wmebed-qr-popup-button")) {
      const generateQRcodeHTML = [
        '<wz-menu-item class="feature-panel-header-menu-option" id="wmebed-qr-popup-button">',
        `<i class="w-icon ${icons.qrcode}" style="font-size: 20px;padding: 2px;"></i>Generate QR Code`,
        "</wz-menu-item>"
      ].join(" ");
      headerMenu.insertAdjacentHTML("beforeend", generateQRcodeHTML);
      document.getElementById("wmebed-qr-popup-button")?.addEventListener("click", () => {
        const htmlstring = [
          '<div class="panel show">',
          '<wz-card elevation="5" class="drive-panel">',
          '<div class="header">',
          "<wz-h5>QR Code</wz-h5>",
          '<wz-button color="clear-icon" size="xs"><i class="w-icon w-icon-x"></i></wz-button>',
          "</div>",
          '<div style="text-align: center;">',
          '<span id="wmebed-qr-popup" style="display: inline-block; height: 235px; width: 220px;">',
          "</span>",
          "<div>",
          `<wz-button id="wmebed-qr-download" color="primary" size="sm" class=""><i class="w-icon ${icons.download}"></i> Download</wz-button><br>`,
          `<i style="position: relative;top: 1px;">Generated by ${SCRIPT_SHORT_NAME}</i>`,
          "</div>",
          "</div>",
          "</wz-card>",
          "</div>"
        ].join(" ");
        document.querySelector("#panel-container")?.insertAdjacentHTML("beforeend", htmlstring);
        document.querySelector("#panel-container .header wz-button")?.addEventListener("click", () => {
          const panel = document.getElementById("panel-container");
          if (panel) panel.innerHTML = "";
        });
        displayQrCode("wmebed-qr-popup", venue.id);
        document.getElementById("wmebed-qr-download")?.addEventListener("click", () => {
          const link = document.createElement("a");
          link.download = `${venue.name}.png`;
          const canvas = document.querySelector("#wmebed-qr-popup canvas");
          if (!canvas) return;
          link.href = canvas.toDataURL();
          link.click();
        });
      });
    }
    if (!document.getElementById("wmebed-copy-lmlink-button")) {
      const copyLivemapLinkHTML = [
        '<wz-menu-item class="feature-panel-header-menu-option" id="wmebed-copy-lmlink-button">',
        '<i class="w-icon w-icon-copy"></i>Copy livemap link to clipboard',
        "</wz-menu-item>"
      ].join(" ");
      headerMenu.insertAdjacentHTML("beforeend", copyLivemapLinkHTML);
      document.getElementById("wmebed-copy-lmlink-button")?.addEventListener("click", () => {
        navigator.clipboard.writeText(`https://ul.waze.com/ul?preview_venue_id=${venue.id}&navigate=yes&utm_medium=send_to_phone_QR`);
        WazeWrap.Alerts.info(GM_info.script.name, "Livemap link copied to clipboard");
      });
    }
  }
  var ep2Inserting = false;
  var reportClass2 = `${SCRIPT_SHORT_NAME}-report`;
  var reportParkingIssueId = `${SCRIPT_SHORT_NAME}-report-an-issue-parking`;
  var reportGasIssueId = `${SCRIPT_SHORT_NAME}-report-an-issue-gas`;
  function buildParkingTab(json, bypass) {
    let latlon = getMapCenter4326();
    let venue = getSelectedWmeFeatures()[0];
    if (!venue) return;
    let link = `https://${getSearchServerBase()}?lon=${latlon.lon}&lat=${latlon.lat}&format=PROTO_JSON_FULL&venue_id=venues.${venue.id}`;
    function processRates() {
      let ratesHtml = "";
      json.venue.booking_offers[0].rates.forEach((rate) => {
        let currencySymbol = rate.standard_rate.currency_code == "USD" ? "$" : "?";
        let units = rate.standard_rate.units;
        let nanos = rate.standard_rate.nanos.toString().padStart(2, "0");
        let durationHours = rate.duration.seconds / 3600;
        let rateHtml = `<span><b>${currencySymbol} ${units}.${nanos}</b> for <b>${durationHours} hours</b></span>`;
        ratesHtml += rateHtml;
      });
      return ratesHtml;
    }
    let htmlstring = [
      `<form class="attributes-form">`,
      `<div class="side-panel-section">`,
      `<div class="form-group">`,
      `<label class="control-label">Provider${getSettings().Debug == true ? `<i id="EP2-ss2" class="${icons["search-server"]} EP2-icon EP2-clickable" style="color: #8c8c8c;"></i>` : ``}</label>`,
      //Needs Translated
      `<wz-text-input name="provider" value="${json.venue.booking_offers[0].external_provider.provider}" placeholder=""autocomplete="off" readonly="true"></wz-text-input>`,
      `</div>`,
      `<div class="form-group">`,
      `<label class="control-label">Rates</label>` + // Translation Required
      processRates(),
      `</div>`,
      `<div class="form-group">`,
      `<a href="${json.venue.booking_offers[0].reservation_uri}" target="_blank"><wz-button id="wmebed_book_parking" size="sm" disabled=${json.venue.booking_offers[0].reservation_uri == void 0 ? "true" : "false"}>Book Parking</wz-button><a>`,
      // Translation Required
      `</div>`,
      `<div class="${reportClass2}">`,
      `<i class="${icons.github}" style="font-size: 13px; padding-right:5px"></i>`,
      `<div style="display: inline-block">`,
      `<a id="${reportParkingIssueId}">${I18n.t("wmebed.report_an_issue")}</a>`,
      `</div>`,
      `</div>`,
      `</div>`,
      `</form>`
    ].join(" ");
    document.getElementById("venue-parking")?.insertAdjacentHTML("beforeend", htmlstring);
    document.getElementById(reportParkingIssueId)?.addEventListener("click", function() {
      if (confirm(I18n.t("wmebed.gas_price_reminder"))) {
        const permalink = document.querySelector(".WazeControlPermalink .permalink")?.href ?? "";
        window.open(
          `https://github.com/TheCre8r/WME-BackEnd-Data/issues/new?title=Parking%20Provider%20Issue&body=${encodeURIComponent("Permalink: " + permalink)}`,
          "_blank"
          //New window
        );
      }
    });
    document.getElementById("EP2-ss2")?.addEventListener("click", function() {
      fetch(link).then((res) => res.json()).then((data) => {
        makeModal(venue.name, void 0, data, "Search Server", link);
      }).catch((error) => {
        console.error("Error loading data:", error);
      });
    });
    createTooltip("EP2-ss2", "Search Server");
  }
  function buildGasPriceTab(json, bypass) {
    let latlon = getMapCenter4326();
    let venue = getSelectedWmeFeatures()[0];
    if (!venue) return;
    let link = `https://${getSearchServerBase()}?lon=${latlon.lon}&lat=${latlon.lat}&format=PROTO_JSON_FULL&venue_id=venues.${venue.id}`;
    function moveToGasPrices(id) {
      const parent = document.getElementById("gas-prices");
      const el = document.getElementById(id);
      if (parent && el) {
        parent.appendChild(el);
      }
    }
    let htmlstring = [
      `<form class="attributes-form">`,
      `<div class="side-panel-section">`,
      `<div class="form-group">`,
      `<label class="control-label">${I18n.t("wmebed.gas_prices") + (getSettings().Debug == true ? `<i id="EP2-ss2" class="${icons["search-server"]} EP2-icon EP2-clickable" style="color: #8c8c8c;"></i>` : ``)}</label><div id="gas-prices" style="text-align:center">`,
      `</div>`,
      `</div>`,
      `<ul class="additional-attributes list-unstyled side-panel-section">`,
      `<li id="gas-update-time"></li>`,
      `</ul>`,
      `<div class="${reportClass2}">`,
      `<i class="${icons.github}" style="font-size: 13px; padding-right:5px"></i>`,
      `<div style="display: inline-block">`,
      `<a id="${reportGasIssueId}">${I18n.t("wmebed.report_an_issue")}</a>`,
      `</div>`,
      `</div>`,
      `</div>`,
      `</form>`
    ].join(" ");
    document.getElementById("venue-gas")?.insertAdjacentHTML("beforeend", htmlstring);
    document.getElementById("EP2-ss2")?.addEventListener("click", function() {
      fetch(link).then((res) => res.json()).then((data) => {
        makeModal(venue.name, void 0, data, "Search Server", link);
      }).catch((error) => {
        console.error("Error loading data:", error);
      });
    });
    createTooltip("EP2-ss2", "Search Server");
    if (Number(venue.id) < 0) {
      document.querySelector("#gas-update-time").innerHTML = `${I18n.t("wmebed.invalid_gas")} - <a target="_blank" href="https://www.waze.com/user/editor/jm6087">jm6087</a>`;
    } else if (bypass == true || json.venue.product && venue.categories.indexOf("GAS_STATION") >= 0) {
      log(json, 1);
      let price_unit = json.price_unit;
      let updatetimes = [];
      for (let i2 = 0; i2 < json.venue.product.length; i2++) {
        updatetimes.push(json.venue.product[i2].last_updated);
      }
      let lastupdate = Math.max(...updatetimes);
      let lastupdatestring = timeConverter(lastupdate);
      let lastupdateduser;
      if (json.venue.product) {
        for (var i = 0; i < json.venue.product.length; i++) {
          if (json.venue.product[i].last_updated == lastupdate) {
            lastupdateduser = json.venue.product[i].updated_by;
            i = json.venue.product.length;
          }
        }
      }
      let gastypes = [];
      for (let i2 = 0; i2 < json.venue.product.length; i2++) {
        if (json.venue.product[i2].id.includes("gas.")) {
          gastypes.push(json.venue.product[i2].id);
          let type = json.venue.product[i2].id;
          let price = json.venue.product[i2].price;
          let pricestring;
          if (price.toString().includes(".") && price.toString().split(".")[1].length == 3) {
            pricestring = json.venue.currency[0].toString() + String.fromCharCode(160) + price.toString().substring(0, price.toString().length - 1) + `<sup style="top:-0.3em;">` + price.toString().substring(price.toString().length - 1, price.toString().length) + `</sup>`;
          } else {
            pricestring = json.venue.currency[0].toString() + String.fromCharCode(160) + price;
          }
          let htmlstring2 = `<div class="gas-price-block" id="${json.venue.product[i2].id}"><div class="gas-price">${pricestring}</div><span class="gas-price-text">${I18n.t(`wmebed.${type}`)}</span></div>`;
          document.getElementById("gas-prices")?.insertAdjacentHTML("beforeend", htmlstring2);
        }
      }
      const topCountry = getTopCountry();
      const countryName = topCountry?.name ?? null;
      log("Country: " + countryName, 0);
      if (countryName == "United States" || countryName == "Canada") {
        moveToGasPrices("gas.regular");
        moveToGasPrices("gas.midgrade");
        moveToGasPrices("gas.premium");
        moveToGasPrices("gas.diesel");
      } else if (countryName == "Mexico") {
        moveToGasPrices("gas.magna");
        moveToGasPrices("gas.premium");
        moveToGasPrices("gas.diesel");
      } else if (countryName == "Italy") {
        const dieselSpan = document.getElementById("gas.diesel")?.querySelector("span");
        if (dieselSpan) dieselSpan.innerHTML = I18n.t("wmebed.gas.regular");
        const regularSpan = document.getElementById("gas.regular")?.querySelector("span");
        if (regularSpan) regularSpan.innerHTML = I18n.t("wmebed.gas.diesel");
        moveToGasPrices("gas.regular");
        moveToGasPrices("gas.diesel");
        moveToGasPrices("gas.gpl");
        moveToGasPrices("gas.gas");
        var allowed = ["gas.regular", "gas.diesel", "gas.gas", "gas.gpl"];
        for (let i2 = document.querySelector("#gas-prices").childElementCount - 1; i2 >= 0; i2--) {
          if (!allowed.includes(document.querySelector("#gas-prices").children[i2].id)) {
            document.querySelector("#gas-prices").children[i2].remove();
          }
        }
      }
      if (lastupdatestring && lastupdateduser) {
        if (lastupdateduser == "3rd Party") {
          document.getElementById("gas-update-time").innerHTML = `${I18n.t("edit.updated_on", { time: lastupdatestring })} 3rd Party`;
        } else {
          document.getElementById("gas-update-time").innerHTML = `${I18n.t("edit.updated_on", { time: lastupdatestring })} <a target="_blank" href="https://www.waze.com/user/editor/${lastupdateduser}">${lastupdateduser}</a>`;
        }
      } else {
        document.getElementById("gas-update-time").innerHTML = `${I18n.t("edit.updated_on", { time: lastupdatestring })} Unknown User</a>`;
      }
    } else {
      document.querySelector("#gas-update-time").innerHTML = `<span>${I18n.t("wmebed.no_gas_prices")}</span>`;
    }
    document.getElementById(reportGasIssueId)?.addEventListener("click", function() {
      if (confirm(I18n.t("wmebed.gas_price_reminder"))) {
        const permalink = document.querySelector(".WazeControlPermalink .permalink")?.href ?? "";
        window.open(
          `https://github.com/TheCre8r/WME-BackEnd-Data/issues/new?title=Missing%20Gas%20Prices&body=${encodeURIComponent("Permalink: " + permalink)}`,
          "_blank"
          //New window
        );
      }
    });
  }
  function processParkingLotData(json) {
    let spots = json.venue.parking_lot_attributes.numberOfSpots;
    if (!document.querySelector("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > label > span")) {
      const label = document.querySelector("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > label");
      label?.insertAdjacentHTML("beforeend", "<span> (" + spots + ")</span>");
    }
    let divno = 0;
    if (spots > 0 && spots <= 10) {
      divno = 1;
    } else if (spots > 10 && spots <= 30) {
      divno = 2;
    } else if (spots > 30 && spots <= 60) {
      divno = 3;
    } else if (spots > 60 && spots <= 100) {
      divno = 4;
    } else if (spots > 100 && spots <= 300) {
      divno = 5;
    } else if (spots > 300 && spots <= 600) {
      divno = 6;
    } else if (spots > 600) {
      divno = 7;
    }
    if (document.querySelector("#csParkingSpacesContainer")) {
      document.querySelector("#csParkingSpacesContainer > div:nth-child(" + divno + ")")?.classList.add("wmebed-cs-correct");
      const container = document.querySelector("#csParkingSpacesContainer");
      const blue = container?.querySelectorAll(".waze-btn-blue")[0];
      const green = container?.querySelectorAll(".waze-btn-green")[0];
      const correct = container?.querySelectorAll(".wmebed-cs-correct")[0];
      if (blue && blue === correct || green && green === correct) {
        log("Right");
        document.querySelector("#csParkingSpacesContainer > div:nth-child(" + divno + ")")?.classList.remove("waze-btn-blue");
        document.querySelector("#csParkingSpacesContainer > div:nth-child(" + divno + ")")?.classList.add("waze-btn-green");
        document.querySelector(".hide-residential > a")?.style.removeProperty("background-color");
        document.querySelector("#csParkingSpacesContainer > div:nth-child(" + divno + ")")?.style.removeProperty("background-color");
      } else {
        log("Wrong");
        document.querySelector("#csParkingSpacesContainer > div:nth-child(" + divno + ")")?.classList.remove("waze-btn-green");
        document.querySelector("#csParkingSpacesContainer > div:nth-child(" + divno + ")")?.classList.add("waze-btn-blue");
        const hideResidentialLink = document.querySelector(".hide-residential > a");
        if (hideResidentialLink) hideResidentialLink.style.backgroundColor = "orange";
        const parkingOption = document.querySelector("#csParkingSpacesContainer > div:nth-child(" + divno + ")");
        if (parkingOption) parkingOption.style.backgroundColor = "orange";
      }
      document.querySelector("#csParkingSpacesContainer")?.addEventListener("click", function(event) {
        processParkingLotData(json);
      });
    } else {
      const wzSelect = document.querySelector("#venue-edit-more-info > form > div:nth-child(8) > wz-select");
      let selectedValue = wzSelect?.value;
      const selectedIndex = wzSelect?.selectedIndex ?? -1;
      const wzSelectOption = wzSelect?.children?.[divno];
      wzSelectOption?.classList.add("wmebed-correct");
      if (wzSelectOption) wzSelectOption.style.backgroundColor = "orange";
      return;
      const setBg = (selector, color) => {
        const el = document.querySelector(selector);
        if (el) el.style.backgroundColor = color;
      };
      const clearBg = (selector) => {
        const el = document.querySelector(selector);
        if (el) el.style.removeProperty("background-color");
      };
      if (divno - 1 == selectedIndex) {
        clearBg(".hide-residential > a");
        setBg("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select", "#20da9c");
        setBg("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(1)", "white");
        setBg("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(2)", "white");
        setBg("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(3)", "white");
        setBg("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(4)", "white");
        setBg("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(5)", "white");
        setBg("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(6)", "white");
        setBg("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(7)", "white");
        setBg("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(" + divno + ")", "#20da9c");
      } else {
        setBg(".hide-residential > a", "orange");
        setBg("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select", "orange");
        setBg("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(1)", "white");
        setBg("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(2)", "white");
        setBg("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(3)", "white");
        setBg("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(4)", "white");
        setBg("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(5)", "white");
        setBg("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(6)", "white");
        setBg("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(7)", "white");
        setBg("#venue-edit-more-info > div > form > fieldset > div:nth-child(3) > div:nth-child(5) > select > option:nth-child(" + divno + ")", "orange");
      }
    }
    document.querySelector('select[name="estimatedNumberOfSpots"]')?.addEventListener("change", function() {
      processParkingLotData(json);
    });
  }
  async function insertExternalProviders2() {
    if (ep2Inserting) {
      return;
    }
    const venue = getSelectedWmeFeatures()[0];
    if (!venue) return;
    const existing = document.getElementById("ExternalProviders2");
    const existingVenueId = existing?.getAttribute("data-venue-id");
    if (existing && existingVenueId === String(venue.id)) {
      return;
    }
    if (existing && existingVenueId !== String(venue.id)) {
      existing.remove();
    }
    ep2Inserting = true;
    try {
      let newEPItem = function(name2, link2, icon, canDelete, extraInfo) {
        let deleteButtonHTML = [
          `<wz-button color="shadowed" size="sm" class="external-provider-action external-provider-action-delete">`,
          `<i class="w-icon w-icon-trash external-provider-action-icon"></i>`,
          `</wz-button>`
        ].join(" ");
        let linkButtonHTML = [
          `<a class="url" href="${link2 ? link2 : "#"}" target="_blank" rel="noopener noreferrer">`,
          `<wz-button color="shadowed" size="sm" disabled="false" class="external-provider-action external-provider-action-focus">`,
          `<i class="w-icon w-icon-link external-provider-action-icon"></i>`,
          `</wz-button>`,
          `</a>`
        ].join(" ");
        let iconHTML;
        if (icon.includes("</i>")) {
          iconHTML = icon;
        } else {
          iconHTML = `<img class="EP2-img" style="height: 18px;padding: 0px;margin-right: 6px;" src="${icon}">`;
        }
        let debugHTML = `<span style="color: #8c8c8c;font-size: 10px;display: inline;"">, ${extraInfo}</span>`;
        let html = [
          `<wz-list-item class="external-provider unclickable">`,
          `<div slot="item-key" class="external-provider-content">${icon ? iconHTML : ""}${name2}${getSettings().Debug && extraInfo ? debugHTML : ""}</div>`,
          `<div slot="actions" class="external-provider-actions">`,
          `${link2 ? linkButtonHTML : ""}`,
          `${canDelete ? deleteButtonHTML : ""}`,
          `</div>`,
          `</wz-list-item>`
        ].join(" ");
        document.getElementById("EP2-list")?.insertAdjacentHTML("beforeend", html);
      };
      let latlon = getMapCenter4326();
      let link = `https://${getSearchServerBase()}?lon=${latlon.lon}&lat=${latlon.lat}&format=PROTO_JSON_FULL&venue_id=venues.${venue.id}`;
      let searchServerJSON;
      let headerMenu = document.querySelector("#edit-panel > div > div.venue-feature-editor > div > wz-section-header > span > div");
      if (!headerMenu) {
        const editPanel = document.querySelector("#edit-panel");
        if (!editPanel) {
          log("External providers header menu not found yet.", 2);
          return;
        }
        const observer = new MutationObserver(() => {
          headerMenu = document.querySelector("#edit-panel > div > div.venue-feature-editor > div > wz-section-header > span > div");
          if (!headerMenu) {
            return;
          }
          observer.disconnect();
          insertExternalProviders2();
        });
        observer.observe(editPanel, { childList: true, subtree: true });
        return;
      }
      initVenueDropdownItems(headerMenu, venue);
      if (Number(venue.id) <= 0) {
      } else {
        try {
          const res = await fetch(link);
          searchServerJSON = await res.json();
        } catch (error) {
          console.error("Error loading data:", error);
        }
      }
      let EP2html = [
        `<div class="external-providers-control form-group" id="ExternalProviders2" data-venue-id="${venue.id}">`,
        `<wz-label html-for="">${I18n.t("edit.venue.external_providers.title")} (${I18n.t("wmebed.read_only")})`,
        `<i id="ep2-tooltip" class="EP2-icon w-icon w-icon-info"></i>`,
        `</wz-label>`,
        `<wz-list class="external-providers-list" id="EP2-list">`,
        `</wz-list>`,
        `</div>`
      ].join(" ");
      if (venue.categories.indexOf("GAS_STATION") >= 0) {
        let bootstrapGas = function(tries = 1) {
          if (document.querySelector("wz-tabs") == null && tries < 5) {
            setTimeout(() => bootstrapGas(tries++), 1e3);
          } else {
            makeVenueTab("Gas", "tab-gas", '<div id="venue-gas"></div>', false);
            buildGasPriceTab(searchServerJSON);
          }
        };
        try {
          bootstrapGas();
        } catch (error) {
          log(error, 3);
        }
      } else if (venue.categories.indexOf("PARKING_LOT") >= 0 && searchServerJSON.venue.parking_lot_attributes) {
        processParkingLotData(searchServerJSON);
      }
      if (searchServerJSON && searchServerJSON.venue.booking_offers) {
        let bootstrapParkingTab = function(tries = 1) {
          if (document.querySelector("wz-tabs") == null && tries < 5) {
            setTimeout(() => bootstrapParkingTab(tries++), 1e3);
          } else {
            makeVenueTab("Parking", "tab-parking", '<div id="venue-parking"></div>', false);
            buildParkingTab(searchServerJSON);
          }
        };
        try {
          bootstrapParkingTab();
        } catch (error) {
          log(error, 3);
        }
      }
      const generalPanel = document.querySelector("#venue-edit-general");
      const externalProvidersBlock = generalPanel?.querySelector(".external-providers-control") ?? document.querySelector("#venue-edit-general > .external-providers-control");
      const geometryBlock = generalPanel?.querySelector(".geometry-type-control") ?? document.querySelector("#venue-edit-general > .geometry-type-control");
      const fallbackInsertTarget = generalPanel?.querySelector(".form-group") ?? generalPanel;
      if (externalProvidersBlock) {
        externalProvidersBlock.insertAdjacentHTML("afterend", EP2html);
      } else if (geometryBlock) {
        geometryBlock.insertAdjacentHTML("afterend", EP2html);
      } else if (fallbackInsertTarget) {
        fallbackInsertTarget.insertAdjacentHTML("beforeend", EP2html);
      } else {
        log("External providers insert target not found.", 2);
      }
      if (!venue.name.includes("Parking  -") && !venue.name.includes("Parking -") && !venue.name.includes("Lot -") && !venue.name.includes("(copy)")) {
        log(venue.name, 0);
        getAds(latlon, venue);
      }
      if (Number(venue.id) <= 0 || link.toString().indexOf("venues.-") >= 0) {
        newEPItem("None", "", "", false);
        return;
      }
      const selectedNow = getSelectedWmeFeatures()[0];
      if (!selectedNow || String(selectedNow.id) !== String(venue.id)) {
        return;
      }
      const externalProviders = searchServerJSON?.venue?.external_providers;
      if (externalProviders && externalProviders.length > 0) {
        log("JSON External Providers " + externalProviders.length, 0);
      } else {
        log("JSON External Providers 0", 0);
        newEPItem("None", "", "", false);
      }
      let i = 0;
      let count = 0;
      let readOnlyCount = 0;
      while (externalProviders != void 0 && i < externalProviders.length) {
        switch (externalProviders[i].type) {
          case "USER":
          case "QUICKMATCH":
          case "QUICKMATCH_NO_GCID":
          case "AUTOMATIC":
            break;
          default:
            const knownProviders = ["ARRIVE", "BrazilGasStations", "Google", "MapFuel", "MultispectralBrazil", "OPIS", "ParkMe"];
            if (!knownProviders.includes(externalProviders[i].provider)) {
              let report = function(ep2) {
                const permalink = document.querySelector(".WazeControlPermalink .permalink")?.href ?? "";
                let url = [
                  `https://github.com/TheCre8r/WME-BackEnd-Data/issues/new?`,
                  `title=New%20Provider%20Issue&`,
                  `body=`,
                  encodeURIComponent("Permalink: " + permalink),
                  `%0A`,
                  encodeURIComponent("```json"),
                  `%0A`,
                  encodeURIComponent(JSON.stringify(ep2)),
                  `%0A`,
                  encodeURIComponent("```")
                ].join("");
                window.open(url, "_blank");
              };
              let ep = externalProviders[i];
              const typeLabel = String(externalProviders[i].type ?? "");
              const typeTitle = typeLabel.length > 0 ? typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1).toLowerCase() : "Unknown";
              const message = `Please Report on GitHub:
Unknown ${typeTitle} - ${externalProviders[i].provider}`;
              try {
                WazeWrap.Alerts.confirm(
                  GM_info.script.name,
                  `Please Report on GitHub:<br> Unknown ${typeTitle} - ${externalProviders[i].provider}`,
                  function() {
                    report(ep);
                  },
                  null,
                  "Report",
                  "Cancel"
                );
              } catch (error) {
                if (window.confirm(message)) {
                  report(ep);
                }
              }
            }
            break;
        }
        switch (externalProviders[i].provider) {
          case "Google":
            if (!canEditVenue(venue)) {
              newEPItem(
                "Google",
                "",
                '<i class="EP2-img-fa fa fa-google" style="font-size: 14px;"></i>',
                false,
                externalProviders[i].i
              );
              readOnlyCount++;
            }
            break;
          case "Yext":
          case "Yext2":
          case "YextAds":
            newEPItem(
              externalProviders[i].provider,
              "",
              "https://www.yext.com/wp-content/themes/yext/img/icons/favicon-seal.png",
              false,
              externalProviders[i].i
            );
            readOnlyCount++;
            break;
          case "ParkMe":
            newEPItem(
              externalProviders[i].provider,
              `https://www.parkme.com/lot/${externalProviders[i].id}`,
              "https://raw.githubusercontent.com/TheCre8r/WME-BackEnd-Data/master/images/ParkMe.png",
              false,
              externalProviders[i].id
            );
            readOnlyCount++;
            break;
          case "ARRIVE":
            newEPItem(
              "Arrive",
              "",
              "https://developer.arrive.com/v4/assets/img/favicon.ico",
              false,
              externalProviders[i].id
            );
            readOnlyCount++;
            break;
          case "ESSO":
            newEPItem(
              externalProviders[i].provider,
              "",
              "https://upload.wikimedia.org/wikipedia/commons/2/22/Esso_textlogo.svg",
              false,
              externalProviders[i].id
            );
            readOnlyCount++;
            break;
          case "EcoMovement":
            newEPItem(
              "Eco Movement",
              `https://api.eco-movement.com/api/ocpi/cpo/2.2/locations/${externalProviders[i].id}`,
              "https://www.eco-movement.com/wp-content/themes/eco-movement/css/images/favicon.svg",
              false,
              externalProviders[i].id
            );
            readOnlyCount++;
            break;
          case "MapFuel":
            newEPItem(
              externalProviders[i].provider,
              "",
              '<i class="EP2-img-fa fa fa-server" style="font-size: 14px;"></i> ',
              false,
              externalProviders[i].id
            );
            readOnlyCount++;
            break;
          case "Government of Mexico Gas Station":
            newEPItem(
              externalProviders[i].provider,
              "",
              '<i class="EP2-img-fa fa fa-university" style="font-size: 14px;"></i> ',
              false,
              externalProviders[i].id
            );
            readOnlyCount++;
            break;
          default:
            newEPItem(
              externalProviders[i].provider,
              "",
              '<i class="EP2-img-fa fa fa-server" style="font-size: 14px;"></i> ',
              false,
              externalProviders[i].id
            );
            readOnlyCount++;
            break;
        }
        count++;
        if (getSettings().Debug == true) {
          const span = document.querySelector(`#EP2-items > div:nth-child(${count}) > span`);
          span?.insertAdjacentHTML("beforeend", `<span style="color: #8c8c8c;font-size: 10px;display: inline;"">, ${externalProviders[i].id}</span>`);
        }
        i++;
      }
      if (externalProviders && externalProviders.length > 0 && readOnlyCount === 0) {
        newEPItem("None", "", "", false);
      }
      createTooltip("ep2-tooltip", I18n.t("wmebed.third_party_tooltip"));
    } finally {
      ep2Inserting = false;
    }
  }
  function insertVenueDebugGroup() {
    const selected = getSelectedWmeFeatures()[0];
    if (!selected || getSettings().Debug !== true) {
      document.getElementById("wmebed-venue-debug-group")?.remove();
      return;
    }
    const venue = selected;
    const existing = document.getElementById("wmebed-venue-debug-group");
    const existingVenueId = existing?.getAttribute("data-venue-id");
    if (existing && existingVenueId === String(venue.id)) {
      return;
    }
    existing?.remove();
    const segmentForm = document.querySelector("#venue-edit-general form.attributes-form.side-panel-section");
    const generalPanel = document.querySelector("#venue-edit-general");
    const insertTarget = segmentForm ?? generalPanel;
    if (!insertTarget) {
      return;
    }
    const html = [
      `<div class="form-group" id="wmebed-venue-debug-group" data-venue-id="${venue.id}">`,
      `<wz-label html-for="">Debug</wz-label>`,
      `<div class="controls">`,
      `<div class="controls-container">`,
      `<i id="EP2-ss" class="${icons["search-server"]} EP2-icon EP2-clickable" style="vertical-align: 1px;"></i>`,
      `<i id="EP2-code" class="${icons.wme} EP2-icon EP2-clickable"></i>`,
      `<i id="EP2-lm" class="${icons.livemap} EP2-icon EP2-clickable"></i>`,
      `<i id="EP2-sdk" class="w-icon w-icon-script EP2-icon EP2-clickable"></i>`,
      `</div>`,
      `</div>`,
      `</div>`
    ].join("");
    insertTarget.insertAdjacentHTML("beforeend", html);
    const latlon = getMapCenter4326();
    const searchServerLink = `https://${getSearchServerBase()}?lon=${latlon.lon}&lat=${latlon.lat}&format=PROTO_JSON_FULL&venue_id=venues.${venue.id}`;
    document.getElementById("EP2-code")?.addEventListener("click", function() {
      let selectedObject = null;
      try {
        const selected2 = W?.selectionManager?.getSelectedDataModelObjects?.();
        selectedObject = Array.isArray(selected2) ? selected2[0] ?? null : null;
      } catch {
        selectedObject = null;
      }
      const modalTitle = selectedObject?.name ?? venue.name ?? "Venue";
      log(selectedObject ?? venue, 0);
      makeModal(modalTitle, void 0, selectedObject ?? venue, "WME", void 0);
    });
    createTooltip("EP2-code", "WME", "top");
    document.getElementById("EP2-ss")?.addEventListener("click", function() {
      fetch(searchServerLink).then((res) => res.json()).then((data) => {
        makeModal(venue.name, void 0, data, "Search Server", searchServerLink);
      }).catch((error) => {
        console.error("Error loading data:", error);
      });
    });
    createTooltip("EP2-ss", "Search Server", "top");
    document.getElementById("EP2-lm")?.addEventListener("click", function() {
      const liveMapApiUrl = `https://www.waze.com/live-map/api/venues/${venue.id}?locale=en`;
      GM_xmlhttpRequest({
        method: "GET",
        url: liveMapApiUrl,
        onload: (response) => {
          try {
            const data = JSON.parse(response.responseText);
            makeModal(venue.name, void 0, data, "Live Map API", `https://www.waze.com/live-map/directions/?to=place.w.${venue.id}`);
          } catch (error) {
            console.error("Error parsing Live Map API response:", error);
          }
        },
        onerror: (error) => {
          console.error("Error loading Live Map API data:", error);
        }
      });
    });
    createTooltip("EP2-lm", "LiveMap API", "top");
    document.getElementById("EP2-sdk")?.addEventListener("click", function() {
      const sdk2 = getSdk();
      const venueId = String(venue.id);
      const sdkVenue = sdk2.DataModel.Venues.getById({ venueId });
      const sdkAddress = sdk2.DataModel.Venues.getAddress({ venueId });
      const sdkSelection = sdk2.Editing.getSelection();
      makeModal(
        venue.name,
        void 0,
        {
          selection: sdkSelection,
          venue: sdkVenue,
          address: sdkAddress
        },
        "WME SDK",
        void 0
      );
    });
    createTooltip("EP2-sdk", "WME SDK", "top");
  }
  function initVenueSelectionBootstrap() {
    if (getUrlParameter("venues").length && getSelectedWmeFeatures()[0] != void 0) {
      insertExternalProviders2();
      insertVenueDebugGroup();
    }
  }
  function handleVenueSelectionChange() {
    const selected = getSelectedWmeFeatures()[0];
    if (!selected) {
      document.getElementById("wmebed-venue-debug-group")?.remove();
      return;
    }
    const editPanel = document.querySelector("#edit-panel");
    if (!editPanel) {
      return;
    }
    const maybeInsert = (tries = 0) => {
      const current = getSelectedWmeFeatures()[0];
      if (!current) return;
      const venueId = String(current.id);
      const hasVenuePanel = Boolean(document.querySelector("#edit-panel .venue-feature-editor"));
      if (!hasVenuePanel) {
        if (tries < 12) {
          setTimeout(() => maybeInsert(tries + 1), 200);
        }
        return;
      }
      const existing = document.getElementById("ExternalProviders2");
      const existingVenueId = existing?.getAttribute("data-venue-id");
      if (existing && existingVenueId !== venueId) {
        existing.remove();
      }
      const existingDebug = document.getElementById("wmebed-venue-debug-group");
      const existingDebugVenueId = existingDebug?.getAttribute("data-venue-id");
      if (existingDebug && existingDebugVenueId !== venueId) {
        existingDebug.remove();
      }
      const hasCurrentEp = Boolean(document.querySelector(`#ExternalProviders2[data-venue-id="${venueId}"]`));
      const hasCurrentDebug = Boolean(document.querySelector(`#wmebed-venue-debug-group[data-venue-id="${venueId}"]`));
      if (!hasCurrentEp) {
        insertExternalProviders2();
      }
      insertVenueDebugGroup();
      if ((!hasCurrentEp || getSettings().Debug === true && !hasCurrentDebug) && tries < 12) {
        setTimeout(() => maybeInsert(tries + 1), 200);
      }
    };
    const observer = new MutationObserver(() => {
      const current = getSelectedWmeFeatures()[0];
      if (!current) return;
      observer.disconnect();
      maybeInsert();
    });
    observer.observe(editPanel, { childList: true, subtree: true });
    maybeInsert();
  }
  var segmentDebugObserver = null;
  var segmentBeaconObserver = null;
  function watchSegmentPanel() {
    const sdk2 = getSdk();
    const editPanel = document.querySelector("#segment-edit-general") ?? document.querySelector("#edit-panel");
    if (!editPanel || segmentBeaconObserver) {
      return;
    }
    segmentBeaconObserver = new MutationObserver(() => {
      const selection = sdk2.Editing.getSelection();
      if (!selection || selection.objectType !== "segment") {
        return;
      }
      const segmentId = Number(selection.ids?.[0]);
      const segment = Number.isFinite(segmentId) ? sdk2.DataModel.Segments.getById({ segmentId }) : null;
      const hasTarget = Boolean(document.querySelector('#segment-edit-general wz-checkbox[data-testid="unpavedCheckbox"]')) || Boolean(document.querySelector("#segment-edit-general .controls")) || Boolean(document.querySelector("#segment-edit-general > div.orderOne--Fa4nw > div.feature-ids-details > wz-button")) || Boolean(document.querySelector("#segment-edit-general"));
      if (!segment || !hasTarget) {
        return;
      }
      segmentBeaconObserver?.disconnect();
      segmentBeaconObserver = null;
      insertBeaconCheckbox();
    });
    segmentBeaconObserver.observe(editPanel, { childList: true, subtree: true });
  }
  function insertSegmentDebugButton() {
    if (document.getElementById("wmebed-segment-debug-wrap")) {
      return;
    }
    const segmentForm = document.querySelector("#segment-edit-general form.attributes-form.side-panel-section");
    const debugGroupHtml = [
      `<div class="form-group" id="wmebed-segment-debug-group">`,
      `<wz-label html-for="">Debug</wz-label>`,
      `<div class="controls">`,
      `<div class="controls-container" id="wmebed-segment-debug-wrap" style="position: relative;">`,
      `<i id="wmebed-segment-debug" class="w-icon w-icon-map-edit EP2-icon EP2-clickable"></i>`,
      `<i id="wmebed-segment-sdk" class="w-icon w-icon-script EP2-icon EP2-clickable"></i>`,
      `</div>`,
      `</div>`,
      `</div>`
    ].join("");
    if (segmentForm) {
      segmentForm.insertAdjacentHTML("beforeend", debugGroupHtml);
    } else {
      const targetButton = document.querySelector("#segment-edit-general > div.orderOne--Fa4nw > div.feature-ids-details > wz-button");
      const targetWrap = targetButton?.closest(".feature-ids-details");
      if (!targetWrap || !targetWrap.parentElement) {
        return;
      }
      targetWrap.insertAdjacentHTML("afterend", debugGroupHtml);
    }
    const debugGroup = document.getElementById("wmebed-segment-debug-group");
    const previous = debugGroup?.previousElementSibling;
    if (previous && !previous.classList.contains("form-group")) {
      previous.classList.add("form-group");
    }
    document.getElementById("wmebed-segment-debug")?.addEventListener("click", function() {
      let selectedObjects = [];
      try {
        const selected = W?.selectionManager?.getSelectedDataModelObjects?.();
        selectedObjects = Array.isArray(selected) ? selected.filter(Boolean) : [];
      } catch {
        selectedObjects = [];
      }
      if (selectedObjects.length === 0) {
        return;
      }
      if (selectedObjects.length === 1) {
        const segment = selectedObjects[0];
        makeModal(`Segment ${segment?.id ?? ""}`.trim(), void 0, segment, "WME", void 0);
        return;
      }
      makeModal(`Segments (${selectedObjects.length})`, void 0, { segments: selectedObjects }, "WME", void 0);
    });
    createTooltip("wmebed-segment-debug", "WME", "top");
    document.getElementById("wmebed-segment-sdk")?.addEventListener("click", function() {
      const sdk2 = getSdk();
      const selection = sdk2.Editing.getSelection();
      if (!selection || selection.objectType !== "segment") {
        return;
      }
      const segmentIds = (selection.ids ?? []).map((id) => Number(id)).filter((id) => Number.isFinite(id));
      if (segmentIds.length === 0) {
        return;
      }
      if (segmentIds.length === 1) {
        const segment = sdk2.DataModel.Segments.getById({ segmentId: segmentIds[0] });
        if (!segment) {
          return;
        }
        makeModal(
          `Segment ${segmentIds[0]}`,
          void 0,
          {
            selection,
            segment
          },
          "WME SDK",
          void 0
        );
        return;
      }
      const selectedSegments = segmentIds.map((id) => sdk2.DataModel.Segments.getById({ segmentId: id })).filter(Boolean);
      if (selectedSegments.length === 0) {
        return;
      }
      makeModal(
        `Segments (${selectedSegments.length})`,
        void 0,
        {
          selection,
          segments: selectedSegments
        },
        "WME SDK",
        void 0
      );
    });
    createTooltip("wmebed-segment-sdk", "WME SDK", "top");
  }
  function showSegmentDebug() {
    if (getSettings().Debug !== true) {
      return;
    }
    const sdk2 = getSdk();
    const selection = sdk2.Editing.getSelection();
    if (!selection || selection.objectType !== "segment") {
      return;
    }
    const targetButton = document.querySelector("#segment-edit-general > div.orderOne--Fa4nw > div.feature-ids-details > wz-button");
    if (!targetButton) {
      const editPanel = document.querySelector("#edit-panel");
      if (!editPanel || segmentDebugObserver) {
        return;
      }
      segmentDebugObserver = new MutationObserver(() => {
        const currentSelection = sdk2.Editing.getSelection();
        const nowTarget = document.querySelector("#segment-edit-general > div.orderOne--Fa4nw > div.feature-ids-details > wz-button");
        if (!nowTarget || !currentSelection || currentSelection.objectType !== "segment") {
          return;
        }
        segmentDebugObserver?.disconnect();
        segmentDebugObserver = null;
        insertSegmentDebugButton();
      });
      segmentDebugObserver.observe(editPanel, { childList: true, subtree: true });
      return;
    }
    insertSegmentDebugButton();
  }
  function insertBeaconCheckbox() {
    if (getSettings().Debug !== true) {
      return;
    }
    const sdk2 = getSdk();
    const selection = sdk2.Editing.getSelection();
    if (!selection || selection.objectType !== "segment") {
      return;
    }
    const segmentIds = (selection.ids ?? []).map((id) => Number(id)).filter((id) => Number.isFinite(id));
    if (segmentIds.length === 0) {
      return;
    }
    const segments = segmentIds.map((id) => sdk2.DataModel.Segments.getById({ segmentId: id })).filter(Boolean);
    if (segments.length !== segmentIds.length || segments.length === 0) {
      watchSegmentPanel();
      return;
    }
    const getBeaconsInsertTarget = () => {
      const unpavedCheckbox = document.querySelector('#segment-edit-general wz-checkbox[data-testid="unpavedCheckbox"]');
      const roadDetails = unpavedCheckbox?.closest(".controls");
      if (roadDetails) {
        return roadDetails;
      }
      const anyControls = document.querySelector("#segment-edit-general .controls");
      if (anyControls) {
        return anyControls;
      }
      const targetButton = document.querySelector("#segment-edit-general > div.orderOne--Fa4nw > div.feature-ids-details > wz-button");
      const targetWrap = targetButton?.closest(".feature-ids-details");
      return targetWrap?.parentElement ?? document.querySelector("#segment-edit-general");
    };
    const insertTarget = getBeaconsInsertTarget();
    if (!insertTarget) {
      watchSegmentPanel();
      return;
    }
    let wrap = document.getElementById("wmebed-beacons-flag");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "controls-container";
      wrap.id = "wmebed-beacons-flag";
      wrap.style.position = "relative";
      wrap.innerHTML = '<wz-checkbox id="wmebed-beacons-checkbox" disabled="true" value="on">Beacons<input type="checkbox" name="wmebed-beacons" value="on" style="display: none; visibility: hidden;"></wz-checkbox><i id="wmebed-beacons-tooltip" class="w-icon w-icon-info"></i>';
      insertTarget.appendChild(wrap);
      createTooltip("wmebed-beacons-tooltip", I18n.t("wmebed.beacons_tooltip"));
    }
    const beaconStates = segments.map((segment) => Boolean(segment.flagAttributes?.beacons));
    const allEnabled = beaconStates.every((state) => state === true);
    const allDisabled = beaconStates.every((state) => state === false);
    const isIndeterminate = !allEnabled && !allDisabled;
    const checkbox = document.getElementById("wmebed-beacons-checkbox");
    if (checkbox) {
      if (allEnabled) {
        checkbox.setAttribute("checked", "");
        checkbox.setAttribute("aria-checked", "true");
        checkbox.removeAttribute("indeterminate");
      } else if (isIndeterminate) {
        checkbox.removeAttribute("checked");
        checkbox.setAttribute("aria-checked", "mixed");
        checkbox.setAttribute("indeterminate", "");
      } else {
        checkbox.removeAttribute("checked");
        checkbox.setAttribute("aria-checked", "false");
        checkbox.removeAttribute("indeterminate");
      }
      const input = checkbox.querySelector('input[type="checkbox"]');
      if (input) {
        input.checked = allEnabled;
        input.indeterminate = isIndeterminate;
      }
    }
  }
  function handleSegmentSelectionChange() {
    const sdk2 = getSdk();
    const selection = sdk2.Editing.getSelection();
    if (!selection || selection.objectType !== "segment") {
      return;
    }
    const editPanel = document.querySelector("#edit-panel");
    if (!editPanel) {
      return;
    }
    const apply = () => {
      const currentSelection = sdk2.Editing.getSelection();
      if (!currentSelection || currentSelection.objectType !== "segment") {
        return;
      }
      showSegmentDebug();
      insertBeaconCheckbox();
    };
    const observer = new MutationObserver(() => {
      const hasSegmentPanel = Boolean(document.querySelector("#segment-edit-general"));
      if (!hasSegmentPanel) {
        return;
      }
      observer.disconnect();
      apply();
    });
    observer.observe(editPanel, { childList: true, subtree: true });
    apply();
  }
  var googlePlaceDebugObserver = null;
  var googlePlaceEnsureTimer = null;
  function getGooglePlacePanel() {
    const contents = document.querySelector("#edit-panel > .contents");
    return contents?.firstElementChild ?? null;
  }
  function getGooglePlaceInsertTarget(panel) {
    const activeTabContent = panel.querySelector("wz-tabs wz-tab[is-active] > div") ?? panel.querySelector("wz-tab[is-active] > div");
    return activeTabContent ?? panel;
  }
  function readGooglePlaceSelectionSafe() {
    try {
      return getSdk().Editing.getSelection();
    } catch {
      return { objectType: "googlePlace", ids: [] };
    }
  }
  function readGooglePlaceWmeObjectSafe() {
    try {
      const selected = W?.selectionManager?.getSelectedDataModelObjects?.();
      return Array.isArray(selected) ? selected[0] ?? null : null;
    } catch {
      return null;
    }
  }
  function serializeError(error) {
    const err = error;
    return {
      name: String(err?.name ?? "UnknownError"),
      message: String(err?.message ?? ""),
      stack: typeof err?.stack === "string" ? err.stack : void 0,
      code: err?.code ?? void 0,
      cause: err?.cause ?? void 0,
      raw: (() => {
        try {
          return JSON.parse(JSON.stringify(error));
        } catch {
          return String(error ?? "");
        }
      })()
    };
  }
  function insertGooglePlaceDebugGroup() {
    if (getSettings().Debug !== true) {
      return;
    }
    const panel = getGooglePlacePanel();
    if (!panel) {
      return;
    }
    const selection = readGooglePlaceSelectionSafe();
    if (!selection || selection.objectType !== "googlePlace") {
      return;
    }
    const insertTarget = getGooglePlaceInsertTarget(panel);
    const idKey = String(selection?.ids?.[0] ?? panel.querySelector("wz-section-header")?.getAttribute("subtitle") ?? "active");
    const existing = document.getElementById("wmebed-googleplace-debug-group");
    const existingKey = existing?.getAttribute("data-googleplace-id");
    if (existing && existingKey === idKey) {
      return;
    }
    existing?.remove();
    const html = [
      `<div class="form-group" id="wmebed-googleplace-debug-group" data-googleplace-id="${idKey}">`,
      `<wz-label html-for="">Debug</wz-label>`,
      `<div class="controls">`,
      `<div class="controls-container">`,
      `<i id="wmebed-googleplace-debug" class="w-icon w-icon-map-edit EP2-icon EP2-clickable"></i>`,
      `<i id="wmebed-googleplace-sdk" class="w-icon w-icon-script EP2-icon EP2-clickable"></i>`,
      `</div>`,
      `</div>`,
      `</div>`
    ].join("");
    insertTarget.insertAdjacentHTML("beforeend", html);
    document.getElementById("wmebed-googleplace-debug")?.addEventListener("click", () => {
      const selection2 = readGooglePlaceSelectionSafe();
      if (!selection2 || selection2.objectType !== "googlePlace") return;
      const wmeFeature = readGooglePlaceWmeObjectSafe();
      makeModal(
        "Google Place",
        void 0,
        {
          selection: selection2,
          wmeFeature
        },
        "WME",
        void 0
      );
    });
    createTooltip("wmebed-googleplace-debug", "WME", "top");
    document.getElementById("wmebed-googleplace-sdk")?.addEventListener("click", () => {
      const sdk2 = getSdk();
      let selection2;
      try {
        selection2 = sdk2.Editing.getSelection();
      } catch (error) {
        makeModal(
          "Google Place",
          void 0,
          {
            error: serializeError(error)
          },
          "WME SDK",
          void 0
        );
        return;
      }
      const mapCenter = sdk2.Map.getMapCenter();
      makeModal(
        "Google Place",
        void 0,
        {
          selection: selection2,
          sdkState: {
            isEditingAllowed: sdk2.Editing.isEditingAllowed(),
            mapCenter
          }
        },
        "WME SDK",
        void 0
      );
    });
    createTooltip("wmebed-googleplace-sdk", "WME SDK", "top");
  }
  function handleGooglePlaceSelectionChange() {
    log("Google Place Selected", 1);
    if (getSettings().Debug !== true) {
      return;
    }
    const editPanel = document.querySelector("#edit-panel");
    if (!editPanel) {
      return;
    }
    const apply = (tries = 0) => {
      const panel = getGooglePlacePanel();
      if (!panel) {
        if (tries < 12) {
          setTimeout(() => apply(tries + 1), 200);
        }
        return;
      }
      insertGooglePlaceDebugGroup();
    };
    if (!googlePlaceDebugObserver) {
      googlePlaceDebugObserver = new MutationObserver(() => {
        if (googlePlaceEnsureTimer != null) {
          window.clearTimeout(googlePlaceEnsureTimer);
        }
        googlePlaceEnsureTimer = window.setTimeout(() => {
          googlePlaceEnsureTimer = null;
          const panel = getGooglePlacePanel();
          if (!panel) {
            return;
          }
          insertGooglePlaceDebugGroup();
        }, 50);
      });
      googlePlaceDebugObserver.observe(editPanel, { childList: true, subtree: true });
    }
    apply();
  }
  var nodeDebugObserver = null;
  function clearNodeDebugGroup() {
    document.getElementById("wmebed-node-debug-group")?.remove();
  }
  function insertNodeDebugGroup() {
    const sdk2 = getSdk();
    const selection = sdk2.Editing.getSelection();
    if (!selection || selection.objectType !== "node") {
      clearNodeDebugGroup();
      return;
    }
    const nodeId = Number(selection.ids?.[0]);
    if (!Number.isFinite(nodeId)) {
      return;
    }
    const nodePanel = document.querySelector("#edit-panel .node");
    if (!nodePanel) {
      return;
    }
    const existing = document.getElementById("wmebed-node-debug-group");
    const existingNodeId = existing?.getAttribute("data-node-id");
    if (existing && existingNodeId === String(nodeId)) {
      return;
    }
    existing?.remove();
    let debugContainer = nodePanel.querySelector(".sidebar-tab-pane-body");
    if (!debugContainer) {
      nodePanel.insertAdjacentHTML("beforeend", `<div class="sidebar-tab-pane-body" id="wmebed-node-debug-body"></div>`);
      debugContainer = nodePanel.querySelector(".sidebar-tab-pane-body");
    }
    if (!debugContainer) {
      return;
    }
    const html = [
      `<div class="form-group" id="wmebed-node-debug-group" data-node-id="${nodeId}">`,
      `<wz-label html-for="">Debug</wz-label>`,
      `<div class="controls">`,
      `<div class="controls-container">`,
      `<i id="wmebed-node-debug" class="w-icon w-icon-map-edit EP2-icon EP2-clickable"></i>`,
      `<i id="wmebed-node-sdk" class="w-icon w-icon-script EP2-icon EP2-clickable"></i>`,
      `</div>`,
      `</div>`,
      `</div>`
    ].join("");
    debugContainer.insertAdjacentHTML("beforeend", html);
    document.getElementById("wmebed-node-debug")?.addEventListener("click", () => {
      let node = null;
      try {
        const selected = W?.selectionManager?.getSelectedDataModelObjects?.();
        node = Array.isArray(selected) ? selected[0] ?? null : null;
      } catch {
        node = null;
      }
      if (!node) return;
      makeModal(`Node ${node?.id ?? ""}`.trim(), void 0, node, "WME", void 0);
    });
    createTooltip("wmebed-node-debug", "WME", "top");
    document.getElementById("wmebed-node-sdk")?.addEventListener("click", () => {
      const currentSelection = sdk2.Editing.getSelection();
      if (!currentSelection || currentSelection.objectType !== "node") return;
      const currentNodeId = Number(currentSelection.ids?.[0]);
      if (!Number.isFinite(currentNodeId)) return;
      const node = sdk2.DataModel.Nodes.getById({ nodeId: currentNodeId });
      if (!node) return;
      const connectedSegments = (node.connectedSegmentIds ?? []).map((segmentId) => sdk2.DataModel.Segments.getById({ segmentId })).filter(Boolean);
      makeModal(
        `Node ${currentNodeId}`,
        void 0,
        {
          selection: currentSelection,
          node,
          connectedSegments
        },
        "WME SDK",
        void 0
      );
    });
    createTooltip("wmebed-node-sdk", "WME SDK", "top");
  }
  function handleNodeSelectionChange() {
    const sdk2 = getSdk();
    const selection = sdk2.Editing.getSelection();
    if (!selection || selection.objectType !== "node") {
      clearNodeDebugGroup();
      return;
    }
    const editPanel = document.querySelector("#edit-panel");
    if (!editPanel) {
      return;
    }
    const apply = (tries = 0) => {
      const currentSelection = sdk2.Editing.getSelection();
      const hasNodePanel = Boolean(document.querySelector("#edit-panel .node"));
      if (!currentSelection || currentSelection.objectType !== "node" || !hasNodePanel) {
        if (tries < 12) {
          setTimeout(() => apply(tries + 1), 200);
        }
        return;
      }
      insertNodeDebugGroup();
    };
    if (nodeDebugObserver) {
      nodeDebugObserver.disconnect();
      nodeDebugObserver = null;
    }
    nodeDebugObserver = new MutationObserver(() => {
      const currentSelection = sdk2.Editing.getSelection();
      const hasNodePanel = Boolean(document.querySelector("#edit-panel .node"));
      if (!currentSelection || currentSelection.objectType !== "node" || !hasNodePanel) {
        return;
      }
      nodeDebugObserver?.disconnect();
      nodeDebugObserver = null;
      insertNodeDebugGroup();
    });
    nodeDebugObserver.observe(editPanel, { childList: true, subtree: true });
    apply();
  }
  var bigJunctionDebugObserver = null;
  function getActiveEditObjectPanel() {
    const contents = document.querySelector("#edit-panel > .contents");
    return contents?.firstElementChild ?? null;
  }
  function ensureSidebarBody(panel) {
    let body = panel.querySelector(".sidebar-tab-pane-body");
    if (!body) {
      panel.insertAdjacentHTML("beforeend", `<div class="sidebar-tab-pane-body" id="wmebed-bj-debug-body"></div>`);
      body = panel.querySelector(".sidebar-tab-pane-body");
    }
    return body ?? panel;
  }
  function removeBigJunctionDebugGroup() {
    document.getElementById("wmebed-bigjunction-debug-group")?.remove();
  }
  function insertBigJunctionDebugGroup() {
    const sdk2 = getSdk();
    const selection = sdk2.Editing.getSelection();
    if (!selection || selection.objectType !== "bigJunction" || getSettings().Debug !== true) {
      removeBigJunctionDebugGroup();
      return;
    }
    const bigJunctionId = Number(selection.ids?.[0]);
    if (!Number.isFinite(bigJunctionId)) {
      return;
    }
    const panel = getActiveEditObjectPanel();
    if (!panel) {
      return;
    }
    const body = ensureSidebarBody(panel);
    const existing = document.getElementById("wmebed-bigjunction-debug-group");
    const existingId = existing?.getAttribute("data-bigjunction-id");
    if (existing && existingId === String(bigJunctionId)) {
      return;
    }
    existing?.remove();
    const html = [
      `<div class="form-group" id="wmebed-bigjunction-debug-group" data-bigjunction-id="${bigJunctionId}">`,
      `<wz-label html-for="">Debug</wz-label>`,
      `<div class="controls">`,
      `<div class="controls-container">`,
      `<i id="wmebed-bigjunction-debug" class="w-icon w-icon-map-edit EP2-icon EP2-clickable"></i>`,
      `<i id="wmebed-bigjunction-sdk" class="w-icon w-icon-script EP2-icon EP2-clickable"></i>`,
      `</div>`,
      `</div>`,
      `</div>`
    ].join("");
    body.insertAdjacentHTML("beforeend", html);
    document.getElementById("wmebed-bigjunction-debug")?.addEventListener("click", () => {
      let bigJunction = null;
      try {
        const selected = W?.selectionManager?.getSelectedDataModelObjects?.();
        bigJunction = Array.isArray(selected) ? selected[0] ?? null : null;
      } catch {
        bigJunction = null;
      }
      if (!bigJunction) return;
      makeModal(`Big Junction ${bigJunction?.id ?? ""}`.trim(), void 0, bigJunction, "WME", void 0);
    });
    createTooltip("wmebed-bigjunction-debug", "WME", "top");
    document.getElementById("wmebed-bigjunction-sdk")?.addEventListener("click", () => {
      const currentSelection = sdk2.Editing.getSelection();
      if (!currentSelection || currentSelection.objectType !== "bigJunction") return;
      const id = Number(currentSelection.ids?.[0]);
      if (!Number.isFinite(id)) return;
      const bigJunction = sdk2.DataModel.BigJunctions.getById({ bigJunctionId: id });
      if (!bigJunction) return;
      let allPossibleTurns = [];
      try {
        allPossibleTurns = sdk2.DataModel.BigJunctions.getAllPossibleTurns({ bigJunctionId: id }) ?? [];
      } catch {
        allPossibleTurns = [];
      }
      makeModal(
        `Big Junction ${id}`,
        void 0,
        {
          selection: currentSelection,
          bigJunction,
          allPossibleTurns
        },
        "WME SDK",
        void 0
      );
    });
    createTooltip("wmebed-bigjunction-sdk", "WME SDK", "top");
  }
  function handleBigJunctionSelectionChange() {
    const sdk2 = getSdk();
    const selection = sdk2.Editing.getSelection();
    if (!selection || selection.objectType !== "bigJunction") {
      removeBigJunctionDebugGroup();
      return;
    }
    const editPanel = document.querySelector("#edit-panel");
    if (!editPanel) {
      return;
    }
    const runWithRetry = (tries = 0) => {
      const currentSelection = sdk2.Editing.getSelection();
      const hasPanel = Boolean(getActiveEditObjectPanel());
      if (!currentSelection || currentSelection.objectType !== "bigJunction" || !hasPanel) {
        if (tries < 12) {
          setTimeout(() => runWithRetry(tries + 1), 200);
        }
        return;
      }
      insertBigJunctionDebugGroup();
    };
    if (bigJunctionDebugObserver) {
      bigJunctionDebugObserver.disconnect();
      bigJunctionDebugObserver = null;
    }
    bigJunctionDebugObserver = new MutationObserver(() => {
      const currentSelection = sdk2.Editing.getSelection();
      if (!currentSelection || currentSelection.objectType !== "bigJunction" || !getActiveEditObjectPanel()) {
        return;
      }
      bigJunctionDebugObserver?.disconnect();
      bigJunctionDebugObserver = null;
      insertBigJunctionDebugGroup();
    });
    bigJunctionDebugObserver.observe(editPanel, { childList: true, subtree: true });
    runWithRetry();
  }
  var permanentHazardDebugObserver = null;
  function getActiveEditObjectPanel2() {
    const contents = document.querySelector("#edit-panel > .contents");
    return contents?.firstElementChild ?? null;
  }
  function ensureSidebarBody2(panel) {
    let body = panel.querySelector(".sidebar-tab-pane-body");
    if (!body) {
      panel.insertAdjacentHTML("beforeend", `<div class="sidebar-tab-pane-body" id="wmebed-hz-debug-body"></div>`);
      body = panel.querySelector(".sidebar-tab-pane-body");
    }
    return body ?? panel;
  }
  function removePermanentHazardDebugGroup() {
    document.getElementById("wmebed-hazard-debug-group")?.remove();
  }
  function insertPermanentHazardDebugGroup() {
    const sdk2 = getSdk();
    const selection = sdk2.Editing.getSelection();
    if (!selection || selection.objectType !== "permanentHazard" || getSettings().Debug !== true) {
      removePermanentHazardDebugGroup();
      return;
    }
    const cameraId = Number(selection.ids?.[0]);
    if (!Number.isFinite(cameraId)) {
      return;
    }
    const panel = getActiveEditObjectPanel2();
    if (!panel) {
      return;
    }
    const body = ensureSidebarBody2(panel);
    const existing = document.getElementById("wmebed-hazard-debug-group");
    const existingId = existing?.getAttribute("data-camera-id");
    if (existing && existingId === String(cameraId)) {
      return;
    }
    existing?.remove();
    const html = [
      `<div class="form-group" id="wmebed-hazard-debug-group" data-camera-id="${cameraId}">`,
      `<wz-label html-for="">Debug</wz-label>`,
      `<div class="controls">`,
      `<div class="controls-container">`,
      `<i id="wmebed-hazard-debug" class="w-icon w-icon-map-edit EP2-icon EP2-clickable"></i>`,
      `<i id="wmebed-hazard-sdk" class="w-icon w-icon-script EP2-icon EP2-clickable"></i>`,
      `</div>`,
      `</div>`,
      `</div>`
    ].join("");
    body.insertAdjacentHTML("beforeend", html);
    document.getElementById("wmebed-hazard-debug")?.addEventListener("click", () => {
      let camera = null;
      try {
        const selected = W?.selectionManager?.getSelectedDataModelObjects?.();
        camera = Array.isArray(selected) ? selected[0] ?? null : null;
      } catch {
        camera = null;
      }
      if (!camera) return;
      makeModal(`Camera ${camera?.id ?? ""}`.trim(), void 0, camera, "WME", void 0);
    });
    createTooltip("wmebed-hazard-debug", "WME", "top");
    document.getElementById("wmebed-hazard-sdk")?.addEventListener("click", () => {
      const currentSelection = sdk2.Editing.getSelection();
      if (!currentSelection || currentSelection.objectType !== "permanentHazard") return;
      const id = Number(currentSelection.ids?.[0]);
      if (!Number.isFinite(id)) return;
      const camera = sdk2.DataModel.PermanentHazards.getCameraById({ cameraId: id });
      if (!camera) return;
      makeModal(
        `Camera ${id}`,
        void 0,
        {
          selection: currentSelection,
          camera
        },
        "WME SDK",
        void 0
      );
    });
    createTooltip("wmebed-hazard-sdk", "WME SDK", "top");
  }
  function handlePermanentHazardSelectionChange() {
    const sdk2 = getSdk();
    const selection = sdk2.Editing.getSelection();
    if (!selection || selection.objectType !== "permanentHazard") {
      removePermanentHazardDebugGroup();
      return;
    }
    const editPanel = document.querySelector("#edit-panel");
    if (!editPanel) {
      return;
    }
    const runWithRetry = (tries = 0) => {
      const currentSelection = sdk2.Editing.getSelection();
      const hasPanel = Boolean(getActiveEditObjectPanel2());
      if (!currentSelection || currentSelection.objectType !== "permanentHazard" || !hasPanel) {
        if (tries < 12) {
          setTimeout(() => runWithRetry(tries + 1), 200);
        }
        return;
      }
      insertPermanentHazardDebugGroup();
    };
    if (permanentHazardDebugObserver) {
      permanentHazardDebugObserver.disconnect();
      permanentHazardDebugObserver = null;
    }
    permanentHazardDebugObserver = new MutationObserver(() => {
      const currentSelection = sdk2.Editing.getSelection();
      if (!currentSelection || currentSelection.objectType !== "permanentHazard" || !getActiveEditObjectPanel2()) {
        return;
      }
      permanentHazardDebugObserver?.disconnect();
      permanentHazardDebugObserver = null;
      insertPermanentHazardDebugGroup();
    });
    permanentHazardDebugObserver.observe(editPanel, { childList: true, subtree: true });
    runWithRetry();
  }
  function initSelectionHandling() {
    initVenueSelectionBootstrap();
    const applySelection = () => {
      restoreVenueTabPane();
      let selection;
      try {
        selection = getSdk().Editing.getSelection();
      } catch (error) {
        const message = String(error?.message ?? error ?? "");
        if (message.includes("googlePlace")) {
          handleGooglePlaceSelectionChange();
          return;
        }
        if (getSettings().Debug === true) {
          log(error, 3);
        }
        return;
      }
      if (!selection) {
        return;
      }
      if (String(selection?.objectType ?? "") === "googlePlace") {
        handleGooglePlaceSelectionChange();
        return;
      }
      if (selection.objectType === "venue") {
        handleVenueSelectionChange();
        return;
      }
      if (selection.objectType === "segment") {
        handleSegmentSelectionChange();
        return;
      }
      if (selection.objectType === "node") {
        handleNodeSelectionChange();
        return;
      }
      if (selection.objectType === "bigJunction") {
        handleBigJunctionSelectionChange();
        return;
      }
      if (selection.objectType === "permanentHazard") {
        handlePermanentHazardSelectionChange();
      }
    };
    const applySelectionWithRetry = (tries = 0) => {
      let selection;
      try {
        selection = getSdk().Editing.getSelection();
      } catch (error) {
        const message = String(error?.message ?? error ?? "");
        if (message.includes("googlePlace")) {
          handleGooglePlaceSelectionChange();
        } else if (getSettings().Debug === true) {
          log(error, 3);
        }
        return;
      }
      if (!selection) {
        if (tries < 10) {
          setTimeout(() => applySelectionWithRetry(tries + 1), 200);
        }
        return;
      }
      applySelection();
    };
    onSelectionChanged(function() {
      applySelection();
    });
    onFeatureEditorOpened((featureType) => {
      if (featureType === "segment" || featureType === "node" || featureType === "bigJunction" || featureType === "permanentHazard") {
        applySelection();
      }
    });
    applySelectionWithRetry();
  }
  function initWmecs(sdk2) {
    if (!isWmecsUser(getCurrentUserName())) return;
    if (typeof WMECS === "undefined") return;
    WazeWrap.Alerts.info(GM_info.script.name, "WMECS has been loaded.");
    sdk2.Events.on({
      eventName: "wme-map-move-end",
      eventHandler: () => processAdsResponse(null, null, "WMECS")
    });
  }
  function initializeI18n() {
    const currentLocale = I18n.currentLocale();
    log(`i18n Initialized - ${currentLocale}`, 0);
    const translations = {
      en: {
        tab_title: `${SCRIPT_NAME}`,
        settings_1: "Enable Debug Mode",
        settings_2: "Open Ad tab when Linked Ad Pin is selected",
        settings_3: "Show Pop-Up when ads are searched",
        settings_4: "Center Ad Pin On Click",
        search_for_ads: "Search for Ads",
        by_name: "By Name",
        on_screen: "On Screen",
        clear_ad_pins: "Clear Ad Pins",
        report_an_issue: "Report an Issue on GitHub",
        report_misplaced_ad_pin: "Report Misplaced Ad Pin",
        help: "Help",
        gas_prices: "Gas Prices",
        popup_request: "Please enter the name of the requested ads",
        invalid_gas: "Why would you even think there are gas prices yet? You haven't even saved the place yet.",
        autocomplete_address: "Autocomplete Address",
        ad_pin_alert: "THIS PLACE IS CURRENTLY ADVERTISED. PLEASE USE THE LINK BELOW TO REPORT A MISPLACED AD PIN.",
        ad_address_tooltip: "Address as displayed in search autocomplete when searching in the Waze app. Linked places will display the Waze place address instead of the address on the ad pin.",
        select_nearby: "Select Nearby Waze Place",
        create_new_place: "Create New Place at Ad Pin",
        open_in_waze: "Open in the Waze app",
        ad_open_tooltip: "Attempt to open ad in the Waze app",
        no_gas_prices: "No gas prices have been reported yet. Time for a road trip!",
        gas_price_reminder: "Reminder:\nGas prices can't be updated in WME.\nPlease do not report incorrect gas prices.",
        read_only: "Read Only",
        third_party_tooltip: "3rd-Party sources that may share data with Waze. If more information is available, the button can be clicked.",
        beacons_tooltip: `This was added by ${SCRIPT_SHORT_NAME}`,
        tool_rank_lock: "This tool is only available for rank 4 and above",
        gas: {
          regular: "Regular",
          regularself: "Regular (Self)",
          diesel: "Diesel",
          midgrade: "Midgrade",
          premium: "Premium",
          lpg: "LPG",
          gpl: "LPG",
          gas: "Natural Gas"
        },
        areas: {
          US: "United States"
        },
        update: {
          message: "",
          v0_0_0_0: ""
        }
      },
      es: {
        tab_title: `${SCRIPT_NAME}`,
        settings_1: "Habilitar el modo de Limpiar",
        settings_2: "Abrir el Ajuste del Anuncio, cuando se seleccione el pin de Anuncio Vinculado",
        settings_3: "Mostrar una ventana extra, Cuando se Buscan Anuncios",
        settings_4: "Centrar el Pin del Anuncio al hacer Clic",
        search_for_ads: "Buscar por Anuncios",
        by_name: "Por Nombre",
        on_screen: "En Pantalla",
        clear_ad_pins: "Borrar Pin de anuncion",
        report_an_issue: "Reportar Un Problema En GitHub",
        help: "Ayuda",
        gas_prices: "Precios de Gasolina",
        popup_request: "Por Favor Ingresa el Nombre del los Anuncios Solicitados",
        invalid_gas: "Por que pensarias que hay precios de Gasolina? Si ni siquiera has guardado el Lugar todavia.",
        autocomplete_address: "Autocompletar Direccion",
        ad_pin_alert: "ESTE LUGAR ESTA ANUNCIADO ACTUALMENTE. UTILICE EL ENLACE SIGUIENTE PARA INFORMAR SOBRE UN PIN EXTRAVIADO.",
        ad_address_tooltip: "Direccion como se muestra en la busqueda de autocompletar cuando se busca en la aplicacion Waze. Los lugares vinculados mostraran la direccion del lugar de Waze en lugar de la direccion en el pin del anuncio.",
        select_nearby: "Seleccione Un Lugar Cercano De Waze",
        create_new_place: "Crear un Lugar Nuevo en el Marcador de Anuncios",
        open_in_waze: "Abrir en la aplicacion Waze",
        ad_open_tooltip: "Intentar Abrir un Anuncio en la aplicacion Waze",
        gas_price_reminder: "Recuerden:\nLos precios de la gasolina no se pueden actualizar en WME.\nPor favor no informar precios de gasolina incorrectos.",
        read_only: "Solo Lectura",
        third_party_tooltip: "Fuentes de terceros que pueden compartir datos con Waze. Si hay mas informacion disponible, se puede dar click en el boton.",
        gas: {
          regular: "Regular",
          regularself: "Regular (Servicio propio)",
          diesel: "Diesel",
          midgrade: "grado medio",
          premium: "Premium",
          lpg: "LPG",
          gpl: "LPG",
          95: "95",
          98: "98"
        },
        areas: {
          US: "Estados Unidos"
        }
      },
      it: {
        gas: {
          regular: "Benzina",
          diesel: "Gasolio",
          lpg: "GPL",
          gpl: "GPL",
          gas: "Metano",
          95: "95",
          98: "98"
        }
      },
      fr: {
        tab_title: `${SCRIPT_NAME}`,
        settings_1: "Activer le mode d\xE9bogage",
        settings_2: "Ouvrir l'onglet Publicit\xE9 quand une publicit\xE9 est s\xE9lectionn\xE9e",
        settings_3: "Ouvrir un pop-up lors de la recherche",
        settings_4: "Centrer la publicit\xE9 au clic",
        search_for_ads: "Rechercher une pub",
        by_name: "Par nom",
        on_screen: "A l'\xE9cran",
        clear_ad_pins: "Effacer le Pin Publicitaire",
        report_an_issue: "Signaler un probl\xE8me sur GitHub",
        help: "Aide",
        gas_prices: "Prix carburants",
        popup_request: "Veuillez entrer le nom de la publicit\xE9 demand\xE9e",
        invalid_gas: "Pourquoi pensez-vous qu'il y a d\xE9j\xE0 des prix de l'essence ? Vous n'avez m\xEAme pas encore sauvegard\xE9 le lieu.",
        autocomplete_address: "Remplir automatiquement l'adresse",
        ad_pin_alert: "CE LIEU FAIT L'OBJET D'UNE ANNONCE. VEUILLEZ UTILISER LE LIEN CI-DESSOUS POUR SIGNALER UNE ERREUR D'AFFICHAGE.",
        ad_address_tooltip: "L'adresse telle qu'elle est affich\xE9e dans l'autocompl\xE9tion de recherche lors d'une recherche dans l'app Waze. Les lieux li\xE9s afficheront l'adresse du lieu Waze au lieu de l'adresse sur l'\xE9pingle de l'annonce.",
        select_nearby: "S\xE9lectionnez un lieu Waze proche",
        create_new_place: "Cr\xE9er un nouveau lieu sur la publicit\xE9",
        open_in_waze: "Ouvrir dans l'app Waze",
        ad_open_tooltip: "Tentative d'ouverture de la pub dans l'app Waze",
        gas_price_reminder: "Rappel:\nLes prix des carburants ne peuvent pas \xEAtre mis \xE0 jour dans WME.\nNe signalez pas une erreur de prix.",
        read_only: "Lecture seulement",
        third_party_tooltip: "Les sources tierces qui peuvent partager des donn\xE9es avec Waze. Si plus d'informations sont disponibles, le bouton est cliquable.",
        gas: {
          regular: "Gasolina (E5)",
          diesel: "Gas\xF3leo (B7)",
          midgrade: "Gasolina (E10)",
          regularself: "Essence (Self)",
          premium: "Premium",
          lpg: "GPL",
          gpl: "GPL",
          gas: "Gaz naturel",
          95: "95",
          98: "98"
        },
        areas: {
          US: "Etats-Unis"
        }
      },
      "pt-PT": {
        tab_title: `${SCRIPT_NAME}`,
        settings_1: "Ativar modo de depura\xE7\xE3o",
        settings_2: "Abrir o separador Ad-Pin quando selecionar um local com an\xFAncio",
        settings_3: "Mostrar pop-up aquando da pesquisa por an\xFAncios",
        settings_4: "Centrar mapa quando clicar no an\xFAncio",
        search_for_ads: "Procurar an\xFAncios",
        by_name: "Por nome",
        on_screen: "Na \xE1rea vis\xEDvel",
        clear_ad_pins: "Limpar alfinetes",
        report_an_issue: "Reportar um problema no GitHub",
        report_misplaced_ad_pin: "Reportar alfinete no s\xEDtio errado",
        help: "Ajuda",
        gas_prices: "Pre\xE7os dos combust\xEDveis",
        popup_request: "Digite o nome do an\xFAncio a pesquisar",
        invalid_gas: "Porque pensa que estariam dispon\xEDveis pre\xE7os dos combust\xEDveis? Ainda nem sequer guardou o local!",
        autocomplete_address: "Autocompletar morada",
        ad_pin_alert: "ESTE LOCAL CONTEM AN\xDANCIOS. USE A LIGA\xC7\xC3O ABAIXO PARA REPORTAR UM ALFINETE QUE SE ENCONTRE NO S\xCDTIO ERRADO.",
        ad_address_tooltip: "Morada que \xE9 mostrada nas pesquisas efetuadas no Waze. Locais com liga\xE7\xE3o para fontes externas ir\xE3o mostrar a morada que consta no Waze, em detrimento da morada mostrada no an\xFAncio.",
        select_nearby: "Selecione um local do Waze perto do alfinete",
        create_new_place: "Criar um novo local no s\xEDtio do alfinete ",
        open_in_waze: "Abrir no Waze",
        ad_open_tooltip: "Tentar abrir an\xFAncio no Waze ",
        gas_price_reminder: "Aten\xE7\xE3o:\nOs pre\xE7os de combust\xEDveis n\xE3o podem ser atualizados no WME.\nPor favor n\xE3o reporte pre\xE7os de combust\xEDveis errados.",
        read_only: "S\xF3 de leitura",
        third_party_tooltip: "Fontes de terceiros que podem partilhar dados com o Waze. Se existir mais informa\xE7\xE3o dispon\xEDvel, pode clicar no bot\xE3o.",
        gas: {
          regular: "Gasolina (E5)",
          diesel: "Gas\xF3leo (B7)",
          midgrade: "Gasolina (E10)",
          gpl: "GPL"
        },
        areas: {
          US: "Estados Unidos"
        }
      }
    };
    translations["en-GB"] = translations["en-US"] = translations["en-AU"] = translations.en;
    translations["es-419"] = translations.es;
    I18n.translations[currentLocale].wmebed = translations.en;
    Object.keys(translations).forEach((locale) => {
      if (currentLocale === locale) {
        addFallbacks(translations[locale], translations.en);
        I18n.translations[locale].wmebed = translations[locale];
      }
    });
    function addFallbacks(localeStrings, fallbackStrings) {
      Object.keys(fallbackStrings).forEach((key) => {
        if (!localeStrings[key]) {
          localeStrings[key] = fallbackStrings[key];
        } else if (typeof localeStrings[key] === "object") {
          addFallbacks(
            localeStrings[key],
            fallbackStrings[key]
          );
        }
      });
    }
  }
  function ensureWazeDevToastrFallback() {
    const windowRef = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
    if (windowRef.wazedevtoastr) return;
    const logToast = (level) => {
      return (message, title) => {
        const scriptName = title ? String(title) : "";
        const text = message ? String(message) : "";
        if (level === "warning") {
          console.warn(scriptName, text);
        } else if (level === "error") {
          console.error(scriptName, text);
        } else {
          console.log(scriptName, text);
        }
      };
    };
    windowRef.wazedevtoastr = {
      info: logToast("info"),
      success: logToast("success"),
      warning: logToast("warning"),
      error: logToast("error"),
      clear: () => {
      }
    };
    console.warn("wazedevtoastr missing; fallback logger installed.");
  }
  function waitForDomReady() {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
    });
  }
  async function bootstrap() {
    await waitForDomReady();
    ensureWazeDevToastrFallback();
    if (window.location.host === "support.google.com") {
      log("Google Form Detected");
      bootstrapFillForm();
      return;
    }
    injectCss();
    try {
      const sdk2 = await initSdk();
      await sdk2.Events.once({ eventName: "wme-ready" });
      initializeI18n();
      await initSettingsTab();
      initializeSettings();
      initAdsLayer();
      initSelectionHandling();
      installToastPromptKeyHandlers();
      initWmecs(sdk2);
      log("Bootstrap complete", 1);
    } catch (error) {
      console.error(`${SCRIPT_SHORT_NAME} bootstrap failed:`, error);
      return;
    }
  }
  void bootstrap();
})();
