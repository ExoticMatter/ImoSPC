/******************************************************************************
 * Copyright (C) 2014 ExoticMatter
 *
 * This file is part of ImoSPC.
 *
 * ImoSPC is free software; you can redistribute it and/or modify it under
 * the terms of the GNU Lesser General Public License as published by the Free
 * Software Foundation; either version 2.1 of the License, or (at your option)
 * any later version.
 *
 * ImoSPC is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE.  See the GNU Lesser General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License along with
 * ImoSPC. If not, see <http://www.gnu.org/licenses/>.
 ******************************************************************************/
;;(function(global, document){
	"use strict";

	/** @const */ var IMO_VERSION_MAJOR = 1;
	/** @const */ var IMO_VERSION_MINOR = 9;
	/** @const */ var IMO_VERSION_BUILD = 1;

	var undefined_;
	var null_ = null;

	/** @const */ var DEBUG = false;

	/** @const */ var IMO_UNZIP_WORKER	= 'imo-w-unzip.js';
	/** @const */ var IMO_SPC_WORKER	= 'imo-w-spc.js';
	/** @const */ var IMO_FLASH_SWF		= 'imo-fl.swf';

	// Allow some constructors to be inherently uncallable.
	function defineUnconstructable(proto) {
		function ctor() { throw new TypeError('Illegal constructor'); }
		if (proto) {
			defineReadonlyProperty(ctor, 'prototype', proto);
		}
		return ctor;
	}
	var _IllegalConstructor = defineUnconstructable();
	
	// Makes it so you cannot call the constructor of an object using
	// <obj>.prototype.constructor.
	function assignIllegalConstructorAndFreeze() {
		for (var i = -1, ii = arguments.length; ++i < ii;) {
			var proto = arguments[i].prototype;
			//proto['constructor'] = _IllegalConstructor;
			defineReadonlyProperty(proto, 'constructor', _IllegalConstructor);
			//tryFreeze(proto);
			defineReadonlyProperty(arguments[i], 'prototype', proto);
		}
	}

	//<editor-fold defaultstate="collapsed" desc="Event handlers">

	var eventTable = {
		'init':				[],
		'initerror':		[],
		'load':				[],
		'loaderror':		[],
		'playstatechange':	[]
	};
	var defaultEventInvokers = {};

	// Allow event handlers to be required.
	// For example, the events init and initerror need to be specified, or else
	// the caller cannot know when ImoSPC has been initialized.
	function hasEventHandler(eventName) {
		var h = ImoSPC['on' + eventName];
		if (h !== defaultEventInvokers[eventName] && isFunction(h))
			return 1;
		else {
			var handlers = eventTable[eventName],
				handlersLength = handlers.length;
			var badHandlers = 0;
			if (Array.isArray(handlers) && handlersLength) {
				for (var i = -1, ii = handlers.length; ++i < ii;) {
					var handler = handlers[i];
					if (!isFunction(handler) && (!isNotNull(handler) || !isFunction(handler['handleEvent'])))
						badHandlers++;
				}
				return badHandlers < handlersLength;
			}
		}
	}

	function requireEvent(eventName) {
		if (!hasEventHandler(eventName))
			throw new TypeError(eventName + " event must be handled.");
	}

	function imoAddEventHandler(eventName, callback) {
		if (!isFunction(callback) && (!isNotNull(callback) || !isFunction(callback['handleEvent'])))
			throw new TypeError('callback must be a function or event handler.');
		
		var handlers = eventTable[eventName];
		if (Array.isArray(handlers))
			handlers.push(callback);
	}

	function imoDeleteEventHandler(eventName, callback) {
		if (!isFunction(callback) && (!isNotNull(callback) || !isFunction(callback['handleEvent'])))
			throw new TypeError('callback must be a function or event handler.');

		var handlers = eventTable[eventName];
		if (Array.isArray(handlers)) {
			var index = handlers.lastIndexOf(callback);
			if (index >= 0) handlers.splice(index, 1);
		}
	}

	function imoDefaultInvokeEvent(eventName, target, oEvt) {
		var handlers = eventTable[eventName];
		if (Array.isArray(handlers)) {
			for (var i = -1, ii = handlers.length; ++i < ii;) {
				var handler = handlers[i];
				if (isFunction(handler))
					//try { handler.call(target, oEvt); } catch (e) {}
					handler.call(target, oEvt);
				else if (isNotNull(handler) && isFunction(handler['handleEvent']))
					//try { handler['handleEvent'](oEvt); } catch (e) {}
					handler['handleEvent'](oEvt);
			}
		}
	}

	function imoInvokeEvent(eventName, target, oEvt) {
		var fn = ImoSPC['on' + eventName];
		target = target || ImoSPC;
		if (fn !== defaultEventInvokers[eventName] && isFunction(fn))
			try { fn.call(target, oEvt); } catch (e) {}
		else
			imoDefaultInvokeEvent(eventName, target, oEvt);
	}
	
	function imoInvokeInit				(oEvt) { imoInvokeEvent('init', 0, oEvt); }
	function imoInvokeInitError			(oEvt) { imoInvokeEvent('initerror', 0, oEvt); }
	function imoInvokeLoad				(oEvt) { imoInvokeEvent('load', 0, oEvt); }
	function imoInvokeLoadError			(oEvt) { imoInvokeEvent('loaderror', 0, oEvt); }
	function imoInvokePlayStateChange	(oEvt) { imoInvokeEvent('playstatechange', 0, oEvt); }
	
	// Create default event handlers (ImoSPC.on<event>) and add them to the list
	// of default event invokers, that way, isHandlerEmpty can determine if
	(function(){
		function createDefaultEventHandler(event) {
			return function(oEvt) {
				imoDefaultInvokeEvent(event, this, oEvt);
			};
		}

		for (var evt in eventTable) if (eventTable.hasOwnProperty(evt)) {
			defaultEventInvokers[evt] = createDefaultEventHandler(evt);
		}
	}());

	//</editor-fold>

	//<editor-fold defaultstate="collapsed" desc="Shims, polyfills, etc.">

	// Need to detect MSIE 8 or older
	var msie = (function() {
		var ua = window.navigator.userAgent;
		var msie = ua.indexOf("MSIE ");

		if (msie > 0) {
			return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
		}
	}());
	
	if (!Array['isArray'] || msie && msie < 9) {
		Array['isArray'] = function(o) {
			return Object.prototype.toString.call(o) === '[object Array]';
		};
	}

	var ArrayBuffer = global.ArrayBuffer;
	var AudioContext = global.AudioContext || global.webkitAudioContext;
	var Worker = global.Worker;
	var XMLHttpRequest = global.XMLHttpRequest;
	var tryFreeze = Object.freeze || function(o) { return o; };

	function quickShim(cls, name, shim) {
		if (!cls.prototype[name])
			cls.prototype[name] = shim;
	}
	function quickShimRename(cls, standardName, oddName) {
		quickShim(cls, standardName, cls.prototype[oddName]);
	}
	
	quickShim(Array, 'forEach', function(callback, thisArg) {
		if (!thisArg) thisArg = null;
		var length = this.length >>> 0;
		for (var i = -1; ++i < length;) {
			if (i in this)
				callback.call(thisArg, this[i], i, this);
		}
	});
	quickShim(Array, 'indexOf', function(x, i) {
		var length = this.length >>> 0;
		i |= 0;
	
		if (i < 0) {
			i += length;
			if (i < 0) i = 0;
		}
		for (; i < length; i++) {
			if (this[i] === x) return i;
		}
		return -1;
	});

	var defineReadonlyProperty, defineReadonlyProperties;
	if (Object.defineProperty && (!msie || msie > 8)) {
		defineReadonlyProperty = function (cls, propertyName, value, invisible) {
			Object.defineProperty(cls, propertyName, {
				'configurable': false,
				'writable': false,
				'enumerable': !invisible && propertyName !== 'prototype',
				'value': value
			});
		};
		defineReadonlyProperties = function(cls, properties, invisible) {
			for (var key in properties)
				properties[key] = {
					'configurable': false,
					'writable': false,
					'enumerable': !invisible,
					'value': properties[key]
				};
			Object.defineProperties(cls, properties);
		};
	} else {
		defineReadonlyProperty = function (cls, propertyName, value) {
			cls[propertyName] = value;
		};
		defineReadonlyProperties = function (cls, properties) {
			for (var key in properties)
				if (properties.hasOwnProperty(key))
					cls[key] = properties[key];
		};
	}

	function isDefined(obj) {
		return obj !== undefined_;
	}

	function isNotNull(obj) {
		// TODO: Replace with "return obj != null_" when minifying.
		// Try to find a way to do so automatically.
		return obj !== undefined_ && obj !== null_;
	}
	
	function isFunction(obj) {
		return typeof obj === 'function';
	}

	function doNothing() {}
	
	function hashOf(str) {
		if (!isNaN(str)) return str;
		str = String(str);
		var hash = 0;
		for (var i = -1, ii = str.length; ++i < ii;) {
			hash = hash * 31 + str.charCodeAt(i);
		}
		return hash;
	}
	
	function clearArray(a) {
		a['length'] = 0;
	}

	//</editor-fold>

	//<editor-fold defaultstate="collapsed" desc="URL functions">
	
	// The following function is under public domain.
	// See https://gist.github.com/Yaffle/1088850 for the original version.
	var absolutizeURI = (function(){
		function parseURI(url) {
			var m = String(url).replace(/^\s+|\s+$/g, '').match(/^([^:\/?#]+:)?(\/\/(?:[^:@]*(?::[^:@]*)?@)?(([^:\/?#]*)(?::(\d*))?))?([^?#]*)(\?[^#]*)?(#[\s\S]*)?/);
			// authority = '//' + user + ':' + pass '@' + hostname + ':' port
			return (m ? {
				href     : m[0] || '',
				protocol : m[1] || '',
				authority: m[2] || '',
				host     : m[3] || '',
				hostname : m[4] || '',
				port     : m[5] || '',
				pathname : m[6] || '',
				search   : m[7] || '',
				hash     : m[8] || ''
			} : null);
		}
		
		function removeDotSegments(input) {
			var output = [];
			input.replace(/^(\.\.?(\/|$))+/, '')
					.replace(/\/(\.(\/|$))+/g, '/')
					.replace(/\/\.\.$/, '/../')
					.replace(/\/?[^\/]*/g, function (p) {
						if (p === '/..') {
							output.pop();
				} else {
					output.push(p);
				}
			});
			return output.join('').replace(/^\//, input.charAt(0) === '/' ? '/' : '');
		}
		
		return function(base, href) {// RFC 3986
			href = parseURI(href || '');
			base = parseURI(base || '');
			
			return !href || !base ? null : (href.protocol || base.protocol) +
					(href.protocol || href.authority ? href.authority : base.authority) +
					removeDotSegments(href.protocol || href.authority || href.pathname.charAt(0) === '/' ? href.pathname : (href.pathname ? ((base.authority && !base.pathname ? '/' : '') + base.pathname.slice(0, base.pathname.lastIndexOf('/') + 1) + href.pathname) : base.pathname)) +
					(href.protocol || href.authority || href.pathname ? href.search : (href.search || base.search)) +
					href.hash;
		};
	}());
	
	function relativeToPage(url) {
		return absolutizeURI(location.href, url);
	}

	// Get the location of the current script, so that the workers can be found.
	var imoLocation = (function() {
		var scripts = document.getElementsByTagName('script');
		return relativeToPage(scripts[scripts.length - 1].src);
	}());
	
	function relativeToScript(url) {
		return absolutizeURI(imoLocation, url);
	}

	//</editor-fold>
	
	//<editor-fold defaultstate="collapsed" desc="ImoSPC.Error, ImoSPC.Runtime, and ImoSPC.PlaybackState">

	/** @const */ var E_SUCCESS					= undefined_;
	/** @const */ var E_UNKNOWN					= 'unknown error';
	/** @const */ var E_INVALID_SPC				= 'invalid spc';
	/** @const */ var E_INVALID_ZIP				= 'invalid zip';
	/** @const */ var E_EMPTY_ARCHIVE			= 'empty archive';
	/** @const */ var E_UNKNOWN_FILE_TYPE		= 'unknown file type';
	/** @const */ var E_BAD_URL					= 'invalid url';
	/** @const */ var E_DOWNLOAD_ERROR			= 'download error';
	// Can't distinguish between CORS errors and other errors with XHR, so don't
	// do it with Flash, either. Use E_DOWNLOAD_ERROR instead.
	///** @const */ var E_SECURITY_ERROR			= 'crossdomain';
	/** @const */ var E_DOWNLOAD_ABORTED		= 'download aborted';
	/** @const */ var E_IO						= 'io error';
	/** @const */ var E_PATH_NOT_FOUND			= 'path not found in archive';
	/** @const */ var E_BROWSER_NOT_SUPPORTED	= 'browser not supported';
	/** @const */ var E_TIMEOUT					= 'swf load timeout';
	/** @const */ var E_FLASHBLOCK				= 'swf blocked';
	
	var ImoError = tryFreeze({
		'SUCCESS':					E_SUCCESS,
		'UNKNOWN':					E_UNKNOWN,
		'INVALID_SPC':				E_INVALID_SPC,
		'INVALID_ZIP':				E_INVALID_ZIP,
		'EMPTY_ARCHIVE':			E_EMPTY_ARCHIVE,
		'UNKNOWN_FILE_TYPE':		E_UNKNOWN_FILE_TYPE,
		'BAD_URL':					E_BAD_URL,
		'DOWNLOAD_ERROR':			E_DOWNLOAD_ERROR,
		//'SECURITY_ERROR':			E_SECURITY_ERROR,
		'DOWNLOAD_ABORTED':			E_DOWNLOAD_ABORTED,
		'IO_ERROR':					E_IO,
		'PATH_NOT_FOUND':			E_PATH_NOT_FOUND,
		'BROWSER_NOT_SUPPORTED':	E_BROWSER_NOT_SUPPORTED,
		'TIMEOUT':					E_TIMEOUT,
		'FLASHBLOCK':				E_FLASHBLOCK
	});

	/** @const */ var R_NONE	= null_;
	/** @const */ var R_HTML5	= 'html5';
	/** @const */ var R_FLASH = 'flash';
	
	var ImoRuntime = tryFreeze({
		'NONE': R_NONE,
		'HTML5': R_HTML5,
		'FLASH': R_FLASH
	});

	/** @const */ var P_STOPPED		= 'stopped';
	/** @const */ var P_LOADING		= 'loading';
	/** @const */ var P_BUFFERING	= 'buffering';
	/** @const */ var P_PLAYING		= 'playing';
	/** @const */ var P_PAUSED		= 'paused';
	
	var ImoPlaybackState = tryFreeze({
		'STOPPED':		P_STOPPED,
		'PLAYING':		P_PLAYING,
		'PAUSED':		P_PAUSED,
		'BUFFERING':	P_BUFFERING,
		'LOADING':		P_LOADING
	});

	//</editor-fold>

	//<editor-fold defaultstate="collapsed" desc="Comparison helpers">
	
	// Coerces a and b to signed ints, and then compares them.
	function intcmp(a, b) {
		return (a | 0) - (b | 0);
	}
	
	// Replaces null or undefined with an empty string, and then
	// compares the strings.
	function strcmp(a, b) {
		return (a || '').localeCompare(b || '');
	}

	function UrlTrackSort(trackA, trackB) {
		return strcmp(trackA.url, trackB.url) ||
				strcmp(trackA.title, trackB.title);
	}

	function TitleTrackSort(trackA, trackB) {
		return strcmp(trackA.title, trackB.title) ||
				strcmp(trackA.url, trackB.url);
	}
	
	function GameTrackSort(trackA, trackB) {
		return strcmp(trackA.game, trackB.game) ||
				TitleTrackSort(trackA, trackB);
	}
	
	function FilenameTrackSort(trackA, trackB) {
		return strcmp(trackA.filename, trackB.filename) ||
				UrlTrackSort(trackA, trackB);
	}

	function ChronologicalTrackSort(trackA, trackB) {
		return strcmp(trackA.osttitle, trackB.osttitle) ||
				intcmp(trackA.ostdisc, trackB.ostdisc) ||
				intcmp(trackA.osttracknum, trackB.osttracknum) ||
				strcmp(trackA.osttrackchar, trackB.osttrackchar) ||
				TitleTrackSort(trackA, trackB);
	}
	
	var ImoTrackSort = tryFreeze({
		'Title': TitleTrackSort,
		'Game': GameTrackSort,
		'URL': UrlTrackSort,
		'Filename': FilenameTrackSort,
		'Chronological': ChronologicalTrackSort
	});

	//</editor-fold>

	//<editor-fold defaultstate="collapsed" desc="ImoVersion object">
	
	function createVersionString(a, b, c) {
		return a + '.' + b + '.' + c;
	}

	// Version info
	function ImoVersion(runtime) {
		// [ImoSPC vX.Y.Z, HTML5]
		// [ImoSPC vX.Y.Z, uninitialized]
		var prettyString = '[ImoSPC v' + createVersionString(IMO_VERSION_MAJOR, IMO_VERSION_MINOR, IMO_VERSION_BUILD) + ', ' + (runtime === R_HTML5 ? 'HTML5]' : 'unitialized]');
	
		defineReadonlyProperties(this, {
			'runtime': runtime,
			'major': IMO_VERSION_MAJOR,
			'minor': IMO_VERSION_MINOR,
			'build': IMO_VERSION_BUILD,
			
			'toString': function() { return prettyString; }
		});
	}
	assignIllegalConstructorAndFreeze(ImoVersion);

	var V_R_NONE	= new ImoVersion(R_NONE);
	var V_R_HTML5	= new ImoVersion(R_HTML5);
	var V_R_FLASH	= new ImoVersion(R_FLASH);

	//</editor-fold>

	//<editor-fold defaultstate="collapsed" desc="Event descriptors">
	
	function ImoInitEvent(v, error) {
		defineReadonlyProperties(this, {
			'version': v || V_R_NONE,
			'error': error || E_SUCCESS
		});
	}

	function ImoLoadEvent(url, userdata, track, playlist, corruptFiles, error, httpStatus) {
		defineReadonlyProperties(this, {
			'url': url,
			'userdata': userdata,
			'track': track,
			'playlist': error ? null_ : playlist,
			'corruptFiles': corruptFiles,
			'error': error,
			'httpStatus': error === E_DOWNLOAD_ERROR ? httpStatus : undefined_
		});
	}

	function ImoStateEvent(state, track, playlist, trackIndex, previousTrack, previousTrackIndex) {
		defineReadonlyProperties(this, {
			'state': state,
			'track': track,
			'playlist': playlist,
			'index': trackIndex,
			'previousTrack': previousTrack,
			'previousIndex': previousTrackIndex
		});
	}

	assignIllegalConstructorAndFreeze(ImoInitEvent, ImoLoadEvent, ImoStateEvent/*, ImoPlayStateEvent*/);

	//</editor-fold>
	
	//<editor-fold defaultstate="collapsed" desc="Support detector">

	var isHtml5Supported, supportQueryArray;
	
	/** @const */ var FLASH_MIME_TYPE = 'application/x-shockwave-flash';
	/** @const */ var SHOCKWAVE_FLASH = 'Shockwave Flash';
	/** @const */ var SHOCKWAVE_FLASH_AX = 'ShockwaveFlash.ShockwaveFlash';

	// Flash ImoSPC requires Adobe Flash Player 11.5 or greater.
	var isFlashSupported = (function(){
		var major, minor, plugins = navigator.plugins, mimeTypes = navigator.mimeTypes;
		if (!msie && plugins) {
			if (plugins[SHOCKWAVE_FLASH]) {
				var desc = plugins[SHOCKWAVE_FLASH].description;
				if (desc && !(mimeTypes && mimeTypes[FLASH_MIME_TYPE] && !mimeTypes[FLASH_MIME_TYPE].enabledPlugin)) {
					var version = desc.match(/(\d+)/g);
					major = version[0];
					minor = version[1];
				} else return;
			} else return;
		} else if (typeof ActiveXObject === 'function') {
			try {
				var version = new ActiveXObject(SHOCKWAVE_FLASH_AX).GetVariable('$version');
				version = version.split(' ')[1].split(',');
				major = version[0];
				minor = version[1];
			} catch (e) { return; }
		} else return; // Can't detect Flash

		major = parseInt(major, 10);
		minor = parseInt(minor, 10);

		return major > 11 || (major === 11 && minor >= 5);
	}());

	function testHTML5Support(callback) {
		if (isDefined(isHtml5Supported)) {
			callback(isHtml5Supported);
		} else {
			var _URL = global.webkitURL || global.URL;
			if (!ArrayBuffer || !Worker || !AudioContext || !XMLHttpRequest ||
				!global.Blob || !isFunction(_URL.createObjectURL)) {
					supportQueryArray = tryFreeze(isFlashSupported ? [R_FLASH] : []);
					callback(isHtml5Supported = false);
					return;
			}
			
			try {
				var tstBlob = new Blob(['postMessage(self.FileReaderSync?"a":"")'], { 'type': 'text/javascript' });
				var u = _URL.createObjectURL(tstBlob);
				var testWorker = new Worker(u);
				testWorker['onmessage'] = function(s) {
					_URL.revokeObjectURL(u);
					testWorker.terminate();
					supportQueryArray = s ? [R_HTML5] : [];
					if (isFlashSupported) supportQueryArray.unshift(R_FLASH);
					tryFreeze(supportQueryArray);
					callback(isHtml5Supported = !!s);
				};
			} catch (e) {
				supportQueryArray = tryFreeze(isFlashSupported ? [R_FLASH] : []);
				callback(isHtml5Supported = false);
			}
		}
	}

	//</editor-fold>

	//<editor-fold defaultstate="collapsed" desc="Single Instance Helper">

	var takeControl;
	if (global['Storage'] !== 'undefined') {
		/** @const */ var IMO_CTL = '_ImoCurrentInstanceController';
		takeControl = function() {
			try { if (!ImoSPC['allowMultipleInstances'])
				localStorage.setItem(IMO_CTL, localStorage.getItem(IMO_CTL)^1);
			} catch (e) {}
		};
		var loseControl = function(e) {
			//if (_stop && (e || global['event'])['key'] === IMO_CTL) _stop();
			if (_pause && (e || global['event'])['key'] === IMO_CTL) _pause();
		};
		if (isFunction(global.addEventListener)) {
			global.addEventListener('storage', loseControl, false);
		} else if (isFunction(global.attatchEvent)) {
			global.attatchEvent('onstorage', loseControl);
		} else takeControl = doNothing;
	} else takeControl = doNothing;

	//</editor-fold>

	//<editor-fold defaultstate="collapsed" desc="Percent decoder">

	function safePctDecFn(match) {
		var s = '';
		match = match.split('%');
		for (var i = 1, ii = match.length; i < ii;) {
			var c = parseInt(match[i++], 16);
			if (c > 0x7F) {
				var extra, min;
				
				/**/ if ((c & 0xE0)===0xC0) extra = 1, c &= 0x1F, min = 0x00080;
				else if ((c & 0xF0)===0xE0) extra = 2, c &= 0x0F, min = 0x00800;
				else if ((c & 0xF8)===0xF0) extra = 3, c &= 0x07, min = 0x10000;
				else {
					/**/ if ((c & 0xFC) === 0xF8) extra = 4;
					else if ((c & 0xFE) === 0xFC) extra = 5;
					else extra = 0;
					
					while (--extra >= 0) {
						var x = parseInt(match[i], 16);
						if ((x & 0xC0) !== 0x80)
							break;
						i++;
					}
					c = 0xFFFD;
				}
				
				while (--extra >= 0) {
					var x = parseInt(match[i], 16);
					if ((x & 0xC0) !== 0x80) {
						c = 0xFFFD;
						break;
					}
					i++;
					c = (c << 6) | (x & 0x3F);
				}
				
				if (c < min || c > 0x10FFFF ||
					c === 0xFFFE || c === 0xFFFF) c = 0xFFFD;
			}
			if (c > 0xFFFF) {
				c -= 0x10000;
				var lead	= 0xD800 + (c >> 10),
					trail	= 0xDC00 + (c & 0x3FF);
				
				s += String.fromCharCode(lead, trail);
			} else {
				s += String.fromCharCode(c);
			}
		}
		return s;
	}
	
	function safePercentDecode(str) {
		return String(str).replace(/((?:%[a-f\d]{2})+)/ig, safePctDecFn);
	}

	//</editor-fold>
	
	//<editor-fold defaultstate="collapsed" desc="Hashtable">

	function Hashtable() {
		var hashes = [],
		keys = [],
		values = [];
		
		this.remove = function(key) {
			var hash = hashOf(key);
			for (var i = -1, ii = hashes.length; ++i < ii;) {
				if (hashes[i] === hash) {
					if (keys[i] === key) {
						var value = values[i];
						hashes.splice(i, 1);
						keys.splice(i, 1);
						values.splice(i, 1);
						return value;
					}
				}
			}
		};
		
		this.add = function(key, value) {
			hashes.push(hashOf(key));
			keys.push(key);
			values.push(value);
		};
	}

	//</editor-fold>

	//<editor-fold defaultstate="collapsed" desc="BaseImo">

	// _play: function(seekTo, track, playlist)

	var volume = 1;
	var _open, _play, _pause, _unpause, _stop, _getTime, _setVolume;
	var _curPlaylist, _curTrack, _curTrackIndex;
	// Keep these separate from the currently playing stuff
	// The URL is kept here as well, since objects can't be sent to workers.
	var pendingPlayUrl, pendingPlayTrack, pendingPlayPlaylist, pendingPlayTrackIndex;
	var _isPaused;

	var setIsFunctional, setVersion;

	//<editor-fold defaultstate="collapsed" desc="Track">
	
	var Track_prototype_play;
	var Track_fields = [
		'url', '_ofs', 'title', 'game', 'artist', 'publisher', 'copyright',
		'osttitle', 'ostdisc', 'osttrack', 'osttracknum', 'osttrackchar',
		'_fSt', '_fLn' //'length'
	];
	function Track(metadata) {
		var that = this; // Cannot access this in closure
		Track_fields.forEach(function(field, i) {
			defineReadonlyProperty(that, field, metadata[i]);
		});
		var url = metadata[0];
		if (url) {
			var filename;
			url = String(url);
			var hashPos = url.indexOf('#');
			if (hashPos >= 0) {
				var archive = url.substring(0, hashPos);
				var path = safePercentDecode(url.substring(hashPos + 1));
				defineReadonlyProperties(this, {
					'archive': archive,
					'path': path
				});
				filename = path.substring(path.lastIndexOf('/') + 1);
			} else {
				if (!url.lastIndexOf('data:', 0)) {
					filename = '[data]';
				} else if (!url.lastIndexOf('blob:', 0)) {
					filename = '[blob]';
				} else {
					filename = url.substring(url.search(/[^\/\\]*$/));
				}
			}
			defineReadonlyProperty(that, 'filename', filename);
		}
		defineReadonlyProperty(that, 'length', +metadata[12] + +metadata[13]);
	}
	function trackfn(x) { if (!(x instanceof Track)) throw new TypeError('Track functions can only be called on Track objects.'); }
	defineReadonlyProperties(Track.prototype, {
		'play': Track_prototype_play = function(seekTo) {
			trackfn(this);
			_play(+seekTo || 0, this);
		},
		//'pause': function() { trackfn(this); return areTracksEqual(_curTrack, this) ? _pause() : false; },
		//'unpause': function() { trackfn(this); return areTracksEqual(_curTrack, this) ? _unpause() : false; },
		//'stop': function() { trackfn(this); return areTracksEqual(_curTrack, this) ? _stop() : false; },
		'pause': function() { trackfn(this); return isCurrentTrack(this) ? _pause() : false; },
		'unpause': function() { trackfn(this); return isCurrentTrack(this) ? _unpause() : false; },
		'stop': function() { trackfn(this); return isCurrentTrack(this) ? _stop() : false; },
		'time': function() { trackfn(this); return areTracksEqual(_curTrack, this) ? _getTime() : -1; },
		'seek': function(to, relative) {
			trackfn(this);
			if (isNaN(to)) throw new TypeError('to must be a number.');
			if (areTracksEqual(_curTrack, this) && (to || !relative)) {
				var time = _getTime();
				if (time >= 0) {
					if (relative) to += time;
					_play(to, _curPlaylist ? _curTrackIndex : _curTrack, _curPlaylist);
					return true;
				}
			}
			return false;
		},
		
		'toString': function(that) {
			that = this;
			return '[ImoSPC.Track, ' + (that['title'] || that['filename'] || that['url']) + ']';
		}
	});
	// Track's prototype doesn't need to be sealed, because end users cannot
	// access this Track function.
	//defineReadonlyProperty(Track, 'prototype', Track.prototype);

	// It is theoretically possible for two different track objects for the same
	// URL, so compare tracks using their URLs, not the objects.
	function areTracksEqual(a, b) {
		if (!a || !b) return a === b;
		return a['url'] === b['url'];
	}
	function isCurrentTrack(t) {
		return areTracksEqual(pendingPlayTrack || _curTrack, t);
	}
	//</editor-fold>

	//<editor-fold defaultstate="collapsed" desc="Playlist">

	var Playlist_prototype_play;
	function Playlist(tracks) {
		defineReadonlyProperty(this, 'tracks', tryFreeze(tracks));
		defineReadonlyProperties(this, {
			'tracks': tryFreeze(tracks),
			'length': tracks.length
		});
	}
	// The user version of Playlist; verifies its arguments, and clones tracks.
	function _Playlist(tracks) {
		if (!Array.isArray(tracks))
			throw new TypeError('tracks is not an array.');
		if (!tracks.length)
			throw new TypeError('tracks is empty.');
		tracks.forEach(function(t) {
			if (!(t instanceof Track))
				throw new TypeError('tracks contains an invalid track.');
		});
		
		Playlist.call(this, tracks.slice());
	}
	function playlistfn(x) { if (!(x instanceof Playlist)) throw new TypeError('Playlist functions can only be called on Playlist objects.'); }
	defineReadonlyProperties(Playlist.prototype, {
		'constructor': _Playlist,
		'play': Playlist_prototype_play = function(track, startAt) {
			playlistfn(this);

			var tracks = this['tracks'];
			if (isNotNull(track) && isNaN(track)) {
				if (track instanceof Track) {
					track = tracks.indexOf(track);
				} else {
					throw new TypeError('track must be a Track object or the index of a track.');
				}
			} else track = +track;
			if (isNotNull(startAt) && isNaN(startAt))
				throw new TypeError('startAt must be a number.');
			if (track < 0 || track > tracks.length ||
				!(tracks[track >>>= 0] instanceof Track))
					throw new RangeError('track is not in the playlist.');

			_play(+startAt || 0, track, this);
		},
		'pause': function() { playlistfn(this); return isActivePlaylist(this) ? _pause() : false; },
		'unpause': function() { playlistfn(this); return isActivePlaylist(this) ? _unpause() : false; },
		'stop': function() { playlistfn(this); return isActivePlaylist(this) ? _stop() : false; },
		
		'first': function() { playlistfn(this); return this['tracks'][0]; },
		'previous': function() { playlistfn(this); return isActivePlaylist(this) ? this['tracks'][getCurrentTrack() - 1] : undefined_; },
		'current': function() { playlistfn(this); return isActivePlaylist(this) ? pendingPlayTrack || _curTrack : undefined_; },
		'next': function() { playlistfn(this); return isActivePlaylist(this) ? this['tracks'][getCurrentTrack() + 1] : undefined_; },
		'last': function() { playlistfn(this); var tracks = this['tracks']; return tracks[tracks.length - 1]; },
		
		'indexOfFirst': function() { playlistfn(this); return 0; },
		'indexOfPrevious': function() { playlistfn(this); return isActivePlaylist(this) ? _curTrackIndex - 1 : -1; },
		'indexOfCurrent': function() { playlistfn(this); return isActivePlaylist(this) ? _curTrack : -1; },
		'indexOfNext': function() { playlistfn(this); var trkL = this['tracks'].length, trkI = getCurrentTrack() + 1; return (isActivePlaylist(this) && trkI < trkL) ? trkI : -1; },
		'indexOfLast': function() { playlistfn(this); return this['tracks'].length - 1; },
		
		'sort': function(compareFunction) {
			playlistfn(this);
			// Do not change to !==; treat undefined and null equally
			if (isNotNull(compareFunction)) {
				if (!isFunction(compareFunction))
					throw new TypeError('compareFunction is not a function.');
			} else compareFunction = ChronologicalTrackSort;
			
			return new Playlist(this.tracks.slice().sort(compareFunction));
		},
		'sortReverse': function(compareFunction) {
			playlistfn(this);
			// Do not change to !==; treat undefined and null equally
			if (isNotNull(compareFunction)) {
				if (!isFunction(compareFunction))
					throw new TypeError('compareFunction is not a function.');
			} else compareFunction = ChronologicalTrackSort;
			
			return new Playlist(this.tracks.slice().sort(compareFunction).reverse());
		},
		
		'toString': function() {
			return '[ImoSPC.Playlist, ' + this['length'] + ' track(s)]';
		}
	});
	// Seal the prototype of _Playlist so that external callers can't fuck it up
	defineReadonlyProperty(_Playlist, 'prototype', Playlist.prototype);
	
	function isActivePlaylist(p) {
		return (pendingPlayPlaylist || _curPlaylist) === p;
	}
	function getCurrentTrack() {
		return isNotNull(pendingPlayTrackIndex) ? pendingPlayTrackIndex : _curTrackIndex;
	}
	
	//</editor-fold>

	var isInitializationInProgress;
	var ImoSPC = {};
	defineReadonlyProperties(ImoSPC, {
		'Error': ImoError,
		'Runtime': ImoRuntime,
		'PlaybackState': ImoPlaybackState,
		'TrackSort': ImoTrackSort,

		'Playlist': _Playlist,
		'Track': defineUnconstructable(Track['prototype']),

		'InitEvent': ImoInitEvent,
		'LoadEvent': ImoLoadEvent,
		'PlayStateEvent': ImoStateEvent,

		'currentTrack': function() {
			return pendingPlayTrack || _curTrack;
		},
		'currentPlaylist': function() {
			return pendingPlayPlaylist || _curPlaylist;
		},

		'querySupportedRuntimes': function(callback) {
			if (isDefined(isHtml5Supported)) {
				callback(supportQueryArray);
			} else {
				testHTML5Support(function() {
					callback(supportQueryArray);
				});
			}
		},

		'open': function(url, options) { _open(url, options); },
		'play': function(arg1, arg2, arg3) {
			if (!arguments.length) throw new TypeError('ImoSPC.play() cannot be called without arguments.');
			if (arg1 instanceof Playlist) {
				Playlist_prototype_play.call(arg1, arg2, arg3);
			} else if (arg1 instanceof Track) {
				Track_prototype_play.call(arg1, arg2);
			} else throw new TypeError('The first argument of ImoSPC.play() must be a track or playlist.');
		},
		'pause': function() { return _pause(); },
		'unpause': function() { return _unpause(); },
		'stop': function() { return _stop(); },
		'time': function() { return _getTime ? _getTime() : -1; },

		'getVolume': function() { return volume; },
		'setVolume': function(v) {
			if (isNaN(v = +v)) throw new TypeError('volume must be a number.');
			if (v < 0 || v > 1) throw new RangeError('volume must be between 0 and 1.');
			volume = v;
			if (_setVolume) _setVolume(v);
			return volume;
		},

		'canSeek': true,
		'canSetVolume': true,

		'addEventListener': imoAddEventHandler,
		'removeEventListener': imoDeleteEventHandler,

		'toString': function() {
			return String(this['version']);
		}
	});
	
	(function() {
		if (Object.defineProperties && (!msie || msie > 8)) {
			var version = V_R_NONE;
			
			var autostart = false,
				autoplay = true,
				allowMultipleInstances = false;

			Object.defineProperties(ImoSPC, {
				'isFunctional': {
					'enumerable': true,
					'configurable': false,
					'get': function() {
						return !!(_open && _play && _pause && _unpause && _stop && _getTime && _setVolume);
					}
				},

				'version': {
					'enumerable': true,
					'configurable': false,
					'get': function() {
						return version;
					}
				},

				'autostart': {
					'enumerable': true,
					'configurable': false,
					'get': function() { return autostart; },
					'set': function(v) { autostart = !!v; }
				},
				'autoplay': {
					'enumerable': true,
					'configurable': false,
					'get': function() { return autoplay; },
					'set': function(v) { autoplay = !!v; }
				},
				'allowMultipleInstances': {
					'enumerable': true,
					'configurable': false,
					'get': function() { return allowMultipleInstances; },
					'set': function(v) { allowMultipleInstances = !!v; }
				}
			});
			
			setIsFunctional = function() {};
			setVersion = function(ver) {
				version = ver;
			};
		} else {
			(setIsFunctional = function(isFn) {
				ImoSPC['isFunctional'] = !!isFn;
			})(false);
			(setVersion = function(ver) {
				ImoSPC['version'] = ver;
			})(V_R_NONE);
			ImoSPC['autostart'] = false;
			ImoSPC['autoplay'] = true;
			ImoSPC['allowMultipleInstances'] = false;
		}

		// Create event handler properties
		for (var evt in eventTable) if (eventTable.hasOwnProperty(evt)) {
			var handlerName = 'on' + evt,
				handler = defaultEventInvokers[evt];

			if (Object.defineProperty && (!msie || msie > 8)) {
				(function(evt, handlerName, handler){
					Object.defineProperty(ImoSPC, handlerName, {
						'enumerable': true,
						'configurable': false,
						'get': function() { return handler; },
						'set': function(v) {
							if (!v) {
								handler = defaultEventInvokers[evt];
							} else if (isFunction(v)) {
								handler = v;
							} else throw new TypeError(handlerName + ' must be a function.');
						}
					});
				}(evt, handlerName, handler));
			} else {
				ImoSPC[handlerName] = handler;
			}
		}
	}());
	defineReadonlyProperty(global, 'ImoSPC', ImoSPC);

	//</editor-fold>

	//<editor-fold defaultstate="collapsed" desc="Html5Imo">

	function createHtml5Imo(options) {
		quickShimRename(AudioContext, 'createGain', 'createGainNode');
		quickShimRename(AudioContext, 'createScriptProcessor', 'createJavaScriptNode');
		
		var canTransfer; // Can ArrayBuffer objects be transferred?
		
		var audioContext, masterGain, fadeGain, outputNode, sampleRate;
		
		var loader, player;
		
		var isStarved;
		
		var BUFFER_LENGTH = 2048;
		var MAX_PENDING_BUFFERS = 8; // 4;
		var MAX_OLD_BUFFERS = 32;
		
		// timeCorrectionFactor is the number that can be subtracted from the
		// audio context's time to get the current playback position.
		var nextBufferStart, timeCorrectionFactor, pauseTime;
		var pendingBuffers = [], oldBuffers = [];
		var fadeStart, trackEnd, wasFadeSet, wasPlayBufferingMessageSent;
		// How many samp requests have not been received?
		// This number can help _play() guess if a seek request should be
		// dropped.
		var nUnreceivedBuffers = 0;
		// How many seeks have been sent but not received?
		// This tells how many.
		//var nUnreceivedSeeks = 0;
		// This appears to force the timer to be updated.
		var resetTimer;
		
		var pendingLoadUserdata = new Hashtable();
		
		//<editor-fold defaultstate="collapsed" desc="Initialization">
		
		function initialize() {
			audioContext = new AudioContext();
			
			masterGain = audioContext.createGain();
			masterGain.gain['value'] = volume;
			masterGain.connect(audioContext.destination);
			fadeGain = audioContext.createGain();
			fadeGain.connect(masterGain);
			
			var v_string = createVersionString(IMO_VERSION_MAJOR, IMO_VERSION_MINOR, IMO_VERSION_BUILD);
				
			loader = new Worker(relativeToScript(IMO_UNZIP_WORKER));
			player = new Worker(relativeToScript(IMO_SPC_WORKER));

			loader['onmessage'] = unzipMsgProc;
			player['onmessage'] = spcMsgProc;
			
			//loader.postMessage({ 'msg': 'base', 'url': location.href });
			player.postMessage({ 'msg': 'setr', 'rate': sampleRate = audioContext.sampleRate });
			
			var test = new ArrayBuffer(1);
			player.postMessage({ 'msg': 'test', 'x': test }, [test]);
			canTransfer = !test.length;
			
			initialize = doNothing;
		}
		
		//</editor-fold>
		
		//<editor-fold defaultstate="collapsed" desc="Worker error codes to API error codes">
		
		var ECONV = {
			'badspc': E_INVALID_SPC,
			'badzip': E_INVALID_ZIP,
			'empty': E_EMPTY_ARCHIVE,
			'unkty': E_UNKNOWN_FILE_TYPE,
			'badurl': E_BAD_URL,
			'dlerr': E_DOWNLOAD_ERROR,
			'dlabt': E_DOWNLOAD_ABORTED, // not used
			'nofile': E_PATH_NOT_FOUND,
			'io': E_IO
		};
		
		//</editor-fold>
		
		//<editor-fold defaultstate="collapsed" desc="Loader message processor">
		
		function unzipMsgProc(data) {
			data = data['data'];
			var ok = data['msg'] === 'ok';
			var url = data['url'];
			switch (data['from']) {
				case 'info':
					var corruptFiles = data['bad'] || [];
					var list = data['ls'];
					// Get the userdata for this load
					var hasUserdata = data['u'], userdata;
					if (hasUserdata) userdata = pendingLoadUserdata.remove(url);
					if (ok) {
						var list = data['ls'];
						if (!list.length) {
							// Reject empty lists
							imoInvokeLoadError(new ImoLoadEvent(url, userdata, undefined_, undefined_, corruptFiles, E_EMPTY_ARCHIVE));
							return;
						}
						// Load the tracks
						var tracks = [];
						list.forEach(function(t) {
							t = new Track(t);
							if (isDefined(userdata))
								defineReadonlyProperty(t, 'userdata', userdata);
							tracks.push(t);
						});
						// Create the playlist
						var playlist = new Playlist(tracks);
						if (isDefined(userdata))
							defineReadonlyProperty(playlist, 'userdata', userdata);
						
						imoInvokeLoad(new ImoLoadEvent(url, userdata, playlist.length === 1 ? tracks[0] : undefined_, playlist, corruptFiles, E_SUCCESS));
						if (data['ap'] && pendingPlayUrl === url) {
							// Hypothetically, caling _play() should be faster
							// than calling Playlist.play(). Microoptimization?
							//playlist.play();
							var wasPaused = _isPaused;
							_play(0, 0, playlist);
							_isPaused = wasPaused;
						}
					} else {
						// Pass errors onto the caller
						var e = ECONV[data['e']] || E_UNKNOWN;
						var status = e === E_DOWNLOAD_ERROR ? data['code'] : undefined_;
						imoInvokeLoadError(new ImoLoadEvent(url, userdata, undefined_, undefined_, corruptFiles, e, status || undefined_));
						if (url === pendingPlayUrl)
							pendingPlayUrl = pendingPlayTrack =
								pendingPlayPlaylist = pendingPlayTrackIndex = null_;
					}
					break;
				case 'load':
					// Ignore successes and failures for files that aren't
					// supposed to be playing.
					if (url !== pendingPlayUrl) break;
					if (ok) {
						var url = data['url'];
						var spc = data['fi'];	// The SPC file
						var at = data['at'];	// The time to begin playing at
						
						player.postMessage({ 'msg': 'load', 'url': url, 'fi': spc }, canTransfer ? [spc] : undefined_);
						if (at) player.postMessage({ 'msg': 'seek', 'url': url, 'to': at * sampleRate });
						
						//fetchMoreSamples(); // Doesn't work here.
					} else {
						// Pass errors onto the caller
						var e = ECONV[data['e']] || E_UNKNOWN;
						var status = e === E_DOWNLOAD_ERROR ? data['code'] : undefined_;
						// There might be recoverable data here--what track was
						// playing? What playlist was it being played in?
						var track = pendingPlayTrack,
						playlist = pendingPlayPlaylist;
						pendingPlayUrl = pendingPlayTrack =
								pendingPlayPlaylist = pendingPlayTrackIndex = null_;
						imoInvokeLoadError(new ImoLoadEvent(url, track['userdata'], track, playlist, [], e, status));
					}
					break;
			}
		}
		
		//</editor-fold>
		
		//<editor-fold defaultstate="collapsed" desc="Player message processor">
		
		function spcMsgProc(data) {
			data = data['data'];
			var ok = data['msg'] === 'ok';
			var url = data['url'];
			
			switch (data['from']) {
				case 'load':
					if (url !== pendingPlayUrl) break;
					if (ok) {
						_curTrack = pendingPlayTrack;
						_curPlaylist = pendingPlayPlaylist;
						_curTrackIndex = pendingPlayTrackIndex;
						
						isStarved = 0;
						wasPlayBufferingMessageSent = 0;
						nextBufferStart = 0;
						
						fadeStart = +_curTrack['_fSt'];
						trackEnd = +_curTrack['length'];
						if (_isPaused) {
							imoInvokePlayStateChange(new ImoStateEvent(P_PAUSED, _curTrack, _curPlaylist, _curTrackIndex));
						} else {
							startAudio();
						}
						fetchMoreSamples();
					} else if (data['e'] !== 'wrong url') {
						imoInvokeLoadError(new ImoLoadEvent(url, pendingPlayTrack['userdata'], pendingPlayTrack, pendingPlayPlaylist, [], ECONV[data['e']]));
					}
					pendingPlayUrl = pendingPlayTrack =
							pendingPlayPlaylist = pendingPlayTrackIndex = null_;
					break;
				case 'samp':
					if (!_curTrack || url !== _curTrack['url']) break;
					if (ok) {
						nUnreceivedBuffers--;
						//if (nUnreceivedSeeks < 1) {
						pendingBuffers.push(data['dat']);
						fetchMoreSamples();
						//}
					} else if (data['e'] !== 'wrong url' && DEBUG) {
						debugger; // This place shouldn't be reached.
					}
					break;
				case 'seek':
					if (!_curTrack || url !== _curTrack['url']) break;
					if (ok) {
						//nUnreceivedSeeks--;
						nextBufferStart = +data['at'];
						// TODO: Handle the seek operation.
						// This is all that the old imo-main.js did, so it might
						// be all that needs to be done here as well.
						// However, vigorously test the seeking thing to make
						// sure it works.
						0
					} else if (data['e'] !== 'wrong url' && DEBUG) {
						// The only error that will ever be received here is
						// 'bad value', which indicates a logic error rather
						// than a client-side error.
						debugger;
					}
			}
		}
		
		//</editor-fold>
		
		//<editor-fold defaultstate="collapsed" desc="Start/stop audio">
		
		function startAudio() {
			stopAudio();
			
			timeCorrectionFactor = -1 / 0; // -Infinity
			_isPaused = 0;
			
			fadeGain.gain['value'] = 1;
			outputNode = audioContext.createScriptProcessor(BUFFER_LENGTH, 0, 2);
			outputNode['onaudioprocess'] = processAudio;
			outputNode.connect(fadeGain);
		}
		
		function stopAudio() {
			clearFade();
			
			fadeGain.gain['value'] = 0;
			if (outputNode) {
				outputNode.disconnect();
				outputNode['onaudioprocess'] = null_; // FF bug; stop calling
				outputNode = null_;
			}
		}
		
		//</editor-fold>
		
		function fetchMoreSamples() {
			// Don't stop getting samples until the new track has been loaded?
			if (_curTrack/* && !pendingPlayUrl*/) {
				var literalTrackEnd = trackEnd * sampleRate;
				var requestedBufferStartTime = nextBufferStart + ((pendingBuffers.length + nUnreceivedBuffers) * BUFFER_LENGTH);
				var waitingBuffers = pendingBuffers.length + nUnreceivedBuffers;
				var neededBuffers = MAX_PENDING_BUFFERS - waitingBuffers;
				
				var recycledBuffer;
				while (neededBuffers-- > 0 && requestedBufferStartTime < literalTrackEnd) {
					if (oldBuffers.length > MAX_OLD_BUFFERS) {
						recycledBuffer = oldBuffers.shift();
						if (!canTransfer) recycledBuffer = undefined_;
					} else recycledBuffer = undefined_;
					player.postMessage({ 'msg': 'samp', 'url': _curTrack['url'], 'rcl': recycledBuffer }, recycledBuffer && [recycledBuffer]);
					requestedBufferStartTime += BUFFER_LENGTH;
					nUnreceivedBuffers++;
				}
			}
		}
		
		var gaveWarning;
		function processAudio(oEvt) {
			if (!_curTrack) throw new Error('No track is loaded.');
			
			// End the track once the audio stops.
			if (audioContext.currentTime + timeCorrectionFactor >= trackEnd)
				return endTrack(), undefined_;
			
			var time = oEvt.playbackTime;
			// Webkit doesn't implement AudioProcessingEvent.playbackTime,
			// so try to guess.
			if (isNaN(time)) {
				if (DEBUG && console && !gaveWarning)
					gaveWarning = 1, console.warn('Browser does not implement AudioProcessingEvent.playbackTime; timing may be innacurate.');
				
				time = audioContext.currentTime + (BUFFER_LENGTH / sampleRate);
			}
			
			var outputBuffer = oEvt.outputBuffer,
			outL = outputBuffer.getChannelData(0), // \ Unused warning
			outR = outputBuffer.getChannelData(1); // / is a bug
			
			var data = pendingBuffers.shift();
			if (!data) {
				// Chrome bug: audio doesn't get cleared
				for (var i = -1, ii = outputBuffer.length; ++i < ii;)
					outL[i] = outR[i] = 0;
				// Don't issue P_BUFFERING when the track ends.
				if (time + timeCorrectionFactor < trackEnd && (!isStarved || !wasPlayBufferingMessageSent)) {
					isStarved = 1;
					wasPlayBufferingMessageSent = 1;
					// Starvation will cause the time correction factor to
					// become obsolete, so set it to negative infinity so that
					// it will be fixed once samples are received.
					// NEVER MIND: Don't do it here, it interrupts with the
					// track end process.
					//timeCorrectionFactor = -1 / 0; // -Infinity
					clearFade();
					imoInvokePlayStateChange(new ImoStateEvent(P_BUFFERING, _curTrack, _curPlaylist, _curTrackIndex));
				}
			} else {
				oldBuffers.push(data);
				
				// Calculate timeCorrectionFactor.
				var nextBufferStartSeconds = nextBufferStart / sampleRate;
				if (isStarved || !wasPlayBufferingMessageSent) {
					isStarved = 0;
					// Starvation will cause the time correction factor to
					// become obsolete, so set it to negative infinity so that
					// it will be fixed once samples are received.
					timeCorrectionFactor = -1 / 0; // -Infinity
					wasPlayBufferingMessageSent = 1;
					clearFade();
					imoInvokePlayStateChange(new ImoStateEvent(P_PLAYING, _curTrack, _curPlaylist, _curTrackIndex));
					// Does anything else have to be done here?
				}
				if (time + timeCorrectionFactor < nextBufferStartSeconds || resetTimer) {
					resetTimer = 0;
					timeCorrectionFactor = nextBufferStartSeconds - time;
					//clearFade(); // Don't do it here, causes audio glitches(?)
					setNextFade();
				}
				
				var source = new Int16Array(data);
				for (var i = -1, j = i, ii = outputBuffer.length; ++i < ii;) {
					outL[i] = source[++j] / 0x8000; // \ Unused warning
					outR[i] = source[++j] / 0x8000; // / is a bug
				}
				nextBufferStart += ii;
			}
			
			fetchMoreSamples();
		}
		
		function getFadeAtTime(t) {
			return -((t - fadeStart) / (trackEnd - fadeStart)) + 1;
		}
		
		function setNextFade() {
			if (!wasFadeSet && isFinite(timeCorrectionFactor)) {
				var time = audioContext.currentTime,
				trueTime = time + timeCorrectionFactor;
				
				var startFade, startFadeTime,
				endFade = 0, endFadeTime = trackEnd - timeCorrectionFactor;
				
				if (trueTime < fadeStart) {
					startFade = 1;
					startFadeTime = fadeStart - timeCorrectionFactor;
				} else {
					startFade = getFadeAtTime(trueTime);
					startFadeTime = time;
				}
				
				var gain = fadeGain.gain;
				gain['value'] = startFade;
				gain.setValueAtTime(startFade, startFadeTime);
				gain.linearRampToValueAtTime(endFade, endFadeTime);
				
				wasFadeSet = 1;
			}
		}
		
		function clearFade() {
			fadeGain.gain.cancelScheduledValues(wasFadeSet = 0);
			fadeGain.gain['value'] = 1;
		}
		
		function endTrack() {
			var tracks;
			if (ImoSPC['autoplay'] && _curPlaylist && ++_curTrackIndex < (tracks = _curPlaylist['tracks']).length) {
				stopAudio(); // Destroy the current audio node
				// Clear _curTrack since the track has ended.
				// However, if the next track in the playlist is the same object
				// as the current track, then there is no need, and a seeking
				// event will be issued instead.
				if (!_play(0, _curTrackIndex, _curPlaylist))
					_curTrack = undefined_;
			} else {
				_stop();
			}
		}
		
		// Stop the current track, but don't clear the playlist.
		function stopWithoutClearing() {
			stopAudio();
			clearArray(pendingBuffers);
			clearArray(oldBuffers);
			_isPaused = nUnreceivedBuffers = 0;
			_curTrack = null_;
		}
		
		// This actually only tells the loader to load a file, and then when the
		// loader sets the playback into motion.
		_play = function(seekTo, track, playlist) {
			// seekTo, track, and playlist are assumed to be valid.
			// Seeking beyond the end of a track will stop the track.
			// Seeking to a negative position will seek that far from the end of
			// the track.
			initialize();
			takeControl();
			
			var trackIndex = playlist ? track : undefined_;
			if (playlist) track = playlist['tracks'][trackIndex];
			
			var maxTime = track['length'];
			// Negative seekTo means you start that many seconds from the end.
			if (seekTo < 0) {
				seekTo += maxTime;
				// -Infinity will start at zero.
				if (seekTo < 0) seekTo = 0;
			} else if (seekTo >= maxTime) {
				// If seeking beyond the end of the track, stop.
				// However, in a playlist, skip to the next track.
				if (playlist && ++trackIndex < playlist['tracks'].length) {
					seekTo = 0;
					track = playlist['tracks'][trackIndex];
				} else return _stop(), undefined_;
			}
			
			if (track !== _curTrack) {
				var previousTrack, previousIndex;
				
				if (!playlist || playlist !== _curPlaylist) {
					_stop();
				} else {
					previousTrack = _curTrack;
					previousIndex = _curTrackIndex;
					stopWithoutClearing();
				}
				// Because either 1.) a different track is playing or 2.) a
				// different track is currently being loaded, the specified
				// track needs to be re-loaded by the worker.
				pendingPlayUrl = track['url'];
				pendingPlayTrack = track;
				pendingPlayPlaylist = playlist;
				pendingPlayTrackIndex = trackIndex;
				
				_isPaused = 0; // Don't stay paused
				
				loader.postMessage({ 'msg': 'load', 'at': seekTo, 'url': pendingPlayUrl, 'ofs': track['_ofs'] });
				imoInvokePlayStateChange(new ImoStateEvent(P_LOADING, track, playlist, trackIndex, previousTrack, previousIndex));
			} else {
				// TODO: Perform a seek without reloading the current track.
				// Also, return true so that endTrack() knows when to not set
				// _curTrack to undefined.
				var nextBufferStart_ = nextBufferStart; // copy
				var seekToSample = Math.floor(seekTo * sampleRate);
				var manualSeek;
				if (seekToSample < nextBufferStart_) {
					// Try to re-use old buffers, if possible, instead of doing
					// an actual seek.
					while (oldBuffers.length) {
						pendingBuffers.unshift(oldBuffers.pop());
						nextBufferStart_ -= BUFFER_LENGTH;
						if (nextBufferStart_ <= seekToSample) {
							nextBufferStart = nextBufferStart_;
							resetTimer = 1;
							clearFade();
							return;
						}
					}
					manualSeek = 1;
				} else if (seekToSample > nextBufferStart_) {
					// Don't issue a seek operation if the samples have already
					// been received.
					while (pendingBuffers.length) {
						if (nextBufferStart_ + BUFFER_LENGTH >= seekToSample) {
							nextBufferStart = nextBufferStart_;
							resetTimer = 1;
							clearFade();
							return;
						}
						oldBuffers.push(pendingBuffers.shift());
						nextBufferStart_ += BUFFER_LENGTH;
					}
					// Check if the buffers that are waiting to be received
					// can be used.
					var unreceivedBuffersLength = nUnreceivedBuffers * BUFFER_LENGTH;
					manualSeek = (nextBufferStart_ + unreceivedBuffersLength < seekToSample);
				}
				if (manualSeek) {
					clearFade();
					//nUnreceivedSeeks++;
					clearArray(pendingBuffers);
					clearArray(oldBuffers);
					nUnreceivedBuffers = 0;
					resetTimer = 1;
					player.postMessage({ 'msg': 'seek', 'url': track['url'], 'to': nextBufferStart = seekToSample });
					fetchMoreSamples();
				}
				_unpause(); // Simply setting _isPaused to false won't work here
			}
		};
		
		_pause = function() {
			var ok = !!_curTrack && !_isPaused;
			if (ok) {
				stopAudio();
				_isPaused = 1;
				var pauseTime = (audioContext.currentTime + timeCorrectionFactor) * sampleRate;
				while (nextBufferStart > pauseTime) {
					var buffer = oldBuffers.pop();
					if (!buffer) break;
					
					pendingBuffers.unshift(buffer);
					nextBufferStart -= buffer.byteLength >>> 2;
				}
				wasPlayBufferingMessageSent = 0;
				imoInvokePlayStateChange(new ImoStateEvent(P_PAUSED, _curTrack, _curPlaylist, _curTrackIndex));
			} else if (pendingPlayUrl) {
				ok = _isPaused = true;
			}
			return ok;
		};
		_unpause = function() {
			var ok = !!(_curTrack && _isPaused);
			if (ok) {
				// TODO: This is probably not complete, but I'm not sure what's
				// missing. Figure it out.
				0
				startAudio();
				takeControl();
				//setNextFade(); // will be called by processAudio().
				//imoInvokePlayStateChange(new ImoStateEvent(P_PLAYING, _curTrack, _curPlaylist, _curTrackIndex));
			}
			return ok;
		};
		_stop = function() {
			var ok = !!_curTrack;
			if (ok) {
				var prevTrack = _curTrack,
				prevPlaylist = _curPlaylist,
				prevTrackIndex = _curTrackIndex;
				
				stopWithoutClearing();
				_curTrack = _curPlaylist = _curTrackIndex = null_;
				imoInvokePlayStateChange(new ImoStateEvent(P_STOPPED, prevTrack, prevPlaylist, prevTrackIndex));
			}
			// Get rid of any pending items
			if (pendingPlayUrl || pendingPlayTrack) {
				ok = true;
				pendingPlayUrl = pendingPlayTrack = pendingPlayPlaylist =
						pendingPlayTrackIndex = null_;
			}
			if (ok) _isPaused = 0;
			return ok;
		};
		_getTime = function() {
			return _curTrack && audioContext ? (_isPaused || isStarved ? nextBufferStart / sampleRate : audioContext.currentTime + timeCorrectionFactor) : -1;
		};
		
		_open = function(url, options) {
			if (!url) throw new TypeError('url is not specified.');
			// TODO: Figure out why I previously deferred absolutizing the
			// URL to the worker script.
			url = relativeToPage(url);

			var autostart, userdata, hasUserdata;
			if (options) {
				autostart = options['autostart'];
				userdata = options['userdata'];
			}
			autostart = !!(isDefined(autostart) ? autostart : ImoSPC['autostart']);
			if (!autostart) {
				// autoplay is the only way a track can be loaded if the
				// load event is not handled.
				requireEvent('load');
			}
			hasUserdata = isDefined(userdata);
			if (hasUserdata) {
				pendingLoadUserdata.add(url, userdata);
			}

			initialize();

			// If playing the opened file automatically, set the pending
			// play URL as a way of verifying that the user doesn't set
			// play something else while the loading is taking place.
			//
			// Also, stop playing whatever was previously playing when using
			// autostart.
			if (autostart) {
				_stop();
				pendingPlayTrack = pendingPlayPlaylist = pendingPlayTrackIndex = null_;
				pendingPlayUrl = url;
			}
			loader.postMessage({ 'msg': 'info', 'url': url, 'ap': autostart, 'u': hasUserdata });
		};

		_setVolume = function(vol) {
			if (masterGain)
				masterGain.gain['value'] = vol;
		};
		
		setVersion(V_R_HTML5);
		setIsFunctional(true);
		
		imoInvokeInit(new ImoInitEvent(V_R_HTML5));
	}

	//</editor-fold>

	//<editor-fold defaultstate="collapsed" desc="FlashImo">

	// Give ImoSPC the invisible, unmodifiable function _ready().
	// This will be called when the flash player is ready.
	var setFlashReadyFunction, setOtherFlashCallbacks;
	
	(function() {
		if (Object.defineProperties && (!msie || msie > 8)) {
			var _ready, _ongetinfo, _loaded, _onloaderror, _setstate;
			
			Object.defineProperties(ImoSPC, {
				'_ready': {
					'enumerable': false,
					'configurable': false,
					'get': function() {
						return _ready;
					}
				},
				'_ongetinfo': {
					'enumerable': false,
					'configurable': false,
					'get': function() {
						return _ongetinfo;
					}
				},
				'_loaded': {
					'enumerable': false,
					'configurable': false,
					'get': function() {
						return _loaded;
					}
				},
				'_onloaderror': {
					'enumerable': false,
					'configurable': false,
					'get': function() {
						return _onloaderror;
					}
				},
				'_setstate': {
					'enumerable': false,
					'configurable': false,
					'get': function() {
						return _setstate;
					}
				}
			});
			setFlashReadyFunction = function(func) {
				_ready = func;
			};
			setOtherFlashCallbacks = function(ongetinfo, loaded, onloaderror, setstate) {
				_ongetinfo = ongetinfo;
				_loaded = loaded;
				_onloaderror = onloaderror;
				_setstate = setstate;
			};
		} else {
			setFlashReadyFunction = function(func) {
				ImoSPC['_ready'] = func;
			};
			setOtherFlashCallbacks = function(ongetinfo, loaded, onloaderror, setstate) {
				ImoSPC['_ongetinfo'] = ongetinfo;
				ImoSPC['_loaded'] = loaded;
				ImoSPC['_onloaderror'] = onloaderror;
				ImoSPC['_setstate'] = setstate;
			};
		}
	}());
	
	function createFlashImo(options) {
		var swf_location = relativeToScript(IMO_FLASH_SWF);

		var swf = document.createElement('div');
		swf.innerHTML = '<object id="_ImoSwf" type="application/x-shockwave-flash" data="' + swf_location + '" style="width:1px;height:1px;position:absolute;top:0;' + (msie ? 'left:-1px" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000' : 'left:0;visibility:hidden') +
				'"><param name="movie" value="' + swf_location + '"/>' +
				'<param name="allowScriptAccess" value="always"/>' +
				'</object>';
		swf = swf.firstChild;
		
		isInitializationInProgress = true;

		var body;

		function addSwfToBody() {
			body = document.body || document.getElementsByTagName('body')[0];
			if (body) {
				body.appendChild(swf);
				if (msie) swf = global['_ImoSwf'];
				
				setFlashReadyFunction(function() {
					if (loadTimeout) {
						clearTimeout(loadTimeout);
						loadTimeout = null;
						
						finishLoading();
					}
				});
				
				if (swf.style.display === 'none' || swf.bgInactive) {
					// Don't bother setting the timeout if the Flash object is blocked.
					handleFlashBlocker();
				} else {
					var loadTimeout = setTimeout(function() {
						isInitializationInProgress = false;
						
						body.removeChild(swf);
						swf = null;
						loadTimeout = null;
						
						imoInvokeInitError(new ImoInitEvent(null_, E_TIMEOUT));
					}, (options && +options['timeout']) || 5000);
				}
			}
			else setTimeout(addSwfToBody, 100);
		}

		var _jsonEscapeMap = {
			'&': '&amp;',
			'\\': '&#x5C;',
			'"': '&quot;',
			"'": '&#x27;',
			'\r': '&#x0D;',
			'\n': '&#x0A;'
		};

		function _jsonEscape(match) {
			return _jsonEscapeMap[match] || match;
		}

		function jsonEscape(str) {
			return str.replace(/[&\\"'\r\n]/g, _jsonEscape);
		}
		
		var _jsonUnescapeMap = {
			'&amp;': '&',
			'&#x5c;': '\\',
			'&quot;': '"',
			'&#x27;': "'",
			'&#x0d;': '\r',
			'&#x0a;': '\n'
		};
		
		function _jsonUnescape(match) {
			return _jsonUnescapeMap[match.toLowerCase()] || match;
		}
		
		function jsonUnescape(str) {
			return str.replace(/&(?:amp|quot|#x(?:5C|27|0D|0A));/gi, _jsonUnescape);
		}
		
		function jsonUnescapeArray(array) {
			if (array) for (var i = -1, ii = array.length; ++i < ii;) {
				var s = array[i];
				if (typeof s === "string") {
					array[i] = jsonUnescape(s);
				}
			}
			return array;
		}
		
		function jsonUnescapeArrayArray(arrayArray) {
			if (arrayArray) for (var i = -1, ii = arrayArray.length; ++i < ii;) {
				var o = arrayArray[i];
				if (Array.isArray(o)) {
					jsonUnescapeArray(o);
				}
			}
			return arrayArray;
		}

		var pendingLoadUserdata = new Hashtable();
		var pauseImmediately;
		var pendingPlaySeek;
		
		function handleFlashBlocker() {
			imoInvokeInitError(new ImoInitEvent(null_, E_FLASHBLOCK));
		}
		
		function finishLoading() {
			isInitializationInProgress = false;

			_open = function(url, options) {
				if (!url) throw new TypeError('url is not specified.');
				url = relativeToPage(url);
				
				var autostart, userdata, hasUserdata;
				if (options) {
					autostart = options['autostart'];
					userdata = options['userdata'];
				}
				autostart = !!(isDefined(autostart) ? autostart : ImoSPC['autostart']);
				if (!autostart) {
					// autoplay is the only way a track can be loaded if the
					// load event is not handled.
					requireEvent('load');
				}
				hasUserdata = isDefined(userdata);
				if (hasUserdata) {
					pendingLoadUserdata.add(url, userdata);
				}
				
				if (autostart) {
					_stop();
					pendingPlayUrl = url;
					pendingPlayPlaylist = pendingPlayTrack = pendingPlaySeek =
							pauseImmediately = pendingPlayTrackIndex=undefined_;
				}
				swf['_getinfo'](jsonEscape(url));
			};
			
			_play = function(seekTo, track, playlist) {
				takeControl();
				
				pauseImmediately = false;
				
				var trackIndex = playlist ? track : undefined_;
				if (playlist) track = playlist['tracks'][trackIndex];
				
				var maxTime = track['length'];
				// Negative seekTo means you start that many seconds from the end.
				if (seekTo < 0) {
					seekTo += maxTime;
					// -Infinity will start at zero.
					if (seekTo < 0) seekTo = 0;
				} else if (seekTo >= maxTime) {
					// If seeking beyond the end of the track, stop.
					// However, in a playlist, skip to the next track.
					if (playlist && ++trackIndex < playlist['tracks'].length) {
						seekTo = 0;
						track = playlist['tracks'][trackIndex];
					} else return _stop(), undefined_;
				}
				
				if (track !== _curTrack) {
					
					if (!playlist || playlist !== _curPlaylist) {
						_stop();
					} else {
						// Don't send a P_STOPPED message when changing tracks
						// in a playlist
						swf['_stop'](false);
						var prevTrack = _curTrack,
						prevIndex = _curTrackIndex;
						_curTrack = _curTrackIndex = undefined_;
					}
					pendingPlayUrl = relativeToPage(track['url']);
					pendingPlayTrack = track;
					pendingPlayPlaylist = playlist;
					pendingPlayTrackIndex = trackIndex;
					pendingPlaySeek = seekTo;
					
					// Load and seek
					if (!swf['_load'](jsonEscape(pendingPlayUrl), +track['_fSt'], +track['_fLn'])) {
						imoInvokePlayStateChange(new ImoStateEvent(P_LOADING, pendingPlayTrack, pendingPlayPlaylist, pendingPlayTrackIndex, prevTrack, prevIndex));
					} else if (0) { // Don't bother, since the SWF will call _loaded()
						_curTrack = track;
						_curPlaylist = playlist;
						_curTrackIndex = trackIndex;
						pendingPlayTrackIndex = pendingPlayPlaylist =
								pendingPlayUrl = pendingPlayTrack = undefined_;
						
						swf['_start'](false);
						if (seekTo > 0) swf['_seek'](seekTo);
					}
				} else {
					pendingPlayTrackIndex = pendingPlayPlaylist =
							pendingPlayUrl = pendingPlayTrack = undefined_;
					
					_curPlaylist = playlist;
					_curTrackIndex = trackIndex;
					
					swf['_seek'](seekTo);
					swf['_resume']();
				}
			};
			
			_pause = function() {
				if (pendingPlayUrl) {
					pauseImmediately = true;
					return true;
				}
				return swf['_pause']();
			};
			
			_unpause = function() {
				takeControl();
				if (pendingPlayUrl) {
					pauseImmediately = false;
					return true;
				}
				return swf['_resume']();
			};
			
			_stop = function() {
				if (pendingPlayUrl) {
					pendingPlayUrl = pendingPlayTrack = pendingPlayPlaylist =
							pendingPlayTrackIndex = pendingPlaySeek =undefined_;
					return true;
				}
				return swf['_stop'](true);
			};
			
			_getTime = function() {
				return swf['_tell']() || -1;
			};
			
			_setVolume = function(v) {
				swf['_setVol'](v);
			};
			
			var ECONV = {
				'badspc': E_INVALID_SPC,
				'badzip': E_INVALID_ZIP,
				'empty': E_EMPTY_ARCHIVE,
				'unkty': E_UNKNOWN_FILE_TYPE,
				'badurl': E_BAD_URL,
				'dlerr': E_DOWNLOAD_ERROR,
				'http': E_DOWNLOAD_ERROR,
				'security': E_DOWNLOAD_ERROR,
				'dlabt': E_DOWNLOAD_ABORTED, // not used
				'nofile': E_PATH_NOT_FOUND,
				'io': E_IO
			};
			
			setOtherFlashCallbacks(function(url, tracks, corruptFiles) {
				// _ongetinfo()
				url = jsonUnescape(url);
				jsonUnescapeArrayArray(tracks);
				jsonUnescapeArray(corruptFiles);

				var userdata = pendingLoadUserdata.remove(url);
				if (!tracks.length) {
					imoInvokeLoadError(new ImoLoadEvent(url, userdata, undefined_, undefined_, corruptFiles, E_EMPTY_ARCHIVE));
					return;
				}
				
				for (var i = -1, ii = tracks.length; ++i < ii;) {
					var t = tracks[i] = new Track(tracks[i]);
					if (isDefined(userdata))
						defineReadonlyProperty(t, 'userdata', userdata);
				}
				var playlist = new Playlist(tracks);
				if (isDefined(userdata))
					defineReadonlyProperty(playlist, 'userdata', userdata);
				
				imoInvokeLoad(new ImoLoadEvent(url, userdata, tracks.length === 1 ? tracks[0] : undefined_, playlist, corruptFiles || [], E_SUCCESS));
				
				if (url === pendingPlayUrl && !pendingPlayTrack) {
					pendingPlayUrl = undefined_;
					var p = pauseImmediately;
					_play(0, 0, playlist);
					pauseImmediately = p;
				}
			}, function(url) {
				// _loaded()
				url = jsonUnescape(url);

				if (url === pendingPlayUrl) {
					var seekTo = pendingPlaySeek;
					
					_curTrack = pendingPlayTrack;
					_curPlaylist = pendingPlayPlaylist;
					_curTrackIndex = pendingPlayTrackIndex;
					
					pendingPlayUrl = pendingPlayTrack = pendingPlayPlaylist =
							pendingPlaySeek = pendingPlayTrackIndex =undefined_;
					
					swf['_start'](pauseImmediately);
					if (seekTo > 0) swf['_seek'](seekTo);
					if (pauseImmediately) {
						imoInvokePlayStateChange(new ImoStateEvent(P_PAUSED, _curTrack, _curPlaylist, _curTrackIndex));
					}
				}
			}, function(url, reason, extra) {
				// _onloaderror()
				url = jsonUnescape(url);
				if (typeof extra === "string") extra = jsonUnescape(extra);

				var e = ECONV[reason];
				if (DEBUG && !e) { console.log('Unknown error: ' + reason); }
				
				var userdata, httpStatus, corruptFiles;
				if (pendingPlayTrack) {
					userdata = pendingPlayTrack['userdata'];
					pendingPlayTrackIndex = pendingPlayPlaylist =
							pendingPlayUrl = pendingPlayTrack = undefined_;
				} else {
					userdata = pendingLoadUserdata.remove(url);
					if (url === pendingPlayUrl) {
						pendingPlayTrackIndex = pendingPlayPlaylist =
								pendingPlayUrl = pendingPlayTrack = undefined_;
					}
				}
				switch (e) {
					case E_DOWNLOAD_ERROR:
						httpStatus = +extra || undefined_;
						break;
					case E_INVALID_SPC:
					case E_EMPTY_ARCHIVE:
					case E_PATH_NOT_FOUND:
						corruptFiles = Array.isArray(extra) ? extra : [];
						break;
				}
				imoInvokeLoadError(new ImoLoadEvent(url, userdata, pendingPlayTrack, pendingPlayPlaylist, corruptFiles, e, httpStatus));
			}, function(state) {
				// _setstate()
				var message,
				track = _curTrack,
				playlist = _curPlaylist,
				index = _curTrackIndex;
				switch (state) {
					case 'buffering':
						// TODO: raise P_BUFFERING
						message = P_BUFFERING;
						break;
					case 'playing':
						// TODO: raise P_PLAYING
						message = P_PLAYING;
						break;
					case 'paused':
						// TODO: raise P_PAUSED
						message = P_PAUSED;
						break;
					case 'end':
						// TODO: switch to next track if autoplay is enabled and
						// there are more tracks to play; or else, fall through
						if (_curPlaylist && ImoSPC['autoplay'] && ++_curTrackIndex < _curPlaylist['tracks'].length) {
							_play(0, _curTrackIndex, _curPlaylist);
							return;
						}
					case 'stopped':
						// TODO: raise P_STOPPED
						message = P_STOPPED;
						_curTrack = _curPlaylist = _curTrackIndex = undefined_;
				}
				imoInvokePlayStateChange(new ImoStateEvent(message, track, playlist, index));
			});
			
			setIsFunctional(true);
			setVersion(V_R_FLASH);
			
			imoInvokeInit(new ImoInitEvent(V_R_FLASH));
		}
		
		addSwfToBody();
	}

	//</editor-fold>

	defineReadonlyProperty(ImoSPC, 'init', function(options) {
		requireEvent('init');
		requireEvent('initerror');
		
		// Don't re-initialize.
		if (ImoSPC['isFunctional'] || isInitializationInProgress)
			throw new Error('ImoSPC is already initialized');

		if (options) {
			if ('autoplay' in options) ImoSPC['autoplay'] = !!options['autoplay'];
			if ('autostart' in options) ImoSPC['autostart'] = !!options['autostart'];
			if ('allowMultipleInstances' in options) ImoSPC['allowMultipleInstances'] = !!options['allowMultipleInstances'];
		}

		if (isFlashSupported && !(options && 'preferredRuntime' in options && options['preferredRuntime'] === R_HTML5)) {
			createFlashImo(options);
		} else {
			testHTML5Support(function(ok) {
				if (ok) {
					createHtml5Imo(options);
				} else if (isFlashSupported) {
					createFlashImo(options);
				} else {
					imoInvokeInitError(new ImoInitEvent(V_R_NONE, E_BROWSER_NOT_SUPPORTED));
				}
			});
		}
	});
}(this, document));
