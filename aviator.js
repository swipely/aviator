(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],3:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],4:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],5:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require("JkpR2F"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":4,"JkpR2F":3,"inherits":2}],6:[function(require,module,exports){
var util = require('util');
var helpers = require('./helpers');
var compact = helpers.compact;
var map = helpers.map;

var EventEmitter = require('events').EventEmitter;
var ActionEmitter = function () {
	this.getExitMessage = function (){
		return compact(map(this.listeners('exit'), function (listener) {
			return listener()
		})).join(', ') || undefined;
	}
	return this;
};

util.inherits(ActionEmitter, EventEmitter);

module.exports = ActionEmitter;

},{"./helpers":7,"events":1,"util":5}],7:[function(require,module,exports){
/**
binds a function to a context

@method bind
@param {Function} func
@param {Object} context
@return {Function}
@private
**/
var bind = function (func, context) {
  return function () {
    func.apply(context, Array.prototype.slice.call(arguments));
  };
};

/**
@method each
@param {Array} arr
@param {Function} iterator
@private
**/
var each = function (arr, iterator, context) {
  context = context || this;

  for (var i = 0, len = arr.length; i < len; i++) {
    iterator.call(context, arr[i], i);
  }
};

/**
@method compact
@param {Array} arr
@private
**/
var compact = function (arr) {
  return arr.filter(function (x) {
    return !!x;
  });
};

/**
@method map
@param {Array} arr
@param {Function} iterator
@private
**/

var map = function (arr, iterator) {
  return arr.map(iterator);
};

/**
@method merge
@return {Object}
@private
**/
var merge = function () {
  var result = {},
      arr = Array.prototype.slice.call(arguments, 0);

  each(arr, function (obj) {
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = obj[key];
      }
    }
  });

  return result;
};

/**
@method addEvent
@param {Any} host
@param {String} eventName
@param {Function} handler
@param {Any} [context]
@private
**/
var addEvent = function (host, eventName, handler, context) {
  host.addEventListener(eventName, bind(handler, context), false);
};

/**
@method isArray
@param {Object} o
@return {Boolean}
@private
**/
var isArray = function (o) {
  return Array.isArray(o);
};

/**
@method isFunc
@param {any} val
@return {Boolean}
@private
**/
var isFunc = function (val) {
  return typeof val === 'function';
};

/**
@method isPlainObject
@param {any} val
@return {Boolean}
@private
**/
var isPlainObject = function (val) {
  return (!!val) && (val.constructor === Object);
};

/**
@method isString
@param {Any} val
@return {Boolean}
@private
**/
var isString = function (val) {
  return typeof val === 'string';
};

