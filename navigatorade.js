(function () {

  // Convienience aliases
  var location  = window.location,
      history   = window.history;

  // -- Utility ---------------------------------------------------------------

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
  @param {Array[Object]}
  @return {Object}
  **/
  var merge = function (arr) {
    var result = {};

    each(arr, function (obj) {
      for (var key in obj) {
        result[key] = obj[key];
      }
    });

    return result;
  };

  /**
  @method isPlainObject
  @param {any} val
  @return {Boolean}
  **/
  var isPlainObject = function (val) {
    return (!!val) && (val.constructor === Object);
  };

  /**
  @method isString
  @param {Any} val
  @return {Boolean}
  **/
  var isString = function (val) {
    return typeof val === 'string';
  };

  // -- Internal API ----------------------------------------------------------

  /**
  @class Request
  @constructor
  **/
  var Request = function (options) {};
  Request.prototype = {
    extractParamsFromUrl: function () { },
    extractParamsFromQueryString: function () { }
  };

  /**
  Contains the properties for a route
  After attempting to match a url to the Routes map

  @class Route
  @constructor
  @private
  **/
  var Route = function (routes, url) {
    this.url          = url;
    this.matchedRoute = '';
    this.actions      = [];
    this.options      = [];

    this.match(routes);

    this.url = url;
  };

  Route.prototype = {

    /**
    Matches the url from the routes map.

    @method match
    @param {String} routeLevel
    @return {Object}
    **/
    match: function (routeLevel) {
      var value,
          action = {
            responder: routeLevel.responder,
            method:    null
          };

      for (var key in routeLevel) {
        value = routeLevel[key];

        if (this.isFragment(key) && this.isFragmentInURL(key)) {
          this.updateMatchedRoute(key);
          this.updateURL(key);

          if (this.isActionDescriptor(value)) {
            if (isString(value)) {
              action.method = value;
            }
            else {
              action.method = value.method;
              this.options.push(value.options);
            }

            this.actions.push(action);
          }

          if (this.url.length > 0 && isPlainObject(value)) {
            // recurse
            this.match(value);
          }
        }
      }
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
    removes matched fragments from the beginning of the url

    @method updateURL
    @param {String} fragment
    **/
    updateURL: function (fragment) {
      var url = this.url,
          match;

      if (fragment !== '/' && fragment !== '/*') {
        match = url.match(/(\/\w+)\/?/);
        if (match) {
          this.url = url.replace(match[1], '');
        }
      }
    },

    /**
    @method isFragmentInURL
    @param {Any} fragment
    @return {Boolean}
    **/
    isFragmentInURL: function (fragment) {
      var url    = this.url,
          prefix = fragment.substr(0,2),
          match;

      if ( fragment === '/' ) {
        return (url === '/' || url === '');
      }
      else if ( fragment === '/*' || prefix === '/:') {
        return true;
      }
      else {
        match = url.match(/(\/\w+)\/?/);
        return match && fragment === match[1];
      }
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
      return isString(val) || isPlainObject(val) && val.method && val.options;
    }
  };

  /**
  @class Navigator
  @constructor
  @private
  **/
  var Navigator = function () {
    this._routes = null;
  };

  Navigator.prototype = {

    setup: function () {},

    /**
    @method setRoutes
    @param {Object} routes a configuration of routes and responders
    **/
    setRoutes: function (routes) {
      this._routes = routes;
    },

    /**
    @method getRouteForURL
    @param {String} url
    @return {Request}
    **/
    getRouteForURL: function (url) {
      return new Route(this._routes, url);
    },

    /**
    @method getRequest
    @param {String} matchedRoute
    @return {Request}
    **/
    getRequest: function (matchedRoute) {
      return new Request({ matchedRoute: matchedRoute });
    },

    /**
    @method dispatch
    **/
    dispatch: function () {
      var url = window.location.href,
          route = this.getRouteForURL(url),
          request = this.getRequest(route.matchedRoute),
          options = merge(route.options);

      each(route.actions, function (action) {
        var responder = action.responder,
            method    = action.method;

        responder[method].call(
          responder,
          request,
          options
        );
      });
    },

    /**
    @method onURLChange
    **/
    onURLChange: function () {
      this.dispatch();
    },

    navigate: function (url, options) {}
  };

  // -- Public API ------------------------------------------------------------
  // Only expose a tiny API to keep internal routing safe

  /**
  @singleton Navigatorade
  **/
  window.Navigatorade = {

    /**
    @property pushStateEnabled
    @type {Boolean}
    @default true if the browser supports pushState
    **/
    pushStateEnabled: ('pushState' in history),

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
    dispatches routes to responders and sets up event handlers

    @method dispatch
    **/
    dispatch: function () {
      this._navigator.setup();
      this._navigator.dispatch();
    },

    /**
    @method navigate
    @param {String} url to navigate to
    @param {Object} [options]
    **/
    navigate: function (url, options) {
      this._navigator.navigate(url, options);
    }

  };

}());
