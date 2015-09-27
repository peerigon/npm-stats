"use strict";

let stats = require("../lib/");

stats.modulesByUser("peerigon")
    .then(function (modules) {
        return stats.modules(modules);
    })
    .then(function(res) {
        console.log(res);
    })
    .catch(function (err) {
        console.error("ERR", err);
    });
