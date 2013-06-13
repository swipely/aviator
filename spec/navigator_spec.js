describe('Navigator', function () {

  var subject, usersResponder, routes;

  beforeEach(function () {
    subject = Navigatorade._navigator;
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

  describe('#dispatch', function () {
    describe('with pushStateEnabled', function () {
      beforeEach(function () {
        Navigatorade.pushStateEnabled = true;
      });

      describe('when the url matches a route', function () {
        beforeEach(function () {
          spyOn( subject, 'getRouteForURL' ).andReturn({
            matchedRoute: '/users/:uuid',
            actions: [ { method: 'show', responder: usersResponder } ],
            options: [ { leftNav: true }, { showLayout: false } ]
          });

          window.history.replaceState({}, '', '/users');
          spyOn( usersResponder, 'show' );

          subject.dispatch();
        });

        it('calls the responder method', function () {
          expect( usersResponder.show ).toHaveBeenCalled();
        });
      });
    });
  });


});