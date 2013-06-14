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

    describe('with one match', function () {
      beforeEach(function () {
        url = '/users/foo';

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

    describe('with multiple matches', function () {
      var appResponder = { init: function () {} },
          userResponder = { edit: function () {}, show: function () {} },
          storesResponder = { index: function () {} };

      beforeEach(function () {
        url = '/users/foo/edit';

        navigator._routes = {
          responder: appResponder,
          '/*': 'init',
          '/users': {
            responder: usersResponder,
            '/': 'index',
            '/:uuid': {
              responder: userResponder,
              '/': 'show',
              '/edit': 'edit'
            }
          },
          '/stores': {
            responder: storesResponder,
            '/': 'index'
          }
        };

        subject = navigator.getRouteForURL(url);
      });

      it('returns the correct route properties', function () {
        expect( subject.matchedRoute ).toBe( '/users/:uuid/edit' )
        expect( subject.actions ).toEqual([
          { method: 'init', responder: appResponder },
          { method: 'edit', responder: userResponder }
        ]);
        expect( subject.options ).toEqual( {} );
      });

      describe('with options for the matched action', function () {
        beforeEach(function () {
          url = '/';

          navigator._routes['/*'] = {
            method: 'init',
            options: { showLayout: true }
          }

          subject = navigator.getRouteForURL(url);
        });

        it('includes those options in the routes object', function () {
          expect( subject.options ).toEqual({ showLayout: true });
        });

        describe('with multiple options at different levels', function () {
          beforeEach(function () {
            url = '/users/catdog/edit';

            navigator._routes['/users']['/:uuid']['/edit'] = {
              method: 'edit',
              options: { renderBunnies: true }
            };

            subject = navigator.getRouteForURL(url);
          });

          it('merges the options into one object', function () {
            expect( subject.options ).toEqual({
              showLayout: true,
              renderBunnies: true
            });
          });
        });

        describe('with colliding options at different levels', function () {
          beforeEach(function () {
            url = '/users/';

            navigator._routes['/users']['/'] = {
              method: 'index',
              options: { showLayout: false }
            };

            subject = navigator.getRouteForURL(url);
          });

          it('gives precedence to the deeper option', function () {
            expect( subject.options ).toEqual({ showLayout: false });
          });
        });

      });
    });

  });

});
