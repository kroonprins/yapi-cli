(function() {
    "use strict";

    var syncRequest = require('sync-request');

    global.yapi = global.yapi || {};
    var YAPI_VERSION="3.1";

    var get_xhr_headers = function() {
        var res = syncRequest('GET', global.portalRoot+'/static/mosaic-tools/yapi-'+YAPI_VERSION+'/index.html');
        if(res.statusCode != "200") {
          throw "It seems the portal is not reachable ("+global.portalRoot+")";
        }
        var xbbxsrf = res.headers['x-bbxsrf'];
        var cookie = parse_set_cookie_to_cookie(res.headers['set-cookie']);

        if (global.withPortalLogin) {
            res = syncRequest('GET', global.portalRoot+'/spring_security_login', {
                headers: {
                    'Cookie': cookie
                }
            });
            res = syncRequest('POST', global.portalRoot+'/j_spring_security_check', {
                body: "j_username="+global.portalUser+"&j_password="+global.portalPassword+"&submit=Login&BBXSRF=" + xbbxsrf,
                headers: {
                    'Content-Type': "application/x-www-form-urlencoded",
                    'Accept': "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    'Cookie': cookie
                },
                followRedirects: false
            });
            // Haven't figured out a way to check if the login succeeded :'(
            cookie = parse_set_cookie_to_cookie(res.headers['set-cookie']);
        }

        return {
            'xbbxsrf': xbbxsrf,
            'cookie': cookie
        }
    }

    var parse_set_cookie_to_cookie = function(cookie_container) {
        if (!cookie_container) {
            return "";
        }
        var res = [];
        for (var cookie in cookie_container) {
            var i = cookie_container[cookie].indexOf(";");
            if (i > 0) {
                res.push(cookie_container[cookie].substr(0, i));
            } else {
                res.push(cookie_container[cookie]);
            }
        }
        return res.join("; ");
    }


    var config = global.yapi.config = global.yapi.config || {
        portalServer: 'portalserver',
        contextRoot: global.portalRoot,
        xhrequest: {
            headers: get_xhr_headers()
        },
        items: {
            templates: [],
            portals: [],
            catalog: [],
            pages: [],
            containers: [],
            widgets: [],
            links: [],
            groups: [],
            users: [],
            rightsList: [],
            advancedrights: []
        },
        selectors: {
            itemGroups: function() {
                return 'templates, ' +
                    'portals, ' +
                    'catalog, ' +
                    'pages, ' +
                    'containers, ' +
                    'widgets, ' +
                    'links, ' +
                    'groups, ' +
                    'users,  ' +
                    'rightsList, ' +
                    'advancedrights';
            },
            itemTypes: 'template, portal, page, container, widget, link, group, user, rights'
        },
        deletingActivated: false,
        logging: global.yapi.logging
    };


})();
