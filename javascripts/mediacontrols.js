function tryStore(key, value) {
    if ('localStorage' in window) {
        localStorage.setItem(key, value);
    }
    return value;
}

function tryFetch(key, _default) {
    if ('localStorage' in window) {
        var value = localStorage.getItem(key);
    }
    return value != null && !isNaN(value = +value) ? value : _default;
}

var row = $('<table class="ui-widget-header ui-corner-all" style="font-size: 10px"></table>').appendTo('#mediacontrols');
row = $('<tr></tr>').appendTo(row);
var toolbar = $('<td style="width: 1px; padding: 4px; white-space: nowrap"></td>').appendTo(row);

function makeButton(type, text, handler) {
    var btn = $('<button>' + text + '</button>')
        .button({
            text: false,
            disabled: true,
            icons: {
                primary: 'ui-icon-' + type
            }
        })
    .click(handler)
    .appendTo(toolbar);

    btn.after(' ');
    return btn;
}

var first = makeButton('seek-start', 'Play first track', handleFirst),
    prev  = makeButton('seek-prev', 'Play previous track', handlePrev),
    play  = makeButton('play', 'Play', handlePlayPause),
    stop  = makeButton('stop', 'Stop', handleStop),
    next  = makeButton('seek-next', 'Play next track', handleNext),
    last  = makeButton('seek-end', 'Play last track', handleLast);

var seekbar = $('<td></td>').appendTo(row);
seekbar = $('<div></div>')
    .progressbar({
        max: 1,
        value: 0
    })
    .click(function(e) {
        var track = ImoSPC.currentTrack();
        if (track) track.seek(((e.pageX - $(this).offset().left) / ($(this).width() - 1)) * track.length);
    })
    .appendTo(seekbar);

var volumebar = $('<td style="width: 1px; padding: 4px; white-space: nowrap"></td>').appendTo(row);

var muteBtn = $('<input type="checkbox" id="mute" checked="1">').appendTo(volumebar);
muteBtn.after('<label for="mute">Mute</label>');

muteBtn.button({
    text: false,
    icons: { primary: 'ui-icon-volume-on' }
})
.change(function() {
    if (this.checked) {
        muteBtn.button('option', 'label', 'Mute');
        muteBtn.button('option', 'icons', { primary: 'ui-icon-volume-on' });
    ImoSPC.setVolume(tryFetch('volume', 100) / 100);
    } else {
        muteBtn.button('option', 'label', 'Unmute');
        muteBtn.button('option', 'icons', { primary: 'ui-icon-volume-off' });
    ImoSPC.setVolume(0);
    }
});

volumebar = $('<div style="display: inline-block; width: 100px; margin: 0 8px; vertical-align: middle;"></div>')
    .slider({
        range: 'min',
        value: tryFetch('volume', 100),
        min: 0,
        max: 100,
    slide: function(event, ui) {
            ImoSPC.setVolume(tryStore('volume', ui.value) / 100);
    }
    })
    .appendTo(volumebar);

function replaceWithLink(id) {
    id = '#' + id;
    $(id).replaceWith('<a href="javascript:void(0)" onclick="playtrack(\'http://http://shadowfan-x.github.io/ImoSPC/spcs/' + id + '.zip\')">' + $(id).text() + '</a>');
}

var lastBlobU = null,
    createObjectURL = (window.webkitURL || window.URL).createObjectURL,
    revokeObjectURL = (window.webkitURL || window.URL).revokeObjectURL;

function showError(message) {
    $('<div><p><span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 20px 0;"></span>' + message + '</p></div>').appendTo('body').dialog({
        resizable: false,
        modal: true,
        buttons: {
            Close: function() {
                $(this).dialog('close');
            }
        }
    });
}

ImoSPC.oninit = function() {
    replaceWithLink('smw');
    replaceWithLink('yi');
    replaceWithLink('dkq');

    if ('FileReader' in window) {
        $('#droparea')
            .text('Drop an SPC or Zip file here')
            .on('drop', function(e) {
                e.stopPropagation();
                e.preventDefault();
                e = e.originalEvent;

                if (lastBlobU) {
                    revokeObjectURL(lastBlobU);
                    lastBlobU = null;
                }
            })
            .on('dragenter', function(e) {
                e.stopPropagation();
                e.preventDefault();
                e = e.originalEvent;

                var dt = e.dataTransfer;
                if (dt.files && dt.files.length === 1) {
                    dt.effectAllowed = 'copy';
                } else {
                    dt.effectAllowed = 'none';
                }
            })
            .on('dragover', function(e) {
                e.stopPropagation();
                e.preventDefault();
            
                /*var dt = e.dataTransfer;
                if (dt.files && dt.files.length === 1) {
                    dt.dropEffect = 'copy';
                } else {
                    dt.dropEffect = 'none';
                }
                console.log(dt.files && dt.files.length);*/
            });
    } else {
        $('#droparea').text('');
    }
};

