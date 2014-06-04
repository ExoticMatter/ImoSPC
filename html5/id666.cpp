#include "id666.h"

#include <memory.h>
//#include <flash/as3api.h>
//#include <html5/emapi.h>

#define SPC_SIG_LENGTH		27
#define SPC_MINIMUM_SIZE	0x10180
#define SPC_FILE_SIZE		0x10200

#define SPC_DEFAULT_FADE_START	(60 * 3)
#define SPC_DEFAULT_FADE_LENGTH	3

const char c_szSpcSig[SPC_SIG_LENGTH + 1] = "SNES-SPC700 Sound File Data";

inline bool IsDigit(char c)
{
	return c >= '0' && c <= '9';
}

// Since this is text, it uses big-endian format (first digit first).
uint32_t ReadIntText(const uint8_t *data, int size)
{
	uint32_t n = 0;
	while (size-- > 0)
	{
		char c = (char)*data++;

		if (IsDigit(c)) c -= '0';
		else if (!c) return n;
		else return 0;

		n *= 10;
		n += c;
	}

	return n;
}

// Read in little-endian format (last byte first).
uint32_t ReadIntBin(const uint8_t *data, int size)
{
	uint32_t n = 0;
	int shift = 0;

	while (size-- > 0)
	{
		n |= *data++ << shift;
		shift += 8;
	}
	return n;
}

#define XID6_FIELD_TITLE		0x01
#define XID6_FIELD_GAME			0x02
#define XID6_FIELD_ARTIST		0x03
#define XID6_FIELD_OST			0x10
#define XID6_FIELD_OSTDISC		0x11
#define XID6_FIELD_OSTTRACK		0x12
#define XID6_FIELD_PUBLISHER	0x13
#define XID6_FIELD_COPYRIGHT	0x14
#define XID6_FIELD_INTROLENGTH	0x30
#define XID6_FIELD_LOOPLENGTH	0x31
#define XID6_FIELD_ENDLENGTH	0x32
#define XID6_FIELD_FADELENGTH	0x33
#define XID6_FIELD_NLOOP		0x35

#define XID6_FIELD_FLAG_TITLE		0x00
#define XID6_FIELD_FLAG_GAME			0x00
#define XID6_FIELD_FLAG_ARTIST		0x00
#define XID6_FIELD_FLAG_OST			0x00
#define XID6_FIELD_FLAG_OSTDISC		0x01
#define XID6_FIELD_FLAG_OSTTRACK		0x02
#define XID6_FIELD_FLAG_PUBLISHER	0x00
#define XID6_FIELD_FLAG_COPYRIGHT	0x03
#define XID6_FIELD_FLAG_INTROLENGTH	0x00
#define XID6_FIELD_FLAG_LOOPLENGTH	0x00
#define XID6_FIELD_FLAG_ENDLENGTH	0x00
#define XID6_FIELD_FLAG_FADELENGTH	0x00
#define XID6_FIELD_FLAG_NLOOP		0x00

#define XID6_TYPE_LENGTH	0
#define XID6_TYPE_STRING	1
#define XID6_TYPE_INTEGER	4

#define XID6_SIG_LENGTH		4

const char c_szXid6[XID6_SIG_LENGTH + 1] = "xid6";

#define _XID6Field_(name) XID6_FIELD_##name
#define _XID6FieldFlag_(name) XID6_FIELD_FLAG_##name

// This method limits string fields to 256 bytes.
// It ensures that the string is null-terminated enough for a 16-bit encoding.
#define HandleXID6String(name, field) \
	case _XID6Field_(name): \
		if (type == XID6_TYPE_STRING) { \
			uint16_t trueLength = length <= XID6_TEXT_FIELD_LENGTH ? length : XID6_TEXT_FIELD_LENGTH; \
			memcpy(field, data, trueLength); \
			field[trueLength] = field[trueLength + 1] = '\0'; \
		} break;

#define HandleXID6Int(name, field) \
	case _XID6Field_(name): \
		if (type == XID6_TYPE_INTEGER) { \
			meta->fields |= _XID6FieldFlag_(name); \
			field = ReadIntBin(data, length); \
		} break;

