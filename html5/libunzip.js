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
;;(function(global){
	var undefined_;
	var null_ = null;

	var SPC_FILE_SIZE = 0x10180;
	var SPC_FILE_LIMIT = 0x20000;

	var pCompressedData = _malloc(SPC_FILE_LIMIT);
	var pRawData = _malloc(SPC_FILE_LIMIT);

	//<editor-fold defaultstate="collapsed" desc="Blob.slice() shim">

	(function(p){
		if (!p['slice']) p['slice'] =
				p['mozSlice'] ||
				p['webkitSlice'] ||
				p['msSlice'];
	}(Blob.prototype));

	//</editor-fold>
	
	//<editor-fold defaultstate="collapsed" desc="XHR cache">
	
	var CACHE_MAX_SIZE = 8;

	var cache = {};
	var cachedUrls = [];

	function tryGetCacheItem(url) {
		var item = cache[url];
		if (item !== undefined_) {
			var i = cachedUrls.indexOf(url);
			if (i >= 0) {
				cachedUrls.splice(i, 1);
			}
			cachedUrls.push(url);
		}
		return item;
	}
	
	function cacheItem(url, item) {
		if (cache.hasOwnProperty(url)) {
			var i = cachedUrls.indexOf(url);
			if (i >= 0) {
				cachedUrls.splice(i, 1);
			}
		}
		cache[url] = item;
		cachedUrls.push(url);
		if (cachedUrls.length > CACHE_MAX_SIZE)
			cachedUrls.shift();
	}
	
	//</editor-fold>

	//<editor-fold defaultstate="collapsed" desc="URL functions">
	
	var docBase;
	// The following function is under public domain.
	// See https://gist.github.com/Yaffle/1088850 for the original.
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
			} : null_);
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
			
			return !href || !base ? null_ : (href.protocol || base.protocol) +
					(href.protocol || href.authority ? href.authority : base.authority) +
					removeDotSegments(href.protocol || href.authority || href.pathname.charAt(0) === '/' ? href.pathname : (href.pathname ? ((base.authority && !base.pathname ? '/' : '') + base.pathname.slice(0, base.pathname.lastIndexOf('/') + 1) + href.pathname) : base.pathname)) +
					(href.protocol || href.authority || href.pathname ? href.search : (href.search || base.search)) +
					href.hash;
		};
	}());
	
	function uriRelativeToPage(uri) {
		return docBase ? absolutizeURI(docBase, uri) : uri;
	}
	
	//</editor-fold>

	//<editor-fold defaultstate="collapsed" desc="read blob helper">

	//function read_blob(blob, start, length, onload, onerror) {
	//	var reader = new FileReader();
	//	reader['onerror'] = onerror;
	//	reader['onload'] = function() {
	//		onload(new Uint8Array(this['result']));
	//	};
	//
	//	var subblob = start > 0 || length < blob.size;
	//	if (subblob) blob = blob.slice(start, start + length);
	//	reader.readAsArrayBuffer(blob);
	//	if (subblob) blob.close();
	//}
	var reader = new FileReaderSync();
	function read_blob(blob, start, length, onload, onerror) {
		var subblob = start > 0 || length < blob.size;
		if (subblob) blob = blob.slice(start, start + length);
		try {
			var result = reader.readAsArrayBuffer(blob);
			setTimeout(function() {
				onload(new Uint8Array(result));
			}, 0);
		} catch (e) {
			onerror();
		} finally {
			if (subblob && Blob.prototype.close) blob.close();
		}
	}

	//</editor-fold>
	
	//<editor-fold defaultstate="collapsed" desc="integer read helpers">
	
	function read_uint16_be(buffer, offset) {
		return (buffer[offset] << 8) | buffer[offset + 1];
	}

	function read_uint16(buffer, offset) {
		return buffer[offset] | (buffer[offset + 1] << 8);
	}
	
	function read_int16(buffer, offset) {
		var result = read_uint16(buffer, offset);
		return result < 0x8000 ? result : (result - 0x10000);
	}
	
	function read_uint32_be(buffer, offset) {
		return ((buffer[offset] << 24) |
				(buffer[offset + 1] << 16) |
				(buffer[offset + 2] << 8) |
				(buffer[offset + 3])) >>> 0;
	}
	
	function read_uint32(buffer, offset) {
		return ((buffer[offset]) |
				(buffer[offset + 1] << 8) |
				(buffer[offset + 2] << 16) |
				(buffer[offset + 3] << 24)) >>> 0;
	}
	
	function read_int32(buffer, offset) {
		return read_uint32(buffer, offset) | 0;
	}

	//</editor-fold>
	
	//<editor-fold defaultstate="collapsed" desc="string helpers">
	
	// Decode regular SPC fields.
	function cp1252_to_string(src, c_style) {
		var str = '';
		for (var i = -1, ii = src.length; ++i < ii;) {
			var c = src[i];
			// End on NUL.
			if (c_style && c === 0) break;
			// In Code Page 1252, only characters 0x80 to 0x9F
			// differ from their Unicode code points.
			if (c > 0x7F && c < 0xA0) {
				str += "€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008DŽ\u008F\u0090‘’“”•–—˜™š›œ\u009DžŸ".charAt(c - 0x80);
			} else str += String.fromCharCode(c);
		}
		return str;
	}

	/*var cp437, string_to_cp437_table = {};

	(function(string_to_cp437_table){
		cp437 = "\x00☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼ !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■\xA0".split("");

		for (var i = -1, ii = cp437.length; ++i < ii;) {
			string_to_cp437_table[cp437[i]] = i;
		}
		// And now, other equivalent characters.
		string_to_cp437_table['β'] = 0xE1;
		string_to_cp437_table['Π'] = string_to_cp437_table['∏'] = 0xE3;
		string_to_cp437_table['∑'] = 0xE4;
		string_to_cp437_table['μ'] = 0xE6;
		string_to_cp437_table['Ω'] = 0xEA;
		string_to_cp437_table['ð'] = string_to_cp437_table['∂'] = 0xEB;
		string_to_cp437_table['\u2205'] = string_to_cp437_table['\u03D5'] = string_to_cp437_table['\u2300'] = string_to_cp437_table['ø'] = 0xED;
		string_to_cp437_table['\u2208'] = string_to_cp437_table['€'] = 0xEE;
		
		
	}(string_to_cp437_table));

	function cp437_to_string(src) {
		var str = '';
		for (var i = -1, ii = src.length; ++i < ii;) {
			str += cp437[src[i]];
		}
		return str;
	}
	
	function string_to_cp437(str) {
		var arr = new Uint8Array(str.length);
		for (var i = -1, ii = arr.length; ++i < ii;) {
			var c = string_to_cp437_table[str.charAt(i)];
			if (c === undefined_) return null_;
			arr[i] = c;
		}
		return arr;
	}*/
	
	// Zip file paths need to be percent-encoded as UTF-8 rather than converted
	// into UTF-16. (This means that bad UTF-8 can be percent-encoded and
	// decoded into the same exact byte sequence as the original. Meaning
	// incorrectly encoded paths can be accessed.)
	function percent_encode_unit(unit) {
		var h = unit.toString(16).toUpperCase();
		return (h.length > 1 ? '%' : '%0') + h;
	}
	
	function percent_decode_unit(str, i) {
		var n1 = str.charCodeAt(i + 1),
			n2 = str.charCodeAt(i + 2);

		/**/ if (n1 > 0x2F && n1 < 0x3A) n1 -= 0x30;
		else if (n1 > 0x40 && n1 < 0x47) n1 -= 0x37;
		else if (n1 > 0x60 && n1 < 0x67) n1 -= 0x57;
		else return -1;

		/**/ if (n2 > 0x2F && n2 < 0x3A) n2 -= 0x30;
		else if (n2 > 0x40 && n2 < 0x47) n2 -= 0x37;
		else if (n2 > 0x60 && n2 < 0x67) n2 -= 0x57;
		else return -1;
		
		return (n1 << 4) | n2;
	}
	
	// This pair of functions leaves the bytes unchanged, allowing callers to
	// access incorrectly encoded paths in an archive.
	function percent_encode_binary(bin) {
		var str = '';
		for (var i = -1, ii = bin.length; ++i < ii;) {
			var c = bin[i];
			// Don't percent encode safe URI characters.
			if ((c === 0x21)			|| // !
				(c === 0x24)			|| // $
				(c > 0x25 && c < 0x3C)	|| // &'()*+,-./0-9:;
				(c === 0x3D)			|| // =
				(c > 0x3E && c < 0x5B)	|| // ?@A-Z
				(c === 0x5F)			|| // _
				(c > 0x60 && c < 0x7B)	|| // a-z
				(c === 0x7E)) {			   // ~
					c = String.fromCharCode(c);
			} else {
				c = percent_encode_unit(c);
			}
			str += c;
		}
		return str;
	}
	
	function percent_decode_binary(str) {
		var arr = [];
		for (var i = -1, ii = str.length; ++i < ii;) {
			var c = str.charCodeAt(i);
			if (c === 0x25) {
				c = percent_decode_unit(str, i);
				if (c < 0) c = 0x25;
				else i += 2;
			}
			arr.push(c);
		}
		return new Uint8Array(arr);
	}

	var cp437, string_to_cp437_table = {};

	(function(){
		cp437 = "\x00☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼ !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■\xA0".split("");

		for (var i = -1, ii = cp437.length; ++i < ii;) {
			var c = cp437[i], p, x;
			// encodeURI doesn't convert #.
			// This is the only character that needs to be encoded that
			// encodeURI doesn't get.
			if (p === '#') p = '%23';
			else p = encodeURI(c);
			cp437[i] = p;
			// Match the ANSI char code as well
			x = percent_encode_unit(i);

			string_to_cp437_table[c] =
			string_to_cp437_table[p] =
			string_to_cp437_table[x] = i;
		}
		
		function defineChar(code) {
			var args = arguments;
			for (var i = 0, ii = args.length; ++i < ii;) {
				var c = args[i], p = encodeURI(c);
				string_to_cp437_table[c] = string_to_cp437_table[p] = code;
			}
		}

		// And now, other equivalent characters.
		defineChar(0xE1, 'β');
		defineChar(0xE3, 'Π', '∏');
		defineChar(0xE4, '∑');
		defineChar(0xE6, 'μ');
		defineChar(0xEA, 'Ω');
		defineChar(0xEB, 'ð', '∂');
		defineChar(0xED, '\u2205', '\u03D5', '\u2300', 'ø');
		defineChar(0xEE, '\u2208', '€');
	}());
	
	// This pair of functions converts between CP-437 and UTF-8.
	// TODO: Make this more efficient, instead of doing a three-tier conversion.
	function percent_encode_cp437(src) {
		var str = '';
		for (var i = -1, ii = src.length; ++i < ii;)
			str += cp437[src[i]];
		return str;
	}
	
	function percent_decode_cp437(src) {
		var data = [];
		// %[0-7][a-f\d] -- Match ASCII
		// %[cd][a-f\d]%[8-b][a-f\d] -- Match 2-byte UTF-8 sequences
		// %e[a-f\d](?:%[8-b][a-f\d]){2} -- Match 3-byte UTF-8 sequences
		// %f[0-7](?:%[8-b][a-f\d]){3} -- Match 4-byte UTF-8 sequences
		// %[89a-f][a-f\d] -- Interpret invalid UTF-8 as Code Page 437.
		// [^] -- Match everything else (also grabs unencoded Unicode chars)
		var rgx = /(%[0-7][a-f\d]|%[cd][a-f\d]%[8-b][a-f\d]|%e[a-f\d](?:%[8-b][a-f\d]){2}|%f[0-7](?:%[8-b][a-f\d]){3}|%[89a-f][a-f\d]|[^])/ig;
		var match;
		
		while (match = rgx.exec(src)) {
			var c = string_to_cp437_table[match[0]];
			if (c === undefined_)
				return null_;
			data.push(c);
		}
		return new Uint8Array(data);
	}
	
	function utf32_char_to_string(c, nullOnFail) {
		if (c < 0 || c > 0x10FFFF || (c >> 8) > 0xD7) {
			if (nullOnFail) return null_;
			else c = 0xFFFD;
		} else if (c > 0xFFFF) {
			c -= 0x10000;
			var lead	= 0xD800 + (c >> 10),
				trail	= 0xDC00 + (c & 0x3FF);
			return String.fromCharCode(lead, trail);
		}
		return String.fromCharCode(c);
	}
	
	function unicode_decode_utf16(src, i, c_style, littleEndian) {
		var read_code_point = littleEndian ? read_uint16 : read_uint16_be;
		var str = '';
		for (var ii = src.length; i < ii; i += 2) {
			var c = read_code_point(src, i);
			if (c_style && c === 0) break;
			str += String.fromCharCode(c);
		}
		return str;
	}
	
	function unicode_decode_utf8(src, i, c_style, nullOnFail) {
		var str = '';
		function read_utf8_sequence() {
			var c = src[i++];
			if (c > 0x80) {
				var extra, min;

				/**/ if ((c & 0xE0)===0xC0) extra = 1, c &= 0x1F, min = 0x00080;
				else if ((c & 0xF0)===0xE0) extra = 2, c &= 0x0F, min = 0x00800;
				else if ((c & 0xF8)===0xF0) extra = 3, c &= 0x07, min = 0x10000;
				else if (nullOnFail) return -1;
				else {
					/**/ if ((c & 0xFC) === 0xF8) extra = 4;
					else if ((c & 0xFE) === 0xFC) extra = 5;
					else extra = 0;
					
					while (--extra >= 0) {
						if ((src[i] & 0xC0) !== 0x80) break;
						i++;
					}
					c = 0xFFFD;
				}
				
				while (--extra >= 0) {
					var x = src[i];
					// If a byte isn't a trail byte, then leave it for the
					// next iteration of the main loop, and replace the current
					// character with U+FFFD.
					if ((x & 0xC0) !== 0x80) {
						if (nullOnFail) return -1;
						c = 0xFFFD;
						break;
					}
					++i;
					c = (c << 6) | (x & 0x3F);
				}
				// Reject overlong characters, and anything beyond U+10FFFF, as
				// well as the nonexistent code points U+FFFE and U+FFFF.
				if (c < min || c > 0x10FFFF ||
					c === 0xFFFE || c === 0xFFFF) {
					if (nullOnFail) return -1;
					c = 0xFFFD;
				}
			}
			return c;
		}
		for (var ii = src.length; i < ii;) {
			var c = read_utf8_sequence();
			// End with NUL for C-style strings.
			if (c_style && c === 0) break;
			if (c < 0 || (c > 0xDBFF && c < 0xE000)) {
				if (nullOnFail) return null_;
				else c = '\uFFFD';
			} else if (c > 0xD7FF && c < 0xDC00) {
				// Try to decode an improperly encoded surrogate pair.
				var j = i, c2 = read_utf8_sequence();
				if (c2 > 0xDBFF && c2 < 0xE000) {
					c = String.fromCharCode(c, c2);
				} else {
					if (nullOnFail) return null_;
					i = j;
					c = '\uFFFD';
				}
			} else {
				c = utf32_char_to_string(c);
			}
			str += c;
		}
		return str;
	}
	
	// Guesses what encoding a string uses based on its byte order mark.
	// FF,FE,00,00 -> UTF-32, little endian
	// 00,00,FE,FF -> UTF-32, big endian
	// FF,FE -> UTF-16, little endian
	// FE,FF -> UTF-16, big endian
	// EF,BB,BF -> UTF-8
	// (no BOM) -> UTF-8; fall back Windows-1252 on failure
	function string_decode_auto(src, c_style) {
		var bom = read_uint16(src, 0);
		if (bom === 0xFEFF) {
			return unicode_decode_utf16(src, 2, c_style, true);
		} else if (bom === 0xFFFE) {
			return unicode_decode_utf16(src, 2, c_style);
		} else if (bom === 0xBBEF && src[2] === 0xBF) {
			return unicode_decode_utf8(src, 3, c_style);
		} else {
			// It should be rare for a non-UTF-8 data stream to be able to be
			// parsed as valid UTF-8 text. So, if the stream can be parsed as
			// UTF-8, then assume that it is indeed UTF-8.
			var s = unicode_decode_utf8(src, 0, c_style, true);
			return (s === null_) ? cp1252_to_string(src, c_style) : s;
		}
	}
	
	function string_to_utf8(str, bom) {
		var utf8 = bom ? [0xEF, 0xBB, 0xBF] : [];
		for (var i = -1, ii = str.length; ++i < ii;) {
			var c = str.charCodeAt(i);
			if (c > 0xD7FF && c < 0xDC00) {
				var d = str.charCodeAt(i + 1);
				if (d > 0xDBFF & d < 0xE000) {
					c -= 0xD800;
					d -= 0xDC00;
					c = 0x10000 + ((c << 10) | d);
					i++;
				} else {
					c = 0xFFFD;
				}
			} else if (c > 0xDBFF && c < 0xE000) {
				c = 0xFFFD;
			}
			if (c < 0x80) {
				utf8.push(c);
			} else {
				var mask, extra;
				/**/ if (c < 0x00800) mask = 0xC0, extra = 1;
				else if (c < 0x10000) mask = 0xE0, extra = 2;
				else /**************/ mask = 0xF0, extra = 3;
				
				utf8.push(mask | (c >> (extra * 6)));
				while (--extra >= 0) {
					utf8.push(0x80 | (c >> (extra * 6)) & 0x3F);
				}
			}
		}
		return new Uint8Array(utf8);
	}

	function ascii_to_displayable_char(ascii) {
		if (!ascii) {
			// NUL is used to indicate that there is no character, so ignore it.
			return '';
		} else if (ascii < 0 || ascii > 0x7F) {
			// Replace invalid ASCII with a question mark on a black lozenge.
			ascii = 0xFFFD;
		} else if (ascii === 0x7F) {
			// Replace DEL with the control picture U+2421 'SYMBOL FOR DELETE'.
			ascii = 0x2421;
		} else if (ascii < 0x21) {
			// Replace all C0 control codes, as well as spaces (U+0020), with
			// the corresponding control pictures.
			ascii += 0x2400;
		}
		return String.fromCharCode(ascii);
	}

	//</editor-fold>

	//<editor-fold defaultstate="collapsed" desc="pkzip">

	var PKZIP_FILE_MAGIC = 0x04034b50;
	var PKZIP_LOCAL_FILE_HEADER_SIZE = 30;
	
	var PKZIP_FLAG_ENCRYPTION		= 0x0001;
	var PKZIP_FLAG_SEPARATE_DESC	= 0x0008;
	var PKZIP_FLAG_PATCHED			= 0x0020;
	var PKZIP_FLAG_STRONG_ENCRYPT	= 0x0040;
	var PKZIP_FLAG_UTF8				= 0x0800;
	var PKZIP_FLAG_DIR_ENCRYPTION	= 0x2000;
	
	var PKZIP_UNSUPPORTED_FLAGS =
			PKZIP_FLAG_ENCRYPTION | PKZIP_FLAG_SEPARATE_DESC |
			PKZIP_FLAG_PATCHED | PKZIP_FLAG_STRONG_ENCRYPT |
			PKZIP_FLAG_DIR_ENCRYPTION;
	
	var PKZIP_COMPRESSION_DEFLATE	= 8;
	
	function pkzip_read_entries(blob, offset, oneHitOnly, sizeLimit, filenameCallback, dataCallback, onioerror, onziperror, onend, corruptFilesList) {
		var generalPurposeFlag;
		var compressionMethod;
		var crc32, compressedSize, uncompressedSize;
		var filenameLength, extraFieldLength;
		var filename, isFilenameUtf8;
		var isCompressed;
		
		var headerBegin;
		var allowMore = true;
		
		function reset_fields() {
			generalPurposeFlag = compressionMethod = crc32 = compressedSize =
					uncompressedSize = filenameLength = extraFieldLength =
					filename = isFilenameUtf8 = isCompressed = null_;
		}
		
		function load_next_file() {
			if (oneHitOnly) {
				if (!allowMore) return end();
				allowMore = false;
			}
			reset_fields();
			read_blob(blob, headerBegin = offset, PKZIP_LOCAL_FILE_HEADER_SIZE, block_loaded, onioerror);
			offset += PKZIP_LOCAL_FILE_HEADER_SIZE;
		}
		
		function block_loaded(data) {
			if (read_uint32(data, 0) !== PKZIP_FILE_MAGIC)
				return void(onend());
			
			generalPurposeFlag	= read_uint16(data, 6);
			compressionMethod	= read_uint16(data, 8);
			crc32				= read_int32(data, 14);
			compressedSize		= read_uint32(data, 18);
			uncompressedSize	= read_uint32(data, 22);
			filenameLength		= read_uint16(data, 26);
			extraFieldLength	= read_uint16(data, 28);
			
			isCompressed = !!compressionMethod;
			
			var isUnsupported= !!(generalPurposeFlag & PKZIP_UNSUPPORTED_FLAGS);
			isFilenameUtf8 = !!(generalPurposeFlag & PKZIP_FLAG_UTF8);
			
			// Deflate is the only compression method that is allowed.
			if (isUnsupported || compressedSize > sizeLimit || uncompressedSize > sizeLimit ||
					(isCompressed && compressionMethod !== PKZIP_COMPRESSION_DEFLATE))
				onziperror();
			else {
				// Only read the filename; do not read the extra field.
				read_blob(blob, offset, filenameLength, filename_loaded, onioerror);
				offset += filenameLength + extraFieldLength;
			}
		}
		
		function filename_loaded(data) {
			filename = data;
			if (filenameCallback)
				if (!filenameCallback(filename, isFilenameUtf8)) {
					offset += isCompressed ? compressedSize : uncompressedSize;
					load_next_file();
					return;
				}
			
			read_blob(blob, offset, isCompressed ? compressedSize : uncompressedSize, file_data_loaded, onioerror);
			offset += isCompressed ? compressedSize : uncompressedSize;
		}
		
		function file_data_loaded(data) {
			if (isCompressed) {
				HEAPU8.set(data, pCompressedData);
				if (!_imo_inflate(pCompressedData, compressedSize, pRawData, uncompressedSize) || _crc32(0, pRawData, uncompressedSize) !== crc32) {
					onziperror();
					return;
				}
			} else {
				HEAPU8.set(data, pRawData);
			}
			//dataCallback(isFilenameUtf8 ? unicode_decode_utf8(filename, 0) : cp437_to_string(filename), headerBegin, pRawData, uncompressedSize);
			dataCallback(isFilenameUtf8 ? percent_encode_binary(filename) : percent_encode_cp437(filename), headerBegin, pRawData, uncompressedSize);
			load_next_file();
		}
		
		function end() {
			if (onend) onend();
		}
		
		load_next_file();
	}
	
	function pkzip_extract_file(blob, path, callback, onmatchfail, onioerror, onziperror, hint) {
		//var path_utf8 = string_to_utf8(path), path_utf8_i32 = new Int32Array(path_utf8.buffer, 0, path_utf8.length / 4 >>> 0);
		var path_utf8 = percent_decode_binary(path), path_utf8_i32 = new Int32Array(path_utf8.buffer, 0, path_utf8.length / 4 >>> 0);
		var filenameTester;
		var matchFound;
		
		function compare_arrays(a, b, a_i32, b_i32) {
			if (!a || !b || a.length !== b.length) return;
			
			for (var i = -1, ii = a_i32.length; ++i < ii;) {
				if (a_i32[i] !== b_i32[i]) return;
			}
			for (var i = a_i32.length << 2 >>> 0, ii = a.length; i < ii; i++) {
				if (a[i] !== b[i]) return;
			}
			return 1;
		}
		
		//if (path_utf8.length === path.length) {
		//	// ASCII filename; no need for any extra comparisons.
		//	filenameTester = function(filename, isUtf8) {
		//		return compare_arrays(path_utf8, filename, path_utf8_i32, new Int32Array(filename.buffer, 0, filename.length / 4 >>> 0));
		//	};
		//} else {
			// If the filename contains non-ASCII characters, then encode the
			// same string in Code Page 437, and choose which one 
			//var path_cp437 = string_to_cp437(path), path_cp437_i32 = path_cp437 && new Int32Array(path_cp437.buffer, 0, path_cp437.length / 4 >>> 0);
			var path_cp437 = percent_decode_cp437(path), path_cp437_i32 = path_cp437 && new Int32Array(path_cp437.buffer, 0, path_cp437.length / 4 >>> 0);
			filenameTester = function(filename, isUtf8) {
				return compare_arrays(isUtf8 ? path_utf8 : path_cp437, filename, isUtf8 ? path_utf8_i32 : path_cp437_i32, new Int32Array(filename.buffer, 0, filename.length / 4 >>> 0));
			};
		//}
		
		function onMatch(filename, offset, data_ptr, data_size) {
			if (!matchFound) {
				matchFound = 1;
				callback(filename, offset, data_ptr, data_size);
			}
		}
		
		function onE() {
			if (!matchFound) onmatchfail();
		}
		
		function pkzip_read_template(hint, hasHint, onend) {
			pkzip_read_entries(blob, hint >>> 0, hasHint, SPC_FILE_LIMIT, filenameTester, onMatch, onioerror, onziperror, onend);
		}
		
		function searchAll() {
			pkzip_read_template(0, false, onE);
		}
		
		// It's okay to do a full search if hint is 0, because when doing a
		// full search when hint is 0 means that it should match the correct
		// file right away.
		if (hint/* !== undefined_*/) {
			pkzip_read_template(hint, true, function() {
				if (!matchFound) searchAll();
			});
		} else searchAll();
	}
	
	function pkzip_list_spc_files(blob, baseUrl, callback, onioerror, onziperror, corruptFilesList) {
		var list = [];
		
		pkzip_read_entries(blob, 0, false, SPC_FILE_LIMIT,
		
		function(filename) {
			// Match filename against *.sp{c,0..9}, and ignore case
			var i = filename.length - 4,
			a = filename[i],
			b = filename[i + 1],
			c = filename[i + 2],
			d = filename[i + 3];
			
			return			   a === 0x2E  &&	// .
			(b === 0x73 || b === 0x53) &&	// s || S
			(c === 0x70 || c === 0x50) &&	// p || P
			(d === 0x63 || d === 0x43  ||	// c || C || [0-9]
			(d  >  0x2F && d  <  0x3A));
		},
		
		function(filename, offset, data_ptr, data_size) {
			// filename is now already percent encoded.
			//var fileurl = baseUrl + '#' + filename.replace(/#/g, '%23');
			var fileurl = baseUrl + '#' + filename; //encodeURIComponent(filename);
			if (!is_block_spc(HEAPU8.subarray(data_ptr, data_ptr + data_size)))
				corruptFilesList.push(fileurl);
			else
				list.push(get_metadata_from_ptr(fileurl, offset, data_ptr, data_size));
		}, onioerror, onziperror,
		
		function() {
			callback(list);
		}, corruptFilesList);
	}
	
	function pkzip_list_spc_single(blob, baseUrl, path, callback, onempty, onioerror, onziperror, corruptFilesList) {
		pkzip_extract_file(blob, path,
		
		function(filename, offset, data_ptr, data_size) {
			// filename is now already percent encoded.
			//var fileurl = baseUrl + '#' + filename.replace(/#/g, '%23');
			var fileurl = baseUrl + '#' + filename; //encodeURIComponent(filename);
			var list = [];
			if (!is_block_spc(HEAPU8.subarray(data_ptr, data_ptr + data_size)))
				corruptFilesList.push(fileurl);
			else
				list.push(get_metadata_from_ptr(fileurl, offset, data_ptr, data_size));
			
			callback(list);
		}, onempty, onioerror, onziperror, corruptFilesList);
	}

	//</editor-fold>

	//<editor-fold defaultstate="collapsed" desc="SPC helper functions">

	function raw_spc_read(blob, url, callback, onioerror) {
		read_blob(blob, 0, SPC_FILE_LIMIT,
		
		function(data) {
			HEAPU8.set(data, pRawData);
			callback([get_metadata_from_ptr(url, undefined_, pRawData, data.length)]);
		}, onioerror);
	}
	
	// These flags allow integer fields to be set to undefined when unspecified.
	var XID6_FIELD_FLAG_OSTDISC		= 0x01;
	var XID6_FIELD_FLAG_OSTTRACK	= 0x02;
	var XID6_FIELD_FLAG_COPYRIGHT	= 0x04;

	function get_metadata_from_ptr(url, offset, data_ptr, data_size) {
		var pMeta = _imo_get_metadata(data_ptr, data_size);
		var fadeStart = _xid6_getFadeStart(pMeta);
		var xid6Fields = _xid6_getFields(pMeta);
		var trackNum = xid6Fields & XID6_FIELD_FLAG_OSTTRACK ? _xid6_getOstTrack(pMeta) : undefined_;
		var trackNumChar = ascii_to_displayable_char(_xid6_getOstTrackChar(pMeta));
		var metadata = [
			url,
			offset,
			decode_string_ptr(_xid6_getTitle(pMeta)) || undefined_,
			decode_string_ptr(_xid6_getGame(pMeta)) || undefined_,
			decode_string_ptr(_xid6_getArtist(pMeta)) || undefined_,
			decode_string_ptr(_xid6_getPublisher(pMeta)) || undefined_,
			xid6Fields & XID6_FIELD_FLAG_COPYRIGHT ? _xid6_getCopyrightYear(pMeta) : undefined_,
			decode_string_ptr(_xid6_getOstTitle(pMeta)) || undefined_,
			xid6Fields & XID6_FIELD_FLAG_OSTDISC ? _xid6_getOstDisc(pMeta) : undefined_,
			(trackNum !== undefined_) ? trackNum + trackNumChar : undefined_,
			trackNum,
			trackNumChar || undefined_,
			fadeStart,
			/*fadeStart +*/ _xid6_getFadeLength(pMeta)
		];
		_imo_free_metadata(pMeta);
		return metadata;
	}
	
	function decode_string_ptr(ptr) {
		return string_decode_auto(HEAPU8.subarray(ptr, ptr + 256), true);
	}

	//</editor-fold>

	//<editor-fold defaultstate="collapsed" desc="Download helper">
	
	function download_file(url, callback, onerror) {
		var result = tryGetCacheItem(url);
		if (result !== undefined_) {
			callback(result);
		} else {
			var xhr = new XMLHttpRequest();
			xhr.open('GET', url, true);
			xhr['responseType'] = 'blob';
			xhr['onreadystatechange'] = function() {
				if (this.readyState === 4) {
					var status = +this.status;
					if (status > 399 && status < 700) {
						onerror.call(this);
					} else {
						var response = this.response;
						if (!(response instanceof Blob)) {
							response = new Blob(response);
						}
						cacheItem(url, response);
						callback(response);
					}
				}
			};
			xhr['onerror'] = onerror;
			
			xhr.send();
		}
	}

	//</editor-fold>

	//<editor-fold defaultstate="collapsed" desc="File type guesser">

	// Since this is pure ASCII, there are no problems using string_to_utf8.
	var SPC_FILE_MAGIC = string_to_utf8('SNES-SPC700 Sound File Data ');
	
	function is_block_spc(data, size) {
		if (size === undefined_) size = data.length;
		
		if (size < SPC_FILE_SIZE ||
			data[0x21] !== 26 || data[0x22] !== 26 ||
			(data[0x23] !== 26 && data[0x23] !== 27)) return 0;

		for (var i = -1, ii = SPC_FILE_MAGIC.length; ++i < ii;) {
			if (data[i] !== SPC_FILE_MAGIC[i]) return 0;
		}
		return 1;
	}
	
	// No MIME type, or 
	function auto_detect_file(blob, spcProc, pkzipProc, failProc, onioerror) {
		read_blob(blob, 0, 36, function(data) {
			if (read_int32(data, 0) === PKZIP_FILE_MAGIC) {
				pkzipProc();
			} else if (is_block_spc(data, blob.size)) {
				spcProc();
			} else {
				failProc();
			}
		}, onioerror);
	}

	//</editor-fold>

	global['onmessage'] = function(data) {
		data = data.data;
		var msg = data['msg'];
		var url = data['url']; //uriRelativeToPage(data['url']);

		if (msg === 'base') {
			if (!url) return;
			docBase = url;
			return;
		}
		
		//var trueUrl = uriRelativeToPage(url);
		var trueUrl = url; // Do this in imo-main.js

		function create_error_base(e) {
			return {
				'msg': 'fail',
				'from': msg,
				'url': url,
				'u': data['u'],
				'e': e
			};
		}

		function post_error(e) {
			debugger;
			postMessage(create_error_base(e));
		}
		
		function post_unknowntypeerror() { post_error('unkty'); }
		function post_ioerror() { post_error('io'); }
		function post_badspc() { post_error('badspc'); }
		function post_badzip() { post_error('badzip'); }
		function post_nofile() { post_error('nofile'); }
		
		function post_dlerror_proc() {
			var e = create_error_base('dlerr');
			e['code'] = this['status'];
			postMessage(e);
		}
		
		if (!url || url === '#') {
			post_error('badurl');
			return;
		}
		var fragment, base, fragmentStart = trueUrl.indexOf('#') + 1;
		if (fragmentStart > 0) {
			// Don't allow...
			// - Empty URLs (i.e. #file.spc)
			// - Empty paths (i.e. ./archive.zip#)
			// - Nested archives (i.e. ./parent.zip#child.zip#file.spc
			if (fragmentStart === 1 || fragmentStart >= trueUrl.length ||
				trueUrl.indexOf('#', fragmentStart) >= 0) {
					post_error('badurl');
					return;
			}
			fragment = trueUrl.substring(fragmentStart);
			base = trueUrl.substring(0, fragmentStart - 1);
		}
		fragmentStart--;

		var fn = {
			'info': function(blob) {
				var corruptSpcFiles = [];

				function post_success(list) {
					if (list.length <= 0) {
						post_error(corruptSpcFiles.length ? 'badspc' : 'empty');
					} else {
						postMessage({
							'msg': 'ok',
							'from': msg,
							'url': url,
							'ls': list,
							'ap': data['ap'],
							'u': data['u'],
							'bad': corruptSpcFiles
						});
					}
				}

				auto_detect_file(blob, function() {
					// SPC proc
					if (fragmentStart < 0) {
						raw_spc_read(blob, trueUrl, post_success, post_ioerror);
					} else {
						post_badspc(); // SPC files can't have a fragment
					}
				},
				
				function() {
					// Zip proc
					if (fragmentStart < 0) {
						// List every SPC track in the archive
						pkzip_list_spc_files(blob, trueUrl, post_success, post_ioerror, post_badzip, corruptSpcFiles);
					} else {
						// Get the info for a specific SPC file
						pkzip_list_spc_single(blob, base, fragment, post_success, post_nofile, post_ioerror, post_badzip, corruptSpcFiles);
					}
				}, post_unknowntypeerror, post_ioerror);
			},

			'load': function(blob) {
				var seekTime = data['at'];
				function post_success(data) {
					if (is_block_spc(data)) {
						data = data.buffer;
						postMessage({
							'msg': 'ok',
							'from': msg,
							'url': url,
							'fi': data,
							'at': seekTime
						}, [data]);
					} else {
						post_badspc();
					}
				}

				auto_detect_file(blob, function() {
					// SPC proc
					if (fragmentStart < 0) {
						read_blob(blob, 0, SPC_FILE_SIZE, post_success, post_ioerror);
					} else {
						post_badspc(); // SPC files can't have a fragment
					}
				},
				
				function() {
					// Zip proc
					if (fragmentStart < 0) {
						post_nofile(); // Zip files MUST have a fragment
					} else {
						pkzip_extract_file(blob, fragment, function(filename, offset, data_ptr, data_size) {
							post_success(new Uint8Array(HEAPU8.buffer.slice(data_ptr, data_ptr + data_size)));
						}, post_nofile, post_ioerror, post_badzip, data['ofs']);
					}
				}, post_unknowntypeerror, post_ioerror);
			}
		}[msg];
		if (typeof fn !== 'function') return;

		download_file(base || trueUrl, fn, post_dlerror_proc);
	};
}(this));
