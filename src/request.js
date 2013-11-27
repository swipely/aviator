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
