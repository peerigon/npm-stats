"use strict";

let registry = require("npm-stats")();
let fetch = require("node-fetch");
const validDurations = ["day", "week", "month"];
const validatePgkName = require("validate-npm-package-name");

function downloadStats(pkg, duration) {
    duration = duration || "month";

    if (validDurations.indexOf(duration) === -1) {
        throw new Error(`Invalid duration. Valid are ${validDurations.join(",")}`);
    }

    const isValidPkgName = validatePgkName(pkg);

    if (!isValidPkgName.validForNewPackages || !isValidPkgName.validForOldPackages) {
        throw new Error(`Invalid module name ${pkg}`);
    }

    return fetch(`https://api.npmjs.org/downloads/point/last-${duration}/${pkg}`)
        .then((response) => response.json());
}

function moduleInfo(name) {
    return new Promise((resolve, reject) => {
        registry.module(name).info(function (err, res) {
            if (err) {
                return reject(err);
            }

            resolve(res);
        });
    });
}

function moduleStats(module, duration) {
    return Promise.all([moduleInfo(module), downloadStats(module, duration)])
        .then((res) => {
            res[0].downloads = res[1];
            return res[0];
        });
}

function getStatsForModules(modules, duration) {
    return Promise.all(
        modules.map((module) => moduleStats(module, duration))
    );
}

function findModulesByUser(user) {
    return new Promise((resolve, reject) => {
        registry.user(user).list((err, modules) => {
            if (err) {
                return reject(err);
            }

            resolve(modules);
        });
    });
}

exports.findModulesByUser = findModulesByUser;
exports.getStatsForModules = getStatsForModules;