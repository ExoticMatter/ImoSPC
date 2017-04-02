#ifndef __AVM2__
#error as3api.cpp must be compiled with FlasCC.
#endif // !__AVM2__

#define IMO_EXTERN
#include <AS3/AS3.h>
#include "../imo-impl.cpp"
#include "../snes_spc/blargg_source.h"

#define FLASH_SAMPLE_RATE	44100

#define DEFAULT_FADE_START	FLASH_SAMPLE_RATE * 60 * 3
#define DEFAULT_FADE_LENGTH	FLASH_SAMPLE_RATE * 5

#define FADE_BLOCK_SIZE		512
#define FADE_SHIFT			4 // fade ends with gain at 1.0 / (1 << FADE_SHIFT)

double _time;
double _fadeStart;
double _fadeStep;

bool _enableFade = true;

// Fading
// int_log and handle_fade are from Game Music Emu.
// http://www.slack.net/~ant/libs/audio.html#Game_Music_Emu

// unit / pow( 2.0, (double) x / step )
static int int_log(blargg_long x, int step, int unit)
{
	int shift = x / step;
	int fraction = (x - shift * step) * unit / step;
	return ((unit - fraction) + (fraction >> 1)) >> shift;
}

static void handle_fade(long out_count, short* out)
{
	for (int i = 0; i < out_count; i += FADE_BLOCK_SIZE)
	{
		int const shift = 14;
		int const unit = 1 << shift;
		int gain = int_log((_time + i - _fadeStart) / FADE_BLOCK_SIZE,
							_fadeStep, unit);

		short* io = &out[i];

		for (int count = min(int(FADE_BLOCK_SIZE), int(out_count - i)); count; --count)
		{
			*io = short((*io * gain) >> shift);
			++io;
		}
	}
}

void as3_imo_set_sample_rate() __attribute__((used,
	annotate("as3sig:public function setSampleRate(sampleRate:Number):void"),
	annotate("as3package:ImoSPC")));

void as3_imo_set_sample_rate()
{
	double sr;
	inline_as3("%0 = sampleRate;" : "=r"(sr));
	imo_set_sample_rate(sr);
}

void as3_imo_load() __attribute__((used,
	annotate("as3sig:public function load(file:int, size:int, fadeStart:Number, fadeLength:Number):Boolean"),
	annotate("as3package:ImoSPC")));

void as3_imo_load()
{
	void *dat;
	int sz;
	double fadeSt, fadeLen;
	inline_as3(
		"%0 = file;"
		"%1 = size;"
		"%2 = fadeStart;"
		"%3 = fadeLength;" : "=r"(dat), "=r"(sz), "=r"(fadeSt), "=r"(fadeLen));

	bool result = imo_load(dat, sz);
	if (result)
	{
		if (fadeSt <= 0) {
			fadeSt = DEFAULT_FADE_START;
			fadeLen = DEFAULT_FADE_LENGTH;
		}
		_time = 0;
		_fadeStart = fadeSt * 2;
		//_fadeStep = fadeLen / (FADE_BLOCK_SIZE * FADE_SHIFT / 2);
		_fadeStep = fadeLen / (FADE_BLOCK_SIZE * FADE_SHIFT / 2);
	}
	AS3_Return(result);
}

void as3_imo_run() __attribute__((used,
	annotate("as3sig:public function run(outBuf:int, count:int):void"),
	annotate("as3package:ImoSPC")));

void as3_imo_run()
{
	short *ob;
	int i;
	inline_as3(
		"%0 = outBuf;"
		"%1 = count;" : "=r"(ob), "=r"(i));

	imo_run(ob, i);
	if (_enableFade && _time > _fadeStart)
		handle_fade(i, ob);

	_time += i;
}

void as3_imo_skip() __attribute__((used,
	annotate("as3sig:public function skip(count:int):void"),
	annotate("as3package:ImoSPC")));

void as3_imo_skip()
{
	int i;
	inline_as3("%0 = count;" : "=r"(i));
	imo_skip(i);
	_time += i;
}

void as3_imo_set_fade_enabled() __attribute__((used,
	annotate("as3sig:public function setFadeEnabled(enabled:Boolean):void"),
	annotate("as3package:ImoSPC")));
void as3_imo_set_fade_enabled()
{
	inline_as3("%0 = enabled;" : "=r"(_enableFade));
}

int main()
{
	AS3_GoAsync();
}
