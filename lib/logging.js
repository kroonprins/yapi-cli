(function () {
    "use strict";

    global.yapi = global.yapi || {};

    var logging = global.yapi.logging = {
        //logResultsElement: $('.input-file-results .placeholder'),
        logStorage: [],
        log: function () {
            var storage = logging.logStorage,
                //loggingElement = logging.logResultsElement,
                //$message = $('<span></span>'),
                $message = "",
                style = 'normal';

            for (var i = 0; i < arguments.length; i++) {
                if (arguments[i].style) {
                    style = arguments[i].style;
                } else {
                    arguments[i] = i !== 0 ? ', ' + arguments[i] : '-- ' + arguments[i];
                    //$message.append(arguments[i]);
                    $message=$message+arguments[i];
                }
            }
            //$message.css(style);
            //loggingElement.append($message);
            //loggingElement.append('<br/>');
            console.log($message);

            // remove log messages from the top to make it faster
            //if (loggingElement.children().length > 200) {
            //    var arrayForStorage = loggingElement.children().slice(0, 150);
            //    $(arrayForStorage.toArray()).each(function () {
            //        storage.push(this);
            //    });
            //    arrayForStorage.remove();
            //}

            //loggingElement.parent().animate({
            //    'scrollTop': loggingElement.parent().get(0).scrollHeight
            //}, 0);

            global.yapi.stats.averageTimePerItem();
        },
        getFullLog: function () {
            //var domFragment = $('<div></div>');
            //$.each(logging.logStorage, function () {
            //    domFragment.append(this);
            //});
            //return domFragment;
        },
        complete: function () {
            //logging.logStorage.push(logging.logResultsElement.children());
        }
    };
    //Attach log to YAPI UI
    //$('.get-yapi-full-log').on('click', function () {
    //    $('.yapi-full-log').append(logging.getFullLog()).show();
    //    $('.get-yapi-full-log').hide();
    //    $('.input-file-results').hide();
    //});
})();
