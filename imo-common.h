#pragma once

#ifndef __IMO_COMMON__
#define __IMO_COMMON__

// The size of one audio frame; Two 16-bit channels.
#define FRAME_SIZE			(2 * 2)
// The sampling rate of the SNES SPC.
#define SPC_SAMPLE_RATE		32000

// Default fade start, 3min.
//#define DEFAULT_FADE_START		(60 * 3 * SPC_SAMPLE_RATE)
// Default fade length, 1sec.
//#define DEFAULT_FADE_LENGTH		(1 * SPC_SAMPLE_RATE)

#endif // __IMO_COMMON__
