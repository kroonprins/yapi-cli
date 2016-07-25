#!/usr/bin/env node
 // note: global scope is used in the below so that the YAPI js doesn't have to change too much

var program = require('commander');
var colors = require('colors');
var fsUtil = require('./lib/fs-util');

// Process input arguments
program
    .version('0.0.1')
    .description('Import YAPI files via command line tool.')
    .option('-P, --portal <url>', 'The root url for the portal server. E.g. http://localhost:7777/portalserver.')
    .option('-u, --user <portal user>', 'Portal user.')
    .option('-p, --password <portal user password>', 'Password of the portal user.')
    .option('-d, --directory <directory with YAPI files>', 'Directory containing one or more YAPI xml files. The directory will be searched recursively.')
    .option('-f, --file <YAPI file>', 'Path to a specific YAPI file.')
    .option('-D, --delete', 'Delete all items and its children in the YAPI files.')
    .option('-i, --importbb', 'Import the backbase standard portal before doing the YAPI import.')
    .action(function(file) {
        console.log('user: %s pass: %s file: %s',
            program.username, program.password, file);
    })
    .parse(process.argv);

// Check input arguments and asssign
if (!program.portal) {
    console.log(colors.red("\n  Please specify the portal url with the -P or --portal option."));
    program.outputHelp();
    process.exit(1);
}
global.portalRoot = program.portal;

if (!(program.directory || program.file) ||
    (program.directory && program.file)) {
    console.log(colors.red("\n  Please specify either a directory or a file."));
    program.outputHelp();
    process.exit(1);
}
var isDirectory = false;
if (program.directory) {
    if (!fsUtil.directoryExists(program.directory)) {
        console.log(colors.red("\n  It seems the given directory does not exist."));
        program.outputHelp();
        process.exit(1);
    }
    isDirectory = true;
    var yapiDirectory = program.directory;
}

var isFile = false;
if (program.file) {
    if (!fsUtil.fileExists(program.file)) {
        console.log(colors.red("\n  It seems the given file does not exist."));
        program.outputHelp();
        process.exit(1);
    }
    isFile = true;
    var yapiFile = program.file;
}

if ((program.user && !program.password) ||
    (!program.user && program.password)) {
    console.log(colors.red("\n  Please specify both username and password."));
    program.outputHelp();
    process.exit(1);
}
if (program.user) {
    global.withPortalLogin = true;
    global.portalUser = program.user;
    global.portalPassword = program.password;
} else {
    if (program.importbb) {
        console.log(colors.red("\n  Please specify both username and password if you want to import the backbase default portal."));
        program.outputHelp();
        process.exit(1);
    }
}

var doImportBbPortal = program.importbb;
var isDeletingActivated = program.delete;

// __MAIN__
require("jsdom").env("", function(err, window) {

    // Some setup needed so that we can use jquery without a browser
    var $ = require("jquery")(window);
    var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
    $.support.cors = true;
    $.ajaxSettings.xhr = function() {
        var xmlHttpRequest = new XMLHttpRequest();
        xmlHttpRequest.setDisableHeaderCheck(true);
        return xmlHttpRequest;
    };
    // Make jquery globally available so that we don't have to do the setup above in each module
    global.$ = $;

    var FileAPI = require('file-api'),
        File = FileAPI.File,
        FileReader = FileAPI.FileReader;
    var DOMParser = require('xmldom').DOMParser;

    // Initialize the yapi sources
    global.yapi = {};
    try {
        require('./lib/config.js');
    } catch (err) {
        console.log(colors.red("ERROR: " + err));
        process.exit(1);
    }
    require('./lib/logging.js');
    require('./lib/restUrls.js');
    require('./lib/stats.js');
    require('./lib/util.js');
    require('./lib/yapi.js');
    global.initYapi();

    if (doImportBbPortal) {
        console.log("The backbase default portal will be imported first.");
        var bbImport = require('./lib/bb-import.js');
        try {
            bbImport.import(global.yapi);
        } catch (err) {
            console.log(colors.red(err));
            process.exit(1);
        }
    }
    if (isDeletingActivated) {
        console.log("Items and its children in the files will be deleted.");
    }
    global.yapi.config.deletingActivated = isDeletingActivated;

    // Gather the files to process
    var files = [];
    if (isDirectory) {
        var glob = require("glob");
        files = glob.sync(yapiDirectory + "/**/*.xml");
    } else if (isFile) {
        files.push(yapiFile);
    }
    var noOfFiles = files.length;
    if (noOfFiles < 1) {
        console.log(colors.red("No files to process found"));
        process.exit(1);
    }
    console.log("Starting processing of following files: " + files);
    var fileResults = [];

    $.each(files, function(i, file) {
        var reader = new FileReader();
        reader.readAsText(new File(file));

        reader.on('load', function(e) {
            var parser = new DOMParser();
            var xmlResults = parser.parseFromString(e.target.result, 'text/xml');
            fileResults.push(xmlResults);
            if (fileResults.length === noOfFiles) {
                global.yapi.orderFilesAndExecute(fileResults);
            }
        });
    });

});
