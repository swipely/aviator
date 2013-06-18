describe('Route', function () {

  var routes, uri, subject, usersResponder;

  beforeEach(function () {
    usersResponder = { index: function () {}, show: function () {} };
    navigator = Aviator._navigator;
    navigator._routes = {};
  });

  describe('given a uri that doesnt match any routes', function () {
    beforeEach(function () {
      uri = '/fartblaherty';
      subject = navigator.getRouteForURI(uri);
    });

    it('doesnt return anything', function () {
      expect( subject.matchedRoute ).toBe( '' );
    });
  });

  describe('given a matching uri', function () {

    describe('with one match', function () {
      beforeEach(function () {
        uri = '/users/foo';

        navigator._routes = {
          '/users': {
            responder: usersResponder,
            '/': 'index',
            '/:uuid': 'show'
          }
        };

        subject = navigator.getRouteForURI(uri);
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
        uri = '/users/foo/edit';

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

        subject = navigator.getRouteForURI(uri);
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
          uri = '/';

          navigator._routes['/*'] = {
            method: 'init',
            options: { showLayout: true }
          }

          subject = navigator.getRouteForURI(uri);
        });

        it('includes those options in the routes object', function () {
          expect( subject.options ).toEqual({ showLayout: true });
        });

        describe('with multiple options at different levels', function () {
          beforeEach(function () {
            uri = '/users/catdog/edit';

            navigator._routes['/users']['/:uuid']['/edit'] = {
              method: 'edit',
              options: { renderBunnies: true }
            };

            subject = navigator.getRouteForURI(uri);
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
            uri = '/users/';

            navigator._routes['/users']['/'] = {
              method: 'index',
              options: { showLayout: false }
            };

            subject = navigator.getRouteForURI(uri);
          });

          it('gives precedence to the deeper option', function () {
            expect( subject.options ).toEqual({ showLayout: false });
          });
        });

      });
    });

  });

});
