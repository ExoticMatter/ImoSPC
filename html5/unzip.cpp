#include <stdint.h>
extern "C" {
#include "puff.h"
}

extern "C" bool imo_inflate(unsigned char *pCompressed, unsigned long compressedSize,
							unsigned char *pDecompressed, unsigned long uncompressedSize)
{
	unsigned long origCompSize = compressedSize, origRawSize = uncompressedSize;
	return !puff(pDecompressed, &uncompressedSize, pCompressed, &compressedSize) && origCompSize == compressedSize && origRawSize == uncompressedSize;
}
