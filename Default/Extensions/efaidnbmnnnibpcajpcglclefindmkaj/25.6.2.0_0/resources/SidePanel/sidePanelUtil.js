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
import e from"../../libs/readability.js";const{Readability:n,isProbablyReaderable:t}=e;function a(e){return e.clientHeight>0&&e.clientWidth>0}async function r(e,n=!0){const r=()=>t(e,{minContentLength:70,minScore:10,visibilityChecker:n?a:void 0});if(r())return!0;const i=(await chrome.runtime.sendMessage({type:"get_sidepanel_state"})).isOpen?1500:5e3,s=Date.now();return new Promise((e=>{const n=setInterval((()=>{r()&&(clearInterval(n),clearTimeout(t),e(!0),chrome.runtime.sendMessage({main_op:"log-info",log:{message:"Webpage is readable after x seconds",seconds:((Date.now()-s)/1e3).toFixed(1)}}))}),300),t=setTimeout((()=>{clearInterval(n),e(!1)}),i)}))}async function i(e){const t=(new DOMParser).parseFromString(e,"text/html");if(await r(t,!1)){return new n(t).parse().content}return e}async function s(e){return(await chrome.i18n.detectLanguage(e)).languages.reduce(((e,n)=>e.percentage>n.percentage?e:n),{language:"en",percentage:0})}export{r as isProbablyReaderableAsync,i as getReadableContent,s as getContentLocale};