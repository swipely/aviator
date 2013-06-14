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

  describe('#setup', function () {
    beforeEach(function () {
      spyOn( window, 'addEventListener' );
      spyOn( document, 'addEventListener' );
    });

    it('sets up listeners for all clicks', function () {
      subject.setup();

      expect( document.addEventListener ).toHaveBeenCalledWith(
        'click',
        subject.onClick,
        false
      );
    });

    describe('with push state enabled', function () {
      beforeEach(function () {
        subject.setup({ pushStateEnabled: true });
      });

      it('listens for onpopstate', function () {
        expect( window.addEventListener ).toHaveBeenCalledWith(
          'popstate',
          subject.onURLChange,
          false
        );
      });
    });

    describe('with push state disabled', function () {
      beforeEach(function () {
        subject.setup({ pushStateEnabled: false });
      });

      it('listens for onhashchange', function () {
        expect( window.addEventListener ).toHaveBeenCalledWith(
          'hashchange',
          subject.onURLChange,
          false
        );
      });
    });
  });

  describe('#onClick', function () {});

  describe('#onURLChange', function () {});

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
