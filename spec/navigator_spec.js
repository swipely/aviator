describe('Navigator', function () {

  var subject, itemsTarget, usersTarget, routes;

  beforeEach(function () {
    subject = Aviator._navigator;

    itemsTarget = {
      redirect: function (request) {
        if (request.queryParams.redirect) {
          subject.navigate(request.queryParams.redirect);
        }
      },
      list: function () {},
      notFound: function () {}
    };
    usersTarget = {
      index: function () {},
      show: function () {},
      exitIndex: function () {},
    };

    routes = {
      '/users': {
        target: usersTarget,
        '/': 'index',
      },
      '/items': {
        target: itemsTarget,
        '/*': 'redirect',
        '/list': 'list',
        notFound: 'notFound'
      }
    };
  });

  afterEach(function () {
    // reset the uri
    window.history.replaceState({}, '', '/_SpecRunner.html');
  });

  describe('#getQueryString', function () {
    describe('with push state disabled', function () {
      beforeEach(function () {
        subject.pushStateEnabled = false;
      });

      describe('and a query string in the current uri', function () {
        beforeEach(function () {
          spyOn( subject, 'getCurrentURI' ).andReturn( 'foo/bar?baz=123' );
        });

        it('gets the queryString from the hash url', function () {
          expect( subject.getQueryString() ).toBe( '?baz=123' );
        });
      });

      describe('and a no query string in the current uri', function () {
        beforeEach(function () {
          spyOn( subject, 'getCurrentURI' ).andReturn( 'foo/bar' );
        });

        it('gets the queryString from the hash url', function () {
          expect( subject.getQueryString() ).toBe( null );
        });
      });

      describe('and an empty query string in the current uri', function () {
        beforeEach(function () {
          spyOn( subject, 'getCurrentURI' ).andReturn( 'foo/bar?' );
        });

        it('gets the queryString from the hash url', function () {
          expect( subject.getQueryString() ).toBe( null );
        });
      });
    });
  });

  describe('#getCurrentPathname', function () {
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
          window.history.pushState({}, '', root + '/foo/bar?bar=123');
        });

        it('returns /foo/bar', function () {
          expect( subject.getCurrentPathname() ).toBe( '/foo/bar' );
        });
      });
    });

    describe('with push state disabled', function () {
      beforeEach(function () {
        subject.pushStateEnabled = false;
      });

      describe('and the uri is #/foo/bar', function () {
        beforeEach(function () {
          window.location.hash = '/foo/bar?bar=123';
        });

        it('returns /foo/bar', function () {
          expect( subject.getCurrentPathname() ).toBe( '/foo/bar' );
        });
      });
    });
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
          window.history.pushState({}, '', root + '/foo/bar?bar=123');
        });

        it('returns /foo/bar', function () {
          expect( subject.getCurrentURI() ).toBe( '/foo/bar?bar=123' );
        });
      });
    });

    describe('with push state disabled', function () {
      beforeEach(function () {
        subject.pushStateEnabled = false;
      });

      describe('and the uri is #/foo/bar', function () {
        beforeEach(function () {
          window.location.hash = '/foo/bar?bar=123';
        });

        it('returns /foo/bar', function () {
          expect( subject.getCurrentURI() ).toBe( '/foo/bar?bar=123' );
        });
      });
    });
  });

  describe('getCurrentRequest', function () {
    beforeEach(function () {
      spyOn( subject, 'createRouteForURI' ).andReturn({
        matchedRoute: '/users/:uuid',
        exits:    [],
        actions:  [ { method: 'show', target: usersTarget } ],
        options:  [ { leftNav: true }, { showLayout: false } ]
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
      });
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

  describe('#hrefFor', function () {
    var uri, options, expected;

    describe('when neither named nor query params are given', function () {
      beforeEach(function () {
        uri = '/some/uri/';
        options = {};
        options.queryParams = null;
        options.namedParams = null;
        expected = uri;
      });

      it('returns the original URI', function () {
        expect( subject.hrefFor(uri, options) ).toEqual( expected );
      });
    });

    describe('when named params are given', function () {
      beforeEach(function () {
        uri = '/users/:username/';
        options = {};
        options.queryParams = null;
        options.namedParams = { username: 'slimjim', age: 'timeless' };
        expected = '/users/slimjim/';
      });

      it('compiles them into the link', function () {
        expect( subject.hrefFor(uri, options) ).toEqual( expected );
      });
    });

    describe('when query params are given', function () {
      beforeEach(function () {
        uri = '/users/slimjim/';
        options = {};
        options.queryParams = { yolo: 'swag' };
        options.namedParams = null;
        expected = '/users/slimjim/?yolo=swag';
      });

      it('compiles them into the link', function () {
        expect( subject.hrefFor(uri, options) ).toEqual( expected );
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

      describe('removing the uri root', function () {
        var uri;

        describe('when the root is not present', function () {
          beforeEach(function () {
            subject.root = '/bonsai';

            uri = subject._removeURIRoot(
              '/foo/bar/kittens'
            );
          });

          it('it does not change the uri', function () {
            expect( uri ).toBe(
              '/foo/bar/kittens'
            );
          });
        });

        describe('when the root is present but not at the begining', function () {
          beforeEach(function () {
            subject.root = '/bar';

            uri = subject._removeURIRoot(
              '/foo/bar/kittens'
            );
          });

          it('it does not change the uri', function () {
            expect( uri ).toBe(
              '/foo/bar/kittens'
            );
          });
        });

        describe('when the root is present and is at the begining', function () {
          beforeEach(function () {
            subject.root = '/foo';

            uri = subject._removeURIRoot(
              '/foo/bar/kittens'
            );
          });

          it('it removes the root', function () {
            expect( uri ).toBe(
              '/bar/kittens'
            );
          });
        });
      });
    });

    describe('with push state disabled', function () {
      beforeEach(function () {
        subject.pushStateEnabled = false;
      });

      it('changes the hash to the href', function () {
        subject.navigate('/foo/bar');
        expect( window.location.hash ).toBe( '#/foo/bar' );
      });

      describe('and navigating with a queryString', function () {
        beforeEach(function () {
          subject.navigate('/foo/bar?baz=123');
        });

        it('changes the hash to the href with a queryString', function () {
          expect( window.location.hash ).toBe( '#/foo/bar?baz=123' );
        });
      });
    });

    describe('when no route can be found', function () {
      beforeEach(function () {
        spyOn( itemsTarget.notFound, 'call' );
        subject.pushStateEnabled = true;
        subject._routes = routes;
        subject._request = null;
      });

      describe('but there is a redirect in one of the /* matchers', function () {
        beforeEach(function () {
          spyOn( itemsTarget.list, 'call' );
        });

        it('redirects and does not call the notFound matcher', function () {
          subject.navigate('/items/404', {
            queryParams: { redirect: '/items/list' }
          });

          expect( itemsTarget.list.call ).toHaveBeenCalled();
          expect( itemsTarget.notFound.call ).not.toHaveBeenCalled();
        });
      });

      describe('and there is a notFound matcher', function () {
        it('calls the notFound matcher', function () {
          subject.navigate('/items/404');
          expect( itemsTarget.notFound.call ).toHaveBeenCalled();
        });
      });

      describe('and is no notFound matcher', function () {
        it('calls no notFound matcher', function () {
          subject.navigate('/users/404');
          expect( itemsTarget.notFound.call ).not.toHaveBeenCalled();
        });
      });
    });

    describe('when called with silent: true', function () {
      beforeEach(function () {
        spyOn( usersTarget, 'index' );

        subject.pushStateEnabled = true;
        subject._routes = routes;
        subject._request = null;
      });

      it('stores the request as if it was a regular one', function () {
        subject.navigate('/users', {
          silent: true,
          queryParams: { foo: 'bar' }
        });

        // TODO: better object comparision than JSON
        expect( JSON.stringify(subject.getCurrentRequest()) ).toEqual(JSON.stringify({
          namedParams: {},
          queryParams: { foo: 'bar' },
          params: { foo: 'bar' },
          uri: '/users',
          queryString: '?foo=bar',
          matchedRoute: '/users'
        }));
      });

      it('doesnt call the actions of the route target', function () {
        subject.navigate('/users', { silent: true });
        expect( usersTarget.index ).not.toHaveBeenCalled();
      });
    });

    describe('when called with namedParams and a route', function () {
      beforeEach(function () {
        spyOn( subject, 'onURIChange' );
      });

      it('navigates to a uri generate from the route and the namedParams', function () {
        var spy = spyOn( window.history, 'pushState' ).andCallFake(function (a, b, c) {
          expect( a ).toEqual( 'navigate' );
          expect( b ).toBe( '' );
          expect( c ).toBe( '/_SpecRunner.html/foo/bar/baz' );
        });
        subject.navigate('/foo/:named/baz', {
          namedParams: {
            named: 'bar'
          }
        });
      });
    });

    describe('when not called with namedParams', function () {
      beforeEach(function () {
        spyOn( subject, 'onURIChange' );
        spyOn( subject, 'getCurrentRequest' ).andReturn({ namedParams: { named: 'bar' } });
        spyOn( window.history, 'pushState' ).andCallFake(function (a, b, c) {
          expect( a ).toEqual( 'navigate' );
          expect( b ).toBe( '' );
          expect( c ).toBe( '/_SpecRunner.html/foo/bar/baz' );
        });
      });

      it('uses the namedParams of the currentRequest', function () {
        subject.navigate('/foo/:named/baz');
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
            exits:    [],
            actions:  [ { method: 'show', target: usersTarget } ],
            options:  [ { leftNav: true }, { showLayout: false } ]
          });

          window.history.replaceState({}, '', '/users');
          spyOn( usersTarget, 'show' );
          spyOn( usersTarget, 'exitIndex' );

          subject._exits = [
            { method: 'exitIndex', target: usersTarget }
          ];

          subject.dispatch();
        });

        it('calls the target method', function () {
          expect( usersTarget.show ).toHaveBeenCalled();
        });

        it('calls the previous target exit method', function () {
          expect( usersTarget.exitIndex ).toHaveBeenCalled();
        });
      });
    });

    describe('when _dispatchingStarted is false', function () {
      beforeEach(function () {
        spyOn( subject, 'createRouteForURI' ).andReturn({ matchedRoute: '', actions: [], exits: [], options: {}});
        subject._dispatchingStarted = false;
      });

      it('sets it to true', function () {
        subject.dispatch();
        expect( subject._dispatchingStarted ).toBe( true );
      });
    });
  });

  describe('#_invokeActions', function () {
    var target, request, options, actions;

    beforeEach(function () {
      target = {
        actionOne: jasmine.createSpy('action one'),
        actionTwo: jasmine.createSpy('action two'),
        actionThree: jasmine.createSpy('action three'),
        actionFour: jasmine.createSpy('action four')
      };

      request = {};
      options = {};

      subject._actions = [
        { target: target, method: 'actionOne' },
        { target: target, method: 'actionTwo' },
        { target: target, method: 'actionThree' },
        { target: target, method: 'actionFour' }
      ];
    });

    it('invokes all actions with the request and options', function () {
      subject._invokeActions(request, options);

      expect( target.actionOne ).toHaveBeenCalledWith(request, options);
      expect( target.actionTwo ).toHaveBeenCalledWith(request, options);
      expect( target.actionThree ).toHaveBeenCalledWith(request, options);
      expect( target.actionFour ).toHaveBeenCalledWith(request, options);
    });

    describe('when an action calls #navigate', function () {
      beforeEach(function () {
        spyOn( subject, 'onURIChange');

        target.actionTwo = function () {
          subject.navigate('/foo/bar');
        };
      });

      it('halts all other action invocations', function () {
        subject._invokeActions(request, options);

        expect( target.actionThree ).not.toHaveBeenCalled();
        expect( target.actionFour ).not.toHaveBeenCalled();
      });
    });
  });

  describe('onPopState', function () {
    beforeEach(function () {
      spyOn( subject, 'onURIChange' );
    });

    describe('when `_dispatchingStarted` is false', function () {
      beforeEach(function () {
        subject._dispatchingStarted = false;
      });

      it('does not calls onURIChange', function () {
        subject.onPopState();
        expect( subject.onURIChange ).not.toHaveBeenCalled();
      });
    });

    describe('when `_dispatchingStarted` is true', function () {
      beforeEach(function () {
        subject._dispatchingStarted = true;
      });

      it('calls onURIChange', function () {
        subject.onPopState();
        expect( subject.onURIChange ).toHaveBeenCalled();
      });
    });
  });

});
