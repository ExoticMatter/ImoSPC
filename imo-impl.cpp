#include "html5/emapi.h"
#include <stdint.h>

#include "snes_spc/Fir_Resampler.h"
#include "snes_spc/SNES_SPC.h"
#include "snes_spc/SPC_Filter.h"

#define SPC_SAMPLE_RATE		32000

Fir_Resampler<24> *resampler = NULL;
SNES_SPC *spc = NULL;
SPC_Filter *filter = NULL;

// note: imo_set_sample_rate is based on Spc_Emu::set_sample_rate_ from
// Game Music Emu, imo_run is partially based on Spc_Emu::play_, and imo_skip is
// based on Spc_Emu::skip_.
// http://www.slack.net/~ant/libs/audio.html#Game_Music_Emu

double _sampleRate = SPC_SAMPLE_RATE;

IMO_EXTERN void imo_set_sample_rate(double sampleRate)
{
	if (sampleRate != _sampleRate)
	{
		if (resampler)
		{
			delete resampler;
			resampler = NULL;
		}
		if (sampleRate > 0 && sampleRate != SPC_SAMPLE_RATE)
		{
			resampler = new Fir_Resampler<24>();
			resampler->buffer_size(SPC_SAMPLE_RATE / 20 * 2);
			resampler->time_ratio((double)SPC_SAMPLE_RATE / (_sampleRate = sampleRate), 0.9965);
		}
	}
}

IMO_EXTERN bool imo_load(void *file, int size)
{
	if (!filter)
		filter = new SPC_Filter();
	if (!spc)
	{
		spc = new SNES_SPC();
		spc->init();
	}
	else spc->reset();

	if (spc->load_spc(file, size) != NULL) return false;

	spc->clear_echo();
	filter->clear();

	if (resampler) resampler->clear();

	return true;
}

IMO_EXTERN void imo_run(short *outBuf, int count)
{
	// Don't bother if count is nothing.
	if (count <= 0) return;

	if (resampler)
	{
		int remain = count;
		//while (remain > 0)
		while (true)
		{
			int nRead = resampler->read(outBuf, remain);
			remain -= nRead;
			outBuf += nRead;

			// Instead of checking remain twice every loop, just do an infinite
			// loop, breaking once if it is ever less than or equal to zero.
			//if (remain > 0) {
			if (remain <= 0) break;

			int nWrite = resampler->max_write();
			short *tmpBuf = resampler->buffer();
			spc->play(nWrite, tmpBuf);
			filter->run(tmpBuf, nWrite);
			resampler->write(nWrite);
			//}
		}
	}
	else
	{
		spc->play(count, outBuf);
		filter->run(outBuf, count);
	}
}

IMO_EXTERN void imo_skip(int count)
{
	if (resampler)
	{
		int realCount = int(count * resampler->ratio()) & ~1;
		if (resampler->avail() > 0)
			realCount -= resampler->skip_input(realCount);

#define RESAMPLER_LATENCY	64

		if (realCount <= 0) return;

		short buf[RESAMPLER_LATENCY];

		if (realCount > RESAMPLER_LATENCY)
		{
			spc->skip(realCount - RESAMPLER_LATENCY);
			filter->clear();
			realCount = RESAMPLER_LATENCY;
		}
		imo_run(buf, realCount);
	}
	else
	{
		spc->skip(count);
		filter->clear();
	}
}

