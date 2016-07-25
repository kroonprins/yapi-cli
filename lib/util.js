(function () {
    "use strict";

    var Q = require('q');
    var XMLSerializer = require('xmldom').XMLSerializer;

    global.yapi = global.yapi || {};

    global.yapi.util = global.yapi.util || {
        XMLtoString: function (elem) {
            var serialized;
            try {
                serialized = (new XMLSerializer()).serializeToString(elem);
            } catch (e) {
                // Internet Explorer has a different approach to serializing XML
                serialized = elem.xml;
            }

            return serialized;
        },
        XMLtoJSON: function (xml) {

            // Create the return object
            var obj = {};

            if (xml.nodeType == 1) { // element
                // do attributes
                if (xml.attributes.length > 0) {
                    obj['@attributes'] = {};
                    for (var j = 0; j < xml.attributes.length; j++) {
                        var attribute = xml.attributes.item(j);
                        obj['@attributes'][attribute.nodeName] = attribute.nodeValue;
                    }
                }
            } else if (xml.nodeType == 3) { // text
                obj = xml.nodeValue;
            }

            // do children
            if (xml.hasChildNodes()) {
                for (var i = 0; i < xml.childNodes.length; i++) {
                    var item = xml.childNodes.item(i);
                    var nodeName = item.nodeName;
                    if (typeof(obj[nodeName]) == 'undefined') {
                        obj[nodeName] = yapi.util.XMLtoJSON(item);
                    } else {
                        if (typeof(obj[nodeName].push) == 'undefined') {
                            var old = obj[nodeName];
                            obj[nodeName] = [];
                            obj[nodeName].push(old);
                        }
                        obj[nodeName].push(yapi.util.XMLtoJSON(item));
                    }
                }
            }
            return obj;
        },
        // retrieve the list of portals excluding the portalManager
        getPortalsList: function(){
          console.log('------------');
        },
        // chain a bunch of functions into a single serial promise
        chain: function (funcs) {
            return funcs.reduce(function (chain, func) {
                return chain.then(func);
            }, Q.fcall(function () {
            }));
        }
    };

})();
