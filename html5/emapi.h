#pragma once

#ifdef EMSCRIPTEN
#ifndef __EMAPI_H__
#define __EMAPI_H__

#include <emscripten.h>

#define IMOSPC_FUNC(as3sig)
#define IMO_EXTERN extern "C"

#endif // __EMAPI_H__
#endif // EMSCRIPTEN
