package
{
	import flash.external.ExternalInterface;

	public class JSONHelper {
		private static var escapeMap:Object = {
			'&': '&amp;',
			'\\': '&#x5C;',
			'"': '&quot;',
			"'": '&#x27;',
			'\r': '&#x0D;',
			'\n': '&#x0A;'
		};

		private static function _escape(match:String, ...args):String {
			return escapeMap[match] || match;
		}

		public static function escape(str:String):String {
			return str.replace(/[&\\"'\r\n]/g, _escape);
		}
		
		public static function escapeArray(array:Array):Array {
			if (array) for (var i:uint = 0, ii:uint = array.length; i < ii; i++) {
				var s:* = array[i];
				if (typeof s === "string") {
					array[i] = escape(s);
				}
			}
			return array;
		}
		
		public static function escapeArrayArray(arrayArray:Array):Array {
			if (arrayArray) for (var i:uint = 0, ii:uint = arrayArray.length; i < ii; i++) {
				var o:* = arrayArray[i];
				if (o is Array) {
					escapeArray(o);
				}
			}
			return arrayArray;
		}

		private static var unescapeMap:Object = {
			'&amp;': '&',
			'&#x5c;': '\\',
			'&quot;': '"',
			'&#x27;': "'",
			'&#x0d;': '\r',
			'&#x0a;': '\n'
		};
		
		private static function _unescape(match:String, ...args):String {
			return unescapeMap[match.toLowerCase()] || match;
		}
		
		public static function unescape(str:String):String {
			return str.replace(/&(?:amp|quot|#x(?:5C|27|0D|0A));/gi, _unescape);
		}
		
		public static function unescapeArray(array:Array):Array {
			if (array) for (var i:uint = 0, ii:uint = array.length; i < ii; i++) {
				var s:* = array[i];
				if (typeof s === "string") {
					array[i] = unescape(s);
				}
			}
			return array;
		}
		
		public static function unescapeArrayArray(arrayArray:Array):Array {
			if (arrayArray) for (var i:uint = 0, ii:uint = arrayArray.length; i < ii; i++) {
				var o:* = arrayArray[i];
				if (o is Array) {
					unescapeArray(o);
				}
			}
			return arrayArray;
		}
	}
}
