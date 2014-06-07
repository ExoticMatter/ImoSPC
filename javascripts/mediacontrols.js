var row = $('<table class="toolbar ui-widget-header ui-corner-all"></table>').appendTo('#mediacontrols');
row = $('<tr></tr>').appendTo(row);
var toolbar = $('<td style="width: 1px; padding: 4px; white-space: nowrap"></td>').appendTo(row);

function makeButton(type, text) {
    var btn = $('<button>' + text + '</button>')
        .button({
            text: false,
            icons: {
                primary: 'ui-icon-' + type
            }
        })
        .appendTo(toolbar);

    btn.after(' ');
    return btn;
}

var first = makeButton('seek-start', 'Play first track'),
    prev  = makeButton('seek-prev', 'Play previous track'),
    play  = makeButton('play', 'Play'),
    stop  = makeButton('stop', 'Stop'),
    next  = makeButton('seek-next', 'Play next track'),
    last  = makeButton('seek-end', 'Play last track');

var progressbar = $('<td></td>').appendTo(row);
progressbar = $('<div></div>')
    .progressbar({
        max: 1,
        value: .75
    })
    .click(function(e) {
        $(this).progressbar('option', 'value', (e.pageX - $(this).offset().left) / ($(this).width() - 1));
    })
    .appendTo(progressbar);

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
    } else {
        muteBtn.button('option', 'label', 'Unmute');
        muteBtn.button('option', 'icons', { primary: 'ui-icon-volume-off' });
    }
});

volumebar = $('<div style="display: inline-block; width: 100px; margin: 0 8px; vertical-align: middle;"></div>')
    .slider({
        range: 'min',
        value: 100,
        min: 0,
        max: 100
    })
    .appendTo(volumebar);
