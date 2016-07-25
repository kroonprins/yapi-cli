//$.support.cors = true;

(function () {
    "use strict";

    var Q = require('q');

    var yapi = global.yapi || {};


    yapi.items = global.yapi.config.items;
    yapi.endTime = null;
    yapi.lastAjaxAction = '';
    yapi.selectors = global.yapi.config.selectors;

    var logging = {
        log: global.yapi.logging.log,
        end: global.yapi.logging.complete
    };

    var stats = global.yapi.stats;

    // because of a weird bug in Portal Server, we have to wait before we can delete manageable areas. Collect them here
    var todelete = [];

    $.ajaxSetup({
      headers: {
        'X-BBXSRF': global.yapi.config.xhrequest.headers.xbbxsrf,
        'cookie': global.yapi.config.xhrequest.headers.cookie
      }
    });

    yapi.checkItemWithGet = function (XMLItem, that, currentFileType) {

        var urls = global.yapi.restUrls.getUrls(XMLItem, currentFileType);

        yapi.startCheck = function () {
            yapi.stats.write();
            return yapi.getRestItem(currentFileType, urls, XMLItem).then(yapi.putRestItem);
        };

        return yapi.startCheck()
            .then(function (data) {
                logging.log('item checked', {style: {'color': 'blue'}});
            }).then(null, function (e) {
                if (e.status === 500) { //Retry is busy
                    return yapi.startCheck();
                }

                //no need to post a if deleting items
                if (global.yapi.config.deletingActivated) {

                    logging.log('no need to post item should not exist anyway', {
                        style: {
                            'color': 'lightgrey'
                        }
                    });
                    yapi.stats.processed.successfully[currentFileType]++;
                    yapi.stats.unmodified[currentFileType]++;
                    return false;
                }


                logging.log(e.responseXML.childNodes[0].textContent, ':: posting new item', {
                    style: {'color': 'grey'}
                });
                return yapi.postRestItem(currentFileType, urls, XMLItem).then(function (data) {
                    logging.log('done my POST', {style: {'color': 'blue'}});
                    yapi.stats.processed.successfully[currentFileType]++;
                    yapi.stats.added[currentFileType]++;

                    //* Need to find a way to stop auto generating the master page containers or removing them after.. *//
                    if (currentFileType === 'pages') {
                        todelete.push(global.yapi.restUrls.getUrls(data.documentElement, currentFileType, true).getUrl);
                    }

                    return $.when(function () {
                        return data;
                    });

                }).fail(function (e) {
                    yapi.stats.processed.failed[currentFileType]++;

                    logging.log('not managed a post either', {style: {'color': 'red'}});
                    throw new Error('not managed a post either');
                });

            }).done(function () {

                //logging.log('end', currentFileType, yapi.lastAjaxAction, getUrl, new Date().getTime(), {
                logging.log('end', currentFileType, yapi.lastAjaxAction, urls.getUrl, new Date().getTime(), {
                    style: {
                        'color': 'DarkBlue'
                    }
                });
            });
    };

    yapi.getRestItem = function (currentFileType, urls, XMLItem) {

        logging.log('Getting: ', currentFileType, urls.getUrl, new Date().getTime(), {
            style: {'color': 'green'}
        });

        return $.ajax({
            type: 'GET',
            url: urls.getUrl,
            crossDomain: true,
            async: false,
            context: {
                XMLItem: XMLItem,
                currentFileType: currentFileType,
                urls: urls
            },
            contentType: 'application/xml'
        }).pipe(function (data, status, response) {
            yapi.lastAjaxAction = 'GET';
            return data;
        });
    };

    yapi.putRestItem = function (data) {
        var newItem = this.XMLItem,
            existingItem = $(data).find(yapi.selectors.itemTypes),
            nodeNames = [],
            nodeValues = [],
            nodeAttributes = [],
            existingProperties = null,
            existingTags = null,
            newProperties = null,
            newTags = null,
            hasChanged = false,
            currentFileType = this.currentFileType,
            urls = this.urls;

        //IF ITEM EXISTS AND DELETE IS CHECKED REMOVE FROM PORTAL
        if (global.yapi.config.deletingActivated) {
            return yapi.deleteRestItem(urls.deleteUrl, currentFileType);
        }

        if (currentFileType === 'rightsList' || currentFileType === 'advancedrights') {
            hasChanged = true;
        }

        $(existingItem).children().each(function () {

            if (this.nodeName !== 'properties' && this.nodeName !== 'tags') {
                nodeNames.push(this.nodeName);
                nodeValues.push(this.textContent);
            } else if (this.nodeName === 'properties') {

                existingProperties = $(this).find('property');
            } else if (this.nodeName === 'tags') {
                existingTags = {};
                $(this).find('tag').each(function () {
                    var tag = $.trim(this.textContent) + '--' + $(this).attr('type');
                    existingTags[tag] = true;
                });
            }
        });

        if (existingProperties && existingProperties.length > 0) {
            $(existingProperties).each(function () {
                if (this.attributes['name'].nodeValue !== 'generatedUrl') {
                    nodeNames.push(this.attributes['name'].nodeValue);
                    nodeValues.push($.trim(this.textContent));
                }
            });
        }

        $(newItem).children().each(function () {
            if (nodeNames.indexOf(this.nodeName) !== -1 && (this.nodeName !== 'properties' && this.nodeName !== 'tags')) {

                var newValue = this.textContent,
                    oldValue = nodeValues[nodeNames.indexOf(this.nodeName)];

                if (this.nodeName === 'extendedItemName' && newValue.substring(0, 1) === '[' && newValue.substring(newValue.length - 1) === ']') {
                    newValue = newValue.substring(1, newValue.length - 1);
                }

                if (newValue !== oldValue) {
                    hasChanged = true;
                    logging.log('new: ', newValue, ' old: ', oldValue, {
                        style: {
                            'color': 'green'
                        }
                    });
                }
            }

            if (this.nodeName === 'properties') {
                $(this).find('property').each(function () {
                    //if (this.attributes['name'].nodeValue !== 'generatedUrl') {
                    if (this.attributes.getNamedItem('name').nodeValue !== 'generatedUrl') {
                        //if (nodeNames.indexOf(this.attributes.['name'].nodeValue) !== -1) {
                        if (nodeNames.indexOf(this.attributes.getNamedItem('name').nodeValue) !== -1) {
                            //var propertyName = this.attributes['name'].nodeValue,
                            var propertyName = this.attributes.getNamedItem('name').nodeValue,
                                newValue = $.trim(this.textContent);
                            oldValue = nodeValues[nodeNames.indexOf(propertyName)];

                            if ($.isNumeric(newValue)) newValue = parseFloat(newValue);
                            if ($.isNumeric(oldValue)) oldValue = parseFloat(oldValue);

                            if (newValue !== oldValue) {
                                hasChanged = true;
                                logging.log('new: ', newValue, ' old: ', oldValue, {style: {'color': 'green'}});
                            }

                            //Get the original/existing property to be inspected
                            var existingProperty = existingProperties.filter(function () {
                                //return this.attributes['name'].nodeValue === propertyName;
                                return this.attributes.getNamedItem('name').nodeValue === propertyName;
                            });

                            var existingAttributes = {};

                            //Loop through it attributes and make an object to compare
                            $.each(existingProperty[0].attributes, function () {
                                existingAttributes[this.nodeName] = this.nodeValue;
                            });

                            $.each(this.attributes, function () {
                                var that = this;
                                if (existingAttributes[this.nodeName] && this.nodeName !== 'readonly' && this.nodeName !== 'itemName') {
                                    var newValue = this.nodeValue,
                                        oldValue = existingAttributes[this.nodeName];

                                    if ($.isNumeric(newValue)) newValue = parseFloat(newValue);
                                    if ($.isNumeric(oldValue)) oldValue = parseFloat(oldValue);

                                    if (newValue !== oldValue) {
                                        hasChanged = true;
                                        logging.log('new attr: ', newValue, ' old attr: ', oldValue, {
                                            style: {
                                                'color': 'green'
                                            }
                                        });
                                    }
                                } else if (this.nodeName !== 'readonly' && this.nodeName !== 'itemName') {
                                    hasChanged = true;
                                    logging.log('new attribute: ', this.nodeName, ' - ', this.nodeValue, {
                                        style: {
                                            'color': 'green'
                                        }
                                    });
                                }
                            });
                        } else {
                            hasChanged = true;
                            //logging.log('new property: ', this.attributes['name'].nodeValue, {
                            logging.log('new property: ', this.attributes.getNamedItem('name').nodeValue, {
                                style: {
                                    'color': 'green'
                                }
                            });
                        }
                    }
                });
            }

            if (this.nodeName === 'tags') {
                var tags = $(this).find('tag'),
                    existingTagsLength = $.map(existingTags, function (n, i) {
                        return i;
                    }).length;

                if (tags.length === existingTagsLength) {

                    $(tags).each(function () {
                        var newValue = $.trim(this.textContent) + '--' + $(this).attr('type');
                        if (!existingTags[newValue]) {
                            logging.log('new tag: ', newValue, {
                                style: {
                                    'color': 'green'
                                }
                            });
                            hasChanged = true;
                            //exit the loop
                            return false;
                        }
                    });

                } else {
                    hasChanged = true;
                    logging.log('tags changed', {
                        style: {'color': 'green'}
                    });
                }
            }
        });

        if (hasChanged) {

            var putData;

            if (currentFileType !== 'templates' &&
                currentFileType !== 'portals' &&
                currentFileType !== 'rightsList' &&
                currentFileType !== 'advancedrights' &&
                currentFileType !== 'users' &&
                currentFileType !== 'groups') {

                putData = '<' + currentFileType + '>' + global.yapi.util.XMLtoString(this.XMLItem) + '</' + currentFileType + '>';

            } else if (currentFileType === 'rightsList' || currentFileType === 'advancedrights') {
                $(this.XMLItem).find('> name, > contextItemName, > type').remove();
                putData = global.yapi.util.XMLtoString(this.XMLItem);
            } else {
                putData = global.yapi.util.XMLtoString(this.XMLItem);
            }

            return $.ajax({
                type: 'PUT',
                url: urls.putUrl,
                contentType: 'application/xml',
                data: putData,
                context: {
                    XMLItem: this.XMLItem,
                    currentFileType: currentFileType,
                    urls: urls
                },
                crossDomain: true,
                processData: false,
                async: false
            }).pipe(function (data) {
                yapi.lastAjaxAction = 'PUT';
                yapi.stats.processed.successfully[currentFileType]++;
                yapi.stats.updated[currentFileType]++;
                return data;
            });
        } else {
            yapi.stats.processed.successfully[currentFileType]++;
            yapi.stats.unmodified[currentFileType]++;

            logging.log('no change to existing item', {
                style: {
                    'color': 'grey'
                }
            });
            return $.when();
        }
    };

    yapi.postRestItem = function (currentFileType, urls, XMLItem) {
        if (currentFileType === 'rightsList' || currentFileType === 'advancedrights') {
            $(XMLItem).find('> name, > contextItemName, > type').remove();
        }

        var postXML;
        if (currentFileType === 'catalog') {
            postXML = '<' + currentFileType + '>' + global.yapi.util.XMLtoString(XMLItem) + '</' + currentFileType + '>';
        } else {
            postXML = global.yapi.util.XMLtoString(XMLItem);
        }


        return $.ajax({
            type: 'POST',
            url: urls.postUrl,
            contentType: 'application/xml',
            data: postXML,
            crossDomain: true,
            processData: false,
            async: false
        }).pipe(function (data) {
            yapi.lastAjaxAction = 'POST';
            return data;
        });
    };
    //

    yapi.deleteRestItem = function (deleteUrl, currentFileType, bypassStats) {
        //Can not delete template of rights
        if (currentFileType !== 'templates' &&
            currentFileType !== 'rightsList' &&
            currentFileType !== 'advancedrights') {

            return $.ajax({
                type: 'DELETE',
                url: deleteUrl,
                contentType: 'application/xml',
                processData: false,
                crossDomain: true,
                async: false
            }).pipe(function (data) {
                logging.log('Deleted..', {style: {'color': 'red', 'font-weight': 'bold'}});

                if (bypassStats === true) return data;

                yapi.lastAjaxAction = 'DELETE';
                yapi.stats.processed.successfully[currentFileType]++;
                yapi.stats.deleted[currentFileType]++;
                return data;
            });
        } else {
            logging.log('Templates and right can not be deleted by the REST interface.. no change to existing item', {
                style: {
                    'color': 'lightgrey'
                }
            });
            yapi.stats.processed.successfully[currentFileType]++;
            yapi.stats.unmodified[currentFileType]++;

            return false;
        }
    };

    yapi.sortItemsByProperty = function (array, property, property2) {
        var lookupItems = array.reduce(function (result, item) {
            result[$(item).find('> name').text()] = $(item).find('> ' + property).text();
            return result;
        }, {});

        var lookupItems2 = {};
        if (property2) {
            lookupItems2 = array.reduce(function (result, item) {
                result[$(item).find('> name').text()] = $(item).find('> ' + property2).text();
                return result;
            }, {});
        }


        var depth = function (lookupItems, name) {
            if (!lookupItems[name]) {
                return 1;
            } else {
                return depth(lookupItems, lookupItems[name]) + 1;
            }
        };

        try {
            array = array.sort(function (a, b) {
                var da, db, da2, db2;

                if (property2) {
                    da = depth(lookupItems, $(a).find('> name').text());
                    db = depth(lookupItems, $(b).find('> name').text());

                    da2 = depth(lookupItems2, $(a).find('> name').text());
                    db2 = depth(lookupItems2, $(b).find('> name').text());


                    return da < db ? -1 : da > db ? 1 : da2 < db2 ? -1 : da2 > db2 ? 1 : 0;
                } else {
                    da = depth(lookupItems, $(a).find('> name').text());
                    db = depth(lookupItems, $(b).find('> name').text());
                    return da < db ? -1 : da > db ? 1 : 0;
                }

            });
        } catch (err) {
            console.log('check for XML error or recursive references.', err);
        }

    };

    yapi.orderFilesAndExecute = function (XMLResults) {
        $.each(XMLResults, function () {
            $(this).find(yapi.selectors.itemGroups() + ', items ' + yapi.selectors.itemGroups()).each(function () {
                var typeOfItem = this.nodeName;
                yapi.items[typeOfItem] = yapi.items[typeOfItem].concat($(this).children(yapi.selectors.itemTypes).get());
            });
        });

        var portalCatalog = [];
        var serverCatalog = yapi.items.catalog.filter(function (item) {
            if ($(item).find('contextItemName').text() === '[BBHOST]') {
                return item
            } else {
                portalCatalog.push(item);
                return false;
            }
        });

        var splitCatalogByCategories = function (catalog) {
            return {
                catPages: catalog.filter(function (item) {
                    return item.nodeName === 'page' ? item : false;
                }),
                catContainers: catalog.filter(function (item) {
                    return item.nodeName === 'container' ? item : false;
                }),
                catWidgets: catalog.filter(function (item) {
                    return item.nodeName === 'widget' ? item : false;
                })
            };
        };

        $.each(yapi.items, function (itemName, item) {
            if (itemName !== 'catalog') {
                yapi.sortItemsByProperty(yapi.items[itemName], 'parentItemName', 'extendedItemName');
            }
        });

        serverCatalog = splitCatalogByCategories(serverCatalog);
        portalCatalog = splitCatalogByCategories(portalCatalog);

        yapi.sortItemsByProperty(serverCatalog.catPages, 'extendedItemName');
        yapi.sortItemsByProperty(serverCatalog.catContainers, 'parentItemName', 'extendedItemName');
        yapi.sortItemsByProperty(serverCatalog.catWidgets, 'parentItemName', 'extendedItemName');

        yapi.sortItemsByProperty(portalCatalog.catPages, 'extendedItemName');
        yapi.sortItemsByProperty(portalCatalog.catContainers, 'parentItemName', 'extendedItemName');
        //yapi.sortItemsByProperty(portalCatalog.catContainers, 'extendedItemName', 'parentItemName');
        yapi.sortItemsByProperty(portalCatalog.catWidgets, 'parentItemName', 'extendedItemName');

        yapi.items.catalog = serverCatalog.catPages
            .concat(serverCatalog.catContainers)
            .concat(serverCatalog.catWidgets)
            .concat(portalCatalog.catPages)
            .concat(portalCatalog.catContainers)
            .concat(portalCatalog.catWidgets);

        yapi.stats.start();

        yapi.executeFiles();
    };

    yapi.executeFiles = function () {

        // Add each set to this first pages, then containers, widgets, links
        var results = null, currentFileType = null;

        $.each(yapi.items, function (i, item) {
            if (this.length > 0) {
                results = item.slice();
                item.length = 0;
                currentFileType = i;
                logging.log('START ' + i);
                return false;
            }
        });

        if (results) {
            var queue = [];

            $.each(results, function (result) {
                queue.push(Q.fcall(yapi.checkItemWithGet, this, result, currentFileType));
            });

            return Q.all(queue)
                .fail(function () {
                    //console.log('Q errors, ', arguments);
                })
                .done(function (data) {
                    logging.log('completed array of: ' + currentFileType, {style: {'color': 'green'}});


                    /* Check if they items are left in arrays and execute */
                    var moreTodo = false;

                    $.each(yapi.items, function (i, item) {
                        if (yapi.items[i].length > 0) {
                            moreTodo = true;
                            return false;
                        }
                    });

                    if (moreTodo) {
                        logging.log('Done one array of items and trying another', {style: {'color': 'blue'}});
                        yapi.executeFiles();
                        yapi.stats.write();
                    } else {
                        /* When all the other task have been completed we will remove the randomly named MA's we don't use */
                        /* Make sure we are working with containers again*/

                        //TODO: merge with yapi for better handling of delete

                        $.when(todelete.map(function (page) {
                            return $.get(page).then(function (data) {
                                var pageName = $(data).find('> page > name').text();
                                currentFileType = 'containers';
                                return $.when($(data).find('> page > children container').map(function () {
                                    var deleteUrl = global.yapi.restUrls.getUrls(this, this.nodeName + 's').deleteUrl,
                                        itemName = $(this).find('> name').text(),
                                        parentItemName = $(this).find('> parentItemName').text();
                                    if (pageName === parentItemName && itemName.indexOf('container_') === 0) {
                                        return yapi.deleteRestItem(deleteUrl, currentFileType, true).then(function () {
                                            logging.log('Final clean up of auto generated item, deleting: ' + itemName,
                                                {
                                                    style: {'color': 'grey'}
                                                });
                                        });
                                    }
                                }));
                            });
                        })).then(function () {
                            logging.log('All items checked, yapi finished process', {
                                style: {
                                    'color': 'blue',
                                    'font-size': '1.2em'
                                }
                            });
                            global.yapi.stats.endTime = new Date().getTime();
                            logging.log('Duration (seconds): ', global.yapi.stats.getFinalDuration());
                            logging.log('Duration (minutes): ', global.yapi.stats.getFinalDuration() / 60);
                            yapi.stats.write();

                            //add last bit to storage
                            logging.end();
                        });
                    }
                });
        }
    };

    global.initYapi = function () {
        yapi.stats.init();
        //global.yapi.ui.init();
    };


})();
