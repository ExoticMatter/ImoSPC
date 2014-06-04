(function(n,R){function Ka(a){function b(){throw new TypeError("Illegal constructor");}a&&v(b,"prototype",a);return b}function La(){for(var a=-1,b=arguments.length;++a<b;){var c=arguments[a].prototype;v(c,"constructor",kb);v(arguments[a],"prototype",c)}}function oa(a){var b;b=i["on"+a];if(b!==Z[a]&&j(b))b=1;else{b=u[a];var c=b.length,d=0;if(Array.isArray(b)&&c){for(var e=-1,g=b.length;++e<g;){var f=b[e];!j(f)&&(!l(f)||!j(f.handleEvent))&&d++}b=d<c}else b=void 0}if(!b)throw new TypeError(a+" event must be handled.");
}function Ma(a,b,c){a=u[a];if(Array.isArray(a))for(var d=-1,e=a.length;++d<e;){var g=a[d];j(g)?g.call(b,c):l(g)&&j(g.handleEvent)&&g.handleEvent(c)}}function $(a,b,c){var d=i["on"+a],b=b||i;if(d!==Z[a]&&j(d))try{d.call(b,c)}catch(e){}else Ma(a,b,c)}function Ba(a){$("initerror",0,a)}function ga(a){$("loaderror",0,a)}function N(a){$("playstatechange",0,a)}function pa(a,b,c){a.prototype[b]||(a.prototype[b]=c)}function l(a){return a!==g&&a!==B}function j(a){return"function"===typeof a}function Ca(){}
function Na(a){if(!isNaN(a))return a;for(var a=String(a),b=0,c=-1,d=a.length;++c<d;)b=31*b+a.charCodeAt(c);return b}function qa(a){a.length=0}function w(a,b){return(a||"").localeCompare(b||"")}function Oa(a,b){return w(a.url,b.url)||w(a.title,b.title)}function Da(a,b){return w(a.title,b.title)||w(a.url,b.url)}function Ea(a,b){return w(a.osttitle,b.osttitle)||(a.ostdisc|0)-(b.ostdisc|0)||(a.osttracknum|0)-(b.osttracknum|0)||w(a.osttrackchar,b.osttrackchar)||Da(a,b)}function aa(a){var b="[ImoSPC v1.9.1, "+
("html5"===a?"HTML5]":"unitialized]");z(this,{runtime:a,major:1,minor:9,build:1,toString:function(){return b}})}function ba(a,b){z(this,{version:a||ra,error:b||sa})}function K(a,b,c,d,e,f,h){z(this,{url:a,userdata:b,track:c,playlist:f?B:d,corruptFiles:e,error:f,httpStatus:"download error"===f?h:g})}function I(a,b,c,d,e,g){z(this,{state:a,track:b,playlist:c,index:d,previousTrack:e,previousIndex:g})}function Pa(a){if(C!==g)a(C);else{var b=n.webkitURL||n.URL;if(!Qa||!ta||!ha||!lb||!n.Blob||!j(b.createObjectURL))F=
D(ka?["flash"]:[]),a(C=!1);else try{var c=new Blob(['postMessage(self.FileReaderSync?"a":"")'],{type:"text/javascript"}),d=b.createObjectURL(c),e=new ta(d);e.onmessage=function(c){b.revokeObjectURL(d);e.terminate();F=c?["html5"]:[];ka&&F.unshift("flash");D(F);a(C=!!c)}}catch(f){F=D(ka?["flash"]:[]),a(C=!1)}}}function mb(a){for(var b="",a=a.split("%"),c=1,d=a.length;c<d;){var e=parseInt(a[c++],16);if(127<e){var g,f;if(192===(e&224))g=1,e&=31,f=128;else if(224===(e&240))g=2,e&=15,f=2048;else if(240===
(e&248))g=3,e&=7,f=65536;else{for(g=248===(e&252)?4:252===(e&254)?5:0;0<=--g;){var h=parseInt(a[c],16);if(128!==(h&192))break;c++}e=65533}for(;0<=--g;){h=parseInt(a[c],16);if(128!==(h&192)){e=65533;break}c++;e=e<<6|h&63}if(e<f||1114111<e||65534===e||65535===e)e=65533}65535<e?(e-=65536,b+=String.fromCharCode(55296+(e>>10),56320+(e&1023))):b+=String.fromCharCode(e)}return b}function Ra(){var a=[],b=[],c=[];this.remove=function(d){for(var e=Na(d),g=-1,f=a.length;++g<f;)if(a[g]===e&&b[g]===d)return d=
c[g],a.splice(g,1),b.splice(g,1),c.splice(g,1),d};this.add=function(d,e){a.push(Na(d));b.push(d);c.push(e)}}function O(a){var b=this;nb.forEach(function(c,e){v(b,c,a[e])});var c=a[0];if(c){var d,c=String(c),e=c.indexOf("#");0<=e?(d=c.substring(0,e),c=c.substring(e+1),c=String(c).replace(/((?:%[a-f\d]{2})+)/ig,mb),z(this,{archive:d,path:c}),d=c.substring(c.lastIndexOf("/")+1)):d=c.lastIndexOf("data:",0)?c.lastIndexOf("blob:",0)?c.substring(c.search(/[^\/\\]*$/)):"[blob]":"[data]";v(b,"filename",d)}v(b,
"length",+a[12]+ +a[13])}function S(a){if(!(a instanceof O))throw new TypeError("Track functions can only be called on Track objects.");}function J(a,b){return!a||!b?a===b:a.url===b.url}function P(a){v(this,"tracks",D(a));z(this,{tracks:D(a),length:a.length})}function Fa(a){if(!Array.isArray(a))throw new TypeError("tracks is not an array.");if(!a.length)throw new TypeError("tracks is empty.");a.forEach(function(a){if(!(a instanceof O))throw new TypeError("tracks contains an invalid track.");});P.call(this,
a.slice())}function m(a){if(!(a instanceof P))throw new TypeError("Playlist functions can only be called on Playlist objects.");}function x(a){return(s||p)===a}function Sa(a){function b(){if(j=R.body||R.getElementsByTagName("body")[0])if(j.appendChild(e),t&&(e=n._ImoSwf),Ga(function(){if(d){clearTimeout(d);d=null;T=!1;ua=function(a,b){if(!a)throw new TypeError("url is not specified.");var a=U(location.href,a),d,f;b&&(d=b.autostart,f=b.userdata);(d=!!(d!==g?d:i.autostart))||oa("load");f!==g&&y.add(a,
f);d&&(E(),k=a,s=h=la=l=r=g);e._getinfo(String(a).replace(/[<>&]/g,c))};L=function(a,b,d){ca();l=!1;var i=d?b:g;d&&(b=d.tracks[i]);var j=b.length;if(0>a)a+=j,0>a&&(a=0);else if(a>=j)if(d&&++i<d.tracks.length)a=0,b=d.tracks[i];else return E(),g;if(b!==f){if(!d||d!==p)E();else{e._stop(!1);var m=f,n=q;f=q=g}k=U(location.href,b.url);h=b;s=d;r=i;la=a;e._load(String(k).replace(/[<>&]/g,c),+b._fSt,+b._fLn)||N(new I("loading",h,s,r,m,n))}else r=s=k=h=g,p=d,q=i,e._seek(a),e._resume()};X=function(){return k?
l=!0:e._pause()};da=function(){ca();return k?(l=!1,!0):e._resume()};E=function(){return k?(k=h=s=r=la=g,!0):e._stop(!0)};ea=function(){return e._tell()||-1};ma=function(a){e._setVol(a)};var a={badspc:"invalid spc",badzip:"invalid zip",empty:"empty archive",unkty:"unknown file type",badurl:"invalid url",dlerr:"download error",security:"crossdomain",dlabt:"download aborted",nofile:"path not found in archive",io:"io error"};Ha(function(a,b,c){var d=y.remove(a);if(b.length){for(var e=-1,f=b.length;++e<
f;){var i=b[e]=new O(b[e]);d!==g&&v(i,"userdata",d)}e=new P(b);d!==g&&v(e,"userdata",d);b=new K(a,d,1===b.length?b[0]:g,e,c||[],sa);$("load",0,b);a===k&&!h&&(k=g,a=l,L(0,0,e),l=a)}else ga(new K(a,d,g,g,c,"empty archive"))},function(a){a===k&&(a=la,f=h,p=s,q=r,k=h=s=la=r=g,e._start(l),0<a&&e._seek(a),l&&N(new I("paused",f,p,q)))},function(b,c,d){var c=a[c],e,f,i;h?(e=h.userdata,r=s=k=h=g):(e=y.remove(b),b===k&&(r=s=k=h=g));switch(c){case "download error":f=+d;break;case "invalid spc":case "empty archive":case "path not found in archive":i=
Array.isArray(d)?d:[]}ga(new K(b,e,h,s,i,c,f))},function(a){var b,c=f,d=p,e=q;switch(a){case "buffering":b="buffering";break;case "playing":b="playing";break;case "paused":b="paused";break;case "end":if(p&&i.autoplay&&++q<p.tracks.length){L(0,q,p);return}case "stopped":b="stopped",f=p=q=g}N(new I(b,c,d,e))});va(!0);wa(Ta);var b=new ba(Ta);$("init",0,b)}}),"none"===e.style.display||e.bgInactive)Ba(new ba(B,"swf blocked"));else var d=setTimeout(function(){T=!1;j.removeChild(e);d=e=null;Ba(new ba(B,
"swf load timeout"))},a&&+a.timeout||5E3);else setTimeout(b,100)}function c(a){return m[a]||a}var d=U(xa,"imo-fl.swf"),e=R.createElement("div");e.innerHTML='<object id="_ImoSwf" type="application/x-shockwave-flash" data="'+d+'" style="width:1px;height:1px;position:absolute;top:0;'+(t?'left:-1px" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000':"left:0;visibility:hidden")+'"><param name="movie" value="'+d+'"/><param name="allowScriptAccess" value="always"/></object>';e=e.firstChild;T=!0;var j,
m={"<":"&lt;",">":"&gt;","&":"&amp;"},y=new Ra,l,la;b()}var g,B=null,kb=Ka(),u={init:[],initerror:[],load:[],loaderror:[],playstatechange:[]},Z={},ob=function(a){return function(b){Ma(a,this,b)}},ya;for(ya in u)u.hasOwnProperty(ya)&&(Z[ya]=ob(ya));var t;var Ia=window.navigator.userAgent,Ja=Ia.indexOf("MSIE ");t=0<Ja?parseInt(Ia.substring(Ja+5,Ia.indexOf(".",Ja)),10):void 0;if(!Array.isArray||t&&9>t)Array.isArray=function(a){return"[object Array]"===Object.prototype.toString.call(a)};var Qa=n.ArrayBuffer,
ha=n.AudioContext||n.webkitAudioContext,ta=n.Worker,lb=n.XMLHttpRequest,D=Object.freeze||function(a){return a};pa(Array,"forEach",function(a,b){b||(b=null);for(var c=this.length>>>0,d=-1;++d<c;)d in this&&a.call(b,this[d],d,this)});pa(Array,"indexOf",function(a,b){var c=this.length>>>0,b=b|0;0>b&&(b+=c,0>b&&(b=0));for(;b<c;b++)if(this[b]===a)return b;return-1});var v,z;Object.defineProperty&&(!t||8<t)?(v=function(a,b,c,d){Object.defineProperty(a,b,{configurable:!1,writable:!1,enumerable:!d&&"prototype"!==
b,value:c})},z=function(a,b,c){for(var d in b)b[d]={configurable:!1,writable:!1,enumerable:!c,value:b[d]};Object.defineProperties(a,b)}):(v=function(a,b,c){a[b]=c},z=function(a,b){for(var c in b)b.hasOwnProperty(c)&&(a[c]=b[c])});var U,Ua=function(a){return(a=String(a).replace(/^\s+|\s+$/g,"").match(/^([^:\/?#]+:)?(\/\/(?:[^:@]*(?::[^:@]*)?@)?(([^:\/?#]*)(?::(\d*))?))?([^?#]*)(\?[^#]*)?(#[\s\S]*)?/))?{href:a[0]||"",protocol:a[1]||"",authority:a[2]||"",host:a[3]||"",hostname:a[4]||"",port:a[5]||"",
pathname:a[6]||"",search:a[7]||"",hash:a[8]||""}:null};U=function(a,b){var b=Ua(b||""),a=Ua(a||""),c;if(!b||!a)c=null;else{c=(b.protocol||a.protocol)+(b.protocol||b.authority?b.authority:a.authority);var d;d=b.protocol||b.authority||"/"===b.pathname.charAt(0)?b.pathname:b.pathname?(a.authority&&!a.pathname?"/":"")+a.pathname.slice(0,a.pathname.lastIndexOf("/")+1)+b.pathname:a.pathname;var e=[];d.replace(/^(\.\.?(\/|$))+/,"").replace(/\/(\.(\/|$))+/g,"/").replace(/\/\.\.$/,"/../").replace(/\/?[^\/]*/g,
function(a){"/.."===a?e.pop():e.push(a)});d=e.join("").replace(/^\//,"/"===d.charAt(0)?"/":"");c=c+d+(b.protocol||b.authority||b.pathname?b.search:b.search||a.search)+b.hash}return c};var xa,Va=R.getElementsByTagName("script");xa=U(location.href,Va[Va.length-1].src);var sa=g,pb=D({SUCCESS:sa,UNKNOWN:"unknown error",INVALID_SPC:"invalid spc",INVALID_ZIP:"invalid zip",EMPTY_ARCHIVE:"empty archive",UNKNOWN_FILE_TYPE:"unknown file type",BAD_URL:"invalid url",DOWNLOAD_ERROR:"download error",SECURITY_ERROR:"crossdomain",
DOWNLOAD_ABORTED:"download aborted",IO_ERROR:"io error",PATH_NOT_FOUND:"path not found in archive",BROWSER_NOT_SUPPORTED:"browser not supported",TIMEOUT:"swf load timeout",FLASHBLOCK:"swf blocked"}),Wa=B,qb=D({NONE:Wa,HTML5:"html5",FLASH:"flash"}),rb=D({STOPPED:"stopped",PLAYING:"playing",PAUSED:"paused",BUFFERING:"buffering",LOADING:"loading"}),sb=D({Title:Da,Game:function(a,b){return w(a.game,b.game)||Da(a,b)},URL:Oa,Filename:function(a,b){return w(a.filename,b.filename)||Oa(a,b)},Chronological:Ea});
La(aa);var ra=new aa(Wa),Xa=new aa("html5"),Ta=new aa("flash");La(ba,K,I);var C,F,ka=function(){var a,b,c=navigator.plugins,d=navigator.mimeTypes;if(!t&&c)if(c["Shockwave Flash"])if((a=c["Shockwave Flash"].description)&&(!d||!d["application/x-shockwave-flash"]||d["application/x-shockwave-flash"].enabledPlugin)){var e=a.match(/(\d+)/g);a=e[0];b=e[1]}else return;else return;else if("function"===typeof ActiveXObject)try{e=(new ActiveXObject("ShockwaveFlash.ShockwaveFlash")).GetVariable("$version"),e=
e.split(" ")[1].split(","),a=e[0],b=e[1]}catch(g){return}else return;a=parseInt(a,10);b=parseInt(b,10);return 11<a||11===a&&5<=b}(),ca;if("undefined"!==n.Storage){ca=function(){try{i.allowMultipleInstances||localStorage.setItem("_ImoCurrentInstanceController",localStorage.getItem("_ImoCurrentInstanceController")^1)}catch(a){}};var Ya=function(a){X&&"_ImoCurrentInstanceController"===(a||n.event).key&&X()};j(n.addEventListener)?n.addEventListener("storage",Ya,!1):j(n.attatchEvent)?n.attatchEvent("onstorage",
Ya):ca=Ca}else ca=Ca;var za=1,ua,L,X,da,E,ea,ma,p,f,q,k,h,s,r,y,va,wa,Za,nb="url _ofs title game artist publisher copyright osttitle ostdisc osttrack osttracknum osttrackchar _fSt _fLn".split(" ");z(O.prototype,{play:Za=function(a){S(this);L(+a||0,this)},pause:function(){S(this);return J(h||f,this)?X():!1},unpause:function(){S(this);return J(h||f,this)?da():!1},stop:function(){S(this);return J(h||f,this)?E():!1},time:function(){S(this);return J(f,this)?ea():-1},seek:function(a,b){S(this);if(isNaN(a))throw new TypeError("to must be a number.");
if(J(f,this)&&(a||b)){var c=ea();if(0<=c)return b||(a+=c),L(a,p?q:f,p),!0}return!1},toString:function(a){a=this;return"[ImoSPC.Track, "+(a.title||a.filename||a.url)+"]"}});var $a;z(P.prototype,{constructor:Fa,play:$a=function(a,b){m(this);var c=this.tracks;if(l(a)&&isNaN(a))if(a instanceof O)a=c.indexOf(a);else throw new TypeError("track must be a Track object or the index of a track.");else a=+a;if(l(b)&&isNaN(b))throw new TypeError("startAt must be a number.");if(0>a||a>c.length||!(c[a>>>=0]instanceof
O))throw new RangeError("track is not in the playlist.");L(+b||0,a,this)},pause:function(){m(this);return x(this)?X():!1},unpause:function(){m(this);return x(this)?da():!1},stop:function(){m(this);return x(this)?E():!1},first:function(){m(this);return this.tracks[0]},previous:function(){m(this);return x(this)?this.tracks[(l(r)?r:q)-1]:g},current:function(){m(this);return x(this)?h||f:g},next:function(){m(this);return x(this)?this.tracks[(l(r)?r:q)+1]:g},last:function(){m(this);var a=this.tracks;return a[a.length-
1]},indexOfFirst:function(){m(this);return 0},indexOfPrevious:function(){m(this);return x(this)?q-1:-1},indexOfCurrent:function(){m(this);return x(this)?f:-1},indexOfNext:function(){m(this);var a=this.tracks.length,b=(l(r)?r:q)+1;return x(this)&&b<a?b:-1},indexOfLast:function(){m(this);return this.tracks.length-1},sort:function(a){m(this);if(l(a)){if(!j(a))throw new TypeError("compareFunction is not a function.");}else a=Ea;return new P(this.tracks.slice().sort(a))},sortReverse:function(a){m(this);
if(l(a)){if(!j(a))throw new TypeError("compareFunction is not a function.");}else a=Ea;return new P(this.tracks.slice().sort(a).reverse())},toString:function(){return"[ImoSPC.Playlist, "+this.length+" track(s)]"}});v(Fa,"prototype",P.prototype);var T,i={};z(i,{Error:pb,Runtime:qb,PlaybackState:rb,TrackSort:sb,Playlist:Fa,Track:Ka(O.prototype),InitEvent:ba,LoadEvent:K,PlayStateEvent:I,currentTrack:function(){return h||f},currentPlaylist:function(){return s||p},querySupportedRuntimes:function(a){C!==
g?a(F):Pa(function(){a(F)})},open:function(a,b){ua(a,b)},play:function(a,b,c){if(!arguments.length)throw new TypeError("ImoSPC.play() cannot be called without arguments.");if(a instanceof P)$a.call(a,b,c);else if(a instanceof O)Za.call(a,b);else throw new TypeError("The first argument of ImoSPC.play() must be a track or playlist.");},pause:function(){return X()},unpause:function(){return da()},stop:function(){return E()},time:function(){return ea?ea():-1},getVolume:function(){return za},setVolume:function(a){if(isNaN(a=
+a))throw new TypeError("volume must be a number.");if(0>a||1<a)throw new RangeError("volume must be between 0 and 1.");za=a;ma&&ma(a);return za},canSeek:!0,canSetVolume:!0,addEventListener:function(a,b){if(!j(b)&&(!l(b)||!j(b.handleEvent)))throw new TypeError("callback must be a function or event handler.");var c=u[a];Array.isArray(c)&&c.push(b)},removeEventListener:function(a,b){if(!j(b)&&(!l(b)||!j(b.handleEvent)))throw new TypeError("callback must be a function or event handler.");var c=u[a];
if(Array.isArray(c)){var d=c.lastIndexOf(b);0<=d&&c.splice(d,1)}},toString:function(){return String(this.version)}});if(Object.defineProperties&&(!t||8<t)){var ab=ra,bb=!1,cb=!0;Object.defineProperties(i,{isFunctional:{enumerable:!0,configurable:!1,get:function(){return!(!ua||!L||!X||!da||!E||!ea||!ma)}},version:{enumerable:!0,configurable:!1,get:function(){return ab}},autostart:{enumerable:!0,configurable:!1,get:function(){return bb},set:function(a){bb=!!a}},autoplay:{enumerable:!0,configurable:!1,
get:function(){return cb},set:function(a){cb=!!a}}});va=function(){};wa=function(a){ab=a}}else(va=function(a){i.isFunctional=!!a})(!1),(wa=function(a){i.version=a})(ra),i.autostart=!1,i.autoplay=!0;for(var Aa in u)if(u.hasOwnProperty(Aa)){var db="on"+Aa,eb=Z[Aa];Object.defineProperty&&(!t||8<t)?function(a,b,c){Object.defineProperty(i,b,{enumerable:!0,configurable:!1,get:function(){return c},set:function(d){if(d)if(j(d))c=d;else throw new TypeError(b+" must be a function.");else c=Z[a]}})}(Aa,db,eb):
i[db]=eb}v(n,"ImoSPC",i);var Ga,Ha;if(Object.defineProperties&&(!t||8<t)){var fb,gb,hb,ib,jb;Object.defineProperties(i,{_ready:{enumerable:!1,configurable:!1,get:function(){return fb}},_ongetinfo:{enumerable:!1,configurable:!1,get:function(){return gb}},_loaded:{enumerable:!1,configurable:!1,get:function(){return hb}},_onloaderror:{enumerable:!1,configurable:!1,get:function(){return ib}},_setstate:{enumerable:!1,configurable:!1,get:function(){return jb}}});Ga=function(a){fb=a};Ha=function(a,b,c,d){gb=
a;hb=b;ib=c;jb=d}}else Ga=function(a){i._ready=a},Ha=function(a,b,c,d){i._ongetinfo=a;i._loaded=b;i._onloaderror=c;i._setstate=d};v(i,"init",function(a){oa("init");oa("initerror");if(i.isFunctional||T)throw Error("ImoSPC is already initialized");a&&("autoplay"in a&&(i.autoplay=!!a.autoplay),"autostart"in a&&(i.autostart=!!a.autostart));ka&&(!a||!("preferredRuntime"in a&&"html5"===a.preferredRuntime))?Sa(a):Pa(function(b){if(b){var c=function(){G=new ha;x=G.createGain();x.gain.value=za;x.connect(G.destination);
u=G.createGain();u.connect(x);F=new ta(U(xa,"imo-w-unzip.js"));W=new ta(U(xa,"imo-w-spc.js"));F.onmessage=d;W.onmessage=e;W.postMessage({msg:"setr",rate:V=G.sampleRate});var a=new Qa(1);W.postMessage({msg:"test",x:a},[a]);D=!a.length;c=Ca},d=function(a){var a=a.data,b="ok"===a.msg,c=a.url;switch(a.from){case "info":var d=a.bad||[],e=a.ls,f;a.u&&(f=aa.remove(c));if(b){e=a.ls;if(!e.length){ga(new K(c,f,g,g,d,"empty archive"));break}var i=[];e.forEach(function(a){a=new O(a);f!==g&&v(a,"userdata",f);
i.push(a)});b=new P(i);f!==g&&v(b,"userdata",f);d=new K(c,f,1===b.length?i[0]:g,b,d,sa);$("load",0,d);a.ap&&k===c&&(c=y,L(0,0,b),y=c)}else e=T[a.e]||"unknown error",a="download error"===e?a.code:g,ga(new K(c,f,g,g,d,e,a)),c===k&&(k=h=s=r=B);break;case "load":if(c!==k)break;b?(c=a.url,b=a.fi,a=a.at,W.postMessage({msg:"load",url:c,fi:b},D?[b]:g),a&&W.postMessage({msg:"seek",url:c,to:a*V})):(e=T[a.e]||"unknown error",a="download error"===e?a.code:g,d=h,b=s,k=h=s=r=B,ga(new K(c,d.userdata,d,b,[],e,a)))}},
e=function(a){var a=a.data,b="ok"===a.msg,c=a.url;switch(a.from){case "load":if(c!==k)break;b?(f=h,p=s,q=r,A=ia=C=0,J=+f._fSt,ja=+f.length,y?N(new I("paused",f,p,q)):j(),m()):"wrong url"!==a.e&&ga(new K(c,h.userdata,h,s,[],T[a.e]));k=h=s=r=B;break;case "samp":if(!f||c!==f.url)break;b&&(fa--,M.push(a.dat),m());break;case "seek":if(!f||c!==f.url)break;b&&(A=+a.at,0)}},j=function(){l();H=-1/0;y=0;u.gain.value=1;w=G.createScriptProcessor(Y,0,2);w.onaudioprocess=n;w.connect(u)},l=function(){t();u.gain.value=
0;w&&(w.disconnect(),w=w.onaudioprocess=B)},m=function(){if(f)for(var a=ja*V,b=A+(M.length+fa)*Y,c=S-(M.length+fa),d;0<c--&&b<a;)Q.length>Z?(d=Q.shift(),D||(d=g)):d=g,W.postMessage({msg:"samp",url:f.url,rcl:d},d&&[d]),b+=Y,fa++},n=function(a){if(!f)throw Error("No track is loaded.");if(G.currentTime+H>=ja)return i.autoplay&&p&&++q<p.tracks.length?(l(),L(0,q,p)||(f=g)):E(),g;var b=a.playbackTime;isNaN(b)&&(b=G.currentTime+Y/V);var c=a.outputBuffer,a=c.getChannelData(0),d=c.getChannelData(1),e=M.shift();
if(e){Q.push(e);var h=A/V;if(C||!ia)C=0,H=-1/0,ia=1,t(),N(new I("playing",f,p,q));if(b+H<h||na)if(na=0,H=h-b,!R&&isFinite(H)){var k=G.currentTime,h=k+H,b=ja-H;h<J?(h=1,k=J-H):h=-((h-J)/(ja-J))+1;var j=u.gain;j.value=h;j.setValueAtTime(h,k);j.linearRampToValueAtTime(0,b);R=1}b=new Int16Array(e);h=e=-1;for(c=c.length;++e<c;)a[e]=b[++h]/32768,d[e]=b[++h]/32768;A+=c}else{e=-1;for(c=c.length;++e<c;)a[e]=d[e]=0;if(b+H<ja&&(!C||!ia))ia=C=1,t(),N(new I("buffering",f,p,q))}m()},t=function(){u.gain.cancelScheduledValues(R=
0);u.gain.value=1},z=function(){l();qa(M);qa(Q);y=fa=0;f=B};pa(ha,"createGain",ha.prototype.createGainNode);pa(ha,"createScriptProcessor",ha.prototype.createJavaScriptNode);var D,G,x,u,w,V,F,W,C,Y=2048,S=8,Z=32,A,H,M=[],Q=[],J,ja,R,ia,fa=0,na,aa=new Ra,T={badspc:"invalid spc",badzip:"invalid zip",empty:"empty archive",unkty:"unknown file type",badurl:"invalid url",dlerr:"download error",dlabt:"download aborted",nofile:"path not found in archive",io:"io error"};L=function(a,b,d){c();ca();var e=d?b:
g;d&&(b=d.tracks[e]);var i=b.length;if(0>a)a+=i,0>a&&(a=0);else if(a>=i)if(d&&++e<d.tracks.length)a=0,b=d.tracks[e];else return E(),g;if(b!==f){var j,l;!d||d!==p?E():(j=f,l=q,z());k=b.url;h=b;s=d;r=e;y=0;F.postMessage({msg:"load",at:a,url:k,ofs:b._ofs});N(new I("loading",b,d,e,j,l))}else{var d=A,a=Math.floor(a*V),n;if(a<d){for(;Q.length;)if(M.unshift(Q.pop()),d-=Y,d<=a){A=d;na=1;t();return}n=1}else if(a>d){for(;M.length;){if(d+Y>=a){A=d;na=1;t();return}Q.push(M.shift());d+=Y}n=d+fa*Y<a}n&&(t(),qa(M),
qa(Q),fa=0,na=1,W.postMessage({msg:"seek",url:b.url,to:A=a}),m());da()}};X=function(){var a=!!f&&!y;if(a){l();y=1;for(var b=(G.currentTime+H)*V;A>b;){var c=Q.pop();if(!c)break;M.unshift(c);A-=c.byteLength>>>2}ia=0;N(new I("paused",f,p,q))}else k&&(a=y=!0);return a};da=function(){var a=!(!f||!y);a&&(0,j(),ca());return a};E=function(){var a=!!f;if(a){var b=f,c=p,d=q;z();f=p=q=B;N(new I("stopped",b,c,d))}if(k||h)a=!0,k=h=s=r=B;a&&(y=0);return a};ea=function(){return f&&G?y||C?A/V:G.currentTime+H:-1};
ua=function(a,b){if(!a)throw new TypeError("url is not specified.");var a=U(location.href,a),d,e,f;b&&(d=b.autostart,e=b.userdata);(d=!!(d!==g?d:i.autostart))||oa("load");(f=e!==g)&&aa.add(a,e);c();d&&(E(),h=s=r=B,k=a);F.postMessage({msg:"info",url:a,ap:d,u:f})};ma=function(a){x&&(x.gain.value=a)};wa(Xa);va(!0);b=new ba(Xa);$("init",0,b)}else ka?Sa(a):Ba(new ba(ra,"browser not supported"))})})})(this,document);
