#pragma once

#ifndef __IMO_ID666_H__
#define __IMO_ID666_H__

#include <stdint.h>
#include <stddef.h>

#define ID666_TEXT_FIELD_LENGTH	32
#define XID6_TEXT_FIELD_LENGTH	256

struct SpcMetadata
{
	char title[XID6_TEXT_FIELD_LENGTH];
	char game[XID6_TEXT_FIELD_LENGTH];
	char artist[XID6_TEXT_FIELD_LENGTH];
	char publisher[XID6_TEXT_FIELD_LENGTH];
	uint16_t copyrightYear;

	char ostTitle[XID6_TEXT_FIELD_LENGTH];
	uint8_t ostDisc;
	uint8_t ostTrack;
	char ostTrackChar;

	uint8_t fields;

	double fadeStart;
	double fadeLength;

	//uint32_t xid6IntroLength;
	//uint32_t xid6LoopLength;
	//int32_t xid6EndLength;
	//uint16_t xid6NLoops;
	//bool hasXID6LengthInfo;
};

extern "C" {
	const char *xid6_getTitle(const SpcMetadata *metadata);
	const char *xid6_getGame(const SpcMetadata *metadata);
	const char *xid6_getArtist(const SpcMetadata *metadata);
	const char *xid6_getPublisher(const SpcMetadata *metadata);
	uint16_t xid6_getCopyrightYear(const SpcMetadata *metadata);

	const char *xid6_getOstTitle(const SpcMetadata *metadata);
	uint8_t xid6_getOstDisc(const SpcMetadata *metadata);
	uint8_t xid6_getOstTrack(const SpcMetadata *metadata);
	char xid6_getOstTrackChar(const SpcMetadata *metadata);

	double xid6_getFadeStart(const SpcMetadata *metadata);
	double xid6_getFadeLength(const SpcMetadata *metadata);

	uint8_t xid6_getFields(const SpcMetadata *metadata);

	SpcMetadata *imo_get_metadata(const uint8_t *data, size_t length);
	void imo_free_metadata(SpcMetadata *meta);
}

#endif // __IMO_ID666_H__
