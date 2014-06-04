package
{
	import flash.utils.ByteArray;
	import flash.utils.IDataInput;

	public class UTFHelper {
		private static function nullTerminateText(text:String):String {
			var firstNull:int = text.indexOf("\x00");
			return (firstNull >= 0) ? text.substring(0,firstNull) : text;
		}

		public static function readBOMPrefixedCString(data:ByteArray, max:int):String {
			function maxRemaining():int {
				return Math.min(max, data.bytesAvailable);
			}
			
			var result:String;
			var originalPos:uint = data.position;
			switch(data.readUnsignedShort()) {
				case 0xFEFF:
					max -= 2;
					result = data.readMultiByte(maxRemaining(), "unicode");
					break;
				case 0xFFFE:
					max -= 2;
					result = data.readMultiByte(maxRemaining(), "unicodeFFFE");
					break;
				case 0xBBEF:
					if (data.readUnsignedByte() === 0xBF) {
						max -= 3;
						result = data.readMultiByte(maxRemaining(), "utf-8");
						break;
					}
				default:
					data.position = originalPos;

					var utf8text:String = data.readMultiByte(maxRemaining(), "utf-8");
					var utf8bin:ByteArray = new ByteArray();
					utf8bin.endian = data.endian;

					var isInvalidUTF8:Boolean;
					// Hackish way of determining validity of UTF-8: Decode it,
					// re-encode it, and compare that to the original. If ANY
					// substitution occurs, then the text is not (valid) UTF-8.
					utf8bin.writeUTFBytes(utf8text);
					
					data.position = originalPos;
					utf8bin.position = 0;

					for (var ii:uint = utf8bin.bytesAvailable; ii >= 4; ii -= 4) {
						if (utf8bin.readInt() !== data.readInt()) {
							isInvalidUTF8 = true;
							break;
						}
					}
					if (!isInvalidUTF8) {
						while (ii--) {
							if (utf8bin.readByte() !== data.readByte()) {
								isInvalidUTF8 = true;
								break;
							}
						}
					}
					if (isInvalidUTF8) {
						data.position = originalPos;
						result = data.readMultiByte(maxRemaining(), "Windows-1252");
					} else {
						data.position = originalPos + max;
						result = utf8text;
					}
					break;
			}
			return nullTerminateText(result);
		}
	}
}
