/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
*  Copyright 2015 Adobe Systems Incorporated
*  All Rights Reserved.
*
* NOTICE:  All information contained herein is, and remains
* the property of Adobe Systems Incorporated and its suppliers,
* if any.  The intellectual and technical concepts contained
* herein are proprietary to Adobe Systems Incorporated and its
* suppliers and are protected by all applicable intellectual property laws,
* including trade secret and or copyright laws.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe Systems Incorporated.
**************************************************************************/
import{util as e}from"../js/content-util.js";import{events as t}from"../../common/analytics.js";import{dcSessionStorage as n}from"../../common/local-storage.js";import{OptionPageActions as a}from"../../common/constant.js";await n.init(),e.sendAnalytics(t.AI_ASSISTANT_SUMMARY_PILL_SHOWN),window.matchMedia("(prefers-color-scheme: dark)").matches?document.documentElement.setAttribute("data-theme","dark"):document.documentElement.setAttribute("data-theme","light"),window.addEventListener("message",(e=>{"exit"===e.data.action&&document.querySelector(".popup").classList.add("exit")})),$(document).ready((()=>{e.translateElements(".translate");const s=e.getSearchParamFromURL("pdfMarkerLink",window.location.href);$("#getSummary").click((()=>{e.sendAnalytics(t.AI_ASSISTANT_SUMMARY_CTA_CLICKED),n.setWithTTL("pdfMarkerAction",!0,5e3),s&&chrome.tabs.create({url:s,active:!0})}));let m=!1;$("#menu").click((()=>{m=!m,m?($("#menu").attr("src","../images/SDC_Close_18_N.svg"),$("#menu").addClass("active"),$(".menuList").show(),e.sendAnalytics(t.AI_ASSISTANT_MENU_DROPDOWN_SHOWN)):($("#menu").attr("src","../images/SDC_ShowMenu_18_N.svg"),$("#menu").removeClass("active"),$(".menuList").hide())})),$("#menuItem1").click((()=>{e.sendAnalytics(t.AI_ASSISTANT_MENU_HIDE_FOR_SESSION_CLICKED),chrome.runtime.sendMessage({main_op:"hideAIMarkerPopup",href:s})})),$("#menuItem2").click((()=>{e.sendAnalytics(t.AI_ASSISTANT_MENU_SETTINGS_CLICKED),chrome.runtime.openOptionsPage((e=>{setTimeout((()=>{chrome.runtime.sendMessage({requestType:a.OPTIONS_HIGHLIGHT_SECTION,sectionIds:["aiMarkerTouchpointPreferenceTitle","aiMarkerTouchpointBanner"]})}),100)}))}))}));