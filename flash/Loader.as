package
{
	import flash.display.Sprite;
	import flash.errors.*;
	import flash.events.*;
	import flash.external.ExternalInterface;
	import flash.system.Security;
	import flash.utils.Endian;
	import flash.utils.ByteArray;
	import flash.utils.IDataInput;

	import ImoSPC.*;

	public class Loader {
		private var spc:SPC;

		private function jslog(text: String) : void {
			ExternalInterface.call("console.log", text);
		}
		
		public function Loader(spc:SPC) {
			this.spc = spc;

			ExternalInterface.addCallback("_getinfo", getInfoAsync);
			ExternalInterface.addCallback("_load", loadAsync);
		}

		private static function sendLoadComplete(url:String, metadata:Array, corruptFiles:Array = null):void {
			ExternalInterface.call("ImoSPC._ongetinfo", url, metadata, corruptFiles);
		}

		private static function sendLoadError(url:String, reason:String, extra:* = null):void {
			ExternalInterface.call("ImoSPC._onloaderror", url, reason, extra);
		}
		
		private function removeURLFragment(url:String):String {
			var hashPos:int = url.indexOf("#");
			if (hashPos >= 0) {
				return url.substring(0, hashPos);
			} else {
				return url;
			}
		}

		private function getInfoAsync(url:String):void {
			try {
				var stream:LoaderHelper = new LoaderHelper(url);
			} catch(e:Error) {
				sendLoadError(url, "other", e.message);
				return;
			}
			stream.endian = Endian.LITTLE_ENDIAN;
			stream.waitForMoreData(PKZIP_LOCAL_FILE_HEADER_SIZE, function():void {
				var tmp:ByteArray = new ByteArray();
				tmp.endian = Endian.LITTLE_ENDIAN;

				stream.readBytes(tmp, 0, PKZIP_LOCAL_FILE_HEADER_SIZE);
				tmp.position = 0;
				switch (tmp.readInt()) {
					case PKZIP_FILE_MAGIC: // PK\x03\x04
						var list:Array = [];
						var corruptFiles:Array = [];
						var baseURL:String = removeURLFragment(url);
						tmp.position = 0;
						forEachZipEntry(url, stream, function(filename:String, data:ByteArray):void {
							var metadata:Array = SPCMetadata.getSPCMetadata(data);
							if (!metadata) {
								corruptFiles.push(filename);
							} else {
								metadata[0] = baseURL + '#' + filename;
								list.push(metadata);
							}
						}, function():void {
							if (!list.length) {
								var reason:String;
								switch (corruptFiles.length) {
									case 0:
										reason = baseURL !== url ? "notfound" : "empty";
										break;
									default:
										reason = "badspc";
								}
								sendLoadError(url, reason, corruptFiles);
							} else {
								sendLoadComplete(url, list, corruptFiles);
							}
						}, function(filename:String):void {
							corruptFiles.push(filename);
						}, readPkZipDescriptor(tmp));
						break;
					case 0x53454E53: // SNES
						stream.waitForMoreData(6, function():void {
							stream.readBytes(tmp, 30, 6);
							tmp.position = 0;
							
							if (SPCMetadata.isSPCFile(tmp)) {
								stream.waitForAllData(function():void {
									if (stream.bytesAvailable + 36 < SPC.MIN_FILE_SIZE) {
										sendLoadError(url, "badspc");
										stream.close();
										return;
									}
									stream.readBytes(tmp, 36, stream.bytesAvailable);
									stream.close();
									tmp.position = 0;

									var metadata:Array = SPCMetadata.getSPCMetadata(tmp);
									sendLoadComplete(metadata[0] = url, [metadata]);
								});
							} else {
								sendLoadError(url, "unkty");
								stream.close();
							}
						}, "unkty");
						break;
					default:
						sendLoadError(url, "unkty");
						break;
				}
			}, "unkty");
		}
		
		private var loadingURL:String;
		private function loadAsync(url:String, fadeStart:Number, fadeLength:Number):Boolean {
			fadeStart *= SPC.SAMPLE_RATE;
			fadeLength *= SPC.SAMPLE_RATE;
			spc.stop(true);
			if (url === spc.loadedURL) {
				spc.fadeStart = fadeStart;
				spc.fadeLength = fadeLength;
				spc.reload();
				ExternalInterface.call("ImoSPC._loaded", url);
				return true;
			}
			var baseURL:String = removeURLFragment(url);

			try {
				var stream:LoaderHelper = new LoaderHelper(url);
				loadingURL = url;
			} catch(e:Error) {
				sendLoadError(url, "other", e.message);
				return false;
			}
			stream.endian = Endian.LITTLE_ENDIAN;
			
			if (baseURL !== url) {
				// Extract from Zip file
				var foundFile:Boolean;

				forEachZipEntry(url, stream, function(filename:String, file:ByteArray):void {
					if (loadingURL !== url) return;

					foundFile = true;
					spc.setFile(baseURL + "#" + filename, file, fadeStart, fadeLength);
				}, function():void {
					if (loadingURL !== url) return;

					if (!foundFile) {
						// A file wasn't found in a Zip archive.
						sendLoadError(url, "notfound");
					}
				}, function():void {
					if (loadingURL !== url) return;

					foundFile = true;
					// Unsupported zip entries--only called when this file
					// matches the input fragment
					sendLoadError(url, "badspc");
				});
			} else {
				// Open SPC file
				stream.waitForMoreData(SPC.MIN_FILE_SIZE, function():void {
					if (loadingURL !== url) return;

					var file:ByteArray = new ByteArray();
					stream.readBytes(file, 0, SPC.MIN_FILE_SIZE);
					spc.setFile(url, file, fadeStart, fadeLength);
				}, "badspc");
			}

			return false;
		}

		private const PKZIP_FILE_MAGIC:int = 0x04034b50;
		private const PKZIP_LOCAL_FILE_HEADER_SIZE:int = 30;

		private function readPkZipDescriptor(stream:IDataInput):PKZipEntry {
			var i:int = stream.readInt();

			if (i !== PKZIP_FILE_MAGIC) return null;
			//if (stream.readInt() !== PKZIP_FILE_MAGIC) return null;
			stream.readShort();	// Skip "Version needed to extract".

			var entry:PKZipEntry = new PKZipEntry();

			entry.flags				= stream.readUnsignedShort();
			entry.compressionMethod = stream.readUnsignedShort();

			stream.readInt(); // Skip "last mod file time/date"

			entry.crc32				= stream.readUnsignedInt();
			entry.compressedSize	= stream.readUnsignedInt();
			entry.uncompressedSize	= stream.readUnsignedInt();
			entry.filenameLength	= stream.readUnsignedShort();
			entry.extraFieldLength	= stream.readUnsignedShort();

			return entry;
		}
		
		private function forEachZipEntry(url:String, stream:LoaderHelper, onmatch:Function, oncomplete:Function, onbadfile:Function, currentHeader:PKZipEntry = null):void {
			var fragment:String;
			var fragmentUTF8:ByteArray;
			var fragmentCP437:ByteArray;
			var fragmentStart:int = url.indexOf("#") + 1;
			if (fragmentStart > 0) {
				fragment = url.substring(fragmentStart);
				fragmentUTF8 = PercentEncoding.decodeToUTF8(fragment);
				fragmentCP437 = PercentEncoding.decodeToCodePage437(fragment);
			}

			var currentFilename:ByteArray = new ByteArray();
			var mustMatchHeader:Boolean;
			var fileData:ByteArray = new ByteArray();
			if (currentHeader) {
				stream.waitForMoreData(currentHeader.filenameLength, readPKZipFilename);
			} else {
				mustMatchHeader = true;
				//stream.waitForMoreData(PKZIP_LOCAL_FILE_HEADER_SIZE, readPKZipHeader, "empty");
				stream.waitForMoreData(PKZIP_LOCAL_FILE_HEADER_SIZE, readPKZipHeader, "notfound");
			}

			function readPKZipHeader():void {
				currentHeader = readPkZipDescriptor(stream);
				if (currentHeader) {
					if (currentHeader.isUnrecoverable) {
						sendLoadError(url, "badzip");
						cleanUp();
					} else {
						currentFilename.clear();
						stream.waitForMoreData(currentHeader.filenameLength, readPKZipFilename, "badzip");
					}
				} else {
					// Zip files MUST start with "PK\003\004".
					// Zip files embedded in other files cannot be used.
					if (mustMatchHeader) {
						mustMatchHeader = false;
						sendLoadError(url, "badzip");
					} else {
						oncomplete();
					}
					cleanUp();
				}
			}

			function readPKZipFilename():void {
				currentFilename.clear();
				stream.readBytes(currentFilename, 0, currentHeader.filenameLength);
				currentHeader.filename = currentFilename;

				var readThisFile:Boolean = fragment ? currentHeader.isFilenameEqualTo(fragmentUTF8, fragmentCP437) : currentHeader.isSPCFile;
				stream.waitForMoreData(currentHeader.extraFieldLength + currentHeader.compressedSize, readThisFile ? decompressPKZipFile : skipPKZipFile, "badzip");
			}
			
			// Decompress a file in a Zip archive
			function decompressPKZipFile():void {
				if (currentHeader.extraFieldLength) {
					stream.readBytes(fileData, 0, currentHeader.extraFieldLength);
				}
				fileData.clear();
				if (currentHeader.compressedSize) {
					stream.readBytes(fileData, 0, currentHeader.compressedSize);
				}
				if (currentHeader.isUnsupported) {
					onbadfile(currentHeader.percentEncodedFilename);
				} else {
					if (currentHeader.compressionMethod) {
						try {
							fileData.inflate();
						} catch (e:IOError) {
							fileData.clear();
						}
					}
					if (!fileData.length || !currentHeader.checkCRC(fileData)) {
						onbadfile(currentHeader.percentEncodedFilename);
					} else {
						fileData.endian = Endian.LITTLE_ENDIAN;
						onmatch(currentHeader.percentEncodedFilename, fileData);
					}
				}

				if (fragment || stream.isComplete) {
					oncomplete();
					cleanUp();
				} else {
					stream.waitForMoreData(PKZIP_LOCAL_FILE_HEADER_SIZE, readPKZipHeader, "badzip");
				}
			}
			
			// Skip a file in a Zip archive without uncompressing it
			function skipPKZipFile():void {
				var l:uint = currentHeader.extraFieldLength + currentHeader.compressedSize;
				if (l) stream.readBytes(fileData, 0, l);
				fileData.clear();
				if (!stream.isComplete) {
					stream.waitForMoreData(PKZIP_LOCAL_FILE_HEADER_SIZE, readPKZipHeader, "badzip");
				} else {
					oncomplete();
					cleanUp();
				}
			}

			function cleanUp():void {
				try {
					stream.close();
				} catch (e:Error) {}
			}
		}
	}
}

