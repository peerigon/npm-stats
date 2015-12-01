"use strict";

const koa = require("koa");
const cash = require("koa-cash");
const stats = require("./lib");

let cache = require("lru-cache")({
    maxAge: 30000 // global max age
});

let port = process.env.PORT || 9090;

const app = koa();

app.use(require("koa-cash")({
    get: function* (key, maxAge) {
        return cache.get(key)
    },
    set: function* (key, value) {
        cache.set(key, value)
    }
}));

//error handler; see https://github.com/koajs/koa/wiki/Error-Handling
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
    // this response is already cashed if `true` is returned,
    // so this middleware will automatically serve this response from cache
    if (yield* this.cashed()) return;

    yield next;
});

app.use(function* (next) {

    let modules;

    if (this.query.user) {
        this.state.modules = yield stats.modulesByUser(this.query.user);
    }

    if (this.query.modules) {
        this.state.modules = this.state.modules || [];

        modules = this.query.modules.split(",");

        if (!Array.isArray(modules)) {
            modules = [modules];
        }

        this.state.modules = this.state.modules.concat(modules);
    }

    if (!this.state.modules) {
        throw new Error("You have to pass modules via query args: ?user=peerigon&modules=less-loader");
    }

    yield next;
});

app.use(function* fetchModules(next) {

    this.state.modules = yield stats.modules(this.state.modules);

    yield next;
});

app.use(function* stripFields(next) {

    if (this.query.fields) {
        this.state.fields = this.query.fields.split(",");
    }

    let fields = this.state.fields || ["name", "description", "downloads"];
    this.state.downloads = 0;

    this.state.modules = this.state.modules.map((module) => {

        let res = {};

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
    this.body = {
        downloads: this.state.downloads,
        modules: this.state.modules
    };
});


app.listen(port, function() {
    console.log(`npm stats listening on port ${port}`);
});