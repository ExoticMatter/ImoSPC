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
(function() {
	var null_ = null;

	var file = _malloc(0x10180);
	var bufLen = 2048;
	var outputBuffer = _malloc(bufLen << 2); // 2048-frame buffer, stereo, 16bit
	var time = 0;
	var sampleRate = 32000;
	var url;

	var seekTimer, blocksAfterSeek = 0;

	function cancelSeek() {
		if (seekTimer) {
			clearTimeout(seekTimer);
			seekTimer = null_;
		}
		blocksAfterSeek = 0;
	}
	
	function performSeek(to) {
		cancelSeek();
		
		if (time > to) {
			time = 0;
			_imo_load(file, 0x10180);
		}

		(function seekProc() {
			var skipAmount = Math.min(to - time, sampleRate);
			if (skipAmount > 0) {
				_imo_skip(skipAmount << 1);
				time += skipAmount;
			}

			if (time < to) {
				seekTimer = setTimeout(seekProc, 0);
			} else {
				seekTimer = null_;

				postMessage({
					'msg': 'ok',
					'from': 'seek',
					'at': time,
					
					'url': url
				});
				
				while (blocksAfterSeek-- > 0) {
					sendMoreSamples();
				}
			}
		}());
	}

	function verifyRequestLoaded(data, noSendMessage) {
		// verify that the URL expected is the URL that will be played or seeked
		if (url != data['url']) {
		    if (!noSendMessage)
				postMessage({ 'msg': 'fail', 'from': data['msg'], 'e': 'wrong url' });
			return false;
		}
		return true;
	}

	function sendMoreSamples(oldBuffer) {
		// Send data for the WebAudio API

		_imo_run(outputBuffer, bufLen << 1); // multiply by 2 for stereo

		// Copy the output data into a 32-bit floating-point buffer.
		//var arr = new ArrayBuffer(bufLen * 2 * 4); // 2 for stereo, 4 for float
		//var outL = new Float32Array(arr, 0, bufLen);
		//var outR = new Float32Array(arr, bufLen * 4, bufLen);

		//var i = 0, j = outputBuffer >> 1;
		//do {
		//	outL[i] = (HEAP16[j = j + 1 | 0] | 0) / 0x8000;
		//	outR[i] = (HEAP16[j = j + 1 | 0] | 0) / 0x8000;
		//} while ((i = i + 1 | 0) < bufLen);

		// New method: copy 16-bit int buffers to the main thread, and convert
		// them to 32-bit float when loading them into the script processor.
		// Recycle a provided ArrayBuffer, if possible.
		var byteLen = bufLen << 2;
		var arr;
		if (oldBuffer && oldBuffer.byteLength == byteLen) {
			arr = oldBuffer;
			// Using 32 bits makes whole frames get copied at a time.
			var tmp32 = new Int32Array(arr);
			for (var i = -1, j = outputBuffer >> 2; ++i < bufLen; j++) {
				tmp32[i] = HEAP32[j];
			}
		} else {
		    arr = buffer.slice(outputBuffer, outputBuffer + byteLen);
		}
		// Send an array buffer along with all the necessary information.
		postMessage({
			'msg': 'ok',
			'from': 'samp',

			'dat': arr,
			'len': bufLen,
			'time': time,
			'url': url
		}, [arr]);

		time += bufLen; /// sampleRate;
	};

	self['onmessage'] = function(data) {
	    data = data.data;
		switch (data['msg']) {
			case 'setr':
			    var tmp = data['rate'];
			    if (tmp) _imo_set_sample_rate(sampleRate = Number(tmp));
			    tmp = data['len'];
			    if (tmp) {
			        tmp = Number(tmp);
			        if (tmp <= 256) tmp = 256;
			        else if (tmp > sampleRate >>> 0) tmp = sampleRate >>> 0;

			        var newBuffer = _realloc(outputBuffer, tmp << 2);
			        if (newBuffer) {
			        	bufLen = tmp;
			        	outputBuffer = newBuffer;
					}
				}
				break;
			case 'load':
				cancelSeek();

				// If the specified file is already loaded, then don't bother
				// doing a pointless copy operation.
				if (!verifyRequestLoaded(data, true)) {
					HEAPU8.set(new Uint8Array(data['fi'], 0, 0x10180), file);
				}
				url = data['url'];
				time = 0;
				if (_imo_load(file, 0x10180))
					postMessage({
						'msg': 'ok',
						'from': 'load',
						'buflen': bufLen,

						'url': url
					});
				else
					postMessage({
						'msg': 'fail',
						'from': 'load',
						'e': 'badspc'
					}), url = null_;
				break;
			case 'samp':
			    if (!verifyRequestLoaded(data)) break;

				if (seekTimer) {
					blocksAfterSeek++;
				} else {
					sendMoreSamples(data['rcl']);
				}
				break;
			case 'seek':
			    if (!verifyRequestLoaded(data)) break;

				var seekTarget = +data['to'];
				if (isNaN(seekTarget) || seekTarget < 0) {
					postMessage({ 'msg': 'fail', 'from': 'seek', 'e': 'bad value' });
				} else {
					performSeek(seekTarget);
				}
		}
	};
}());
