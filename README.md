ImoSPC
======

ImoSPC provides an API for playing [SPC] files and Zip archives, as well as reading SPC metadata, using JavaScript.

(This page is under construction.)

Basic usage
-----------

You need to grab `imospc.js`, `imo-w-spc.js`, `imo-w-unzip.js`, and `imo-fl.swf` from [the repository](https://github.com/ShadowFan-X/ImoSPC/tree/master/bin). Or, you can [compile](#compiling) it yourself.

These files need those exact names, and they need to be stored in the same directory.

    <script type="text/javascript" src="url/to/imospc.js"></script>

You need to initialize ImoSPC using `ImoSPC.init` in order to use it. The initialization process is asynchrous, so you need to add event listeners for the `init` and `initerror` events, using `ImoSPC.addEventListener`.

    ImoSPC.addEventListener("init", myInitProc);
    ImoSPC.addEventListener("initerror", myInitFailProc);
    ImoSPC.init();

[]()

    function myInitFailproc(e) {
        // This isn't the best way to handle initerror, but it will suffice for this example.
        alert("Failed to initialize!");
    }

Once ImoSPC is initialized, you can now load metadata using `ImoSPC.open`.

    function myInitproc() {
        // Passing autoplay: true here will cause the opened file to play immediately.
        // You can also pass autostart: true to ImoSPC.init to use this behaviour by default.
        // You can also listen for the 'load' event instead of using autostart.
        ImoSPC.open("url/to/file.spc", { autostart: true });
    }

API
---

(under construction)

Compiling
---------

To compile ImoSPC, you need [Emscripten], [FlasCC], and [Flex].

(under construction)

License
-------

(under construction)

[SPC]:http://en.wikipedia.org/wiki/Nintendo_S-SMP#Format
[Emscripten]:https://github.com/kripken/emscripten
