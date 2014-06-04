package
{
	import flash.utils.ByteArray;

	public class SPCMetadata {
		private static const SPC_MAGIC:String = "SNES-SPC700 Sound File Data";
		private static const SPC_FILE_LENGTH:int = 0x10200;

		private static const SPC_DEFAULT_FADE_START:int		= 60 * 3;
		private static const SPC_DEFAULT_FADE_LENGTH:int	= 3000;

		private static const ID666_STRING_LENGTH:int	= 32;
		private static const XID6_MAX_STRING_LENGTH:int	= 256;
		
		private static const XID6_TITLE_INDEX:int			= 2;
		private static const XID6_GAME_INDEX:int			= 3;
		private static const XID6_ARTIST_INDEX:int			= 4;
		private static const XID6_PUBLISHER_INDEX:int		= 5;
		private static const XID6_COPYRIGHT_INDEX:int		= 6;
		private static const XID6_OSTTITLE_INDEX:int		= 7;
		private static const XID6_OSTDISC_INDEX:int			= 8;
		private static const XID6_OSTTRACK_INDEX:int		= 9;
		private static const XID6_OSTTRACKNUM_INDEX:int		= 10;
		private static const XID6_OSTTRACKCHAR_INDEX:int	= 11;
		private static const ID666_FADESTART_INDEX:int		= 12;
		private static const ID666_FADELENGTH_INDEX:int		= 13;

		public static function isSPCFile(data:ByteArray):Boolean {
			if (data.readMultiByte(SPC_MAGIC.length, "us-ascii") === SPC_MAGIC){
				data.position += 6;
				if (data.readUnsignedShort() === 0x1A1A) {
					switch (data.readUnsignedByte()) {
						case 26:
						case 27:
							return true;
					}
				}
			}
			return false;
		}

		// data is expected to be a single byte array with nothing else in it.
		public static function getSPCMetadata(data:ByteArray):Array {
			if (!isSPCFile(data)) return null;
			data.position -= 1;

			var metadata:Array = [];
			if (data.readByte() === 26) {
				readID666Tags(data, metadata);
			}
			data.position = SPC_FILE_LENGTH;
			if (data.bytesAvailable >= 12) {
				readXID6Tags(data, metadata);
			}

			return metadata;
		}
		
		private static function parseNumericText(data:ByteArray, length:int):uint {
			return parseInt(data.readMultiByte(length, "us-ascii"), 10);
		}
		
		private static function parseNumericBinary(data:ByteArray, length:int):uint {
			var n:uint = data.readUnsignedInt();
			if (length < 4) data.position -= 4 - length;
			return n & (((1 << (length * 8)) - 1) || -1);
		}

		private static function readID666Tags(data:ByteArray, metadata:Array):void {
			data.position += 10;

			metadata[XID6_TITLE_INDEX] = UTFHelper.readBOMPrefixedCString(data, ID666_STRING_LENGTH);
			metadata[XID6_GAME_INDEX] = UTFHelper.readBOMPrefixedCString(data, ID666_STRING_LENGTH);

			var fadeStart:uint,
				fadeLength:uint;

			data.position = 0x9E;
			var isID666Text:Boolean =
				isNumber(data, 11, true) &&
				isNumber(data, 3, false) &&
				isNumber(data, 5, false);
			data.position = 0xA9;

			if (isID666Text) {
				fadeStart = parseNumericText(data, 3);
				fadeLength = parseNumericText(data, 5);
			} else {
				fadeStart = parseNumericBinary(data, 3);
				fadeLength = parseNumericBinary(data, 4);
			}

			metadata[XID6_ARTIST_INDEX] = UTFHelper.readBOMPrefixedCString(data, ID666_STRING_LENGTH);
			// If no fade start is specified, then use the default fade.
			if (!fadeStart) {
				fadeStart = SPC_DEFAULT_FADE_START;
				fadeLength = SPC_DEFAULT_FADE_LENGTH;
			}
			metadata[ID666_FADESTART_INDEX] = fadeStart;
			metadata[ID666_FADELENGTH_INDEX] = fadeLength / 1000;
		}
		
		private static function isNumber(data:ByteArray, size:int, isDate:Boolean):Boolean {
			while (size-- > 0) {
				var c:int = data.readByte();
				if (!c) break;
				else if (c < 0x30 || c > 0x39) {
					if (!isDate || c !== 0x2F) return false;
				}
			}
			while (size-- > 0) {
				if (data.readByte()) return false;
			}
			return true;
		}

		private static const XID6_FIELD_TITLE:int		= 0x01;
		private static const XID6_FIELD_GAME:int		= 0x02;
		private static const XID6_FIELD_ARTIST:int		= 0x03;
		private static const XID6_FIELD_OST:int			= 0x10;
		private static const XID6_FIELD_OSTDISC:int		= 0x11;
		private static const XID6_FIELD_OSTTRACK:int	= 0x12;
		private static const XID6_FIELD_PUBLISHER:int	= 0x13;
		private static const XID6_FIELD_COPYRIGHT:int	= 0x14;
		private static const XID6_FIELD_INTROLENGTH:int	= 0x30;
		private static const XID6_FIELD_LOOPLENGTH:int	= 0x31;
		private static const XID6_FIELD_ENDLENGTH:int	= 0x32;
		private static const XID6_FIELD_FADELENGTH:int	= 0x33;
		private static const XID6_FIELD_NLOOP:int		= 0x35;

		private static const XID6_TYPE_LENGTH:int	= 0;
		private static const XID6_TYPE_STRING:int	= 1;
		private static const XID6_TYPE_INTEGER:int	= 4;

		private static const XID6_SIG_LENGTH:int	= 4;
		private static const XID6_MIN_FIELDSIZE:int	= 4;
		private static const XID6_MAGIC:int			= 0x36646978;

		private static function readXID6Tags(data:ByteArray, metadata:Array):void {
			if (data.readInt() !== XID6_MAGIC) return;
			var end:uint = data.readUnsignedInt();
			if (end < XID6_MIN_FIELDSIZE) return;
			end += data.position;
			if (end >= data.length) end = data.length - 1;

			var introLength:uint,
				loopLength:uint,
				endLength:int, // Can be negative
				fadeLength:uint,
				nLoops:int,
				ostTrack:int = -1;

import flash.external.ExternalInterface;
			while (data.position < end && data.bytesAvailable >= XID6_MIN_FIELDSIZE) {
				var field:int = data.readByte();
ExternalInterface.call("console.log", "Read tag: 0x" + field.toString(16).toUpperCase());
				var type:int = data.readByte();
				var length:int = data.readUnsignedShort();
				// SPC spec says strings cannot be longer than 256 bytes
				var stringlen:int = Math.min(length, 256);
				// For technical reasons, integers cannot be larger than 32-bit
				var intlen:int = Math.min(length, 4);

				var next:uint = 0;
				if (type !== XID6_TYPE_LENGTH) {
					if (data.bytesAvailable < length) {
ExternalInterface.call("console.log", "Breaking out of loop ahead of time...");
						break;
					}

					next = length;
					if (next & 3) {
						next |= 3;
						next++;
					}
				}
				next += data.position;

				switch (field) {
					case XID6_FIELD_TITLE:
						if (type === XID6_TYPE_STRING)
							metadata[XID6_TITLE_INDEX] = UTFHelper.readBOMPrefixedCString(data, stringlen);
						break;
					case XID6_FIELD_GAME:
						if (type === XID6_TYPE_STRING)
							metadata[XID6_GAME_INDEX] = UTFHelper.readBOMPrefixedCString(data, stringlen);
						break;
					case XID6_FIELD_ARTIST:
						if (type === XID6_TYPE_STRING)
							metadata[XID6_ARTIST_INDEX] = UTFHelper.readBOMPrefixedCString(data, stringlen);
						break;
					case XID6_FIELD_OST:
						if (type === XID6_TYPE_STRING)
							metadata[XID6_OSTTITLE_INDEX] = UTFHelper.readBOMPrefixedCString(data, stringlen);
						break;
					case XID6_FIELD_OSTDISC:
						if (type === XID6_TYPE_LENGTH)
							metadata[XID6_OSTDISC_INDEX] = length & 0xFF;
						break;
					case XID6_FIELD_OSTTRACK:
						if (type === XID6_TYPE_LENGTH)
							ostTrack = length;
						break;
					case XID6_FIELD_PUBLISHER:
						if (type === XID6_TYPE_STRING)
							metadata[XID6_PUBLISHER_INDEX] = UTFHelper.readBOMPrefixedCString(data, stringlen);
						break;
					case XID6_FIELD_COPYRIGHT:
						if (type === XID6_TYPE_LENGTH)
							metadata[XID6_COPYRIGHT_INDEX] = length;
						break;
					case XID6_FIELD_INTROLENGTH:
						if (type === XID6_TYPE_INTEGER)
							introLength = parseNumericBinary(data, intlen);
						break;
					case XID6_FIELD_LOOPLENGTH:
						if (type === XID6_TYPE_INTEGER)
							loopLength = parseNumericBinary(data, intlen);
						break;
					case XID6_FIELD_ENDLENGTH:
						if (type === XID6_TYPE_INTEGER)
							endLength = parseNumericBinary(data, intlen);
						break;
					case XID6_FIELD_FADELENGTH:
						if (type === XID6_TYPE_INTEGER)
							fadeLength = parseNumericBinary(data, intlen);
						break;
					case XID6_FIELD_NLOOP:
						if (type === XID6_TYPE_LENGTH)
							nLoops = length & 0xFF;
				}
				data.position = next;
ExternalInterface.call("console.log", "Starting again at: 0x" + next.toString(16).toUpperCase() + "; Bytes remaining: 0x" + data.bytesAvailable.toString(16).toUpperCase());
			}
			if (ostTrack >= 0) {
ExternalInterface.call("console.log", "Value of ostTrack: 0x" + ostTrack.toString(16).toUpperCase());
				var ostTrackChar:String = ascii_to_displayable_char(ostTrack & 0xFF);
				ostTrack >>= 8;

				metadata[XID6_OSTTRACK_INDEX] = ostTrack + ostTrackChar;
				metadata[XID6_OSTTRACKNUM_INDEX] = ostTrack;
				metadata[XID6_OSTTRACKCHAR_INDEX] = ostTrackChar || undefined;
			}
			var fadeStart:Number = (introLength + loopLength * nLoops + endLength) / 64000;
			if (fadeStart > 0) {
				metadata[ID666_FADESTART_INDEX] = fadeStart;
				metadata[ID666_FADELENGTH_INDEX] = fadeLength / 64000;
			}
		}
		
		private static function ascii_to_displayable_char(ascii:uint):String {
			if (ascii === 0) {
				// 0 indicates that there is no ASCII char.
				return '';
			} else if (ascii > 0x7F) {
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
	}
}
