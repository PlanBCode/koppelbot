const fs = require('fs');


function write(filePath, content) {

}

function File(filePath) {
    //TODO
    this.shouldExist = ()=>{};
    this.shouldNotExist = ()=>{};
    this.shouldMatch = ()=>{};
}

function read(filePath) {
    return new File(filePath);
}

exports.read = read;
exports.write = write;