class PKZipEntry {
	import flash.utils.ByteArray;

	private const PKZIP_FLAG_ENCRYPTION:int		= 0x0001;
	private const PKZIP_FLAG_SEPARATE_DESC:int	= 0x0008;
	private const PKZIP_FLAG_PATCHED:int		= 0x0020;
	private const PKZIP_FLAG_STRONG_ENCRYPT:int	= 0x0040;
	private const PKZIP_FLAG_UTF8:int			= 0x0800;
	private const PKZIP_FLAG_DIR_ENCRYPTION:int	= 0x2000;

	private const PKZIP_UNSUPPORTED_FLAGS:int	=
			PKZIP_FLAG_ENCRYPTION | PKZIP_FLAG_SEPARATE_DESC |
			PKZIP_FLAG_PATCHED | PKZIP_FLAG_STRONG_ENCRYPT |
			PKZIP_FLAG_DIR_ENCRYPTION;

	private const PKZIP_COMPRESSION_DEFLATE:int	= 8;

	public var filename:ByteArray;

	public var flags:int;
	public var compressionMethod:int;
	public var crc32:uint;
	public var compressedSize:uint;
	public var uncompressedSize:uint;
	public var filenameLength:int;
	public var extraFieldLength:int;

	public function get isFilenameUTF8():Boolean {
		return !!(flags & PKZIP_FLAG_UTF8);
	}

