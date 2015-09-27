"use strict";

const koa = require("koa");
const app = koa();
const stats = require("./lib");
const cash = require("koa-cash");

var cache = require('lru-cache')({
    maxAge: 30000 // global max age
});

app.use(require('koa-cash')({
    get: function* (key, maxAge) {
        return cache.get(key)
    },
    set: function* (key, value) {
        cache.set(key, value)
    }
}));

//error handler; see https://github.com/koajs/koa/wiki/Error-Handling
app.use(function *(next) {
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

app.use(function *(next) {

    if(this.query.user) {
        this.state.modules = yield stats.modulesByUser(this.query.user);
    }

    if(this.query.modules && !this.state.user) {
        this.state.modules = this.query.modules.split(",");

    }

    if(!this.state.modules) {
        throw new Error("You have to pass modules via query args");
    }

    yield next;
});

app.use(function *(next) {

    this.state.modules = yield stats.modules(this.state.modules);

    yield next;
});

app.use(function *stripFields(next) {

    if(this.query.fields) {
        this.state.fields = this.query.fields.split(",");
    }

    let fields = this.state.fields || ["name", "description", "downloads"];

    this.state.modules = this.state.modules.map(function(module) {

        let res = {};

        fields.forEach(function(field) {
            res[field] = module[field];
        });

        return res;

    });

    yield next;

});

app.use(function *() {
    this.body = this.state.modules;
});


app.listen(9000);