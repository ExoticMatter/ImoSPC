@set w_spc=imo-w-spc.js
@set w_unzip=imo-w-unzip.js

@if exist bin goto build

@mkdir bin

:build
@echo Compiling %w_spc%...

call emcc imo-impl.cpp snes_spc/SNES_SPC.cpp snes_spc/SNES_SPC_misc.cpp snes_spc/SNES_SPC_state.cpp snes_spc/SPC_DSP.cpp snes_spc/SPC_Filter.cpp snes_spc/Fir_Resampler.cpp --post-js html5/libspc.js -o bin/%w_spc% -s USE_ASM=1 -s EXPORTED_FUNCTIONS=['_malloc','_realloc','_imo_load','_imo_run','_imo_set_sample_rate','_imo_skip'] -O2 --closure 1 --llvm-lto 1 -s ERROR_ON_UNDEFINED_SYMBOLS=1

@echo Compiling %w_unzip%...

call emcc html5/unzip.cpp html5/id666.cpp html5/puff.c html5/crc32.c --post-js html5/libunzip.js -o bin/%w_unzip% -s USE_ASM=1 -s EXPORTED_FUNCTIONS=['_malloc','_imo_inflate','_crc32','_xid6_getTitle','_xid6_getGame','_xid6_getArtist','_xid6_getPublisher','_xid6_getCopyrightYear','_xid6_getOstTitle','_xid6_getOstDisc','_xid6_getOstTrack','_xid6_getOstTrackChar','_xid6_getFadeStart','_xid6_getFadeLength','_xid6_getFields','_imo_get_metadata','_imo_free_metadata'] -O2 --closure 1 --llvm-lto 1 -s ERROR_ON_UNDEFINED_SYMBOLS=1

pause
