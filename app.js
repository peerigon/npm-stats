"use strict";

const koa = require("koa");
const cash = require("koa-cash");
const stats = require("./lib");
const favicon = require("koa-favicon");

const cache = require("lru-cache")({
    maxAge: 1000 * 60 * 60 * 24 // global max age = 1 Day
});

const port = process.env.PORT || 9090;

const app = koa();

app.use(favicon());

app.use(require("koa-cash")({
    get: function* (key) {
        return cache.get(key)
    },
    set: function* (key, value) {
        cache.set(key, value)
    }
}));

app.use(function* (next) {
    try {
        yield next;
    } catch (err) {
        this.status = err.status || 500;
        this.body = err.message;
        this.app.emit("error", err, this);
    }
});

app.use(function* (next) {
    if (yield* this.cashed()) {
        this.set("Access-Control-Allow-Origin", "*");
        return;
    }
    yield next;
});

app.use(function* (next) {
    let modules;

    if (this.query.user) {
        this.state.modules = yield stats.findModulesByUser(this.query.user);
    }

    if (this.query.modules) {
        this.state.modules = this.state.modules || [];

        modules = this.query.modules.split(",");

        if (!Array.isArray(modules)) {
            modules = [modules];
        }

        this.state.modules = this.state.modules.concat(modules);
    }

    this.state.duration = this.query.duration || "month";

    if (!this.state.modules) {
        throw new Error("You have to pass modules via query args: ?user=peerigon&modules=less-loader");
    }

    yield next;
});

app.use(function* fetchModules(next) {
    this.state.modules = yield stats.getStatsForModules(this.state.modules, this.state.duration);

    yield next;
});

app.use(function* stripFields(next) {
    if (this.query.fields) {
        this.state.fields = this.query.fields.split(",");
    }

    const fields = this.state.fields || ["name", "description", "downloads"];
    this.state.downloads = 0;

    this.state.modules = this.state.modules.map((module) => {
        const res = {};

        fields.forEach(function (field) {
            res[field] = module[field];
        });

        if (module.downloads && module.downloads.downloads) {
            this.state.downloads += module.downloads.downloads;
        }

        return res;
    });

    yield next;
});


app.use(function* respond() {
    this.set("Access-Control-Allow-Origin", "*");
    this.body = {
        downloads: this.state.downloads,
        modules: this.state.modules
    };
});

app.listen(port, function() {
    console.log(`npm stats listening on port ${port}`);
});
