CLOSURE_COMPILER:=$(EMSCRIPTEN)/third_party/closure-compiler/compiler.jar

all: swf main

bin:
	mkdir -p bin

swf: require-crossbridge bin
	"$(FLASCC)/usr/bin/g++" -Werror -Wno-write-strings -Wno-trigraphs -jvmopt=-Xmx512M -O4 -emit-swc=ImoSPC -o bin/.imo-spc.swc flash/as3api.cpp snes_spc/SNES_SPC.cpp snes_spc/SNES_SPC_misc.cpp snes_spc/SNES_SPC_state.cpp snes_spc/SPC_DSP.cpp snes_spc/SPC_Filter.cpp snes_spc/Fir_Resampler.cpp
	"$(FLEX)/bin/mxmlc" -library-path+=bin/.imo-spc.swc flash/main.as -o bin/imo-fl.swf

workers: require-emscripten bin
	"$(EMSCRIPTEN)/emcc" imo-impl.cpp snes_spc/SNES_SPC.cpp snes_spc/SNES_SPC_misc.cpp snes_spc/SNES_SPC_state.cpp snes_spc/SPC_DSP.cpp snes_spc/SPC_Filter.cpp snes_spc/Fir_Resampler.cpp --post-js html5/libspc.js -o ./bin/imo-w-spc.js -s USE_ASM=1 -s EXPORTED_FUNCTIONS=['_malloc','_realloc','_imo_load','_imo_run','_imo_set_sample_rate','_imo_skip'] -O2 --closure 1 --llvm-lto 1 -s ERROR_ON_UNDEFINED_SYMBOLS=1
	"$(EMSCRIPTEN)/emcc" html5/unzip.cpp html5/id666.cpp html5/puff.c html5/crc32.c --post-js html5/libunzip.js -o ./bin/imo-w-unzip.js -s USE_ASM=1 -s EXPORTED_FUNCTIONS=['_malloc','_imo_inflate','_crc32','_xid6_getTitle','_xid6_getGame','_xid6_getArtist','_xid6_getPublisher','_xid6_getCopyrightYear','_xid6_getOstTitle','_xid6_getOstDisc','_xid6_getOstTrack','_xid6_getOstTrackChar','_xid6_getFadeStart','_xid6_getFadeLength','_xid6_getFields','_imo_get_metadata','_imo_free_metadata'] -O2 --closure 1 --llvm-lto 1 -s ERROR_ON_UNDEFINED_SYMBOLS=1

main: require-closure bin
	java -jar "$(CLOSURE_COMPILER)" --js imospc.js --js_output_file bin/imospc.js

require-crossbridge:
	@if [ -f "$(FLASCC)/usr/bin/gcc" ] ; then true; else \
		echo "Couldn't locate FLASCC sdk directory; please set the environment variable FLASCC to /path/to/FLASCC/sdk..."; \
		exit 1; \
	fi

	@if [ -d "$(FLEX)/bin" ] ; then true; else \
		echo "Couldn't locate Flex sdk directory, please set the environment variable FLEX to /path/to/flex ..."; \
		exit 1; \
	fi

require-emscripten:
	@if [ ! -f "$(EMSCRIPTEN)/emcc" ] ; then \
		echo "Couldn't locate Emscripten directory, please set the environment variable EMSCRIPTEN to /path/to/emscripten ..."; \
		exit 1; \
	fi

require-closure:
	@command -v java >/dev/null 2>&1 || { \
		echo "Couldn't locate Java, please install Java ..."; \
		exit 1; \
	}

	@if [ ! -f "$(CLOSURE_COMPILER)" ] ; then \
		echo "Couldn't locate Closure, please set the environment variable CLOSURE_COMPILER to /path/to/closure ..."; \
		exit 1; \
	fi
