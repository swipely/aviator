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
