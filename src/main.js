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
  }

};
