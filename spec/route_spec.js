describe('Route', function () {

  var routes, uri, subject, usersTarget, navigator, invokeAction;

  beforeEach(function () {
    usersTarget = {
      index: function () {},
      show: function () {},
      best: function () {}
    };
    navigator = Aviator._navigator;
    navigator._routes = {};
    invokeAction = function (action) {
      return action.target[action.method]();
    };
  });

  describe('given a uri that doesnt match any routes', function () {
    var notFoundTarget;

    beforeEach(function () {
      notFoundTarget = {
        before: function() {},
        test: function() {},
        notFound1: function () {},
        notFound2: function () {}
      };
      navigator._routes = {
        target: notFoundTarget,
        '/fart': {
          '/*': 'before',
          '/blaherty': {
            '/test': 'test',
            notFound: 'notFound1'
          },
          notFound: 'notFound2'
        },
        '/hom': {
          '/tulihan': {
            '/': 'test'
          },
          notFound: function() {
            return 3;
          }
        }
      };
    });

    describe('when there is no notFound matcher in the current scope', function () {
      describe('and there is no notFound matcher in a parent scope', function () {
        beforeEach(function () {
          uri = '/bad/route';
          subject = navigator.createRouteForURI(uri);
        });

        it('doesnt return anything', function () {
          expect( subject.actions ).toEqual( [] );
        });
      });

      describe('and there is a notFound matcher in a parent scope', function () {
        beforeEach(function () {
          uri = '/hom/hulihan';
          subject = navigator.createRouteForURI(uri);
        });

        it('returns the nearest notFound matcher', function () {
          expect( subject.actions.length ).toEqual( 1 );
          expect( invokeAction(subject.actions[0]) ).toEqual( 3 );
        });
      });
    });

    describe('when there is a notFound matcher in the current scope', function () {
      beforeEach(function () {
        uri = '/fart/blaherty/taste';
        subject = navigator.createRouteForURI(uri);
      });

      it('returns the notFound matcher in that scope only', function () {
        expect( subject.actions ).toEqual([
          { target: notFoundTarget, method: 'before' },
          { target: notFoundTarget, method: 'notFound1' }
        ]);
      });
    });
  });

  describe('given a matching uri', function () {
    describe('with one matching function', function () {
      beforeEach(function () {
        uri = '/test/good/';
        navigator._routes = {
          '/test': {
            '/good': function () { return 42; },
            '/bad': function () { return 43; }
          }
        };

        subject = navigator.createRouteForURI(uri);
      });

      it('returns the correct route properties', function () {
        expect( subject.matchedRoute ).toBe( '/test/good' );
        expect( subject.actions.length ).toEqual( 1 );
        expect( invokeAction(subject.actions[0]) ).toEqual( 42 );
        expect( subject.options ).toEqual( {} );
      });
    });

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

        subject = navigator.createRouteForURI(uri);
      });

      it('returns the correct route properties', function () {
        expect( subject.matchedRoute ).toBe( '/users/:uuid' );
        expect( subject.actions ).toEqual(
          [{ method: 'show', target: usersTarget }]
        );
        expect( subject.options ).toEqual( {} );
      });
    });

    describe('with no target on the route level', function () {
      beforeEach(function () {
        uri = '/users/foo/edit';

        navigator._routes = {
          '/users': {
            target: usersTarget,
            '/': 'index',
            '/:uuid': {
              '/': 'show',
              '/edit': 'edit'
            }
          }
        };

        subject = navigator.createRouteForURI(uri);
      });

      it('uses the parent level target', function () {
        expect( subject.matchedRoute ).toBe( '/users/:uuid/edit' );
        expect( subject.actions ).toEqual(
          [{ method: 'edit', target: usersTarget }]
        );
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

        subject = navigator.createRouteForURI(uri);
      });

      it('matches best', function () {
        expect( subject.actions ).toEqual([
          { method: 'best', target: usersTarget }
        ]);
      });

    });

    describe('with exits and multiple matches', function () {
      var appTarget     = { init: function () {}, exit: function () {} },
          userTarget    = { edit: function () {}, show: function () {}, exitShow: function () {} },
          storesTarget  = { index: function () {} };

      beforeEach(function () {
        uri = '/users/foo';

        navigator._routes = {
          target: appTarget,
          '/*': { method: 'init', exit: 'exit' },
          '/users': {
            target: usersTarget,
            '/': 'index',
            '/:uuid': {
              target: userTarget,
              '/': { method: 'show', exit: 'exitShow' },
              '/edit': 'edit'
            }
          },
          '/stores': {
            target: storesTarget,
            '/': 'index'
          }
        };

        subject = navigator.createRouteForURI(uri);
      });

      it('collects all exit functions', function () {
        expect( subject.exits ).toEqual([
          { method: 'exitShow', target: userTarget },
          { method: 'exit', target: appTarget }
        ]);
      });

    });

    describe('with multiple matches and functions', function () {
      var appTarget  = { init: function () {} },
          userTarget = { initUsers: function () {} };

      beforeEach(function () {
        uri = '/users/foo/edit';

        navigator._routes = {
          target: appTarget,
          '/*': 'init',
          '/users': {
            '/*': function () { return 0; },
            '/:uuid': {
              target: userTarget,
              '/*': 'initUsers',
              '/edit': function () { return 1; }
            }
          },
        };

        subject = navigator.createRouteForURI(uri);
      });

      it('returns the correct route properties', function () {
        expect( subject.matchedRoute ).toBe( '/users/:uuid/edit' );
        expect( subject.actions.length ).toEqual( 4 );
        expect( subject.actions[0] ).toEqual(
          { method: 'init', target: appTarget }
        );
        expect( invokeAction(subject.actions[1]) ).toEqual( 0 );
        expect( subject.actions[2] ).toEqual(
          { method: 'initUsers', target: userTarget }
        );
        expect( invokeAction(subject.actions[3]) ).toEqual( 1 );
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

        subject = navigator.createRouteForURI(uri);
      });

      it('returns the correct route properties', function () {
        expect( subject.matchedRoute ).toBe( '/users/:uuid/edit' );
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
          };

          subject = navigator.createRouteForURI(uri);
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

            subject = navigator.createRouteForURI(uri);
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

            subject = navigator.createRouteForURI(uri);
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

            subject = navigator.createRouteForURI(uri);
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

    describe('with dashes in the last fragment', function () {
      beforeEach(function () {
        uri = '/calendar/2013-08';

        navigator._routes = {
          '/calendar': {
            target: usersTarget,
            '/:date': {
              target: usersTarget,
              '/': 'show'
            }
          }
        };

        subject = navigator.createRouteForURI(uri);
      });

      it('returns the correct route properties', function () {
        expect( subject.matchedRoute ).toBe( '/calendar/:date' );
        expect( subject.actions ).toEqual(
          [{ method: 'show', target: usersTarget }]
        );
        expect( subject.options ).toEqual( {} );
      });
    });

    describe('with multiple slashes on a route level', function () {
      beforeEach(function () {
        uri = '/users/type/admins/all';
        navigator._routes = {
          '/users': {
            target: usersTarget,
            '/type/admins/all': 'show'
          }
        };
        subject = navigator.createRouteForURI(uri);
      });

      it('finds the correct action', function () {
        expect( subject.matchedRoute ).toBe( '/users/type/admins/all' );
        expect( subject.actions ).toEqual(
          [{ method: 'show', target: usersTarget }]
        );
      });

      describe('and with named params', function () {
        beforeEach(function () {
          uri = '/users/type/ops/all';
          navigator._routes = {
            '/users': {
              target: usersTarget,
              '/type/:kind/all': 'show'
            }
          };
          subject = navigator.createRouteForURI(uri);
        });

        it('finds the correct action', function () {
          expect( subject.matchedRoute ).toBe( '/users/type/:kind/all' );
          expect( subject.actions ).toEqual(
            [{ method: 'show', target: usersTarget }]
          );
        });
      });

      describe('and with a sub tree', function () {
        beforeEach(function () {
          uri = '/users/type/ops/all/12';
          navigator._routes = {
            '/users/type/:kind/all': {
              '/:id': {
                target: usersTarget,
                '/': 'show'
              }
            }
          };
          subject = navigator.createRouteForURI(uri);
        });

        it('finds the correct action', function () {
          expect( subject.matchedRoute ).toBe( '/users/type/:kind/all/:id' );
          expect( subject.actions ).toEqual(
            [{ method: 'show', target: usersTarget }]
          );
        });
      });
    });

  });

  describe('#includesNamedParam', function () {
    it('is true is there are :foo in the given fragment', function () {
      expect( subject.includesNamedParam('/foo/:bar/baz') ).toBe( true );
      expect( subject.includesNamedParam('/:foo/:bar/baz') ).toBe( true );
      expect( subject.includesNamedParam('/:foo/bar/baz') ).toBe( true );
      expect( subject.includesNamedParam('/foo/bar/:baz') ).toBe( true );
      expect( subject.includesNamedParam('/foo/bar/baz') ).toBe( false );
    });
  });

});