ImoSPC.oniniterror = function(e) {
    $('#droparea').text('');
    var E = ImoSPC.Error;
    var message;
    switch (e.error) {
        case E.BROWSER_NOT_SUPPORTED:
            message = 'Your browser is not supported by ImoSPC.';
            break;
        case E.E_FLASHBLOCK:
            message = 'ImoSPC was blocked by Flashblock.';
            break;
        default:
            message = 'ImoSPC could not be initialized.';
    }
    showError(message);
};

ImoSPC.onloaderror = function(e) {
    var E = ImoSPC.Error;
    var message;
    switch (e.error) {
        case E.INVALID_SPC:
            message = 'The SPC file is invalid.';
            break;
        case E.INVALID_ZIP:
            message = 'The archive is invalid.';
            break;
        case E.EMPTY_ARCHIVE:
            message = 'The archive is empty.';
            break;
        case E.UNKNOWN_FILE_TYPE:
            message = 'The file is invalid. Only SPC and Zip files can be loaded.';
            break;
        case E.PATH_NOT_FOUND
            message = 'Something went wrong and the path of a specific file could not be found in the archive.';
            break;
        default:
            message = 'The file could not be loaded.';
    }
    showError(message);
};

ImoSPC.onplaystatechange = function(e) {
    var PS = ImoSPC.PlaybackState;
    switch (e.state) {
        case PS.LOADING:
            seekbar.progressbar('option', 'max', e.track.length);

            var hasNoPrev = !e.playlist.previous();
            var hasNoNext = !e.playlist.next();
            first.button('option', 'disabled', hasNoPrev);
            prev.button('option', 'disabled', hasNoPrev);
            play.button('option', 'disabled', false);
            stop.button('option', 'disabled', false);
            next.button('option', 'disabled', hasNoNext);
            last.button('option', 'disabled', hasNoNext);
            setIsPlaying(true);

        case PS.BUFFERING:
            timerOff(true);
            break;

        case PS.PLAYING:
            timerOn();
            setIsPlaying(true);
            break;

        case PS.PAUSED:
            timerOn();
            setIsPlaying(false);
            break;

        case PS.STOPPED:
            timerOff();
            setIsPlaying(false);
            first.button('option', 'disabled', true);
            prev.button('option', 'disabled', true);
            play.button('option', 'disabled', true);
            stop.button('option', 'disabled', true);
            next.button('option', 'disabled', true);
            last.button('option', 'disabled', true);
            setIsPlaying(false);
    }
};

ImoSPC.init({ autostart: true });

var loadedPlaylists = {};
function playtrack(url) {
    if (loadedPlaylists.hasOwnProperty(url)) {
        loadedPlaylists[url].play();
    } else {
        ImoSPC.open(url);
        first.button('option', 'disabled', true);
        prev.button('option', 'disabled', true);
        play.button('option', 'disabled', false);
        stop.button('option', 'disabled', false);
        next.button('option', 'disabled', true);
        last.button('option', 'disabled', true);
        setIsPlaying(true);
        timerOff(true);
    }
}

var _timer;
function timerOn() {
    if (_timer) return;

    _timer = setInterval(function() {
        var time = ImoSPC.time();
        if (time < 0) time = 0;

        seekbar.progressbar('option', 'value', time);
    }, 100);
}

function timerOff(isLoading) {
    if (_timer) {
        clearInterval(_timer);
        _timer = null;
    }
    seekbar.progressbar('option', 'value', isLoading ? false : 0);
}

var _isPlaying;
function setIsPlaying(isPlaying) {
    if (isPlaying) {
        play.button('option', 'label', 'Pause');
        play.button('option', 'icons', { primary: 'ui-icon-pause' });
    } else {
        play.button('option', 'label', 'Play');
        play.button('option', 'icons', { primary: 'ui-icon-play' });
    }
    _isPlaying = isPlaying;
}

function handleFirst() {
    var p = ImoSPC.currentPlaylist();
    p.play(p.indexOfFirst());
}

function handlePrev() {
    var p = ImoSPC.currentPlaylist();
    p.play(p.indexOfPrevious());
}

function handlePlayPause() {
    if (_isPlaying) {
        ImoSPC.pause();
    } else {
        ImoSPC.unpause();
    }
}

function handleStop() { ImoSPC.stop(); }

function handleNext() {
    var p = ImoSPC.currentPlaylist();
    p.play(p.indexOfNext());
}

function handleLast() {
    var p = ImoSPC.currentPlaylist();
    p.play(p.indexOfLast());
}
