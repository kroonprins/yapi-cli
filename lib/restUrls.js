(function () {
    "use strict";

    global.yapi = global.yapi || {};
    global.yapi.restUrls =  {
        getUrls : function (XMLItem, itemWrapperName, processChildren) {
            var restItem = XMLItem.nodeName.toLowerCase(),
                itemName = $(XMLItem).find('> name').text(),
                childFilter = processChildren ? '?pc=' + processChildren : '?pc=false',
                destinationPortal = $(XMLItem).find('> contextItemName').text() === '[BBHOST]' ? 'server' : $(XMLItem).find('> contextItemName').text(),
                contextRoot = global.yapi.config.contextRoot;

            var getUrl = contextRoot + '/portals/' + destinationPortal + '/' + itemWrapperName + '/' + itemName + '.xml',
                putUrl = contextRoot + '/portals/' + destinationPortal + '/' + itemWrapperName,
                postUrl = contextRoot + '/portals/' + destinationPortal + '/' + itemWrapperName + '.xml',
                deleteUrl = contextRoot + '/portals/' + destinationPortal + '/' + itemWrapperName + '/' + itemName + '.xml';
            //if its a catalog them add .xml to the put url
            if (itemWrapperName === 'catalog' && destinationPortal !== "server") {
                putUrl = contextRoot + '/portals/' + destinationPortal + '/' + itemWrapperName + '/' + itemName + '.xml';
                getUrl = contextRoot + '/portals/' + destinationPortal + '/' + itemWrapperName + '/' + itemName + '.xml';
                postUrl = contextRoot + '/portals/' + destinationPortal + '/' + itemWrapperName;
                deleteUrl = contextRoot + '/portals/' + destinationPortal + '/' + itemWrapperName + '/' + itemName + '.xml';
            } else if (itemWrapperName === 'catalog' && destinationPortal === "server") {
                putUrl = contextRoot + '/' + itemWrapperName;
                getUrl = contextRoot + '/' + itemWrapperName + '/' + itemName + '.xml';
                postUrl = contextRoot + '/' + itemWrapperName;
                deleteUrl = contextRoot + '/' + itemWrapperName + '/' + itemName;
            }
            //if its a template don't refer to portal
            if (itemWrapperName === 'templates' ||
                itemWrapperName === 'portals' ||
                itemWrapperName === 'groups') {
                getUrl = contextRoot + '/' + itemWrapperName + '/' + itemName + '.xml';
                putUrl = contextRoot + '/' + itemWrapperName + '/' + itemName;
                postUrl = contextRoot + '/' + itemWrapperName + '.xml';
                if (itemWrapperName === 'portals') {
                    deleteUrl = contextRoot + '/portals/' + itemName;
                }
            }


            if (itemWrapperName === 'users') {
                itemName = $(XMLItem).find('> username').text();

                getUrl = contextRoot + '/' + itemWrapperName + '/' + itemName + '.xml';
                putUrl = contextRoot + '/' + itemWrapperName + '/' + itemName;
                postUrl = contextRoot + '/' + itemWrapperName + '.xml';
            }

            if (itemWrapperName === 'rightsList' || itemWrapperName === 'advancedrights') {

                $(XMLItem).unwrap();

                var type = $(XMLItem).find('type').text(),
                    name = $(XMLItem).find('name').text(),
                    portal = $(XMLItem).find('contextItemName').text(),
                    rightsUrlFinalString = itemWrapperName === 'rightsList' ? 'rights.xml' : 'advancedrights.xml';

                if (type === 'portal') {
                    putUrl = contextRoot + '/portals/' + name + '/' + rightsUrlFinalString;
                    getUrl = contextRoot + '/portals/' + name + '/' + rightsUrlFinalString;
                } else {
                    putUrl = contextRoot + '/portals/' + portal + '/' + type + '/' + name + '/' + rightsUrlFinalString;
                    getUrl = contextRoot + '/portals/' + portal + '/' + type + '/' + name + '/' + rightsUrlFinalString;
                }

                //Post and delete are not exposed to right in the REST
                postUrl = '';
                deleteUrl = '';
            }

            // don't get children when doing a get for all item except links, links do not have this function
            if (restItem !== 'link') {
                getUrl += childFilter;
            } else {
                getUrl += '?depth=1';
            }
            return {getUrl: getUrl, putUrl: putUrl, postUrl: postUrl, deleteUrl: deleteUrl};
        }
    };
})();
