describe('Navigator', function () {

  var subject, usersTarget, routes;

  beforeEach(function () {
    subject = Aviator._navigator;
    usersTarget = { index: function () {}, show: function () {} };

    routes = {
      '/users': {
        target: usersTarget,
        '/': 'index'
      }
    };
  });

  afterEach(function () {
    // reset the uri
    window.history.replaceState({}, '', '/_SpecRunner.html');
  });

  describe('#getCurrentURI', function () {
    var root;

    beforeEach(function () {
      root = '/_SpecRunner.html';

      subject.root = root;
    });

    describe('with push state enabled', function () {
      beforeEach(function () {
        subject.pushStateEnabled = true;
      });

      describe('and the uri is /foo/bar', function () {
        beforeEach(function () {
          window.history.pushState({}, '', root + '/foo/bar');
        });

        it('returns /foo/bar', function () {
          expect( subject.getCurrentURI() ).toBe( '/foo/bar' );
        });
      });
    });

    describe('with push state disabled', function () {
      beforeEach(function () {
        subject.pushStateEnabled = false;
      });

      describe('and the uri is #/foo/bar', function () {
        beforeEach(function () {
          window.location.hash = '/foo/bar';
        });

        it('returns /foo/bar', function () {
          expect( subject.getCurrentURI() ).toBe( '/foo/bar' );
        });
      });
    });
  });

  describe('getCurrentRequest', function () {
    beforeEach(function () {
      spyOn( subject, 'createRouteForURI' ).andReturn({
        matchedRoute: '/users/:uuid',
        actions: [ { method: 'show', target: usersTarget } ],
        options: [ { leftNav: true }, { showLayout: false } ]
      });
      subject.dispatch();
    });

    it('returns the current request', function () {
      expect( subject.getCurrentRequest() ).not.toBe( undefined );
    });
  });

  describe('#setup', function () {
    beforeEach(function () {
      spyOn( window, 'addEventListener' );
      spyOn( document, 'addEventListener' );
    });

    describe('with options', function () {
      beforeEach(function () {
        subject.setup({
          pushStateEnabled: false,
          linkSelector: 'a.no-thanks',
          root: '/slash/badass'
        });
      });

      it('saves pushStateEnabled', function () {
        expect( subject.pushStateEnabled ).toBe( false );
      });

      it('saves linkSelector', function () {
        expect( subject.linkSelector ).toBe( 'a.no-thanks' );
      });

      it('saves root', function () {
        expect( subject.root ).toBe( '/slash/badass' );
      })
    });

    it('sets up listeners for all clicks', function () {
      subject.setup();

      expect( document.addEventListener ).toHaveBeenCalled();
    });

    describe('with push state enabled', function () {
      beforeEach(function () {
        subject.setup({ pushStateEnabled: true });
      });

      it('listens for onpopstate', function () {
        expect( window.addEventListener ).toHaveBeenCalled();
      });
    });

    describe('with push state disabled', function () {
      beforeEach(function () {
        subject.setup({ pushStateEnabled: false });
      });

      it('listens for onhashchange', function () {
        expect( window.addEventListener ).toHaveBeenCalled();
      });
    });
  });

  describe('#onClick', function () {
    var linkSelector = 'a.navigate',
        event, href;

    beforeEach(function () {
      href = 'abc/foo/bar';
      subject.root = '/abc';

      event = {
        target: { pathname: href },
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

      it('strips the root and calls #navigate with the href', function () {
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
        spyOn( subject, 'onURIChange');
      });

      it('pushes the href to history with the root', function () {
        var spy = spyOn( window.history, 'pushState' ).andCallFake(function (a, b, c) {
          expect( a ).toEqual( 'navigate' );
          expect( b ).toBe( '' );
          expect( c ).toBe( '/_SpecRunner.html/foo/bar' );
        });
        subject.navigate('/foo/bar');
      });

      it('calls onURIChange', function () {
        subject.navigate('/foo/bar');
        expect( subject.onURIChange ).toHaveBeenCalled();
      });

      describe('and called with replace: true', function () {
        it('replaces the href to history with the root', function () {
          spyOn( window.history, 'replaceState' ).andCallThrough();

          subject.navigate('/foo/bar', { replace: true });
          expect(window.history.replaceState).toHaveBeenCalled();
        });
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

    describe('when called with silent: true', function () {
      beforeEach(function () {
        subject.pushStateEnabled = true;
        spyOn( subject, 'dispatch' );
      });

      it('never calls dispatch', function () {
        subject.navigate('/foo/bar', { silent: true });
        expect( subject.dispatch ).not.toHaveBeenCalled();
      });
    });

    describe('when called with queryParams', function () {
      beforeEach(function () {
        spyOn( subject, 'onURIChange' );
      });

      it('serializes the query params into the url', function () {
        var spy = spyOn( window.history, 'pushState' ).andCallFake(function (a, b, c) {
          expect( a ).toEqual( 'navigate' );
          expect( b ).toBe( '' );
          expect( c ).toBe( '/_SpecRunner.html/foo/bar?baz=boo&userIds[]=2&userIds[]=3' );
        });
        subject.navigate('/foo/bar', {
          queryParams: {
            baz: 'boo',
            userIds: [2,3]
          }
        });
      });
    });
  });

  describe('#refresh', function () {
    it('calls navigate with the current uri', function () {
      spyOn( subject, 'dispatch' );
      subject.refresh();
      expect( subject.dispatch ).toHaveBeenCalled();
    });
  });

  describe('#onURIChange', function () {
    beforeEach(function () {
      spyOn( subject, 'dispatch' );
      subject.onURIChange();
    });

    it('calls #dispatch', function () {
      expect( subject.dispatch ).toHaveBeenCalled();
    });
  });

  describe('#dispatch', function () {
    describe('with pushStateEnabled', function () {
      beforeEach(function () {
        Aviator.pushStateEnabled = true;
      });

      describe('when the uri matches a route', function () {
        beforeEach(function () {
          spyOn( subject, 'createRouteForURI' ).andReturn({
            matchedRoute: '/users/:uuid',
            actions: [ { method: 'show', target: usersTarget } ],
            options: [ { leftNav: true }, { showLayout: false } ]
          });

          window.history.replaceState({}, '', '/users');
          spyOn( usersTarget, 'show' );

          subject.dispatch();
        });

        it('calls the target method', function () {
          expect( usersTarget.show ).toHaveBeenCalled();
        });
      });
    });
  });

});
