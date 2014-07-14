package
{
	import flash.external.ExternalInterface;

	public class JSONHelper {
		private static var escapeMap:Object = {
			'$': '$24',
			'&': '$26',
			'<': '$3C',
			'>': '$3E',
			'\\': '$5C',
			'"': '$22',
			"'": '$27',
			'\r': '$0D',
			'\n': '$0A'
		};

		private static function _escape(match:String, ...args):String {
			return escapeMap[match] || match;
		}

		public static function escape(str:String):String {
			return str.replace(/[$&\\<>"'\r\n]/g, _escape);
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
		
		private static function _unescape(match:String, hex:String, ...args):String {
			return String.fromCharCode(parseInt(hex, 16));
		}
		
		public static function unescape(str:String):String {
			return str.replace(/\$([a-f0-9A-F]{2,2})/g, _unescape);
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
