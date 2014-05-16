;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
  merge: merge,
  addEvent: addEvent,
  isArray: isArray,
  isPlainObject: isPlainObject,
  isString: isString
};

},{}],2:[function(require,module,exports){
// Modules
var Navigator = require('./navigator');


/**
Only expose a tiny API to keep internal routing safe

@singleton Aviator
**/
window.Aviator = {

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

},{"./navigator":3}],3:[function(require,module,exports){
var helpers = require('./helpers'),
    Request = require('./request'),
    Route   = require('./route');

// helpers
var each      = helpers.each,
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

    this._invokeExits(request);

    // temporary action array that can be halted
    this._actions = route.actions;
    this._invokeActions(request, route.options);

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
    if (!this._silent) {
      this.dispatch();
    }

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
        pathname,
        uri;

    if (ev.metaKey || ev.ctrlKey) return;

    // Sub optimal. It itererates through all ancestors on every single click :/
    while (target) {
      if (this._matchesSelector(target)) {
        break;
      }

      target = target.parentNode;
    }

    if (!target) return;

    ev.preventDefault();

    pathname = target.pathname;

    // Some browsers drop the leading slash
    // from an `a` tag's href location.
    if ( pathname.charAt(0) !== '/' ) pathname = '/' + pathname;

    uri = pathname.replace(this.root, '');

    this.navigate(uri);
  },

  /**
  @method navigate
  @param {String} uri
  @param {Object} [options]
  **/
  navigate: function (uri, options) {
    options = options || {};

    var namedParams = options.namedParams,
        queryParams = options.queryParams;

    // halt any previous action invocations
    this._actions = [];

    if (queryParams) {
      uri += this.serializeQueryParams(queryParams);
    }

    if (namedParams) {
      for (var p in namedParams) {
        if (namedParams.hasOwnProperty(p)) {
          uri = uri.replace(':' + p, encodeURIComponent(namedParams[p]));
        }
      }
    }

    if (options.silent) {
      this._silent = true;
    }

    if (this.pushStateEnabled) {
      uri = this._removeURIRoot(uri);

      uri = this.root + uri;

      if (options.replace) {
        history.replaceState('navigate', '', uri);
      }
      else {
        history.pushState('navigate', '', uri);
      }

      this.onURIChange();
    }
    else {
      if (options.replace) location.replace('#' + uri);
      else location.hash = uri;
    }
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
      addEvent(window, 'popstate', this.onPopState, this);
    }
    else {
      addEvent(window, 'hashchange', this.onURIChange, this);
    }

    addEvent(document, 'click', this.onClick, this);
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
  @param {Request} request
  @protected
  **/
  _invokeExits: function (request) {
    var exit, target, method;

    while(this._exits.length) {
      exit = this._exits.pop();
      target = exit.target;
      method = exit.method;

      if (!(method in target)) {
        throw new Error("Can't call exit " + method + ' on target for uri ' + request.uri);
      }

      target[method].call(target);
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
    var action, target, method;

    while (this._actions.length) {
      action = this._actions.shift();
      target = action.target;
      method = action.method;

     if (!(method in target)) {
        throw new Error("Can't call action " + method + ' on target for uri ' + request.uri);
      }

      target[method].call(target, request, options);
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

},{"./helpers":1,"./request":4,"./route":5}],4:[function(require,module,exports){
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

},{"./helpers":1}],5:[function(require,module,exports){
var helpers = require('./helpers'),
    merge = helpers.merge,
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

  this.match(routes);

  this.uri = uri;
};

Route.prototype = {

  /**
  Matches the uri from the routes map.

  @method match
  @param {String} routeLevel
  @return {Object}
  **/
  match: function (routeLevel) {
    var value, action, target;

    if (routeLevel.target) {
      this.targets.push(routeLevel.target);
    }

    if (this.targets.length) {
      target = this.targets[this.targets.length - 1];
    }

    action = {
      target: target,
      method: null
    };

    for (var key in routeLevel) {
      if (routeLevel.hasOwnProperty(key)) {
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
    return isString(val) || isPlainObject(val) && val.method;
  },

  /**
  @method isNamedParam
  @param {String} fragment
  @return {Boolean}
  **/
  isNamedParam: function (fragment) {
    return fragment.indexOf('/:') === 0;
  }
};

module.exports = Route;

},{"./helpers":1}]},{},[2])
;