	// Don't fail over an unsupported compression method; just don't
	// decompress it.
	public function get isUnsupported():Boolean {
		return isUnrecoverable || (compressionMethod &&
				compressionMethod !== PKZIP_COMPRESSION_DEFLATE) ||
				uncompressedSize < SPC.MIN_FILE_SIZE;
	}

	// If any of the unsupported flags are present, than it is
	// impossible to read the zip file any further.
	public function get isUnrecoverable():Boolean {
		return !!(flags & PKZIP_UNSUPPORTED_FLAGS);
	}

	// Gets a percent-encoded filename that can be used as a fragment
	// in a Zip URL.
	// For example:
	// http://example.com/archive.zip#file%20with%20spaces.spc
	public function get percentEncodedFilename():String {
		filename.position = 0;
		if (isFilenameUTF8) {
			return PercentEncoding.encodeFromUTF8(filename);
		} else {
			return PercentEncoding.encodeFromCodePage437(filename);
		}
	}

	public function get isSPCFile():Boolean {
		if (filename.length < 4) return false;

		// Match filename against *.sp{c,0..9}, and ignore case
		filename.position = filename.length - 4;
		var a:int = filename.readUnsignedByte(),
			b:int = filename.readUnsignedByte(),
			c:int = filename.readUnsignedByte(),
			d:int = filename.readUnsignedByte();

		return			   a === 0x2E  &&	// .
			(b === 0x73 || b === 0x53) &&	// s || S
			(c === 0x70 || c === 0x50) &&	// p || P
			(d === 0x63 || d === 0x43  ||	// c || C || [0-9]
			(d  >  0x2F && d  <  0x3A));
	}

