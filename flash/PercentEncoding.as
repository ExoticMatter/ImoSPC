package
{
	import flash.utils.ByteArray;
	import flash.utils.IDataInput;
	import flash.utils.IDataOutput;

	public class PercentEncoding {
		private static var codePage437Table:Vector.<String> = Vector.<String>("\x00☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼ !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■\xA0".split(""));
		private static var codePage437ReverseTable:Object = {};

		(function():void {
			for (var i:int = -1, ii:int = codePage437Table.length; ++i < ii;) {
				var c:String = codePage437Table[i], p:String, x:String;
				// encodeURI doesn't convert #.
				// This is the only character that needs to be encoded that
				// encodeURI doesn't get.
				if (p === '#') p = '%23';
				else p = encodeURI(c);
				codePage437Table[i] = p;
				// Match the ANSI char code as well
				x = encodeUnit(i);

				codePage437ReverseTable[c] =
				codePage437ReverseTable[p] =
				codePage437ReverseTable[x] = i;
			}

			function defineChar(code:int):void {
				for (var i:int = 0, ii:int = arguments.length; ++i < ii;) {
					var c:String = arguments[i], p:String = encodeURI(c);
					codePage437ReverseTable[c] = codePage437ReverseTable[p] = code;
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

		// Write a UTF-8 byte safely without leaving files with improperly
		// encoded filenames inaccessible; it should be fully reversible.
		private static function safeWriteUTF8(output:IDataOutput, code:int):void {
			if (code < 0x80) {
				output.writeByte(code);
			} else {
				var mask:int, extra:int;
				/**/ if (code < 0x00800) mask = 0xC0, extra = 1;
				else if (code < 0x10000) mask = 0xE0, extra = 2;
				else /*****************/ mask = 0xF0, extra = 3;

				output.writeByte(mask | (code >> (extra * 6)));
				while (--extra >= 0) {
					output.writeByte(0x80 | (code >> (extra * 6)) & 0x3F);
				}
			}
		}

		private static function encodeUnit(unit:int):String {
			var h:String = unit.toString(16).toUpperCase();
			return (h.length > 1 ? "%" : "%0") + h;
		}

		// Decode a percent-encoded escape sequence
		private static function decodeUnit(text:String, index:int):int {
			var n1:int = text.charCodeAt(index + 1),
				n2:int = text.charCodeAt(index + 2);

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

		// Get UTF-8 bytes from a percent encoded string.
		// It actually writes percent encoded file names
		public static function decodeToUTF8(text:String):ByteArray {
			var raw:ByteArray = new ByteArray();
			for (var i:int = -1, ii:int = text.length; ++i < ii;) {
				var c:int = text.charCodeAt(i);
				if (c === 0x25) {
					c = decodeUnit(text, i);
					if (c < 0) c = 0x25;
					else i += 2;
					// Do this here to prevent encoding UTF-8 sequences as
					// UTF-8.
					raw.writeByte(c);
				} else if (c < 0x80) {
					// Don't waste a function call over ASCII.
					raw.writeByte(c);
				} else {
					// Automatically convert any unencoded non-ASCII characters
					// to UTF-8.
					safeWriteUTF8(raw, c);
				}
			}
			return raw;
		}
		
		public static function encodeFromUTF8(utf8:IDataInput):String {
			var encoded:String = "";
			for (var ii:int = utf8.bytesAvailable; ii-- > 0;) {
				var code:int = utf8.readUnsignedByte();
				var chr:String;
				// Don't percent encode safe URI characters.
				if ((code === 0x21)					|| // !
					(code === 0x24)					|| // $
					(code > 0x25 && code < 0x3C)	|| // &'()*+,-./0-9:;
					(code === 0x3D)					|| // =
					(code > 0x3E && code < 0x5B)	|| // ?@A-Z
					(code === 0x5F)					|| // _
					(code > 0x60 && code < 0x7B)	|| // a-z
					(code === 0x7E)) {				   // ~
						chr = String.fromCharCode(code);
				} else {
					chr = encodeUnit(code);
				}
				encoded += chr;
			}
			return encoded;
		}

		public static function decodeToCodePage437(text:String):ByteArray {
			var cp437:ByteArray = new ByteArray();
			// %[0-7][a-f\d] -- Match ASCII
			// %[cd][a-f\d]%[8-b][a-f\d] -- Match 2-byte UTF-8 sequences
			// %e[a-f\d](?:%[8-b][a-f\d]){2} -- Match 3-byte UTF-8 sequences
			// %f[0-7](?:%[8-b][a-f\d]){3} -- Match 4-byte UTF-8 sequences
			// %[89a-f][a-f\d] -- Interpret invalid UTF-8 as Code Page 437.
			// [^] -- Match everything else (also grabs unencoded Unicode chars)
			var rgx:RegExp = /(%[0-7][a-f\d]|%[cd][a-f\d]%[8-b][a-f\d]|%e[a-f\d](?:%[8-b][a-f\d]){2}|%f[0-7](?:%[8-b][a-f\d]){3}|%[89a-f][a-f\d]|[^])/ig;
			var match:Object;

			while (match = rgx.exec(text)) {
				var c:Number = codePage437ReverseTable[match[0]];
				if (isNaN(c))
					return null;
				cp437.writeByte(c);
			}
			return cp437;
		}
		
		public static function encodeFromCodePage437(cp437:IDataInput):String {
			var encoded:String = "";
			for (var ii:int = cp437.bytesAvailable; ii-- > 0;)
				encoded += codePage437Table[cp437.readUnsignedByte()];
			return encoded;
		}
	}
}
