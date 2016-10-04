
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
  @param {string} Optional - port '8080'
  @return {String} uri '/partners/s/foo-bar?with=params'
  **/
  _stripDomain: function (href, hostname, port) {
    var hostname = hostname ? hostname : window.location.hostname,
        uriStartIndex = href.indexOf(hostname) + hostname.length;

    var port = port ? port : window.location.port;
    if (port) {
      var fullHost = hostname + ':' + port;
      uriStartIndex = href.indexOf(fullHost) + fullHost.length;
    }

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
