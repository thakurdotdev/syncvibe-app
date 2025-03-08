"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _math = require("./math");
Object.keys(_math).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _math[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _math[key];
    }
  });
});
//# sourceMappingURL=index.js.map