function TickerItem(title, text) {
    this.title = title;
    this.text = text;
    
    var ele = this.element = $('<span style="position:absolute;left:4px;opacity:0;visibility:hidden;transition:opacity 0.5s,visibility 0.5s;-webkit-transition:opacity 0.5s,visibility 0.5s"></span>');

    if (text) {
        ele .text(' ' + text)
            .prepend($('<strong></strong>').text(title + ':'));
    } else {
        ele.append($('<strong></strong>').text(title));
    }
}

(function($) {
    $.fn.ticker = function(opt) {
        var that = $(this), ele = that.get(0),
            items, itemIndex, itemTimer,
            currentItem, previousItem,
            height = -1, itemsToolTip;
        
        if (ele._ticker) {
            ele._ticker(opt);
            return;
        }

        that.css({ position: 'relative' });
        that.tooltip({
            content: function() {
                return itemsToolTip;
            }
        });

        (ele._ticker = function(opt) {
            items = opt.items;
            itemIndex = 0;

            advanceTicker();
            if (itemTimer) clearInterval(itemTimer), itemTimer = null;
            if (itemIndex) itemTimer = setInterval(advanceTicker, opt.length || 4000);

            var title = '';
            var titleRaw = '';
            for (var i = -1, ii = items.length; ++i < ii;) {
                var item = items[i];
                title += item.element.html() + '<br />';
                titleRaw += item.title + (item.text ? ': ' + item.text : '') + '\n';
            }
            that.prop('title', titleRaw);
            itemsToolTip = title;
        })(opt);

        function advanceTicker() {
            if (previousItem) previousItem.remove();
            previousItem = currentItem;
            
            if (previousItem) previousItem.css({
                opacity: 0,
                visibility: 'hidden'
            });

            currentItem = items[itemIndex++].element;

            that.append(currentItem);
            setTimeout(showNextTicker, 100);

            if (itemIndex >= items.length) itemIndex = 0;
        }
        function showNextTicker() {
            var h = currentItem.height();
            if (h > height) that.css('height', (height = h) + 'px');

            currentItem.css({
                opacity: 1,
                visibility: 'visible'
            });
        }

        return that;
    };
}(jQuery));