module.exports = {
  bind: bind,
  each: each,
  compact: compact,
  map: map,
  merge: merge,
  addEvent: addEvent,
  isArray: isArray,
  isFunc: isFunc,
  isPlainObject: isPlainObject,
  isString: isString
};

},{}],8:[function(require,module,exports){
// Modules
var Navigator = require('./navigator');
var ActionEmitter = require('./action_emitter');


/**
Only expose a tiny API to keep internal routing safe

@singleton Aviator
**/
var Aviator = {

  /**
  @property pushStateEnabled
  @type {Boolean}
  @default true if the browser supports pushState
  **/
  pushStateEnabled: ('pushState' in window.history),

  /**
  @property linkSelector
  @type {String}
  @default 'a.navigate'
  **/
  linkSelector: 'a.navigate',

  /**
  the root of the uri from which routing will append to

  @property root
  @type {String}
  @default ''
  **/
  root: '',

  /**
  @property _navigator
  @type {Navigator}

  @private
  **/
  _navigator: new Navigator(),
  _ActionEmitter: ActionEmitter,

  /**
  @method setRoutes
  @param {Object} routes
  **/
  setRoutes: function (routes) {
    this._navigator.setRoutes(routes);
  },

  /**
  dispatches routes to targets and sets up event handlers

  @method dispatch
  **/
  dispatch: function () {
    var navigator = this._navigator;

    navigator.setup({
      pushStateEnabled: this.pushStateEnabled,
      linkSelector:     this.linkSelector,
      root:             this.root
    });

    navigator.dispatch();
  },

  /**
  @method navigate
  @param {String} uri to navigate to
  @param {Object} [options]
  **/
  navigate: function (uri, options) {
    this._navigator.navigate(uri, options);
  },

  /**
   @method hrefFor
   @param {String} uri to navigate to
   @param {Object} [options]
   **/
  hrefFor: function (uri, options) {
    return this._navigator.hrefFor(uri, options);
  },


  /**
  @method serializeQueryParams
  @param {Object} queryParams
  @return {String} queryString "?foo=bar&baz[]=boo&baz=[]oob"
  **/
  serializeQueryParams: function (queryParams) {
    return this._navigator.serializeQueryParams(queryParams);
  },

  /**
  @method getCurrentRequest
  @return {String}
  **/
  getCurrentRequest: function () {
    return this._navigator.getCurrentRequest();
  },

  /**
  @method getCurrentURI
  @return {String}
  **/
  getCurrentURI: function () {
    return this._navigator.getCurrentURI();
  },

  /**
  @method refresh
  **/
  refresh: function () {
    this._navigator.refresh();
  },

  /**
  @method rewriteRouteTo
  @param {String} newRoute
  @return {Object}
  **/
  rewriteRouteTo: function (newRoute) {
    var target = {
      rewrite: function (request) {
        Aviator.navigate(newRoute, {
          namedParams: request.namedParams,
          replace: true
        });
      }
    };

    return {
      target: target,
      '/': 'rewrite'
    };
  }

};

if (window) {
  window.Aviator = Aviator;
}

module.exports = Aviator;

},{"./action_emitter":6,"./navigator":9}],9:[function(require,module,exports){

var ActionEmitter = require('./action_emitter');

var helpers = require('./helpers'),
    Request = require('./request'),
    Route   = require('./route');

// helpers
var each      = helpers.each,
    map       = helpers.map,
    compact   = helpers.compact,
    addEvent  = helpers.addEvent,
    isArray   = helpers.isArray;


/**
@class Navigator
@constructor
@private
**/
var Navigator = function () {
  this._routes  = null;
  this._exits   = [];
  this._silent  = false;
  this._dispatchingStarted = false;
  this._emitters = [];
};

Navigator.prototype = {

  /**
  @method setup
  @param {Object} options
  **/
  setup: function (options) {
    options = options || {};

    for (var k in options) {
      if (options.hasOwnProperty(k)) {
        this[k] = options[k];
      }
    }

    this._attachEvents();
  },

  /**
  @method setRoutes
  @param {Object} routes a configuration of routes and targets
  **/
  setRoutes: function (routes) {
    this._routes = routes;
  },

  /**
  @method createRouteForURI
  @param {String} uri
  @return {Request}
  **/
  createRouteForURI: function (uri) {
    return new Route(this._routes, uri);
  },

  /**
  @method createRequest
  @param {String} uri
  @param {String|Null} queryString
  @param {String} matchedRoute
  @return {Request}
  **/
  createRequest: function (uri, queryString, matchedRoute) {
    this._request = new Request({
      uri: uri,
      queryString: queryString,
      matchedRoute: matchedRoute
    });

    return this._request;
  },

  /**
  @method getCurrentRequest
  @return {Request}
  **/
  getCurrentRequest: function () {
    return this._request;
  },

  /**
  @method getCurrentPathname
  @return {String}
  **/
  getCurrentPathname: function () {
    if (this.pushStateEnabled) {
      return this._removeURIRoot(location.pathname);
    }
    else {
      return location.hash.replace('#', '').split('?')[0];
    }
  },

  /**
  @method getCurrentURI
  @return {String}
  **/
  getCurrentURI: function () {
    if (this.pushStateEnabled) {
      return this._removeURIRoot(location.pathname) + location.search;
    }
    else {
      return location.hash.replace('#', '');
    }
  },

  /**
  @method getQueryString
  @return {String|Null}
  **/
  getQueryString: function () {
    var uri, queryString;

    if (this.pushStateEnabled) {
      return location.search || null;
    }
    else {
      queryString = this.getCurrentURI().split('?')[1];

      if (queryString) {
        return '?' + queryString;
      }
      else {
        return null;
      }
    }
  },

  /**
  @method dispatch
  **/
  dispatch: function () {
    var uri         = this.getCurrentPathname(),
        route       = this.createRouteForURI(uri),
        queryString = this.getQueryString(),
        request     = this.createRequest(uri, queryString, route.matchedRoute);

    this._emitters = [];
    this._invokeExits(request);

    // temporary action array that can be halted
    this._actions = route.actions;

    if (!this._silent) {
      this._invokeActions(request, route.options);
    }

    // collect exits of the current matching route
    this._exits = route.exits;

    if (!this._dispatchingStarted) {
      this._dispatchingStarted = true;
    }
  },

  /**
  @method onURIChange
  **/
  onURIChange: function () {
    this.dispatch();
    this._silent = false;
  },

  /**
  @method onPopState
  @param {Event}
  **/
  onPopState: function (ev) {
    // Some browsers fire 'popstate' on the initial page load with a null state
    // object. We always want manual control over the initial page dispatch, so
    // prevent any popStates from changing the url until we have started
    // dispatching.
    if (this._dispatchingStarted) {
      this.onURIChange();
    }
  },

  /**
  @method onClick
  @param {Event} ev
  **/
  onClick: function (ev) {
    var target = ev.target,
        matchesSelector = this._matchesSelector(target),
        uriWithoutRoot,
        uri;

    if (ev.button === 1 || ev.metaKey || ev.ctrlKey) return;

    // Feels sub-optimal, itererates through all ancestors on every click :/
    // jquery selector handlers do essentially the same thing though!
    while (target) {
      if (this._matchesSelector(target)) {
        break;
      }

      target = target.parentNode;
    }

    if (!target) return;

    ev.preventDefault();

    uri = this._stripDomain(target.href, window.location.hostname);
    uriWithoutRoot = this._removeURIRoot(uri);

    this.navigate(uriWithoutRoot);
  },

  getExitMessage: function () {
    return compact(map(this._emitters, function (emitter) {
      return emitter.getExitMessage();
    })).join(', ') || undefined;
  },

  onBeforeUnload: function (ev) {
    var exitMessage = this.getExitMessage();

    if (exitMessage) {
      ev.returnValue = exitMessage;
      return exitMessage;
    }
  },

  /**
  @method navigate
  @param {String} uri
  @param {Object} [options]
  **/
  navigate: function (uri, options) {
    var link;

    var exitMessage = this.getExitMessage();
    if (exitMessage && !window.confirm(exitMessage)) {
      return
    }

    options = options || {};
    // halt any previous action invocations
    this._actions = [];

    link = this.hrefFor(uri, options);

    if (options.silent) {
      this._silent = true;
    }

    if (this.pushStateEnabled) {
      link = this._removeURIRoot(link);

      link = this.root + link;

      if (options.replace) {
        history.replaceState('navigate', '', link);
      }
      else {
        history.pushState('navigate', '', link);
      }

      this.onURIChange();
    }
    else {
      if (options.replace) location.replace('#' + link);
      else location.hash = link;
    }
  },

  /**
  @method hrefFor
  @param {String} uri
  @param {Object} [options]
   **/
  hrefFor: function (uri, options) {
    options = options || {};

    var link        = uri + '';
    var request     = this.getCurrentRequest();
    var namedParams = options.namedParams;
    var queryParams = options.queryParams;

    if (!namedParams && request) {
      namedParams = request.namedParams;
    }

    if (queryParams) {
      link += this.serializeQueryParams(queryParams);
    }

    if (namedParams) {
      for (var p in namedParams) {
        if (namedParams.hasOwnProperty(p)) {
          link = link.replace(':' + p, encodeURIComponent(namedParams[p]));
        }
      }
    }

    return link;
  },

  /**
  @method refresh
  **/
  refresh: function () {
    this.dispatch();
  },

  /**
  @method _attachEvents
  @protected
  **/
  _attachEvents: function () {
    var pushStateEnabled = this.pushStateEnabled;

    if (pushStateEnabled) {
      // Popstate fired on initial page load causes double trigger
      // Hack to prevent popState firing two times in Safari (workaround found here: https://github.com/visionmedia/page.js/commit/6e6af2f6c0d7638e06a5ea3de0ff808237bdf2ef)
      var self = this;
      setTimeout(function() {
        addEvent(window, 'popstate', self.onPopState, self);
      }, 0);
    }
    else {
      addEvent(window, 'hashchange', this.onURIChange, this);
    }

    addEvent(document, 'click', this.onClick, this);
    addEvent(window, 'beforeunload', this.onBeforeUnload, this);
  },

  /**
  @method _matchesSelector
  @param {DOMNode} node
  @protected
  **/
  _matchesSelector: function (node) {
    var nodeList = document.querySelectorAll(this.linkSelector),
        contains = false,
        i;

    for ( i = 0; i < nodeList.length; i++ ) {
      if (!contains) contains = ( node === nodeList[i] );
      else break;
    }

    return contains;
  },

  /**
  pop of any exits function and invoke them

  @method _invokeExits
  @param {Request} nextRequest
  @protected
  **/
  _invokeExits: function (nextRequest) {
    var exit, target, method;

    while(this._exits.length) {
      exit = this._exits.pop();
      target = exit.target;
      method = exit.method;

      if (!(method in target)) {
        throw new Error("Can't call exit " + method + ' on target when changing uri to ' + request.uri);
      }

      target[method].call(target, nextRequest);
    }
  },

  /**
  invoke all actions with request and options

  @method _invokeActions
  @param {Request} request
  @param {Object} options
  @protected
  **/
  _invokeActions: function (request, options) {
    var action, target, method, emitter;

    while (this._actions.length) {
      action = this._actions.shift();
      target = action.target;
      method = action.method;
      emitter = new ActionEmitter;

      if (!(method in target)) {
        throw new Error("Can't call action " + method + ' on target for uri ' + request.uri);
      }

      this._emitters.push(emitter);

      target[method].call(target, request, options, emitter);
    }
  },

  /**
  @method _removeURIRoot
  @param {String} uri '/partners/s/foo-bar'
  @return {String} uri '/s/foo-bar'
  **/
  _removeURIRoot: function (uri) {
    var rootRegex = new RegExp('^' + this.root);

    return uri.replace(rootRegex, '');
  },

  /**
  @method _stripDomain
  @param {String} href 'http://domain.com/partners/s/foo-bar?with=params#andahash'
  @param {String} Optional - hostname 'domain.com'
  @return {String} uri '/partners/s/foo-bar?with=params'
  **/
  _stripDomain: function (href, hostname) {
    var hostname = hostname ? hostname : window.location.hostname,
        uriStartIndex = href.indexOf(hostname) + hostname.length;

    return href.substr(uriStartIndex);
  },

  /**
  @method serializeQueryParams
  @param {Object} queryParams
  @return {String} queryString "?foo=bar&baz[]=boo&baz=[]oob"
  **/
  serializeQueryParams: function (queryParams) {
    var queryString = [],
        val;

    for (var key in queryParams) {
      if (queryParams.hasOwnProperty(key)) {
        val = queryParams[key];

        if (isArray(val)) {
          each(val, function (item) {
            queryString.push(encodeURIComponent(key) + '[]=' + encodeURIComponent(item));
          });
        }
        else {
          queryString.push(encodeURIComponent(key) + '=' + encodeURIComponent(val));
        }
      }
    }

    queryString = '?' + queryString.join('&');

    return queryString;
  }

};

module.exports = Navigator;

},{"./action_emitter":6,"./helpers":7,"./request":10,"./route":11}],10:[function(require,module,exports){
var helpers = require('./helpers'),
    each = helpers.each,
    merge = helpers.merge,
    isArray = helpers.isArray;

/**
@class Request
@constructor
**/
var Request = function (options) {
  this.namedParams  = {};
  this.queryParams  = {};
  this.params       = {};

  this.uri          = options.uri;
  this.queryString  = options.queryString;
  this.matchedRoute = options.matchedRoute;

  this._extractNamedParamsFromURI();
  this._extractQueryParamsFromQueryString();
  this._mergeParams();
};

Request.prototype = {
  /**
  @method _extractNamedParamsFromURI
  @private
  **/
  _extractNamedParamsFromURI: function () {
    var uriParts = this.uri.split('/'),
        routeParts = this.matchedRoute.split('/'),
        params = {};

    each(routeParts, function (part, i) {
      var key;

      if (part.indexOf(':') === 0) {
        key = part.replace(':', '');

        params[key] = decodeURIComponent( uriParts[i] );
      }
    });

    this.namedParams = params;
  },

  /**
  Splits the query string by '&'. Splits each part by '='.
  Passes the key and value for each part to _applyQueryParam

  @method _extractQueryParamsFromQueryString
  @private
  **/
  _extractQueryParamsFromQueryString: function () {
    var parts;

    if (!this.queryString) return;

    parts = this.queryString.replace('?','').split('&');

    each(parts, function (part) {
      var key = decodeURIComponent( part.split('=')[0] ),
          val = decodeURIComponent( part.split('=')[1] );

      if ( part.indexOf( '=' ) === -1 ) return;
      this._applyQueryParam( key, val );

    }, this);

  },

  /**
  Update the queryParams property with a new key and value.
  Values for keys with the [] notation are put into arrays
  or pushed into an existing array for that key.

  @method _applyQueryParam
  @param {String} key
  @param {String} val
  **/
  _applyQueryParam: function (key, val) {
    if ( key.indexOf( '[]' ) !== -1 ) {
      key = key.replace( '[]', '' );

      if (isArray(this.queryParams[key])) {
        this.queryParams[key].push(val);
      }
      else {
        this.queryParams[key] = [val];
      }
    }
    else {
      this.queryParams[key] = val;
    }
  },

  /**
  @method _mergeParams
  @private
  **/
  _mergeParams: function () {
    this.params = merge(this.namedParams, this.queryParams);
  }
};

module.exports = Request;

},{"./helpers":7}],11:[function(require,module,exports){
var helpers = require('./helpers'),
    merge = helpers.merge,
    isFunc = helpers.isFunc,
    isString = helpers.isString,
    isPlainObject = helpers.isPlainObject;

/**
Contains the properties for a route
After attempting to match a uri to the Routes map

@class Route
@constructor
@private
**/
var Route = function (routes, uri) {
  this.uri          = uri;
  this.matchedRoute = '';
  this.targets      = [];
  this.actions      = [];
  this.exits        = [];
  this.options      = {};
  this.notFound     = null;
  this.fullMatch    = false;

  this.matchOrNotFound(routes);

  this.uri = uri;
};

Route.prototype = {

  /**
  Attempt to match the uri, or call a notFound handler if nothing matches.

  @method matchOrNotFound
  @param {Object} routeLevel
  **/
  matchOrNotFound: function (routeLevel) {
    this.match(routeLevel);

    if (!this.fullMatch && this.notFound) {
      this.actions.push(this.notFound);
    }
  },

  /**
  Matches the uri from the routes map.

  @method match
  @param {Object} routeLevel
  **/
  match: function (routeLevel) {
    var value, action, target;

    if (routeLevel.target) {
      this.targets.push(routeLevel.target);
    }

    if (this.targets.length) {
      target = this.targets[this.targets.length - 1];
    }

    if (routeLevel.notFound && target[routeLevel.notFound]) {
      this.notFound = {
        target: target,
        method: routeLevel.notFound
      };
    }
    else if (isFunc(routeLevel.notFound)) {
      this.notFound = this.anonymousAction(routeLevel.notFound);
    }

    for (var key in routeLevel) {
      if (routeLevel.hasOwnProperty(key)) {
        action = {
          target: target,
          method: null
        };
        value = routeLevel[key];

        if (this.isFragment(key) && this.isFragmentInURI(key)) {
          this.updateMatchedRoute(key);
          this.removeFragmentFromURI(key);

          if (this.isActionDescriptor(value)) {

            // Check that if this fragment is a namedParam,
            // we never override a regular fragment.
            if (!this.isNamedParam(key) || !action.method) {
              if (isString(value)) {
                action.method = value;
              }
              else if (isFunc(value)) {
                action = this.anonymousAction(value);
              }
              else {
                action.method = value.method;

                if (value.exit) {
                  this.exits.unshift({
                    method: value.exit,
                    target: routeLevel.target
                  });
                }

                if (value.options) {
                  this.mergeOptions(value.options);
                }
              }

              // Adding the action
              this.actions.push(action);

              if (key !== '/*') {
                this.fullMatch = true;
              }
            }
          }
          else if (value.hasOwnProperty('options')) {
            this.mergeOptions(value.options);
          }

          if (isPlainObject(value)) {
            // recurse
            this.match(value);
          }
        }
      }
    }
  },

  /**
  @method mergeOptions
  @param {Object} options
  **/
  mergeOptions: function (options) {
    this.options = merge(this.options, options);
  },

  /**
  appends the matched fragment to the matched route

  @method updateMatchedRoute
  @param {String} fragment
  **/
  updateMatchedRoute: function (fragment) {
    if (fragment !== '/' && fragment !== '/*') {
      this.matchedRoute += fragment;
    }
  },

  /**
  removes matched fragments from the beginning of the uri

  @method removeFragmentFromURI
  @param {String} fragment
  **/
  removeFragmentFromURI: function (fragment) {
    var uri = this.uri,
        uriParts, subFrags;

    if (fragment !== '/' && fragment !== '/*') {
      if (this.includesNamedParam(fragment)) {
        uriParts = uri.split('/'),
        subFrags = fragment.split('/');

        subFrags.forEach(function (f, i) {
          if (f.indexOf(':') === 0) {
            uri = uri.replace('/' + uriParts[i], '');
          }
          else if (f) {
            uri = uri.replace('/' + f, '');
          }
        });
      }
      else {
        uri = uri.replace(fragment, '');
      }
    }

    this.uri = uri;
  },

  /**
  @method isFragmentInURI
  @param {Any} fragment
  @return {Boolean}
  **/
  isFragmentInURI: function (fragment) {
    var uri = this.uri,
        uriParts, subFrags;

    if (uri === '/' || uri === '') {
      return fragment === '/' || fragment === '/*';
    }

    if ( fragment === '/' ) {
      return false;
    }
    else if ( fragment === '/*' ) {
      return true;
    }
    // includes vs is named param
    else if (this.includesNamedParam(fragment)) {
      uriParts = uri.split('/'),
      subFrags = fragment.split('/');

      if (subFrags.length === 2) {
        return true;
      }

      return subFrags.map(function (f, i) {
        if (f.indexOf(':') === 0) {
          return true;
        }
        else {
          return uriParts[i].indexOf(f) !== -1;
        }
      }).reduce(function (a, b) { return a && b; });
    }
    else {
      return uri.indexOf(fragment) === 0;
    }
  },

  /**
  @method includesNamedParam
  @param {String} fragment
  @return {Boolean}
  **/
  includesNamedParam: function (fragment) {
    return fragment.indexOf('/:') !== -1;
  },

  /**
  @method isFragment
  @param {Any} key
  @return {Boolean}
  **/
  isFragment: function (key) {
    return key.indexOf('/') === 0;
  },

  /**
  @method isActionDescriptor
  @param {Any} val
  @return {Boolean}
  **/
  isActionDescriptor: function (val) {
    return isString(val) || isFunc(val) || isPlainObject(val) && val.method;
  },

  /**
  @method isNamedParam
  @param {String} fragment
  @return {Boolean}
  **/
  isNamedParam: function (fragment) {
    return fragment.indexOf('/:') === 0;
  },

  /**
  Create an action Object from the given function.

  @method anonymousAction
  @param {Function} func the anonymous function to transform into an action.
  @return {Object} With a method key that maps to a generated String, and
  **/
  anonymousAction: function (func) {
    return {
      target: { lambda: func },
      method: 'lambda'
    };
  }
};

module.exports = Route;

},{"./helpers":7}]},{},[8])