#define HandleXID6Byte(name, field) \
	case _XID6Field_(name): \
		if (type == XID6_TYPE_LENGTH) { \
			meta->fields |= _XID6FieldFlag_(name); \
			field = (uint8_t)length; \
		} break;

#define HandleXID6Word(name, field) \
	case _XID6Field_(name): \
		if (type == XID6_TYPE_LENGTH) { \
			meta->fields |= _XID6FieldFlag_(name); \
			field = length; \
		} break;

void GetXID6Metadata(const uint8_t *data, SpcMetadata *meta, size_t length)
{
	// Require enough room in the file for the XID6 header and at least one
	// field.
	// Why the hell does this need *more* than 12 extra bytes?
	if (length <= SPC_FILE_SIZE + 12) return;

	// Require "xid6" header
	if (memcmp(&data[SPC_FILE_SIZE], c_szXid6, XID6_SIG_LENGTH)) return;

	const uint8_t *end;
	{
		size_t xid6Length = ReadIntBin(&data[4], 4);
		if (SPC_FILE_SIZE + 8 + xid6Length < (length & ~3))
			end = &data[SPC_FILE_SIZE + 8 + xid6Length];
		else
			end = &data[length & ~3];
	}
	data = &data[SPC_FILE_SIZE + 8];

	uint32_t introLength = 0, loopLength = 0, fadeLength = 0;
	int32_t endLength = 0;
	uint8_t nLoops = 0;
	uint16_t ostTrack = 0;

	while (data < end)
	{
		uint8_t id = data[0];
		uint8_t type = data[1];
		uint16_t length = ReadIntBin(&data[2], 2);

		data += 4;
		if (type && data + length > end) break;

		switch (id)
		{
			HandleXID6String(TITLE, meta->title);
			HandleXID6String(GAME, meta->game);
			HandleXID6String(ARTIST, meta->artist);
			HandleXID6String(OST, meta->ostTitle);
			HandleXID6Byte(OSTDISC, meta->ostDisc);
			HandleXID6Word(OSTTRACK, ostTrack);
			HandleXID6String(PUBLISHER, meta->publisher);
			HandleXID6Word(COPYRIGHT, meta->copyrightYear);
			HandleXID6Int(INTROLENGTH, introLength);
			HandleXID6Int(LOOPLENGTH, loopLength);
			HandleXID6Int(ENDLENGTH, endLength);
			HandleXID6Int(FADELENGTH, fadeLength);
			HandleXID6Byte(NLOOP, nLoops);
		}

		//if (type != 1) // 1 is a string. Why the hell does it skip strings?
		if (type)
		{
			// Pad to 4 bytes.
			if (length & 3)
			{
				length |= 3;
				length++;
			}
			data += length;
		}
	}

	meta->ostTrack = ostTrack >> 8;
	meta->ostTrackChar = (char)(uint8_t)ostTrack;

#define _T2S(t)	(t / 64000.0)

	double fadeStart = _T2S(introLength) + (_T2S(loopLength) * nLoops) +
				_T2S(endLength);

	if (fadeStart > 0)
	{
		meta->fadeStart = fadeStart;
		meta->fadeLength = _T2S(fadeLength);
	}

#undef _T2S
}

template <bool IS_DATE>
bool IsNumber(const char *data, int size)
{
	while (size-- > 0)
	{
		char c = *data++;
		if (!c) break;
		else if (!IsDigit(c))
		{
			// For dates, allow the forward slash.
			if (IS_DATE)
				return c == '/';
			else
				return false;
		}
	}
	// After the first zero byte, the rest of the number must be zeros.
	while (size-- > 0)
		if (*data++) return false;

	return true;
}

#define ID666_SONG_TITLE	0x2E
#define ID666_GAME_TITLE	0x4E
#define ID666_DUMPDATE		0x9E
#define ID666_FADE_START	0xA9
#define ID666_FADE_LENGTH	0xAC

