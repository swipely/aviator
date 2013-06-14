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

  describe('#onClick', function () {
    var linkSelector = 'a.navigate',
        event, href;

    beforeEach(function () {
      href = '/foo/bar';

      event = {
        target: { href: href },
        preventDefault: function () {}
      };

      subject.linkSelector = linkSelector;
    });

    describe('when the target matches the linkSelector', function () {
      beforeEach(function () {
        spyOn( subject, '_matchesSelector' ).andReturn(true);
        spyOn( event, 'preventDefault' );
        spyOn( subject, 'navigate' );

        subject.onClick(event);
      });

      it('calls preventDefault', function () {
        expect( event.preventDefault ).toHaveBeenCalled();
      });

      it('calls #navigate with the href', function () {
        expect( subject.navigate ).toHaveBeenCalledWith('/foo/bar');
      });
    });

    describe('when the target doesnt match linkSelector', function () {
      beforeEach(function () {
        spyOn( subject, '_matchesSelector' ).andReturn(false);
        spyOn( event, 'preventDefault' );
      });

      it('doesnt call preventDefault', function () {
        subject.onClick(event);
        expect( event.preventDefault ).not.toHaveBeenCalled();
      });
    });
  });

  describe('#navigate', function () {
    beforeEach(function () {
      subject.root = '/_SpecRunner.html';
    });

    describe('with push state enabled', function () {
      beforeEach(function () {
        subject.pushStateEnabled = true;
      });

      it('adds the href to history with the root', function () {
        var spy = spyOn( window.history, 'pushState' ).andCallFake(function (a, b, c) {
          expect( a ).toEqual({});
          expect( b ).toBe( '' );
          expect( c ).toBe( '/_SpecRunner.html/foo/bar' );
        });
        subject.navigate('/foo/bar');
      });
    });

    describe('with push state disabled', function () {
      beforeEach(function () {
        subject.pushStateEnabled = false;
        subject.navigate('/foo/bar');
      });

      it('changes the hash to the href', function () {
        expect( window.location.hash ).toBe( '#/foo/bar' );
      });
    });
  });

  describe('#onURLChange', function () {
    beforeEach(function () {
      spyOn( subject, 'dispatch' );
      subject.onURLChange();
    });

    it('calls #dispatch', function () {
      expect( subject.dispatch ).toHaveBeenCalled();
    });
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
