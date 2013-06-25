describe('Route', function () {

  var routes, uri, subject, usersTarget;

  beforeEach(function () {
    usersTarget = {
      index: function () {},
      show: function () {},
      best: function () {}
    };
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
            target: usersTarget,
            '/': 'index',
            '/:uuid': 'show'
          }
        };

        subject = navigator.getRouteForURI(uri);
      });

      it('returns the correct route properties', function () {
        expect( subject.matchedRoute ).toBe( '/users/:uuid' )
        expect( subject.actions ).toEqual(
          [{ method: 'show', target: usersTarget }]
        );
        expect( subject.options ).toEqual( {} );
      });
    });

    describe('matching a route with a /: on the same route level', function () {
      beforeEach(function () {
        uri = '/best';

        navigator._routes = {
          target: usersTarget,
          '/best': 'best',
          '/:uuid': 'show'
        };

        subject = navigator.getRouteForURI(uri);
      });

      it('matches best', function () {
        expect( subject.actions ).toEqual([
          { method: 'best', target: usersTarget }
        ]);
      });

    });

    describe('with multiple matches', function () {
      var appTarget     = { init: function () {} },
          userTarget    = { edit: function () {}, show: function () {} },
          storesTarget  = { index: function () {} };

      beforeEach(function () {
        uri = '/users/foo/edit';

        navigator._routes = {
          target: appTarget,
          '/*': 'init',
          '/users': {
            target: usersTarget,
            '/': 'index',
            '/:uuid': {
              target: userTarget,
              '/': 'show',
              '/edit': 'edit'
            }
          },
          '/stores': {
            target: storesTarget,
            '/': 'index'
          }
        };

        subject = navigator.getRouteForURI(uri);
      });

      it('returns the correct route properties', function () {
        expect( subject.matchedRoute ).toBe( '/users/:uuid/edit' )
        expect( subject.actions ).toEqual([
          { method: 'init', target: appTarget },
          { method: 'edit', target: userTarget }
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

        describe('with options with no `method`', function () {
          beforeEach(function () {
            uri = '/users/catdog/edit';

            navigator._routes['/users']['/:uuid']['/*'] = {
              options: { renderCats: true }
            };

            subject = navigator.getRouteForURI(uri);
          });

          it('merges the options into one object', function () {
            expect( subject.options ).toEqual({
              showLayout: true,
              renderCats: true
            });
          });
        });
      });
    });

  });

});
