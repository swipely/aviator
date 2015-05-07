describe('Aviator', function () {

  var subject, _navigator, usersResponder, routes;

  beforeEach(function () {
    subject = Aviator;
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
    beforeEach(function () {
      spyOn( _navigator, 'setRoutes' );

      subject.setRoutes();
    });

    it('sets the routes on the _navigator', function () {
      expect( _navigator.setRoutes ).toHaveBeenCalled();
    });
  });

  describe('.dispatch', function () {
    beforeEach(function () {
      spyOn( _navigator, 'setup' );
      spyOn( _navigator, 'dispatch' );

      subject.dispatch();
    });

    it('calls setup on the private navigator object', function () {
      expect( _navigator.setup ).toHaveBeenCalledWith({
        pushStateEnabled: subject.pushStateEnabled,
        linkSelector: subject.linkSelector,
        root: subject.root
      });
    });

    it('calls dispatch on the private navigator object', function () {
      expect( _navigator.dispatch ).toHaveBeenCalled();
    });
  });

  describe('.getCurrentRequest', function () {
    beforeEach(function () {
      spyOn( _navigator, 'getCurrentRequest' );
      subject.getCurrentRequest();
    });

    it('calls getCurrentRequest on the navigator', function () {
      expect( _navigator.getCurrentRequest ).toHaveBeenCalled();
    });
  });

  describe('.getCurrentURI', function () {
    beforeEach(function () {
      spyOn( _navigator, 'getCurrentURI' );
      subject.getCurrentURI();
    });

    it('calls getCurrentURI on the navigator', function () {
      expect( _navigator.getCurrentURI ).toHaveBeenCalled();
    });
  });

  describe('.refresh', function () {
    beforeEach(function () {
      spyOn( _navigator, 'refresh' );
      subject.refresh();
    });

    it('calls refresh on the navigator', function () {
      expect( _navigator.refresh ).toHaveBeenCalled();
    });
  });

  describe('.navigate', function () {
    var url = '/partners/whatever',
        opts = {};

    beforeEach(function () {
      spyOn( _navigator, 'navigate' );

      subject.navigate( url, opts);
    });

    it('calls navigate on the navigator', function () {
      expect( _navigator.navigate ).toHaveBeenCalledWith( url, opts );
    });
  });

  describe('.hrefFor', function () {
    var url = '/lol/who/cares',
        opts = {};

    beforeEach(function () {
      spyOn( _navigator, 'hrefFor' );
      subject.hrefFor( url, opts );
    });

    it('calls hrefFor on the navigator', function () {
      expect( _navigator.hrefFor ).toHaveBeenCalledWith( url, opts );
    });
  });

  describe('.serializeQueryParams', function () {
    beforeEach(function () {
      spyOn( _navigator, 'serializeQueryParams' );

      subject.serializeQueryParams({ foo: 'bar' });
    });

    it('calls serializeQueryParams on the navigator', function () {
      expect( _navigator.serializeQueryParams ).toHaveBeenCalledWith({
        foo: 'bar'
      });
    });
  });

  describe('.rewriteRouteTo', function () {
    var target;

    beforeEach(function () {
      target = subject.rewriteRouteTo('/foo/bar').target;
    });

    describe('the returned route target action', function () {
      beforeEach(function () {
        spyOn( Aviator, 'navigate' );
      });

      it('calls Aviator.navigate with the given route', function () {
        target.rewrite({ namedParams: { baz: 'boo' } });

        expect( Aviator.navigate ).toHaveBeenCalledWith(
          '/foo/bar',
          {
            namedParams: { baz: 'boo' },
            replace: true
          }
        );

      });
    });
  });

});
