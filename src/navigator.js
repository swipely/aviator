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

    var request     = this.getCurrentRequest();
    var namedParams = options.namedParams;
    var queryParams = options.queryParams;

    if (!namedParams && request) {
      namedParams = request.namedParams;
    }

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
