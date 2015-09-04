"use strict";

let npmStats = require("../lib");

npmStats("peerigon", "month")
    .then(function (res) {

        console.log("total: " + res.total);

        res.pkgs.forEach(function (pkg) {
            console.log("- " + pkg.name + ": " + pkg.downloads);
        });
    });