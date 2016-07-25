var fs = require('fs');

module.exports = {
    fileExists: function(file) {
        try {
            return fs.statSync(file).isFile();
        } catch (err) {
            return false;
        }
    },
    directoryExists: function(directory) {
        try {
            return fs.statSync(directory).isDirectory();
        } catch (err) {
            return false;
        }
    }
}
