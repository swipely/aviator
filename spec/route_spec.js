describe('Route', function () {

  var routes, url, subject, usersResponder;

  beforeEach(function () {
    usersResponder = { index: function () {}, show: function () {} };
    navigator = Navigatorade._navigator;
    navigator._routes = {};
  });

  describe('given a url that doesnt match any routes', function () {
    beforeEach(function () {
      url = '/fartblaherty';
      subject = navigator.getRouteForURL(url);
    });

    it('doesnt return anything', function () {
      expect( subject.matchedRoute ).toBe( '' );
    });
  });

  describe('given a matching url', function () {

    beforeEach(function () {
      url = '/users/:uuid';
    });

    describe('and a single level of routes with a responder', function () {
      beforeEach(function () {
        navigator._routes = {
          '/users': {
            responder: usersResponder,
            '/': 'index',
            '/:uuid': 'show'
          }
        };

        subject = navigator.getRouteForURL(url);
      });

      it('returns the correct route properties', function () {
        expect( subject.matchedRoute ).toBe( '/users/:uuid' )
        expect( subject.actions ).toEqual(
          [{ method: 'show', responder: usersResponder }]
        );
        expect( subject.options ).toEqual( {} );
      });
    });

  });

});
