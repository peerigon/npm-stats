"use strict";

var jsdom = require("jsdom");
var fetch = require("node-fetch");

function fetchDownloadStats(pkg, duration) {
    duration = duration || "week";

    return fetch(`https://api.npmjs.org/downloads/point/last-${duration}/${pkg}`)
        .then(function (response) {
            return response.json();
        });
}

function sumTotal(pkgs) {
    var total = 0;

    pkgs.forEach(function (pkg) {
        total += pkg.downloads;
    });

    return total;
}

function sortByDownloads(a, b) {
    if (a.downloads > b.downloads) {
        return -1;
    }
    if (a.downloads < b.downloads) {
        return 1;
    }

    return 0;
}

function fetchPackages(owner) {

    return new Promise(function (resolve, reject) {

        jsdom.env({
            url: `https://www.npmjs.com/~${owner}`,
            scripts: ["http://code.jquery.com/jquery.js"],
            done: function (err, window) {

                let pkgs = [];
                let $ = window.$;

                if (err) {
                    reject(err);
                    return;
                }

                $("div.container.content ul.bullet-free.collaborated-packages a").each(function () {
                    pkgs.push({
                        name: $(this).text()
                    });
                });

                resolve(pkgs);
            }
        });

    });

}


function npmStatsByOwner(owner, duration) {

    return fetchPackages(owner)
        .then(function (pkgs) {

            return Promise.all(pkgs.map(function (pkg) {
                return fetchDownloadStats(pkg.name, duration)
                    .then(function (downloads) {

                        pkg.downloads = downloads.downloads || 0;

                        return pkg;
                    });
            }));
        })
        .then(function (pkgs) {
            return {
                pkgs: pkgs.sort(sortByDownloads),
                total: sumTotal(pkgs)
            };
        });
}

module.exports = npmStatsByOwner;