#define ID666TXT_ARTIST		0xB1
#define ID666BIN_ARTIST		0xB0

bool IsTextID666(const void *data_)
{
	const char *data = static_cast<const char*>(data_);

	return
		IsNumber<true>(&data[ID666_DUMPDATE], 11) &&
		IsNumber<false>(&data[ID666_FADE_START], 3) &&
		IsNumber<false>(&data[ID666_FADE_LENGTH], 5);
}

SpcMetadata *imo_get_metadata(const uint8_t *data, size_t length)
{
	// SPC files must contain at least 65,920 bytes,
	if (length < SPC_MINIMUM_SIZE ||
		// start with "SNES-SPC700 Sound File Data",
		memcmp(data, c_szSpcSig, SPC_SIG_LENGTH) ||
		// and have the bytes 26,26 at 0x00021.
		data[0x21] != 26 || data[0x22] != 26)
		return NULL;

	bool hasID666Tags;
	// 0x00023 must be either 26 to indicate that there are ID666 tags,
	if (data[0x23] == 26)
		hasID666Tags = true;
	// or 27 to indicate that there are none.
	else if (data[0x23] == 27)
		hasID666Tags = false;
	// Otherwise, the file is invalid.
	else return NULL;

	// Create an empty metadata object and initialize it to empty.
	SpcMetadata *pMeta = new SpcMetadata;
	memset(pMeta, 0, sizeof (*pMeta));

	if (hasID666Tags)
	{
		memcpy(pMeta->title, &data[ID666_SONG_TITLE], ID666_TEXT_FIELD_LENGTH);
		memcpy(pMeta->game, &data[ID666_GAME_TITLE], ID666_TEXT_FIELD_LENGTH);

		uint32_t fadeStart, fadeLength;
		if (IsTextID666(data))
		{
			fadeStart = ReadIntText(&data[ID666_FADE_START], 3);
			fadeLength = ReadIntText(&data[ID666_FADE_LENGTH], 5);
			memcpy(pMeta->artist, &data[ID666TXT_ARTIST], ID666_TEXT_FIELD_LENGTH);
		}
		else
		{
			fadeStart = ReadIntBin(&data[ID666_FADE_START], 3);
			fadeLength = ReadIntBin(&data[ID666_FADE_LENGTH], 4);
			memcpy(pMeta->artist, &data[ID666BIN_ARTIST], ID666_TEXT_FIELD_LENGTH);
		}
		// If fadeStart is zero, then just use the default fade start.
		pMeta->fadeStart = fadeStart ?: SPC_DEFAULT_FADE_START;
		// However, don't use the default fade length.
		pMeta->fadeLength = fadeLength / 1000.0;
	}
	else
	{
		pMeta->fadeStart = SPC_DEFAULT_FADE_START;
		pMeta->fadeLength = SPC_DEFAULT_FADE_LENGTH;
	}

	GetXID6Metadata(data, pMeta, length);
	return pMeta;
}

void imo_free_metadata(SpcMetadata *meta)
{
	delete meta;
}

const char *xid6_getTitle(const SpcMetadata *md) { return md->title; }
const char *xid6_getGame(const SpcMetadata *md) { return md->game; }
const char *xid6_getArtist(const SpcMetadata *md) { return md->artist; }
const char *xid6_getPublisher(const SpcMetadata *md) { return md->publisher; }
uint16_t xid6_getCopyrightYear(const SpcMetadata *md) { return md->copyrightYear; }
const char *xid6_getOstTitle(const SpcMetadata *md) { return md->ostTitle; }
uint8_t xid6_getOstDisc(const SpcMetadata *md) { return md->ostDisc; }
uint8_t xid6_getOstTrack(const SpcMetadata *md) { return md->ostTrack; }
char xid6_getOstTrackChar(const SpcMetadata *md) { return md->ostTrackChar; }
double xid6_getFadeStart(const SpcMetadata *md) { return md->fadeStart; }
double xid6_getFadeLength(const SpcMetadata *md) { return md->fadeLength; }
uint8_t xid6_getFields(const SpcMetadata *md) { return md->fields; }