	// Compares the filename of this file to the specified
	public function isFilenameEqualTo(utf8:ByteArray, cp437:ByteArray):Boolean {
		var other:ByteArray;
		if (isFilenameUTF8) other = utf8;
		else if (cp437) other = cp437;
		else return false;

		filename.position = 0;
		other.position = 0;
		if (other.length !== filename.length) return false;
		for (var ii:uint = filename.bytesAvailable; ii >= 4; ii -= 4) {
			if (filename.readInt() !== other.readInt()) return false;
		}
		while (ii--) {
			if (filename.readByte() !== other.readByte()) return false;
		}
		return true;
	}

	private static const crc_table:Vector.<uint> = Vector.<uint>([
		0x00000000, 0x77073096, 0xee0e612c, 0x990951ba, 0x076dc419, 0x706af48f,
		0xe963a535, 0x9e6495a3, 0x0edb8832, 0x79dcb8a4, 0xe0d5e91e, 0x97d2d988,
		0x09b64c2b, 0x7eb17cbd, 0xe7b82d07, 0x90bf1d91, 0x1db71064, 0x6ab020f2,
		0xf3b97148, 0x84be41de, 0x1adad47d, 0x6ddde4eb, 0xf4d4b551, 0x83d385c7,
		0x136c9856, 0x646ba8c0, 0xfd62f97a, 0x8a65c9ec, 0x14015c4f, 0x63066cd9,
		0xfa0f3d63, 0x8d080df5, 0x3b6e20c8, 0x4c69105e, 0xd56041e4, 0xa2677172,
		0x3c03e4d1, 0x4b04d447, 0xd20d85fd, 0xa50ab56b, 0x35b5a8fa, 0x42b2986c,
		0xdbbbc9d6, 0xacbcf940, 0x32d86ce3, 0x45df5c75, 0xdcd60dcf, 0xabd13d59,
		0x26d930ac, 0x51de003a, 0xc8d75180, 0xbfd06116, 0x21b4f4b5, 0x56b3c423,
		0xcfba9599, 0xb8bda50f, 0x2802b89e, 0x5f058808, 0xc60cd9b2, 0xb10be924,
		0x2f6f7c87, 0x58684c11, 0xc1611dab, 0xb6662d3d, 0x76dc4190, 0x01db7106,
		0x98d220bc, 0xefd5102a, 0x71b18589, 0x06b6b51f, 0x9fbfe4a5, 0xe8b8d433,
		0x7807c9a2, 0x0f00f934, 0x9609a88e, 0xe10e9818, 0x7f6a0dbb, 0x086d3d2d,
		0x91646c97, 0xe6635c01, 0x6b6b51f4, 0x1c6c6162, 0x856530d8, 0xf262004e,
		0x6c0695ed, 0x1b01a57b, 0x8208f4c1, 0xf50fc457, 0x65b0d9c6, 0x12b7e950,
		0x8bbeb8ea, 0xfcb9887c, 0x62dd1ddf, 0x15da2d49, 0x8cd37cf3, 0xfbd44c65,
		0x4db26158, 0x3ab551ce, 0xa3bc0074, 0xd4bb30e2, 0x4adfa541, 0x3dd895d7,
		0xa4d1c46d, 0xd3d6f4fb, 0x4369e96a, 0x346ed9fc, 0xad678846, 0xda60b8d0,
		0x44042d73, 0x33031de5, 0xaa0a4c5f, 0xdd0d7cc9, 0x5005713c, 0x270241aa,
		0xbe0b1010, 0xc90c2086, 0x5768b525, 0x206f85b3, 0xb966d409, 0xce61e49f,
		0x5edef90e, 0x29d9c998, 0xb0d09822, 0xc7d7a8b4, 0x59b33d17, 0x2eb40d81,
		0xb7bd5c3b, 0xc0ba6cad, 0xedb88320, 0x9abfb3b6, 0x03b6e20c, 0x74b1d29a,
		0xead54739, 0x9dd277af, 0x04db2615, 0x73dc1683, 0xe3630b12, 0x94643b84,
		0x0d6d6a3e, 0x7a6a5aa8, 0xe40ecf0b, 0x9309ff9d, 0x0a00ae27, 0x7d079eb1,
		0xf00f9344, 0x8708a3d2, 0x1e01f268, 0x6906c2fe, 0xf762575d, 0x806567cb,
		0x196c3671, 0x6e6b06e7, 0xfed41b76, 0x89d32be0, 0x10da7a5a, 0x67dd4acc,
		0xf9b9df6f, 0x8ebeeff9, 0x17b7be43, 0x60b08ed5, 0xd6d6a3e8, 0xa1d1937e,
		0x38d8c2c4, 0x4fdff252, 0xd1bb67f1, 0xa6bc5767, 0x3fb506dd, 0x48b2364b,
		0xd80d2bda, 0xaf0a1b4c, 0x36034af6, 0x41047a60, 0xdf60efc3, 0xa867df55,
		0x316e8eef, 0x4669be79, 0xcb61b38c, 0xbc66831a, 0x256fd2a0, 0x5268e236,
		0xcc0c7795, 0xbb0b4703, 0x220216b9, 0x5505262f, 0xc5ba3bbe, 0xb2bd0b28,
		0x2bb45a92, 0x5cb36a04, 0xc2d7ffa7, 0xb5d0cf31, 0x2cd99e8b, 0x5bdeae1d,
		0x9b64c2b0, 0xec63f226, 0x756aa39c, 0x026d930a, 0x9c0906a9, 0xeb0e363f,
		0x72076785, 0x05005713, 0x95bf4a82, 0xe2b87a14, 0x7bb12bae, 0x0cb61b38,
		0x92d28e9b, 0xe5d5be0d, 0x7cdcefb7, 0x0bdbdf21, 0x86d3d2d4, 0xf1d4e242,
		0x68ddb3f8, 0x1fda836e, 0x81be16cd, 0xf6b9265b, 0x6fb077e1, 0x18b74777,
		0x88085ae6, 0xff0f6a70, 0x66063bca, 0x11010b5c, 0x8f659eff, 0xf862ae69,
		0x616bffd3, 0x166ccf45, 0xa00ae278, 0xd70dd2ee, 0x4e048354, 0x3903b3c2,
		0xa7672661, 0xd06016f7, 0x4969474d, 0x3e6e77db, 0xaed16a4a, 0xd9d65adc,
		0x40df0b66, 0x37d83bf0, 0xa9bcae53, 0xdebb9ec5, 0x47b2cf7f, 0x30b5ffe9,
		0xbdbdf21c, 0xcabac28a, 0x53b39330, 0x24b4a3a6, 0xbad03605, 0xcdd70693,
		0x54de5729, 0x23d967bf, 0xb3667a2e, 0xc4614ab8, 0x5d681b02, 0x2a6f2b94,
		0xb40bbe37, 0xc30c8ea1, 0x5a05df1b, 0x2d02ef8d
	]);

	public function checkCRC(data:ByteArray):Boolean {
		var pos:uint = data.position,
			length:uint = data.length,
			crc:uint = ~0;

		while (length--) crc = crc_table[(crc ^ data.readUnsignedByte()) & 0xFF] ^ (crc >>> 8);
		data.position = pos;

		crc ^= ~0;

		return crc === crc32;
	}
}
