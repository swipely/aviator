describe('Navigatorade', function () {

  var subject, _navigator, usersResponder, routes;

  beforeEach(function () {
    subject = Navigatorade;
    _navigator = subject._navigator;
    usersResponder = { index: function () {}, show: function () {} };

    routes = {
      '/users': {
        responder: usersResponder,
        '/': 'index'
      }
    };
  });

  afterEach(function () {
    // reset the url
    window.history.replaceState({}, '', '/_SpecRunner.html');
  });

  describe('.setRoutes', function () {
    it('sets the routes on the _navigator', function () {
      subject.setRoutes(routes);
      expect( _navigator._routes ).toEqual( routes );
    });
  });

  describe('.dispatch', function () {
    describe('with pushStateEnabled', function () {
      beforeEach(function () {
        subject.pushStateEnabled = true;
      });

      describe('when the url matches a route', function () {
        beforeEach(function () {
          window.history.replaceState({}, '', '/users');
          spyOn( usersResponder, 'index' );

          subject.setRoutes(routes);
          subject.dispatch();
        });

        it('calls the responder method', function () {
          expect( usersResponder.index ).toHaveBeenCalled();
        });
      });
    });
  });

  describe('.navigate', function () {
    it('changes the url', function () { });
  });

});
