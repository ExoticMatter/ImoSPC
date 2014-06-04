package
{
	import flash.errors.IOError;
	import flash.events.*;
	import flash.external.ExternalInterface;
	import flash.net.URLRequest;
	import flash.net.URLStream;
	import flash.utils.ByteArray;
	import flash.utils.IDataInput;

	// Convenience class for reading a URLStream asynchrously.
	public class LoaderHelper implements IDataInput {
		private var stream:URLStream;
		private var url:String;

		private var _isComplete:Boolean;
		private var _hasFailed:Boolean;

		private var nextCallback:Function;
		private var nextCallbackRequiredBytes:uint;
		private var nextEOFError:String;
		private var completeCallback:Function;

		private var hasReceivedHeader:Boolean;

		public function LoaderHelper(url:String) {
			this.url = url;
			stream = new URLStream();

			stream.addEventListener(HTTPStatusEvent.HTTP_STATUS, onHttpResponse)
			stream.addEventListener(IOErrorEvent.IO_ERROR, onIOError);
			stream.addEventListener(SecurityErrorEvent.SECURITY_ERROR, onSecurityError);
			stream.addEventListener(ProgressEvent.PROGRESS, onProgress);
			stream.addEventListener(Event.COMPLETE, onComplete);;
			
			stream.load(new URLRequest(url));
		}

		public function waitForMoreData(length:uint, callback:Function, eofError:String = null):void {
			if (nextCallback is Function || completeCallback is Function) {
				throw new IOError("The asynchrous stream is already waiting for data.");
			} else if (!stream.connected) {
				throw new IOError("The stream is not connected.");
			} else if (stream.bytesAvailable >= length) {
				callback();
			} else if (_isComplete) {
				onNotEnoughData(eofError);
			} else {
				nextCallback = callback;
				nextCallbackRequiredBytes = length;
				nextEOFError = eofError;
			}
		}

		public function waitForAllData(callback:Function):void {
			if (nextCallback is Function || completeCallback is Function) {
				throw new IOError("The asynchrous stream is already waiting for data.");
			} else if (!stream.connected) {
				throw new IOError("The stream is not connected.");
			} else if (_isComplete) {
				callback();
			} else {
				completeCallback = callback;
			}
		}

		private function onProgress(event:ProgressEvent):void {
			if (hasReceivedHeader && nextCallback is Function && bytesAvailable >= nextCallbackRequiredBytes) {
				var callback:Function = nextCallback;
				nextCallback = null;
				nextEOFError = null;
				callback();
			}
		}
		
		private function onComplete(event:Event):void {
			_isComplete = true;
			if (hasReceivedHeader) {
				if (nextCallback is Function) {
					if (stream.bytesAvailable >= nextCallbackRequiredBytes) {
						var callback:Function = nextCallback;
						nextCallback = null;
						nextEOFError = null;
						callback();
					} else {
						onNotEnoughData(nextEOFError);
						nextEOFError = null;
					}
				} else if (completeCallback is Function) {
					callback = completeCallback;
					completeCallback = null;
					callback();
				}
			}
		}

		private function onHttpResponse(event:HTTPStatusEvent):void {
			var status:int = event.status;
			if (!_hasFailed) {
				if (status >= 400 && status < 600) {
					fail("http", status);
				} else {
					hasReceivedHeader = true;
					if (_isComplete) {
						onComplete(null);
					} else {
						onProgress(null);
					}
				}
			}
		}

		private function onIOError(event:IOErrorEvent):void {
			if (!_hasFailed) {
				fail("io", event.text);
			}
		}

		private function onSecurityError(event:SecurityErrorEvent):void {
			if (!_hasFailed) {
				fail("security", event.text);
			}
		}

		private function onNotEnoughData(errorText:String = null):void {
			// If the download has already failed due to an HTTP, I/O, or
			// security error, then don't send "eof".
			if (!_hasFailed) {
				fail(errorText || "eof");
			}
			if (stream.connected) {
				stream.close();
			}
		}
		
		private function fail(reason:String, extra:* = null):void {
			nextCallback = null;
			nextEOFError = null;
			_isComplete = true;
			_hasFailed = true;
			ExternalInterface.call("ImoSPC._onloaderror", url, reason, extra);
			
			if (connected) {
				try { close(); }
				catch (e:Error) {}
			}
		}

		public function get isComplete():Boolean { return _isComplete; }
		public function get connected():Boolean { return stream.connected; }
		public function close():void { stream.close(); }

		// --- IDataInput implementation ---
		public function get bytesAvailable():uint { return stream.bytesAvailable; }
		public function get endian():String { return stream.endian; }
		public function set endian(value:String):void { stream.endian = value; }
		public function get objectEncoding():uint { return stream.objectEncoding; }
		public function set objectEncoding(value:uint):void { stream.objectEncoding = value; }
		public function readBoolean():Boolean { return stream.readBoolean(); }
		public function readByte():int { return stream.readByte(); }
		public function readBytes(bytes:ByteArray, offset:uint = 0, length:uint = 0):void { stream.readBytes(bytes, offset, length); }
		public function readDouble():Number { return stream.readDouble(); }
		public function readFloat():Number { return stream.readFloat(); }
		public function readInt():int { return stream.readInt(); }
		public function readMultiByte(length:uint, charSet:String):String { return stream.readMultiByte(length, charSet); }
		public function readObject():* { return stream.readObject(); }
		public function readShort():int { return stream.readShort(); }
		public function readUnsignedByte():uint { return stream.readUnsignedByte(); }
		public function readUnsignedInt():uint { return stream.readUnsignedInt(); }
		public function readUnsignedShort():uint { return stream.readUnsignedShort(); }
		public function readUTF():String { return stream.readUTF(); }
		public function readUTFBytes(length:uint):String { return stream.readUTFBytes(length); }
	}
}
