package
{
	import flash.errors.*;
	import flash.events.*;
	import flash.external.ExternalInterface;
	import flash.media.Sound;
	import flash.media.SoundChannel;
	import flash.media.SoundTransform;
	import flash.net.URLRequest;
	import flash.net.URLStream;
	import flash.utils.ByteArray;
	import flash.utils.Timer;

	import ImoSPC.*;

	public class SPC {
	    public static const SAMPLE_RATE:int = 44100;
		private var isPlaying:Boolean;
		private var isPaused:Boolean;
		private var isSeeking:Boolean;

		public var loadedURL:String;

		private var dataptr:int;
		private var extradataptr:int;
		private var outptrs:Vector.<int>;
		private var deadOutptrs:Vector.<int>;
		private var pauseIndex:int;
		private const MAX_OLD_BUFFERS:int = 16;

		private var sound:Sound;
		private var transform:SoundTransform;
		private var channel:SoundChannel;
		
		private var emulatorPos:Number;
		public var fadeStart:Number;
		public var fadeLength:Number;
		private var trackLength:Number;
		// Add this to channel.position, and you get the result of tell().
		private var playbackStartTime:Number;

	    private var seekTimer:Timer;
		private var seekDestination:Number;
		private const SEEK_INCREMENT:int = SAMPLE_RATE << 1; // 2 seconds

		public static const MIN_FILE_SIZE:int = 0x10180;
		private const BUFFER_LENGTH:int = 8192;
		private const BUFFER_TOTAL_LENGTH:int = BUFFER_LENGTH << 1;
		
		private function updateState(state:String):void {
		    ExternalInterface.call("ImoSPC._setstate", state);
		}

		public function SPC() {
		    isPlaying = false;
		    isPaused = false;

			ImoSPC.setSampleRate(SAMPLE_RATE);
			dataptr = CModule.malloc(MIN_FILE_SIZE);
			extradataptr = CModule.malloc(MIN_FILE_SIZE);
			outptrs = new Vector.<int>();
			deadOutptrs = new Vector.<int>();
			for (var n:int = MAX_OLD_BUFFERS; n-- > 0;) {
				deadOutptrs.push(CModule.malloc(BUFFER_TOTAL_LENGTH * 2));
			}

		    sound = new Sound();
			transform = new SoundTransform();
			seekTimer = new Timer(20);
			seekTimer.addEventListener(TimerEvent.TIMER, seekTick);

			ExternalInterface.addCallback("_tell", tell);
			ExternalInterface.addCallback("_setVol", setVolume);
			ExternalInterface.addCallback("_getVol", getVolume);

			ExternalInterface.addCallback("_start", start);
			ExternalInterface.addCallback("_pause", pause);
			ExternalInterface.addCallback("_resume", resume);
			ExternalInterface.addCallback("_stop", stop);
			ExternalInterface.addCallback("_seek", seek);
		}
		
		private function swapDataPtrs():void {
			var a:int = dataptr,
				b:int = extradataptr;

			dataptr = b;
			extradataptr = a;
		}

		public function setFile(url:String, data:ByteArray, fadeStart:Number, fadeLength:Number):void {
			stop(true);
			swapDataPtrs();
			
			data.position = 0;
			data.readBytes(CModule.ram, dataptr, MIN_FILE_SIZE);

			var oldFadeStart:Number = this.fadeStart;
			var oldFadeLength:Number = this.fadeLength;
			this.fadeStart = fadeStart;
			this.fadeLength = fadeLength;
			if (reload()) {
				loadedURL = url;
				ExternalInterface.call("ImoSPC._loaded", loadedURL);
			} else {
				ExternalInterface.call("ImoSPC._onloaderror", url);
				swapDataPtrs();
				this.fadeStart = oldFadeStart;
				this.fadeLength = oldFadeLength;
			}
		}
		
		public function reload():Boolean {
			stopSeeking(false);
			clearOldBuffers();
		    var result:Boolean;
		    if (result = ImoSPC.load(dataptr, MIN_FILE_SIZE, fadeStart, fadeLength)) {
				trackLength = fadeStart + fadeLength;
		        emulatorPos = 0;
			}
			return result;
		}
		
		private function playImpl(sendMessage:Boolean = true):void {
		    isPlaying = true;
		    isPaused = false;
		    isSeeking = false;

			if (pauseIndex >= 0) {
				playbackStartTime = (emulatorPos - outptrs.length * BUFFER_LENGTH + pauseIndex) / SAMPLE_RATE;
			} else {
				playbackStartTime = emulatorPos / SAMPLE_RATE;
			}

			sound.removeEventListener(SampleDataEvent.SAMPLE_DATA, onSampleData);
			sound.addEventListener(SampleDataEvent.SAMPLE_DATA, onSampleData);
			channel = sound.play(0, 1, transform);
			channel.addEventListener(Event.SOUND_COMPLETE, onSoundComplete);
		    
			if (sendMessage) updateState("playing");
		}
		
		private function stopImpl():Boolean {
		    sound.removeEventListener(SampleDataEvent.SAMPLE_DATA, onSampleData);
		    if (channel) {
		    	channel.removeEventListener(Event.SOUND_COMPLETE, onSoundComplete);
		        channel.stop();
		        return true;
			} else {
			    return false;
			}
		}

		private function start(pause:Boolean):void {
		    if (!loadedURL) return;

			stop(false);
			reload();
			
			if (pause) {
				// This allows the SPC player to be started paused.
				isPlaying = true;
			} else {
				playImpl();
			}
		}

		private function pause():Boolean {
		    if (!isPlaying || isPaused) return false;

			isPaused = true;
			if (stopImpl()) {
				if (!isSeeking) {
					pauseIndex = tell() * SAMPLE_RATE - (emulatorPos - outptrs.length * BUFFER_LENGTH);
					// Keep the timer accurate by forcing pauseIndex to not
					// produce a buffer smaller than 4096 samples long.
					var offs:int = pauseIndex % BUFFER_LENGTH;
					if (offs > 4096) {
						var pauseMask:int = pauseIndex / BUFFER_LENGTH;
						pauseMask *= BUFFER_LENGTH;
						if (offs > 6144) {
							pauseIndex = pauseMask + BUFFER_LENGTH;
						} else {
							pauseIndex = pauseMask + 4096;
						}
					}
					if (pauseIndex > outptrs.length * BUFFER_LENGTH) {
						pauseIndex = -1;
					}
				}
				updateState("paused");
				return true;
			} else {
				return false;
			}
		}

		private function resume():Boolean {
		    if (!isPlaying || !isPaused) return false;

			isPaused = false;
			if (!isSeeking) {
				playImpl();
			} else {
		    	updateState("buffering");
			}
			return true;
		}

		public function stop(sendStopSignal:Boolean):Boolean {
			if (!isPlaying) return false;
		    
		    stopSeeking(false);
		    clearOldBuffers();
			isPlaying = false;
			isPaused = false;
			isSeeking = false;
			if (stopImpl()) {
		    	if (sendStopSignal) updateState("stopped");
		    	return true;
			} else {
				return false;
			}
		}
		
		private function seek(to:Number):void {
		    if (!isPlaying || to < 0 || !isFinite(to) || isNaN(to)) return;
		    // Seek parameter should use seconds
		    to *= SAMPLE_RATE;
		    to = Math.floor(to);

			stopImpl();
			if (to <= emulatorPos) {
				var oldBuffersStart:Number = emulatorPos - outptrs.length * BUFFER_LENGTH;
				if (to > oldBuffersStart) {
					// Since a copy of recent samples are kept, this allows the
					// user to seek to a position before emulatorPos without
					// re-emulating the track.
					pauseIndex = to - oldBuffersStart;
					var offs:int = pauseIndex % BUFFER_LENGTH;
					if (offs > 4096) {
						var pauseMask:int = pauseIndex / BUFFER_LENGTH;
						pauseMask *= BUFFER_LENGTH;
						if (offs > 6144) {
							pauseIndex = pauseMask + BUFFER_LENGTH;
						} else {
							pauseIndex = pauseMask + 4096;
						}
					}
					if (pauseIndex > outptrs.length * BUFFER_LENGTH) {
						pauseIndex = -1;
					}
					playImpl(false);
					return;
				} else reload();
			}
		    seekTimer.reset();
		    if (to !== emulatorPos) {
				isSeeking = true;
				seekDestination = to;
				seekTimer.repeatCount = Math.ceil((to - (emulatorPos || 0)) / SEEK_INCREMENT);
				seekTimer.start();
				if (!isPaused) updateState("buffering");
		    } else if (!isPaused) {
		    	playImpl(false);
			}
		}

		private function seekTick(event: TimerEvent) : void {
			if (isNaN(seekDestination)) {
			    stopSeeking(true);
			    return;
			}
			
			var skipAmount:int = Math.min(seekDestination - emulatorPos, SEEK_INCREMENT);
			if (skipAmount < 2) {
				stopSeeking(true);
				return;
			}
			
			ImoSPC.skip(skipAmount << 1);
			emulatorPos += skipAmount;
			clearOldBuffers();

			if (emulatorPos >= seekDestination) stopSeeking(true);
		}
		
		private function stopSeeking(allowContinue:Boolean):void {
		    seekDestination = NaN;
		    seekTimer.reset();
		    isSeeking = false;
		    if (allowContinue && isPlaying && !isPaused) playImpl();
		}
		
		private function getNextBuffer():int {
			var ptr:int;
			if (deadOutptrs.length) {
				ptr = deadOutptrs.pop();
			} else {
				ptr = outptrs.shift();
			}
			outptrs.push(ptr);
			return ptr;
		}
		
		private function clearOldBuffers():void {
			for (var n:int = outptrs.length; n-- > 0;) {
				deadOutptrs.push(outptrs.pop());
			}
			pauseIndex = -1;
		}

		private function onSampleData(event:SampleDataEvent):void {
			if (emulatorPos >= trackLength) {
				return;
			}

			var data:ByteArray = event.data;
			var ram:ByteArray = CModule.ram;
			var nLoops:uint = BUFFER_LENGTH;
			var gotData:Boolean;

			if (pauseIndex >= 0 && outptrs.length) {
				var index:int = pauseIndex / BUFFER_LENGTH;
				var offs:int = pauseIndex % BUFFER_LENGTH;
				/**/ if (offs > 6144) offs = 0, ++index;
				else if (offs > 4096) offs = 4096;
				if (index >= outptrs.length) {
					pauseIndex = -1;
				} else {
					gotData = true;
					ram.position = outptrs[index] + (offs << 1);
					nLoops = BUFFER_LENGTH - offs;
					if (++index >= outptrs.length) {
						pauseIndex = -1;
					} else {
						pauseIndex = index * BUFFER_LENGTH;
					}
				}
			}
			if (!gotData) {
				var outptr:int = getNextBuffer();
				ImoSPC.run(outptr, BUFFER_TOTAL_LENGTH);
				ram.position = outptr;
				emulatorPos += BUFFER_LENGTH;
			}

		    while (nLoops-- > 0) {
				data.writeFloat(ram.readShort() / 0x8000);
				data.writeFloat(ram.readShort() / 0x8000);
			}
		}

		// Tells ImoSPC that the track has finished playing naturally.
		// Also, clears the playing state.
		private function onSoundComplete(event:Event):void {
		    stop(false);
			updateState("end");
		}

		// Get/set the volume.
		private function getVolume():Number {
		    return transform.volume;
		}
		private function setVolume(vol:Number):void {
		    if (vol < 0) vol = 0;
		    else if (vol > 1) vol = 1;
		    transform.volume = vol;
		    if (channel) {
		        channel.soundTransform = transform;
			}
		}

		private function tell():Number {
		    if (!isPlaying) return NaN;
		    if (channel) {
		        return channel.position / 1000 + playbackStartTime;
			} else {
		    	return emulatorPos / SAMPLE_RATE;
		    }
		}
	}
}
