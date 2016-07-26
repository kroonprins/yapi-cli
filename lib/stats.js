(function() {
    "use strict";

    global.yapi = global.yapi || {};
    var pad = require("pad");
    var colors = require("colors");

    var stats = global.yapi.stats = {
        itemsTicker: 0,
        itemsTickerTimer: 0,
        lastFewDuration: 0,
        startTime: 0,
        endTime: 0,
        getFinalDuration: function() {
            return (stats.endTime - stats.startTime) / 1000;
        },
        init: function() {

            /* Build stats object */
            stats.initialCount = {
                all: 0
            };
            stats.processed = {
                successfully: {},
                failed: {}
            };
            stats.updated = {};
            stats.added = {};
            stats.unmodified = {};
            stats.deleted = {};
            stats.remaining = {
                byType: function(type) {
                    return stats.initialCount[type] - stats.processed.successfully[type] - stats.processed.failed[type];
                },
                all: function() {
                    var total = 0;

                    $.each(stats.remaining, function(obj) {
                        if (obj !== 'all' && obj !== 'byType') {
                            total += stats.remaining.byType(obj)
                        }
                    });
                    return total;
                }
            };
        },
        start: function() {

            stats.startTime = new Date().getTime();

            stats.items = {};

            $.each(yapi.items, function(i, item) {
                if (i !== 'adbancedRights') {
                    stats.items[i] = {};
                }
            });

            $.each(stats.items, function(i, item) {
                stats.initialCount[i] = stats.countArrayItemsByType(i);
                stats.processed.successfully[i] = 0;
                stats.processed.failed[i] = 0;
                stats.updated[i] = 0;
                stats.added[i] = 0;
                stats.unmodified[i] = 0;
                stats.deleted[i] = 0;
                stats.remaining[i] = function() {
                    return stats.remaining.byType(i)
                };

                stats.initialCount.all = stats.initialCount.all + stats.initialCount[i];

            });

        },
        countArrayItemsByType: function(type) {
            if (yapi.items[type].length > 0) {
                return yapi.items[type].length;
            } else {
                return 0;
            }
        },
        averageTimePerItem: function() {
            var totalProcessed = 0,
                duration,
                lastFewDuration,
                now,
                averageItemTime,
                lastFewAverageItemTime,
                totalRemaining = stats.remaining.all();


            $.each(stats.processed, function() {
                var that = this;
                $.each(that, function() {
                    totalProcessed += this
                });

            });

            now = new Date().getTime();

            if (stats.itemsTicker === 0) {
                stats.itemsTicker = totalRemaining;
            }

            var aFewItems = 10;
            if (stats.itemsTicker - totalRemaining < aFewItems) {} else {
                stats.itemsTicker = totalRemaining;

                if (stats.itemsTickerTimer > 0) {
                    stats.lastFewDuration = now - stats.itemsTickerTimer;
                }
                stats.itemsTickerTimer = new Date().getTime();
            }

            duration = now - stats.startTime;
            averageItemTime = duration / totalProcessed;
            lastFewAverageItemTime = stats.lastFewDuration / aFewItems;

            var timeLeft = (totalRemaining * lastFewAverageItemTime.toFixed(2)) / 1000 / 60;

            //$('.yapi .average-item-time span.seconds').html(averageItemTime.toFixed(2));
            //$('.yapi .average-item-time span.avglastfew').html(lastFewAverageItemTime.toFixed(0));
            //$('.yapi .average-item-time span.duration').html((duration / 1000).toFixed(0));
            //$('.yapi .average-item-time span.complete').html(timeLeft.toFixed(0));


            var percentComplete;

            if (stats.initialCount.all !== 0) {
                percentComplete = (totalProcessed / stats.initialCount.all) * 100;
                //$('.yapi-progress').val(percentComplete);

                if (percentComplete === 100) {
                    //$('.yapi-progress').addClass('disabled');
                }

            }


        },
        write: function() {
            function formatNumber(number) {
                var asPaddedString = pad(number.toString(), 4);
                var result;
                if (number > 0) {
                    return colors.green(asPaddedString);
                } else if (number < 0) {
                    return colors.red(asPaddedString);
                } else {
                    return asPaddedString;
                }
            }

            function updateRow(type) {
                if (type !== 'remaining') {
                    var message = "";
                    $.each(stats.items, function(i, items) {
                        //$stats.find('.' + type + ' .' + i).text(yapi.stats[type][i]);
                        message = message + "[" + i + ": " + formatNumber(yapi.stats[type][i]) + "]";
                    });
                    console.log("Stats " + pad(type, 14) + ": " + message);
                } else {
                    //var $portalStat = $stats.find('.' + type + ' .portals'),
                    //    $templatesStat = $stats.find('.' + type + ' .templates'),
                    //    $catalogStat = $stats.find('.' + type + ' .catalog'),
                    //    $pagesStat = $stats.find('.' + type + ' .pages'),
                    //    $containersStat = $stats.find('.' + type + ' .containers'),
                    //    $widgetsStat = $stats.find('.' + type + ' .widgets'),
                    //    $linksStat = $stats.find('.' + type + ' .links'),
                    //    $rigthsStat = $stats.find('.' + type + ' .rightsList'),
                    //    $groupsStat = $stats.find('.' + type + ' .groups'),
                    //    $usersStat = $stats.find('.' + type + ' .users');


                    //if ($portalStat.text() !== yapi.stats[type].portals()) {
                    //    $portalStat.text(yapi.stats[type].portals());
                    //}
                    //if ($templatesStat.text() !== yapi.stats[type].templates()) {
                    //    $templatesStat.text(yapi.stats[type].templates());
                    //}
                    //if ($catalogStat.text() !== yapi.stats[type].catalog()) {
                    //    $catalogStat.text(yapi.stats[type].catalog());
                    //}
                    //if ($pagesStat.text() !== yapi.stats[type].pages()) {
                    //    $pagesStat.text(yapi.stats[type].pages());
                    //}
                    //if ($containersStat.text() !== yapi.stats[type].containers()) {
                    //    $containersStat.text(yapi.stats[type].containers());
                    //}
                    //if ($widgetsStat.text() !== yapi.stats[type].widgets()) {
                    //    $widgetsStat.text(yapi.stats[type].widgets());
                    //}
                    //if ($linksStat.text() !== yapi.stats[type].links()) {
                    //    $linksStat.text(yapi.stats[type].links());
                    //}
                    //if ($rigthsStat.text() !== yapi.stats[type].rightsList()) {
                    //    $rigthsStat.text(yapi.stats[type].rightsList());
                    //}
                    //if ($groupsStat.text() !== yapi.stats[type].groups()) {
                    //    $groupsStat.text(yapi.stats[type].groups());
                    //}
                    //if ($usersStat.text() !== yapi.stats[type].users()) {
                    //    $usersStat.text(yapi.stats[type].users());
                    //}
                    console.log("Stats remaining     : " +
                        "[templates: " + formatNumber(yapi.stats[type].templates()) + "]" +
                        "[portals: " + formatNumber(yapi.stats[type].portals()) + "]" +
                        "[catalog: " + formatNumber(yapi.stats[type].catalog()) + "]" +
                        "[pages: " + formatNumber(yapi.stats[type].pages()) + "]" +
                        "[containers: " + formatNumber(yapi.stats[type].containers()) + "]" +
                        "[widgets: " + formatNumber(yapi.stats[type].widgets()) + "]" +
                        "[links: " + formatNumber(yapi.stats[type].links()) + "]" +
                        "[groups: " + formatNumber(yapi.stats[type].groups()) + "]" +
                        "[users: " + formatNumber(yapi.stats[type].users()) + "]" +
                        "[rightsList: " + formatNumber(yapi.stats[type].rightsList()) + "]" +
                        "[advancedrights: n/a ]");
                }
            }

            //var $stats = $('.stats');

            updateRow('initialCount');
            updateRow('remaining');
            updateRow('added');
            updateRow('updated');
            updateRow('unmodified');
            updateRow('deleted');

        }
    };
})();
