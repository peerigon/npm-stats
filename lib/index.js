"use strict";

let registry = require("npm-stats")();
let fetch = require("node-fetch");

function fetchDownloadStats(pkg, duration) {
    duration = duration || "week";

    return fetch(`https://api.npmjs.org/downloads/point/last-${duration}/${pkg}`)
        .then(function (response) {
            return response.json();
        });
}

function moduleInfo(name) {
    return new Promise(function (resolve, reject) {

        registry.module(name).info(function (err, res) {

            if (err) {
                return reject(err);
            }

            resolve(res);
        });
    });
}

function moduleStats(module) {

    return Promise.all([moduleInfo(module), fetchDownloadStats(module)])
        .then(function(res) {
            res[0].downloads = res[1];
            return res[0];
        });
}


function modulesStats(modules) {

    return Promise.all(
        modules.map(moduleStats)
    );
}

function modulesByUser(user) {
    return new Promise(function (resolve, reject) {

        registry.user(user).list(function (err, res) {

            if (err) {
                return reject(err);
            }

            resolve(res);
        });
    });
}

exports.modulesByUser = modulesByUser;
exports.module = moduleStats;
exports.modules = modulesStats;