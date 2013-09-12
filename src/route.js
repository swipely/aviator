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
  this.actions      = [];
  this.exits        = [];
  this.options      = {};

  this.match(routes);

  this.exits = this.exits.reverse();

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
    var value,
        action = {
          target: routeLevel.target,
          method: null
        };

    for (var key in routeLevel) {
      if (routeLevel.hasOwnProperty(key)) {
        value = routeLevel[key];

        if (this.isFragment(key) && this.isFragmentInURI(key)) {
          this.updateMatchedRoute(key);
          this.updateURI(key);

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
                  this.exits.push({
                    method: value.exit,
                    target: routeLevel.target
                  });
                }

                if (value.options) {
                  this.mergeOptions(value.options);
                }
              }

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

  @method updateURI
  @param {String} fragment
  **/
  updateURI: function (fragment) {
    var uri = this.uri,
        split,
        match;

    if (fragment !== '/' && fragment !== '/*') {
      split = uri.split('/');
      match = split[1];

      if (match) {
        this.uri = uri.replace(match[1], '');
        this.uri = uri.replace('/' + match, '');
      }
    }
  },

  /**
  @method isFragmentInURI
  @param {Any} fragment
  @return {Boolean}
  **/
  isFragmentInURI: function (fragment) {
    var uri    = this.uri,
        match;

    if ( fragment === '/' ) {
      return (uri === '/' || uri === '');
    }
    else if ( fragment === '/*' ) {
      return true;
    }
    else if ( this.isNamedParam(fragment) ) {
      return (uri !== '/' && uri !== '');
    }
    else {
      match = uri.match(/(\/\w+)\/?/);
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
