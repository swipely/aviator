describe('Request', function () {

  var subject, navigator;

  beforeEach(function () {
    navigator = Aviator._navigator;
  });

  describe('namedParams', function () {
    describe('with named params', function () {
      var route = '/snap/:uuid/dawg/:section/bro';

      beforeEach(function () {
        subject = navigator.createRequest(
          '/snap/foo/dawg/bar%20noo%20gan/bro',
          null,
          route
        );
      });

      it('extracts the named params', function () {
        expect( subject.namedParams ).toEqual({
          uuid: 'foo',
          section: 'bar noo gan'
        });
      });
    });
  });

  describe('queryParams', function () {
    var route, queryString;

    beforeEach(function () {
      route = '/snap';
    });

    describe('with a regular query string', function () {
      queryString = '?bro=foo&dawg=bar&baz=boo';

      beforeEach(function () {
        subject = navigator.createRequest('/snap', queryString, route);
      });

      it('extracts the query string params', function () {
        expect( subject.queryParams ).toEqual({
          bro: 'foo',
          dawg: 'bar',
          baz: 'boo'
        });
      });
    });

    describe('using the rails convention for arrays in a query', function () {
      beforeEach(function () {
        queryString = '?bros[]=simon&bros[]=barnaby&chickens[]=earl&dinosaurs=fun';
        subject = navigator.createRequest('/snap', queryString, route);
      });

      it('stores values for the same key in an array', function () {
        expect( subject.queryParams['bros'] ).toEqual( [ 'simon', 'barnaby' ] );
      });

      it('does not assume that single values are meant to be in arrays', function () {
        expect( subject.queryParams['dinosaurs'] ).toEqual( 'fun' );
      });

      it('puts values explicitly specified to be in arrays in arrays', function () {
        expect( subject.queryParams['chickens'] ).toEqual( [ 'earl' ] )
      });
    });

    describe('with an invalid query string key', function () {
      beforeEach(function () {
        queryString = '?bros=keith&bros-george';
        subject = navigator.createRequest('/snap', queryString, route);
      });

      it('includes the valid params', function () {
        expect( subject.queryParams['bros'] ).toBe( 'keith' );
      });

      it('does not include invalid params', function () {
        expect( Object.keys(subject.queryParams).length ).toBe( 1 );
      });
    });

  });

  describe('params', function () {
    beforeEach(function () {
      subject = navigator.createRequest('/bro/bar', '?baz=boo', '/bro/:foo');
    });

    it('is a merge of namedParams and queryParams', function () {
      expect( subject.params ).toEqual({
        foo: 'bar',
        baz: 'boo'
      });
    });
  });

});
